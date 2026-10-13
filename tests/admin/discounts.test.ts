import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateSaleTotals } from "../../lib/admin/sales-calculations.js";

const lines = [{ productoId: 1, cantidad: 2, precioUnitarioUsd: 10 }];

describe("descuentos", () => {
  it("calcula porcentaje y su equivalente en USD/Bs", () => {
    const result = calculateSaleTotals(lines, { tipo: "porcentaje", valor: 15 }, 40);
    assert.deepEqual({ subtotal: result.subtotalUsd, descuento: result.descuentoUsd, total: result.totalUsd, totalBs: result.totalBs }, { subtotal: 20, descuento: 3, total: 17, totalBs: 680 });
  });

  it("acepta descuento fijo en USD y descuento cero", () => {
    assert.equal(calculateSaleTotals(lines, { tipo: "usd", valor: 4 }).totalUsd, 16);
    assert.equal(calculateSaleTotals(lines, null).totalUsd, 20);
  });

  it("rechaza negativos y descuentos por encima del subtotal", () => {
    assert.throws(() => calculateSaleTotals(lines, { tipo: "usd", valor: -1 }), /no negativo/);
    assert.throws(() => calculateSaleTotals(lines, { tipo: "usd", valor: 20.01 }), /superar el subtotal/);
  });
});
