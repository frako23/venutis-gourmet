import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAnalyticsPeriod } from "../../lib/admin/periods.js";

const date = (value: string) => new Date(`${value}T12:00:00`);
const localDateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

describe("periodos de analíticas", () => {
  it("resuelve una semana ISO por número y cubre de lunes a domingo", () => {
    const result = resolveAnalyticsPeriod({ semana: "2026-W42", reference: date("2026-10-14") });

    assert.equal(result.tipo, "semana");
    assert.equal(result.valor, "2026-W42");
    assert.equal(localDateKey(result.desde), "2026-10-12");
    assert.equal(localDateKey(result.hasta), "2026-10-18");
    assert.match(result.etiqueta, /Semana 42/);
  });

  it("resuelve un mes calendario completo", () => {
    const result = resolveAnalyticsPeriod({ mes: "2026-02", reference: date("2026-10-14") });

    assert.equal(result.tipo, "mes");
    assert.equal(result.valor, "2026-02");
    assert.equal(localDateKey(result.desde), "2026-02-01");
    assert.equal(localDateKey(result.hasta), "2026-02-28");
    assert.match(result.etiqueta, /febrero de 2026/);
  });

  it("ignora periodos inválidos y conserva una semana válida por defecto", () => {
    const result = resolveAnalyticsPeriod({ semana: "2026-W99", reference: date("2026-10-14") });

    assert.equal(result.tipo, "semana");
    assert.equal(result.valor, "2026-W42");
  });
});
