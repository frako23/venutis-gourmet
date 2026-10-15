import assert from "node:assert/strict";
import test from "node:test";

import { resolveVisitPeriod } from "../../lib/admin/visit-periods.js";
import {
  buildVercelAnalyticsUrl,
  normalizeVisitBreakdown,
} from "../../lib/admin/vercel-web-analytics-core.js";
import { consultarAnaliticasVisitas } from "../../lib/admin/website-visits-core.js";

const config = {
  token: "test-token",
  projectId: "project-test",
};

function period() {
  return resolveVisitPeriod({ preset: "custom", since: "2026-10-01", until: "2026-10-07" });
}

function mockFetch({ pageviews, visitors, rows = true }: { pageviews: number; visitors: number; rows?: boolean }) {
  return async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    if (url.pathname.endsWith("/visits/count")) {
      return new Response(JSON.stringify({ data: { pageviews, visitors } }), { status: 200 });
    }
    return new Response(JSON.stringify({
      data: rows ? [{ requestPath: "/productos", pageviews: 20, visitors: 12 }] : [],
    }), { status: 200 });
  };
}

test("normaliza el conteo y mantiene separados los datos de visitas", async () => {
  const result = await consultarAnaliticasVisitas({ period: period(), config, fetcher: mockFetch({ pageviews: 125, visitors: 80 }) });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.summary, { pageviews: 125, visitors: 80 });
  assert.equal(result.breakdowns.paths[0]?.label, "/productos");
  assert.equal("totalUsd" in result, false);
  assert.equal(result.environment, "production");
});

test("devuelve no_data cuando Vercel responde sin métricas", async () => {
  const result = await consultarAnaliticasVisitas({ period: period(), config, fetcher: mockFetch({ pageviews: 0, visitors: 0, rows: false }) });

  assert.equal(result.status, "no_data");
  assert.deepEqual(result.summary, { pageviews: 0, visitors: 0 });
  assert.deepEqual(result.breakdowns.paths, []);
});

test("no consulta Vercel para un periodo inválido", async () => {
  let calls = 0;
  const invalid = resolveVisitPeriod({ preset: "custom", since: "2026-10-08", until: "2026-10-01" });
  const result = await consultarAnaliticasVisitas({
    period: invalid,
    config,
    fetcher: async () => {
      calls += 1;
      return new Response(JSON.stringify({}), { status: 200 });
    },
  });

  assert.equal(result.status, "invalid");
  assert.equal(calls, 0);
});

test("resuelve presets y fechas personalizadas con un intervalo inclusivo", () => {
  const reference = new Date("2026-10-15T12:00:00.000Z");
  assert.deepEqual(
    resolveVisitPeriod({ preset: "7d", reference }),
    {
      preset: "7d",
      since: "2026-10-09",
      until: "2026-10-15",
      label: "Últimos 7 días · 09 oct. 2026 al 15 oct. 2026",
      isValid: true,
    },
  );
  assert.equal(resolveVisitPeriod({ preset: "30d", reference }).since, "2026-09-16");
  assert.equal(resolveVisitPeriod({ preset: "90d", reference }).since, "2026-07-18");
  assert.equal(resolveVisitPeriod({ preset: "custom", since: "2026-10-01", until: "2026-10-07" }).isValid, true);
  assert.equal(resolveVisitPeriod({ preset: "custom", since: "2026-10-08", until: "2026-10-01" }).isValid, false);
  assert.equal(resolveVisitPeriod({ preset: "custom", since: "2026-02-30", until: "2026-03-01" }).isValid, false);
});

test("consulta las cuatro dimensiones con el mismo periodo, producción y límite", async () => {
  const requests: URL[] = [];
  const result = await consultarAnaliticasVisitas({
    period: period(),
    config,
    fetcher: async (input) => {
      const url = new URL(input.toString());
      requests.push(url);
      if (url.pathname.endsWith("/visits/count")) return new Response(JSON.stringify({ data: { pageviews: 25, visitors: 10 } }));
      const dimension = url.searchParams.get("by")!;
      return new Response(JSON.stringify({ data: [{ [dimension]: dimension === "requestPath" ? "/inicio?utm=private#hash" : dimension, pageviews: 5, visitors: 3 }] }));
    },
  });

  assert.equal(result.status, "ready");
  assert.equal(requests.length, 5);
  assert.deepEqual(new Set(requests.map((request) => request.searchParams.get("by"))), new Set(["requestPath", "referrerHostname", "country", "deviceType", null]));
  for (const request of requests) {
    assert.equal(request.searchParams.get("since"), "2026-10-01");
    assert.equal(request.searchParams.get("until"), "2026-10-07");
    assert.equal(request.searchParams.get("filter"), "environment eq 'production'");
    if (request.searchParams.has("by")) assert.equal(request.searchParams.get("limit"), "10");
  }
  assert.equal(result.breakdowns.paths[0]?.label, "/inicio");
});

test("limita filas, sanitiza valores y no proyecta visitorId", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({ requestPath: `/ruta-${index}?token=privado#fragmento`, pageviews: index, visitors: index }));
  rows.push({ requestPath: "visitorId", pageviews: 4, visitors: 2 });
  const normalized = normalizeVisitBreakdown(rows, "requestPath");

  assert.equal(normalized?.length, 10);
  assert.equal(normalized?.[0]?.label, "/ruta-0");
  assert.equal(normalized?.some((row) => row.label === "visitorId"), false);
  assert.equal(normalizeVisitBreakdown([{ referrerHostname: "", pageviews: 1, visitors: 1 }], "referrerHostname")?.[0]?.label, "Tráfico directo");
  const url = buildVercelAnalyticsUrl({ period: period(), config, dimension: "country" });
  assert.equal(url.searchParams.get("limit"), "10");
});

test("traduce configuración, permisos, validación, indisponibilidad y timeout", async () => {
  const cases = [
    { name: "not_configured", config: null, status: "not_configured" as const },
    { name: "unauthorized", responseStatus: 401, status: "unauthorized" as const },
    { name: "forbidden", responseStatus: 403, status: "unauthorized" as const },
    { name: "unavailable", responseStatus: 503, status: "unavailable" as const },
    { name: "invalid", responseStatus: 400, status: "invalid" as const },
    { name: "missing project", responseStatus: 404, status: "not_configured" as const },
    { name: "removed endpoint", responseStatus: 410, status: "not_configured" as const },
  ];

  for (const current of cases) {
    const result = await consultarAnaliticasVisitas({
      period: period(),
      config: current.config === null ? null : config,
      fetcher: async () => new Response(JSON.stringify({}), { status: current.responseStatus }),
    });
    assert.equal(result.status, current.status, current.name);
    assert.equal(result.summary, null);
    assert.equal(result.message.includes("test-token"), false);
  }

  const timeout = await consultarAnaliticasVisitas({
    period: period(),
    config,
    fetcher: async () => {
      const error = new Error("AbortError");
      error.name = "AbortError";
      throw error;
    },
  });
  assert.equal(timeout.status, "unavailable");

  const malformed = await consultarAnaliticasVisitas({
    period: period(),
    config,
    fetcher: async (input) => new Response(JSON.stringify({ data: new URL(input.toString()).pathname.endsWith("/count") ? { pageviews: "many", visitors: 1 } : [] }), { status: 200 }),
  });
  assert.equal(malformed.status, "invalid");
});
