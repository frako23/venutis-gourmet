import { WebsiteVisitsDashboard } from "@/components/admin/analiticas/websiteVisitsDashboard";
import { WebsiteVisitsFilters } from "@/components/admin/analiticas/websiteVisitsFilters";
import { resolveVisitPeriod } from "@/lib/admin/visit-periods";
import { consultarAnaliticasVisitas } from "@/lib/admin/website-visits";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WebsiteVisitsAnalyticsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const period = resolveVisitPeriod({ preset: first(params.visitasPeriodo), since: first(params.visitasDesde), until: first(params.visitasHasta) });
  const result = await consultarAnaliticasVisitas({ period });
  const retryQuery = new URLSearchParams({
    visitasPeriodo: period.preset,
    ...(period.preset === "custom" ? { visitasDesde: period.since, visitasHasta: period.until } : {}),
  });

  return <main className="admin-page"><div className="admin-content space-y-6"><div><p className="admin-eyebrow">Tráfico del sitio</p><h1 className="admin-title mt-2">Analíticas de visitas</h1><p className="admin-subtitle mt-3">Consulta el tráfico agregado de Vercel sin mezclarlo con las cifras comerciales.</p></div><WebsiteVisitsFilters period={period} /><WebsiteVisitsDashboard result={result} retryHref={`/admin/analytics/visits?${retryQuery.toString()}`} /></div></main>;
}
