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
  return <main className="min-h-full bg-slate-50 p-4 dark:bg-background-dark md:p-8"><div className="mx-auto max-w-7xl space-y-5"><div><p className="text-sm font-semibold text-gold">Rendimiento comercial</p><h1 className="mt-1 text-3xl font-black">Analíticas y predictor</h1><p className="mt-2 text-sm text-slate-500">Los cálculos excluyen ventas canceladas y usan USD como moneda canónica.</p></div><form method="get" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs font-bold uppercase text-slate-500">Desde<input name="desde" type="date" defaultValue={desde} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" /></label><label className="text-xs font-bold uppercase text-slate-500">Hasta<input name="hasta" type="date" defaultValue={hasta} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" /></label><label className="text-xs font-bold uppercase text-slate-500">Granularidad<select name="granularidad" defaultValue={granularidad} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"><option value="semana">Semana</option><option value="mes">Mes</option></select></label><label className="text-xs font-bold uppercase text-slate-500">Producto<select name="productoId" defaultValue={productoId ?? ""} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"><option value="">Todos</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}</select></label><label className="flex items-center gap-2 self-end text-sm"><input name="predictor" value="1" type="checkbox" defaultChecked={incluirPredictor} /> Incluir predictor</label><div className="sm:col-span-2 lg:col-span-5"><button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-gold dark:text-charcoal">Actualizar analíticas</button></div></form><AnalyticsDashboard result={result} /></div></main>;
}
