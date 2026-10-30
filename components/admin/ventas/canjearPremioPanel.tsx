"use client";

import { Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { canjearPremio } from "@/lib/actions/admin-fidelidad";
import { formatUsd } from "@/lib/format";

export type PremioCanjeable = { id: number; nombre: string; costoPuntos: number; detalle: string };

type Props = { transaccionId: number; puntos: number; premios: PremioCanjeable[]; canjes: Array<{ id: number; descripcion: string; puntos: number }>; descuentoPuntosUsd: number };

export function CanjearPremioPanel({ transaccionId, puntos, premios, canjes, descuentoPuntosUsd }: Props) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [premioId, setPremioId] = useState("");
  const disponibles = premios.filter((premio) => premio.costoPuntos <= puntos);

  function canjear() {
    const datos = new FormData();
    datos.set("transaccionId", String(transaccionId));
    datos.set("premioId", premioId);
    iniciar(async () => {
      const resultado = await canjearPremio(datos);
      if (resultado.success) {
        toast.success(resultado.message);
        setPremioId("");
        router.refresh();
      } else {
        toast.error(resultado.message);
      }
    });
  }

  return (
    <section className="admin-panel p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-[#f5eddc] text-[#a57c2f]"><Gift size={17} /></span>
        <div><p className="admin-eyebrow">Fidelización</p><h2 className="mt-1 font-bold text-[#18211d]">Premios canjeados</h2></div>
      </div>
      {canjes.length === 0 ? (
        <p className="mt-4 text-sm text-[#707970]">Este pedido no tiene premios canjeados.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#ebe9e0] text-sm">
          {canjes.map((canje) => <li key={canje.id} className="flex justify-between gap-3 py-2"><span>{canje.descripcion}</span><span className="admin-mono text-[#a5452f]">{canje.puntos.toLocaleString("es-VE")} pts</span></li>)}
        </ul>
      )}
      {descuentoPuntosUsd > 0 && <p className="mt-2 text-xs text-[#707970]">Descuento por puntos aplicado: {formatUsd(descuentoPuntosUsd)}</p>}
      <div className="mt-4 border-t border-[#ebe9e0] pt-4">
        <p className="text-xs text-[#707970]">El cliente tiene {puntos.toLocaleString("es-VE")} puntos.</p>
        {disponibles.length === 0 ? (
          <p className="mt-2 text-sm text-[#8f988f]">No hay premios activos que alcance a canjear.</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="admin-label min-w-60 flex-1">Premio
              <select value={premioId} onChange={(evento) => setPremioId(evento.target.value)} className="admin-field"><option value="">Elige un premio</option>{disponibles.map((premio) => <option key={premio.id} value={premio.id}>{premio.nombre} · {premio.costoPuntos} pts · {premio.detalle}</option>)}</select>
            </label>
            <button type="button" disabled={pendiente || !premioId} onClick={canjear} className="admin-button-primary admin-button-brass">{pendiente ? "Canjeando…" : "Canjear premio"}</button>
          </div>
        )}
      </div>
    </section>
  );
}
