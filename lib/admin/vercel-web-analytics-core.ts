import type { VisitBreakdownRow, VisitMetric, WebsiteVisitsStatus } from "./types.js";

const VERCEL_ANALYTICS_ENDPOINT = "https://api.vercel.com/v1/query/web-analytics";
const REQUEST_TIMEOUT_MS = 8_000;

export type VercelAnalyticsDimension = "requestPath" | "referrerHostname" | "country" | "deviceType";

export type VercelAnalyticsConfig = {
  token: string;
  projectId: string;
  teamId?: string;
  teamSlug?: string;
};

export type VercelAnalyticsError = Error & {
  analyticsStatus: WebsiteVisitsStatus;
};

type FetchInput = {
  period: { since: string; until: string };
  config: VercelAnalyticsConfig;
  dimension?: VercelAnalyticsDimension;
  fetcher?: typeof fetch;
};

type RawResponse = {
  data?: unknown;
};

function analyticsError(status: WebsiteVisitsStatus, message = "Vercel Web Analytics no está disponible.") {
  const error = new Error(message) as VercelAnalyticsError;
  error.analyticsStatus = status;
  return error;
}

function configuredValue(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function readVercelAnalyticsConfig(): VercelAnalyticsConfig | null {
  const token = configuredValue("VERCEL_ANALYTICS_TOKEN");
  const projectId = configuredValue("VERCEL_ANALYTICS_PROJECT_ID");
  const teamId = configuredValue("VERCEL_ANALYTICS_TEAM_ID");
  const teamSlug = configuredValue("VERCEL_ANALYTICS_TEAM_SLUG");

  if (!token || !projectId || (teamId && teamSlug)) return null;
  return { token, projectId, ...(teamId ? { teamId } : {}), ...(teamSlug ? { teamSlug } : {}) };
}

export function buildVercelAnalyticsUrl({ period, config, dimension }: Omit<FetchInput, "fetcher">) {
  const path = dimension ? "/visits/aggregate" : "/visits/count";
  const url = new URL(`${VERCEL_ANALYTICS_ENDPOINT}${path}`);
  url.searchParams.set("projectId", config.projectId);
  url.searchParams.set("since", period.since);
  url.searchParams.set("until", period.until);
  url.searchParams.set("filter", "environment eq 'production'");
  if (dimension) {
    url.searchParams.set("by", dimension);
    url.searchParams.set("limit", "10");
  }
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  if (config.teamSlug) url.searchParams.set("slug", config.teamSlug);
  return url;
}

async function requestVercelAnalytics(input: FetchInput): Promise<RawResponse> {
  const fetcher = input.fetcher ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(buildVercelAnalyticsUrl(input), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.config.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 400) throw analyticsError("invalid");
      if (response.status === 401 || response.status === 403) throw analyticsError("unauthorized");
      if (response.status === 404 || response.status === 410) throw analyticsError("not_configured");
      throw analyticsError("unavailable");
    }
    return (await response.json()) as RawResponse;
  } catch (error) {
    if (error instanceof Error && "analyticsStatus" in error) throw error;
    throw analyticsError("unavailable", error instanceof Error && error.name === "AbortError" ? "La consulta de Vercel agotó el tiempo de espera." : undefined);
  } finally {
    clearTimeout(timeout);
  }
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export function normalizeVisitMetric(data: unknown): VisitMetric | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const pageviews = nonNegativeInteger(record.pageviews);
  const visitors = nonNegativeInteger(record.visitors);
  return pageviews === null || visitors === null ? null : { pageviews, visitors };
}

function safeLabel(value: unknown, dimension: VercelAnalyticsDimension): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return dimension === "referrerHostname" ? "Tráfico directo" : null;
  if (trimmed.length > 200 || /[\r\n]/.test(trimmed)) return null;
  if (dimension === "requestPath") {
    const withoutHash = trimmed.split("#", 1)[0];
    const withoutQuery = withoutHash.split("?", 1)[0];
    if (!withoutQuery.startsWith("/")) return null;
    return withoutQuery;
  }
  return trimmed;
}

function rowValue(row: Record<string, unknown>, dimension: VercelAnalyticsDimension) {
  return row[dimension] ?? row.value ?? row.label ?? row.name;
}

export function normalizeVisitBreakdown(data: unknown, dimension: VercelAnalyticsDimension): VisitBreakdownRow[] | null {
  if (!Array.isArray(data)) return null;
  const rows: VisitBreakdownRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const pageviews = nonNegativeInteger(row.pageviews);
    const visitors = nonNegativeInteger(row.visitors);
    if (pageviews === null || visitors === null) continue;
    const isOthers = row.isOthers === true || row.is_other === true || rowValue(row, dimension) === "Others";
    const label = isOthers ? "Others" : safeLabel(rowValue(row, dimension), dimension);
    if (!label && !isOthers) continue;
    rows.push({ label: label ?? "Others", pageviews, visitors, isOthers });
  }
  return rows.slice(0, 10);
}

export async function fetchVercelVisitCount(input: Omit<FetchInput, "dimension">) {
  const response = await requestVercelAnalytics(input);
  const metric = normalizeVisitMetric(response.data);
  if (!metric) throw analyticsError("invalid");
  return metric;
}

export async function fetchVercelVisitAggregate(input: FetchInput & { dimension: VercelAnalyticsDimension }) {
  const response = await requestVercelAnalytics(input);
  const rows = normalizeVisitBreakdown(response.data, input.dimension);
  if (!rows) throw analyticsError("invalid");
  return rows;
}

export { analyticsError, REQUEST_TIMEOUT_MS };
