"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { guardarNotasCliente } from "@/lib/actions/admin-clients";

const MAX_NOTAS = 2000;

export function FichaNotas({ clienteId, notas }: { clienteId: number; notas: string | null }) {
  const [texto, setTexto] = useState(notas ?? "");
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    const datos = new FormData();
    datos.set("clienteId", String(clienteId));
    datos.set("notasInternas", texto);
    iniciar(async () => {
      const resultado = await guardarNotasCliente(datos);
      if (resultado.success) toast.success(resultado.message);
      else toast.error(resultado.message);
    });
  }

  return (
    <section className="admin-panel p-4 md:p-5">
      <h2 className="text-lg font-bold text-[#18211d]">Notas internas</h2>
      <p className="mt-1 text-xs text-[#707970]">Solo visible para el equipo.</p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={MAX_NOTAS}
        rows={4}
        className="mt-3 w-full rounded-lg border border-[#dedfd6] bg-[#fffdf8] p-3 text-sm text-[#18211d] outline-none focus:border-[#c8a45d]"
        aria-label="Notas internas del cliente"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="admin-mono text-xs text-[#8f988f]">{texto.length}/{MAX_NOTAS}</span>
        <button type="button" onClick={guardar} disabled={pendiente || texto.trim() === (notas ?? "").trim()} className="admin-button-primary admin-button-brass">{pendiente ? "Guardando…" : "Guardar notas"}</button>
      </div>
    </section>
  );
}
