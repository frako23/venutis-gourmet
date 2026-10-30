"use client";

import type { MetodoPago } from "@prisma/client";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useDolar } from "@/hooks/useDolar";
import { registrarPagoACuenta } from "@/lib/actions/admin-cuenta-corriente";
import { getPaymentMethodLabel } from "@/lib/admin/status";

const METODOS: MetodoPago[] = ["Zelle", "EfectivoUsd", "TransferenciaUsd", "PagoMovil", "TransferenciaBs"];
const hoy = () => new Date().toISOString().slice(0, 10);

export function PagoACuentaModal({ clienteId, onClose, onDone }: { clienteId: number; onClose: () => void; onDone: () => void }) {
  const { tasa } = useDolar();
  const [moneda, setMoneda] = useState<"usd" | "bs">("usd");
  const [pendiente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    formData.set("clienteId", String(clienteId));
    iniciar(async () => {
      const resultado = await registrarPagoACuenta(formData);
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
      <form action={enviar} role="dialog" aria-modal="true" aria-labelledby="pago-cuenta-titulo" className="admin-panel grid w-full max-w-md gap-3 p-6" onClick={(evento) => evento.stopPropagation()}>
        <h3 id="pago-cuenta-titulo" className="text-lg font-bold text-[#18211d]">Registrar pago a cuenta</h3>
        <p className="text-xs text-[#707970]">El dinero recibido sin un pedido queda como saldo a favor del cliente.</p>
        <label className="admin-label">Moneda
          <select name="moneda" value={moneda} onChange={(evento) => setMoneda(evento.target.value as "usd" | "bs")} className="admin-field"><option value="usd">USD</option><option value="bs">Bs</option></select>
        </label>
        <label className="admin-label">Monto {moneda === "usd" ? "(USD)" : "(Bs)"}
          <input name="monto" type="number" min="0.01" step="0.01" required className="admin-field admin-mono" />
        </label>
        {moneda === "bs" && (
          <label className="admin-label">Tasa USD/Bs
            <input key={tasa} name="tasaCambio" type="number" min="0.0001" step="0.0001" required defaultValue={tasa || ""} className="admin-field admin-mono" />
          </label>
        )}
        <label className="admin-label">Método
          <select name="metodoPago" required defaultValue="Zelle" className="admin-field">{METODOS.map((metodo) => <option key={metodo} value={metodo}>{getPaymentMethodLabel(metodo)}</option>)}</select>
        </label>
        <label className="admin-label">Referencia <span className="font-normal normal-case tracking-normal">(opcional)</span>
          <input name="referencia" maxLength={120} className="admin-field" />
        </label>
        <label className="admin-label">Fecha
          <input name="fechaPago" type="date" required defaultValue={hoy()} max={hoy()} className="admin-field" />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" disabled={pendiente} onClick={onClose} className="admin-button-secondary">Cancelar</button>
          <button type="submit" disabled={pendiente} className="admin-button-primary admin-button-brass">{pendiente ? "Guardando…" : "Registrar pago"}</button>
        </div>
      </form>
    </div>
  );
}
