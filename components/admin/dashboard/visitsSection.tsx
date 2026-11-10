import type { VisitPeriod, VisitasDiariasResult } from "@/lib/admin/types";
import { ChartCard } from "./chartCard";
import { VisitsChart } from "./visitsChart";

const ENLACE = { href: "/admin/analytics/visits?visitasPeriodo=30d", texto: "Ver visitas" };
const dia = (fecha: string) => new Intl.DateTimeFormat("es-VE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${fecha}T00:00:00Z`));

export function VisitsSectionFallback({ periodo }: { periodo: VisitPeriod }) {
  return (
    <ChartCard eyebrow="Tráfico de la tienda" titulo="Visitas de la tienda" periodo={periodo.label} enlace={ENLACE}>
      <div className="grid h-[200px] animate-pulse place-items-center rounded-lg bg-[#f4f1e8] text-sm text-[#707970]">Consultando visitas…</div>
    </ChartCard>
  );
}

const MENSAJES: Record<string, string> = {
  no_data: "No hubo visitas en este período.",
  not_configured: "Falta configurar la conexión de visitas en el servidor.",
  unauthorized: "La conexión de visitas no tiene permisos suficientes.",
  unavailable: "La fuente de visitas no respondió. Puedes intentarlo de nuevo.",
  invalid: "No se pudo consultar el período de visitas.",
};

export async function VisitsSection({ visitas }: { visitas: Promise<VisitasDiariasResult> }) {
  const r = await visitas;
  const cabecera = { eyebrow: "Tráfico de la tienda", titulo: "Visitas de la tienda", periodo: r.period.label, enlace: ENLACE };

  if (r.status !== "ready" || !r.summary) {
    const reintentar = r.status === "unavailable" || r.status === "invalid";
    return (
      <ChartCard {...cabecera}>
        <div role="status" className="rounded-xl border border-[#dedfd6] bg-[#f8f6ef] p-5">
          <p className="text-sm text-[#18211d]">{MENSAJES[r.status] ?? MENSAJES.unavailable}</p>
          {reintentar && <a href="/admin" className="admin-button-secondary mt-4 inline-flex">Reintentar</a>}
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      {...cabecera}
      cifras={
        <table className="admin-table min-w-full text-left text-sm">
          <caption className="sr-only">Visitas por día</caption>
          <thead><tr><th scope="col">Día</th><th scope="col">Visitantes</th><th scope="col">Páginas vistas</th></tr></thead>
          <tbody>{r.serie.map((d) => <tr key={d.fecha}><th scope="row">{dia(d.fecha)}</th><td className="admin-mono">{d.visitors.toLocaleString("es-VE")}</td><td className="admin-mono">{d.pageviews.toLocaleString("es-VE")}</td></tr>)}</tbody>
        </table>
      }
    >
      <div className="mb-4 flex flex-wrap gap-8">
        <div><p className="admin-eyebrow">Visitantes agregados</p><p className="admin-mono mt-1 text-2xl font-black text-[#18211d]">{r.summary.visitors.toLocaleString("es-VE")}</p></div>
        <div><p className="admin-eyebrow">Páginas vistas</p><p className="admin-mono mt-1 text-2xl font-black text-[#18211d]">{r.summary.pageviews.toLocaleString("es-VE")}</p></div>
      </div>
      <VisitsChart serie={r.serie} />
    </ChartCard>
  );
}
