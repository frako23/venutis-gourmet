"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AjusteSaldoModal } from "@/components/admin/clientes/ficha/ajusteSaldoModal";
import { PagoACuentaModal } from "@/components/admin/clientes/ficha/pagoACuentaModal";
import type { ClientProfile } from "@/lib/admin/client-profile";
import { getPaymentMethodLabel } from "@/lib/admin/status";
import { formatFechaHora, formatUsd, formatUsdConSigno, origenSaldoLabel } from "@/lib/format";

export function FichaSaldoAFavor({ perfil }: { perfil: ClientProfile }) {
  const router = useRouter();
  const [modal, setModal] = useState<"pago" | "ajuste" | null>(null);
  const clienteId = perfil.cliente.id;

  return (
    <section className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe9e0] p-4 md:p-5">
        <div><h2 className="text-lg font-bold text-[#18211d]">Saldo a favor</h2><p className="mt-1 text-xs text-[#707970]">Disponible: <strong className="admin-mono text-[#18211d]">{formatUsd(perfil.financiero.saldoAFavorUsd)}</strong></p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="admin-button-primary admin-button-brass" onClick={() => setModal("pago")}>Registrar pago a cuenta</button>
          <button type="button" className="admin-button-secondary" onClick={() => setModal("ajuste")}>Ajustar saldo</button>
        </div>
      </div>
      {perfil.movimientosSaldo.length === 0 ? (
        <p className="p-5 text-sm text-[#8f988f]">Sin movimientos de saldo a favor.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table min-w-[720px] text-left text-sm">
            <thead><tr><th>Fecha</th><th className="text-right">Monto</th><th>Origen</th><th>Pedido</th><th>Detalle</th><th>Registró</th></tr></thead>
            <tbody>
              {perfil.movimientosSaldo.map((m) => (
                <tr key={m.id}>
                  <td>{formatFechaHora(m.createdAt)}</td>
                  <td className={`admin-mono text-right font-bold ${m.montoUsd < 0 ? "text-[#a5452f]" : "text-[#55704d]"}`}>{formatUsdConSigno(m.montoUsd)}</td>
                  <td>{origenSaldoLabel(m.origen)}</td>
                  <td>{m.numeroOrden ? <Link href={`/admin/transactions?orden=${encodeURIComponent(m.numeroOrden)}`} className="admin-mono text-[#66735f] hover:underline">{m.numeroOrden}</Link> : "—"}</td>
                  <td className="text-xs text-[#707970]">{[m.metodoPago ? getPaymentMethodLabel(m.metodoPago) : null, m.referencia ? `Ref. ${m.referencia}` : null, m.motivo].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="text-xs text-[#707970]">{m.actorEmail ?? "Cliente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal === "pago" && <PagoACuentaModal clienteId={clienteId} onClose={() => setModal(null)} onDone={() => router.refresh()} />}
      {modal === "ajuste" && <AjusteSaldoModal clienteId={clienteId} onClose={() => setModal(null)} onDone={() => router.refresh()} />}
    </section>
  );
}
