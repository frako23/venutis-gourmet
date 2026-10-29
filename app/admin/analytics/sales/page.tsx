import { ORDEN_CATALOGO } from "@/lib/catalog-order";
import { AnalyticsDashboard } from "@/components/admin/analiticas/analyticsDashboard";
import { AnalyticsFilters } from "@/components/admin/analiticas/analyticsFilters";
import { consultarAnaliticas } from "@/lib/admin/analytics";
import { resolveAnalyticsPeriod } from "@/lib/admin/periods";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SalesAnalyticsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const periodo = resolveAnalyticsPeriod({ semana: first(params.semana), mes: first(params.mes) });
  const productoId = Number(first(params.productoId) || 0) || undefined;
  const incluirPredictor = first(params.predictor) !== "0";
  const [products, result] = await Promise.all([
    prisma.producto.findMany({ orderBy: ORDEN_CATALOGO, select: { id: true, nombre: true } }),
    consultarAnaliticas({ periodo, productoId, incluirPredictor }),
  ]);

  return <main className="admin-page"><div className="admin-content space-y-6"><div><p className="admin-eyebrow">Rendimiento comercial</p><h1 className="admin-title mt-2">Analíticas de ventas</h1><p className="admin-subtitle mt-3">Los cálculos excluyen ventas canceladas y usan USD como moneda canónica.</p></div><AnalyticsFilters products={products} semanaInicial={periodo.tipo === "semana" ? periodo.valor : ""} mesInicial={periodo.tipo === "mes" ? periodo.valor : ""} productoId={productoId} incluirPredictor={incluirPredictor} /><AnalyticsDashboard result={result} /></div></main>;
}
