import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatQuantity, isValidQuantity, roundQuantity, unidadesDisponibles } from "../../lib/inventory.js";

describe("cantidades e inventario", () => {
  it("valida cantidades positivas con máximo 2 decimales", () => {
    for (const value of [16.5, 0.01, 3, 0.3]) assert.equal(isValidQuantity(value), true, String(value));
    for (const value of [0, -1, 1.005, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(isValidQuantity(value), false, String(value));
  });

  it("redondea sin restos binarios", () => {
    assert.equal(roundQuantity(0.1 + 0.2), 0.3);
    assert.equal(roundQuantity(3.3 - 3), 0.3);
  });

  it("expone unidades enteras disponibles", () => {
    assert.equal(unidadesDisponibles(12.5), 12);
    assert.equal(unidadesDisponibles(0.5), 0);
    assert.equal(unidadesDisponibles(-0.2), 0);
    assert.equal(unidadesDisponibles(7), 7);
  });

  it("formatea cantidades en es-VE", () => {
    assert.equal(formatQuantity(16.5), "16,5");
    assert.equal(formatQuantity(3), "3");
  });
});
