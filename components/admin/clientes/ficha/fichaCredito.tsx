"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { actualizarCreditoCliente } from "@/lib/actions/admin-clients";
import { formatUsd } from "@/lib/format";

type Props = { clienteId: number; habilitado: boolean; limiteUsd: number | null; deudaUsd: number; disponibleUsd: number | null };

export function FichaCredito({ clienteId, habilitado, limiteUsd, deudaUsd, disponibleUsd }: Props) {
  const [activo, setActivo] = useState(habilitado);
  const [limite, setLimite] = useState(limiteUsd === null ? "" : String(limiteUsd));
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    const datos = new FormData();
    datos.set("clienteId", String(clienteId));
    datos.set("habilitado", String(activo));
    datos.set("limiteUsd", limite);
    iniciar(async () => {
      const resultado = await actualizarCreditoCliente(datos);
      if (resultado.success) toast.success(resultado.message);
      else toast.error(resultado.message);
    });
  }

  return (
    <section className="admin-panel p-4 md:p-5">
      <h2 className="text-lg font-bold text-[#18211d]">Crédito</h2>
      <p className="mt-1 text-xs text-[#707970]">Deuda actual {formatUsd(deudaUsd)}{disponibleUsd !== null && ` · disponible ${formatUsd(disponibleUsd)}`}</p>
      <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-[#18211d]">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 accent-[#66735f]" />
        Crédito habilitado
      </label>
      <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-[#707970]">
        Límite (USD)
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
          disabled={!activo}
          className="mt-1 block w-full rounded-lg border border-[#dedfd6] bg-[#fffdf8] p-2.5 text-sm normal-case text-[#18211d] outline-none focus:border-[#c8a45d] disabled:opacity-50"
        />
      </label>
      <button type="button" onClick={guardar} disabled={pendiente} className="admin-button-primary admin-button-brass mt-4">{pendiente ? "Guardando…" : "Guardar crédito"}</button>
    </section>
  );
}
