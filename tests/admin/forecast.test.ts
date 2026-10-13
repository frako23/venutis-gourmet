import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateMovingAverageForecast } from "../../lib/admin/forecast.js";

const date = (value: string) => new Date(`${value}T00:00:00`);

describe("predictor de ventas", () => {
  it("calcula la media móvil de cuatro semanas", () => {
    const result = calculateMovingAverageForecast([
      { inicio: date("2026-01-05"), fin: date("2026-01-12"), totalUsd: 10 },
      { inicio: date("2026-01-12"), fin: date("2026-01-19"), totalUsd: 20 },
      { inicio: date("2026-01-19"), fin: date("2026-01-26"), totalUsd: 30 },
      { inicio: date("2026-01-26"), fin: date("2026-02-02"), totalUsd: 40 },
    ], "semana");
    assert.equal(result.estado, "disponible");
    assert.equal(result.valorUsd, 25);
    assert.match(result.historialUsado, /2026/);
  });

  it("devuelve datos insuficientes sin inventar una estimación", () => {
    const result = calculateMovingAverageForecast([{ inicio: date("2026-01-01"), fin: date("2026-02-01"), totalUsd: 100 }], "mes");
    assert.equal(result.estado, "datos_insuficientes");
    assert.equal(result.valorUsd, 0);
  });
});
