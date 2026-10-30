"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { ajustarSaldoAFavorCliente } from "@/lib/actions/admin-cuenta-corriente";

export function AjusteSaldoModal({ clienteId, onClose, onDone }: { clienteId: number; onClose: () => void; onDone: () => void }) {
  const [pendiente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    formData.set("clienteId", String(clienteId));
    iniciar(async () => {
      const resultado = await ajustarSaldoAFavorCliente(formData);
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
      <form action={enviar} role="dialog" aria-modal="true" aria-labelledby="ajuste-saldo-titulo" className="admin-panel grid w-full max-w-md gap-3 p-6" onClick={(evento) => evento.stopPropagation()}>
        <h3 id="ajuste-saldo-titulo" className="text-lg font-bold text-[#18211d]">Ajustar saldo a favor</h3>
        <p className="text-xs text-[#707970]">Usa un monto positivo para sumar y uno negativo para restar. El saldo nunca puede quedar negativo.</p>
        <label className="admin-label">Monto (USD)
          <input name="montoUsd" type="number" step="0.01" required className="admin-field admin-mono" />
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
