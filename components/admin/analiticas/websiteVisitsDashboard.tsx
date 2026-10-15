import type { VisitBreakdownRow, WebsiteVisitsResult } from "@/lib/admin/types";

type BreakdownConfig = {
  title: string;
  description: string;
  rows: VisitBreakdownRow[];
};

export function WebsiteVisitsDashboard({ result, retryHref }: { result: WebsiteVisitsResult; retryHref: string }) {
  const hasSummary = result.summary !== null;
  const showBreakdowns = result.status === "ready" || result.status === "no_data";
  const breakdowns: BreakdownConfig[] = [
    { title: "Páginas principales", description: "Rutas sin parámetros de consulta", rows: result.breakdowns.paths },
    { title: "Referentes", description: "Dominios que derivaron tráfico", rows: result.breakdowns.referrers },
    { title: "Países", description: "Distribución agregada por país", rows: result.breakdowns.countries },
    { title: "Dispositivos", description: "Tipo de dispositivo reportado", rows: result.breakdowns.devices },
  ];

  return <section aria-labelledby="website-visits-title" className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="admin-eyebrow">Tráfico del sitio</p>
        <h2 id="website-visits-title" className="mt-1 text-xl font-black tracking-[-0.03em] text-[#18211d]">Visitas del sitio</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#707970]">Visitantes agregados y páginas vistas reportados por Vercel Web Analytics. No representa una cuenta persistente de personas únicas entre días.</p>
      </div>
      <span className="rounded-full bg-[#e8eee5] px-3 py-1.5 text-xs font-bold text-[#52614d]">Entorno: producción</span>
    </div>

    {hasSummary && <section aria-label="Resumen de visitas" className="grid gap-4 sm:grid-cols-2">
      <MetricCard label="Visitantes agregados" value={result.summary!.visitors} detail="Métrica agregada de Vercel" tone="brass" />
      <MetricCard label="Páginas vistas" value={result.summary!.pageviews} detail="Vistas del intervalo" tone="green" />
    </section>}

    <div className="rounded-lg border border-[#ebe9e0] bg-[#fffefa] px-4 py-3 text-sm text-[#707970]">
      <span className="font-bold text-[#18211d]">{result.period.label}</span><span className="mx-2 text-[#c8a45d]">·</span>{result.message}
    </div>

    {!showBreakdowns && <StatusPanel result={result} retryHref={retryHref} />}

    {showBreakdowns && <div className="grid gap-5 xl:grid-cols-2">
      {breakdowns.map((breakdown) => <BreakdownTable key={breakdown.title} {...breakdown} />)}
    </div>}
  </section>;
}

function MetricCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "brass" | "green" }) {
  return <article className={`admin-panel border-l-4 p-5 ${tone === "brass" ? "border-l-[#c8a45d]" : "border-l-[#66735f]"}`}>
    <p className="admin-eyebrow">{label}</p>
    <p className={`admin-mono mt-3 text-3xl font-black tracking-[-0.07em] ${tone === "brass" ? "text-[#a57c2f]" : "text-[#18211d]"}`}>{value.toLocaleString("es-VE")}</p>
    <p className="mt-1 text-xs text-[#707970]">{detail}</p>
  </article>;
}

function BreakdownTable({ title, description, rows }: BreakdownConfig) {
  return <section className="admin-panel overflow-hidden p-5">
    <div>
      <p className="admin-eyebrow">Distribución</p>
      <h3 className="mt-1 text-lg font-bold text-[#18211d]">{title}</h3>
      <p className="mt-1 text-xs text-[#707970]">{description}</p>
    </div>
    {rows.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-[#dedfd6] p-6 text-center text-sm text-[#707970]">Sin datos para este desglose.</p> : <div className="mt-4 overflow-x-auto">
      <table className="admin-table min-w-full text-left text-sm">
        <caption className="sr-only">{title}</caption>
        <thead><tr><th scope="col">Valor</th><th scope="col">Visitantes</th><th scope="col">Páginas vistas</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${row.label}-${index}`}><th scope="row" className="max-w-[14rem] truncate font-bold" title={row.label}>{row.label}</th><td className="admin-mono">{row.visitors.toLocaleString("es-VE")}</td><td className="admin-mono">{row.pageviews.toLocaleString("es-VE")}</td></tr>)}</tbody>
      </table>
    </div>}
  </section>;
}

function StatusPanel({ result, retryHref }: { result: WebsiteVisitsResult; retryHref: string }) {
  const message = result.status === "not_configured"
    ? "Falta configurar la conexión de Web Analytics en el servidor."
    : result.status === "unauthorized"
      ? "El token configurado no tiene permisos suficientes."
      : result.status === "invalid"
        ? result.period.validationMessage ?? "Revisa las fechas seleccionadas."
        : "La fuente de visitas no respondió a tiempo. Puedes intentarlo de nuevo.";
  return <div role="status" className="rounded-xl border border-[#dedfd6] bg-[#f8f6ef] p-5">
    <p className="font-bold text-[#18211d]">No se pudo mostrar el desglose</p>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#707970]">{message}</p>
    <a href={retryHref} className="admin-button-secondary mt-4 inline-flex">Reintentar</a>
  </div>;
}
