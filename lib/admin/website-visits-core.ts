import type { VisitPeriod, WebsiteVisitsResult, WebsiteVisitsStatus } from "./types.js";
import {
  fetchVercelVisitAggregate,
  fetchVercelVisitCount,
  readVercelAnalyticsConfig,
  type VercelAnalyticsConfig,
  type VercelAnalyticsDimension,
  type VercelAnalyticsError,
} from "./vercel-web-analytics-core.ts";

const BREAKDOWNS = [
  { key: "paths", dimension: "requestPath" },
  { key: "referrers", dimension: "referrerHostname" },
  { key: "countries", dimension: "country" },
  { key: "devices", dimension: "deviceType" },
] as const satisfies ReadonlyArray<{ key: keyof WebsiteVisitsResult["breakdowns"]; dimension: VercelAnalyticsDimension }>;

type WebsiteVisitsInput = {
  period: VisitPeriod;
  config?: VercelAnalyticsConfig | null;
  fetcher?: typeof fetch;
};

function emptyBreakdowns(): WebsiteVisitsResult["breakdowns"] {
  return { paths: [], referrers: [], countries: [], devices: [] };
}

function messageForStatus(status: WebsiteVisitsStatus) {
  switch (status) {
    case "ready":
      return "Visitas agregadas de Vercel para producción.";
    case "no_data":
      return "No hay datos de visitas para el intervalo consultado.";
    case "not_configured":
      return "Configura Web Analytics de Vercel para consultar las visitas en producción.";
    case "unauthorized":
      return "La conexión de analítica no tiene autorización suficiente.";
    case "invalid":
      return "No se pudo validar el periodo o la consulta de visitas.";
    case "unavailable":
      return "No se pudieron actualizar las visitas; puedes reintentar.";
  }
}

function resultForStatus(period: VisitPeriod, status: WebsiteVisitsStatus, queriedAt = new Date().toISOString()): WebsiteVisitsResult {
  return {
    period,
    environment: "production",
    queriedAt,
    status,
    summary: null,
    breakdowns: emptyBreakdowns(),
    message: messageForStatus(status),
  };
}

function errorStatus(error: unknown): WebsiteVisitsStatus {
  if (error && typeof error === "object" && "analyticsStatus" in error) {
    const status = (error as VercelAnalyticsError).analyticsStatus;
    if (status === "invalid" || status === "unauthorized" || status === "not_configured" || status === "unavailable") return status;
  }
  return "unavailable";
}

export async function consultarAnaliticasVisitas(input: WebsiteVisitsInput): Promise<WebsiteVisitsResult> {
  const queriedAt = new Date().toISOString();
  if (!input.period.isValid) return resultForStatus(input.period, "invalid", queriedAt);

  const config = "config" in input ? input.config : readVercelAnalyticsConfig();
  if (!config) return resultForStatus(input.period, "not_configured", queriedAt);

  try {
    const [summary, ...breakdownRows] = await Promise.all([
      fetchVercelVisitCount({ period: input.period, config, fetcher: input.fetcher }),
      ...BREAKDOWNS.map(({ dimension }) => fetchVercelVisitAggregate({ period: input.period, config, dimension, fetcher: input.fetcher })),
    ]);
    const breakdowns = Object.fromEntries(BREAKDOWNS.map(({ key }, index) => [key, breakdownRows[index]])) as WebsiteVisitsResult["breakdowns"];
    const status: WebsiteVisitsStatus = summary.pageviews === 0 && summary.visitors === 0 ? "no_data" : "ready";
    return {
      period: input.period,
      environment: "production",
      queriedAt,
      status,
      summary,
      breakdowns,
      message: messageForStatus(status),
    };
  } catch (error) {
    const status = errorStatus(error);
    return resultForStatus(input.period, status, queriedAt);
  }
}

export { messageForStatus };
