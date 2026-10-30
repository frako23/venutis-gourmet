"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { ajustarPuntosCliente } from "@/lib/actions/admin-fidelidad";

export function AjustePuntosModal({ clienteId, onClose, onDone }: { clienteId: number; onClose: () => void; onDone: () => void }) {
  const [pendiente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    formData.set("clienteId", String(clienteId));
    iniciar(async () => {
      const resultado = await ajustarPuntosCliente(formData);
      if (resultado.success) {
        toast.success(resultado.message);
        onDone();
        onClose();
      } else {
        toast.error(resultado.message);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !pendiente && onClose()}>
      <form action={enviar} role="dialog" aria-modal="true" aria-labelledby="ajuste-puntos-titulo" className="admin-panel grid w-full max-w-md gap-3 p-6" onClick={(evento) => evento.stopPropagation()}>
        <h3 id="ajuste-puntos-titulo" className="text-lg font-bold text-[#18211d]">Ajustar puntos</h3>
        <p className="text-xs text-[#707970]">Usa un número positivo para sumar y uno negativo para restar. Los puntos nunca pueden quedar en negativo.</p>
        <label className="admin-label">Puntos
          <input name="puntos" type="number" step="1" required className="admin-field admin-mono" />
        </label>
        <label className="admin-label">Motivo
          <input name="motivo" required minLength={3} maxLength={240} className="admin-field" />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" disabled={pendiente} onClick={onClose} className="admin-button-secondary">Cancelar</button>
          <button type="submit" disabled={pendiente} className="admin-button-primary admin-button-brass">{pendiente ? "Guardando…" : "Registrar ajuste"}</button>
        </div>
      </form>
    </div>
  );
}
