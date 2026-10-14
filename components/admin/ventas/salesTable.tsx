import Link from "next/link";

import { getOrderStateLabel } from "@/lib/admin/status";
import type { PaginatedRows, SalesRow } from "@/lib/admin/types";

export function SalesTable({ result, paginationQuery = "" }: { result: PaginatedRows<SalesRow>; paginationQuery?: string }) {
  if (result.rows.length === 0) return <div className="admin-panel-flat p-12 text-center"><p className="font-bold text-[#18211d]">No hay ventas con estos filtros.</p><p className="mt-1 text-sm text-[#707970]">Prueba con un periodo o estado diferente.</p></div>;
  return <div className="admin-panel overflow-hidden">
    <div className="hidden overflow-x-auto md:block"><table className="admin-table min-w-full text-left text-sm"><thead><tr><th>Orden</th><th>Fecha</th><th>Cliente</th><th>Subtotal</th><th>Descuento</th><th>Total</th><th>Estado</th><th /></tr></thead><tbody>{result.rows.map((row) => <SalesTableRow key={row.id} row={row} />)}</tbody></table></div>
    <div className="divide-y divide-[#ebe9e0] md:hidden">{result.rows.map((row) => <div key={row.id} className="p-4"><SalesCard row={row} /></div>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe9e0] p-4 text-sm text-[#707970]"><span>{result.total} venta(s) · página {result.page} de {result.totalPages}</span><div className="flex gap-2">{result.page > 1 && <Link href={`?${paginationQuery}${paginationQuery ? "&" : ""}page=${result.page - 1}`} className="admin-button-secondary min-h-0 px-3 py-1.5">Anterior</Link>}{result.page < result.totalPages && <Link href={`?${paginationQuery}${paginationQuery ? "&" : ""}page=${result.page + 1}`} className="admin-button-secondary min-h-0 px-3 py-1.5">Siguiente</Link>}</div></div>
  </div>;
}

function SalesTableRow({ row }: { row: SalesRow }) { return <tr><td className="font-bold"><Link href={`/admin/transactions/${row.id}`} className="text-[#18211d] hover:text-[#a57c2f]">{row.numeroOrden}</Link></td><td className="text-[#707970]">{row.fechaCompra.toLocaleDateString("es-VE")}</td><td>{row.cliente}</td><td className="admin-mono text-[#707970]">${row.subtotalUsd.toFixed(2)}</td><td className="admin-mono text-[#b85f49]">-${row.descuentoUsd.toFixed(2)}</td><td className="admin-mono font-bold">${row.totalUsd.toFixed(2)}</td><td><StatusBadge state={row.estado} /></td><td><Link href={`/admin/transactions/${row.id}`} className="text-xs font-bold text-[#66735f] hover:text-[#18211d]">Ver</Link></td></tr>; }
function SalesCard({ row }: { row: SalesRow }) { return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><Link href={`/admin/transactions/${row.id}`} className="font-bold text-[#18211d]">{row.numeroOrden}</Link><StatusBadge state={row.estado} /></div><p className="text-sm text-[#707970]">{row.cliente} · {row.fechaCompra.toLocaleDateString("es-VE")}</p><div className="flex justify-between border-t border-[#ebe9e0] pt-3 text-sm"><span className="text-[#707970]">Total</span><strong className="admin-mono text-[#18211d]">${row.totalUsd.toFixed(2)}</strong></div></div>; }
function StatusBadge({ state }: { state: SalesRow["estado"] }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${state === "pagado" ? "bg-[#e8eee5] text-[#55704d]" : state === "cancelado" ? "bg-[#f8e8e3] text-[#a84f3b]" : "bg-[#f5eddc] text-[#8c6a2c]"}`}>{getOrderStateLabel(state)}</span>; }
