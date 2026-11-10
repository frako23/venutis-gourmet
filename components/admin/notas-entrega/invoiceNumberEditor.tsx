"use client";

import { actualizarNumeroFactura } from "@/lib/actions/delivery-notes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function InvoiceNumberEditor({ noteId, numeroFactura }: { noteId: number; numeroFactura: string | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(numeroFactura ?? "");
  const [pendiente, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
      const response = await actualizarNumeroFactura(noteId, valor);
      if (!response.success) { toast.error(response.message); return; }
      toast.success(response.message);
      setValor(response.numeroFactura ?? "");
      setEditando(false);
      router.refresh();
    });
  }

  if (!editando) {
    return <div className="mt-1 flex flex-wrap items-center gap-3"><span className="admin-mono">{numeroFactura ?? "Sin factura"}</span><button type="button" onClick={() => { setValor(numeroFactura ?? ""); setEditando(true); }} className="text-xs font-bold text-[#66735f] hover:text-[#18211d]">{numeroFactura ? "Editar" : "Agregar"}</button></div>;
  }
  return <div className="mt-1 flex flex-wrap items-center gap-2"><input value={valor} onChange={(event) => setValor(event.target.value)} maxLength={60} autoFocus onKeyDown={(event) => { if (event.key === "Enter") guardar(); if (event.key === "Escape") setEditando(false); }} className="admin-field admin-mono max-w-56" placeholder="Número de factura" aria-label="Número de factura" /><button type="button" disabled={pendiente} onClick={guardar} className="admin-button-primary admin-button-brass min-h-0 px-3 py-1.5">{pendiente ? "Guardando…" : "Guardar"}</button><button type="button" disabled={pendiente} onClick={() => setEditando(false)} className="admin-button-secondary min-h-0 px-3 py-1.5">Cancelar</button></div>;
}
