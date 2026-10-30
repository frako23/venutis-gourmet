import { ClientsFilters } from "@/components/admin/clientes/clientsFilters";
import { ClientsTable } from "@/components/admin/clientes/clientsTable";
import { requireAdmin } from "@/lib/admin/auth";
import Link from "next/link";
import { getClientsPage, parseClientSearchParams } from "@/lib/admin/client-query";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ClientsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAdmin();
  const params = parseClientSearchParams(searchParams ? await searchParams : {});
  const result = await getClientsPage(params);
  const paginationQuery = new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.tipo && params.tipo !== "todos" ? { tipo: params.tipo } : {}) }).toString();

  return <main className="admin-page"><div className="admin-content space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="admin-eyebrow">Directorio protegido</p><h1 className="admin-title mt-2">Clientes</h1><p className="admin-subtitle mt-3">Consulta consumidores y mayoristas, registra nuevos perfiles y corrige varias filas en una sola operación.</p></div><div className="flex flex-wrap items-center gap-3"><Link href="/admin/clients/rewards" className="admin-button-secondary">Premios</Link><div className="admin-panel-flat px-4 py-3 text-sm"><span className="text-[#707970]">Total encontrado</span><strong className="admin-mono ml-2 text-[#18211d]">{result.total}</strong></div></div></div><ClientsFilters q={params.q} tipo={params.tipo} /><ClientsTable result={result} paginationQuery={paginationQuery} /></div></main>;
}
