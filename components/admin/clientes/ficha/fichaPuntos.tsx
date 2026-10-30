"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AjustePuntosModal } from "@/components/admin/clientes/ficha/ajustePuntosModal";
import type { ClientProfile } from "@/lib/admin/client-profile";
import { formatFechaHora, formatPuntosConSigno, tipoPuntosLabel } from "@/lib/format";

export function FichaPuntos({ perfil }: { perfil: ClientProfile }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe9e0] p-4 md:p-5">
        <div>
          <h2 className="text-lg font-bold text-[#18211d]">Puntos de fidelización</h2>
          <p className="mt-1 text-xs text-[#707970]">Disponibles: <strong className="admin-mono text-[#18211d]">{perfil.financiero.puntos.toLocaleString("es-VE")}</strong>{perfil.cliente.tipoCliente === "mayorista" && " · Los mayoristas no acumulan puntos nuevos."}</p>
        </div>
        <button type="button" className="admin-button-secondary" onClick={() => setAbierto(true)}>Ajustar puntos</button>
      </div>
      {perfil.movimientosPuntos.length === 0 ? (
        <p className="p-5 text-sm text-[#8f988f]">Sin movimientos de puntos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table min-w-[640px] text-left text-sm">
            <thead><tr><th>Fecha</th><th className="text-right">Puntos</th><th>Tipo</th><th>Detalle</th><th>Pedido</th><th>Registró</th></tr></thead>
            <tbody>
              {perfil.movimientosPuntos.map((m) => (
                <tr key={m.id}>
                  <td>{formatFechaHora(m.fecha)}</td>
                  <td className={`admin-mono text-right font-bold ${m.puntos < 0 ? "text-[#a5452f]" : "text-[#55704d]"}`}>{formatPuntosConSigno(m.puntos)}</td>
                  <td>{tipoPuntosLabel(m.tipo)}</td>
                  <td className="text-xs text-[#707970]">{[m.descripcion, m.motivo].filter(Boolean).join(" · ") || "—"}</td>
                  <td>{m.numeroOrden ? <Link href={`/admin/transactions?orden=${encodeURIComponent(m.numeroOrden)}`} className="admin-mono text-[#66735f] hover:underline">{m.numeroOrden}</Link> : "—"}</td>
                  <td className="text-xs text-[#707970]">{m.actorEmail ?? "Automático"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {abierto && <AjustePuntosModal clienteId={perfil.cliente.id} onClose={() => setAbierto(false)} onDone={() => router.refresh()} />}
    </section>
  );
}
