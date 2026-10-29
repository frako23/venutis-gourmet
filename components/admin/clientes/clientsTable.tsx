"use client";

import { BulkClientsEditor } from "@/components/admin/clientes/bulkClientsEditor";
import { ClientCreateModal } from "@/components/admin/clientes/clientCreateModal";
import type { ClientRow, PaginatedRows } from "@/lib/admin/types";
import { formatRif } from "@/lib/client-rules";
import { ChevronLeft, ChevronRight, Mail, MapPin, Phone, Plus, Table2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ClientsTable({ result, paginationQuery }: { result: PaginatedRows<ClientRow>; paginationQuery: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);

  if (bulkEditing) {
    return <BulkClientsEditor rows={result.rows} onClose={() => setBulkEditing(false)} />;
  }

  return <>
    <section className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe9e0] bg-[#fffdf8] p-4 md:p-5">
        <div><p className="admin-eyebrow">Directorio operativo</p><h2 className="mt-1 text-lg font-bold text-[#18211d]">Clientes registrados</h2><p className="mt-1 text-sm text-[#707970]">{result.total} cliente(s) disponibles · página {result.page} de {result.totalPages}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setBulkEditing(true)} disabled={result.rows.length === 0} className="admin-button-secondary"><Table2 size={16} /> Editor masivo</button><button type="button" onClick={() => setCreateOpen(true)} className="admin-button-primary admin-button-brass"><Plus size={16} /> Nuevo cliente</button></div>
      </div>

      {result.rows.length === 0 ? <EmptyState onCreate={() => setCreateOpen(true)} /> : <div className="overflow-x-auto"><table className="admin-table min-w-[1120px] text-left text-sm"><thead><tr><th>Cliente</th><th>Tipo</th><th>RIF</th><th>Contacto</th><th>Direcciones</th><th>Actividad</th></tr></thead><tbody>{result.rows.map((row) => <ClientTableRow key={row.id} row={row} />)}</tbody></table></div>}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe9e0] bg-[#f8f6ef] px-4 py-3 text-xs text-[#707970] md:px-5"><span>Mostrando {result.rows.length} de {result.total} cliente(s)</span><div className="flex items-center gap-2"><PaginationLink href={pageHref(result.page - 1, paginationQuery)} disabled={result.page <= 1} label="Página anterior"><ChevronLeft size={15} /></PaginationLink><span className="admin-mono rounded-lg border border-[#dedfd6] bg-[#fffdf8] px-3 py-2">{result.page}/{result.totalPages}</span><PaginationLink href={pageHref(result.page + 1, paginationQuery)} disabled={result.page >= result.totalPages} label="Página siguiente"><ChevronRight size={15} /></PaginationLink></div></footer>
    </section>
    {createOpen && <ClientCreateModal onClose={() => setCreateOpen(false)} />}
  </>;
}
function ClientTableRow({ row }: { row: ClientRow }) {
  return <tr><td><div className="min-w-56"><strong className="text-[#18211d]">{row.nombre} {row.apellido}</strong><span className="admin-mono mt-1 block text-xs text-[#8f988f]">Cliente #{row.id}</span></div></td><td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.tipoCliente === "mayorista" ? "bg-[#f5eddc] text-[#8c6a2c]" : "bg-[#e8eee5] text-[#55704d]"}`}>{row.tipoLabel}</span></td><td><span className="admin-mono text-xs font-semibold text-[#18211d]">{formatRif(row.rif)}</span></td><td><div className="space-y-1.5 text-xs text-[#707970]"><span className="flex items-center gap-2"><Phone size={14} aria-hidden="true" />{row.celular ?? <span className="text-[#8f988f]">Sin teléfono</span>}</span>{row.email && <span className="flex items-center gap-2 break-all"><Mail size={14} aria-hidden="true" />{row.email}</span>}</div></td><td><div className="min-w-56 space-y-2">{row.direcciones.length > 0 ? row.direcciones.map((address) => <details key={address.id} className="rounded-lg border border-[#ebe9e0] bg-[#fffaf0] px-2.5 py-2"><summary className="cursor-pointer list-none text-xs font-bold text-[#66735f]">{address.tipo} · {address.urbanizacion}</summary><p className="mt-1 flex gap-2 text-xs leading-relaxed text-[#707970]"><MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{address.direccion}</p></details>) : <span className="text-xs text-[#8f988f]">Sin direcciones</span>}</div></td><td><div className="min-w-36 space-y-1 text-xs text-[#707970]"><p><strong className="text-[#18211d]">{row.cantidadTransacciones}</strong> transacción(es)</p><p>Última compra: {row.ultimaCompra ? new Date(row.ultimaCompra).toLocaleDateString("es-VE") : "Sin compras"}</p><p>Actualizado: {new Date(row.updatedAt).toLocaleDateString("es-VE")}</p></div></td></tr>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return <div className="grid min-h-64 place-items-center px-6 py-12 text-center"><div><p className="text-lg font-bold text-[#18211d]">No encontramos clientes</p><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#707970]">Prueba con otro nombre, RIF o tipo. También puedes registrar un cliente nuevo desde aquí.</p><button type="button" onClick={onCreate} className="admin-button-primary admin-button-brass mt-5"><Plus size={16} /> Nuevo cliente</button></div></div>;
}

function pageHref(page: number, paginationQuery: string) {
  const params = new URLSearchParams(paginationQuery);
  params.set("page", String(Math.max(1, page)));
  return `/admin/clients?${params.toString()}`;
}

function PaginationLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  return disabled ? <span aria-disabled="true" className="grid size-9 place-items-center rounded-lg border border-[#dedfd6] text-[#c0c4bd]">{children}</span> : <Link href={href} aria-label={label} className="grid size-9 place-items-center rounded-lg border border-[#dedfd6] bg-[#fffdf8] text-[#66735f] hover:border-[#c8a45d]">{children}</Link>;
}
