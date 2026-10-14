import { AnalyticsDashboard } from "@/components/admin/analiticas/analyticsDashboard";
import { consultarAnaliticas } from "@/lib/admin/analytics";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function defaultFrom() { const date = new Date(); date.setDate(date.getDate() - 29); return date.toISOString().slice(0, 10); }
function defaultTo() { return new Date().toISOString().slice(0, 10); }

export default async function AnalyticsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const desde = first(params.desde) ?? defaultFrom();
  const hasta = first(params.hasta) ?? defaultTo();
  const granularidad = first(params.granularidad) === "mes" ? "mes" : "semana";
  const productoId = Number(first(params.productoId) || 0) || undefined;
  const incluirPredictor = first(params.predictor) !== "0";
  const [products, result] = await Promise.all([prisma.producto.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }), consultarAnaliticas({ desde: new Date(`${desde}T00:00:00`), hasta: new Date(`${hasta}T23:59:59.999`), granularidad, productoId, incluirPredictor })]);
  return <main className="admin-page"><div className="admin-content space-y-6"><div><p className="admin-eyebrow">Rendimiento comercial</p><h1 className="admin-title mt-2">Analíticas y predictor</h1><p className="admin-subtitle mt-3">Los cálculos excluyen ventas canceladas y usan USD como moneda canónica.</p></div><form method="get" className="admin-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"><label className="admin-label">Desde<input name="desde" type="date" defaultValue={desde} className="admin-field" /></label><label className="admin-label">Hasta<input name="hasta" type="date" defaultValue={hasta} className="admin-field" /></label><label className="admin-label">Granularidad<select name="granularidad" defaultValue={granularidad} className="admin-field"><option value="semana">Semana</option><option value="mes">Mes</option></select></label><label className="admin-label">Producto<select name="productoId" defaultValue={productoId ?? ""} className="admin-field"><option value="">Todos</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}</select></label><label className="flex items-center gap-2 self-end text-sm font-semibold text-[#18211d]"><input name="predictor" value="1" type="checkbox" defaultChecked={incluirPredictor} className="size-4 accent-[#66735f]" /> Incluir predictor</label><div className="flex items-end sm:col-span-2 lg:col-span-5"><button type="submit" className="admin-button-primary admin-button-brass">Actualizar analíticas</button></div></form><AnalyticsDashboard result={result} /></div></main>;
}
