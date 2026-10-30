import Link from "next/link";

import type { ClientProfile } from "@/lib/admin/client-profile";
import { getOrderStateLabel } from "@/lib/admin/status";
import { formatFecha, formatUsd } from "@/lib/format";

export function FichaPedidos({ perfil }: { perfil: ClientProfile }) {
  return (
    <section className="admin-panel overflow-hidden">
      <div className="border-b border-[#ebe9e0] p-4 md:p-5"><h2 className="text-lg font-bold text-[#18211d]">Pedidos</h2><p className="mt-1 text-xs text-[#707970]">{perfil.pedidos.length} pedido(s), el más reciente primero.</p></div>
      {perfil.pedidos.length === 0 ? (
        <p className="p-5 text-sm text-[#8f988f]">El cliente todavía no tiene pedidos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table min-w-[560px] text-left text-sm">
            <thead><tr><th>Orden</th><th>Fecha</th><th>Estado</th><th className="text-right">Total</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {perfil.pedidos.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/transactions/${p.id}`} className="admin-mono font-semibold text-[#66735f] hover:underline">{p.numeroOrden}</Link></td>
                  <td>{formatFecha(p.fechaCompra)}</td>
                  <td>{getOrderStateLabel(p.estado)}</td>
                  <td className="admin-mono text-right">{formatUsd(p.totalUsd)}</td>
                  <td className={`admin-mono text-right ${p.saldoUsd > 0 ? "font-bold text-[#a5452f]" : "text-[#8f988f]"}`}>{formatUsd(p.saldoUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
