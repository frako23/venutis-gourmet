import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateSaleTotals,
  calculateSubtotal,
  convertUsdToBs,
} from "../../lib/admin/sales-calculations.js";

describe("cálculos de ventas administrativas", () => {
  it("calcula subtotal, descuento porcentual y total con dos decimales", () => {
    const totals = calculateSaleTotals(
      [
        { productoId: 1, cantidad: 2, precioUnitarioUsd: 4.99 },
        { productoId: 2, cantidad: 1, precioUnitarioUsd: 3.01 },
      ],
      { tipo: "porcentaje", valor: 10 },
    );

    assert.equal(totals.subtotalUsd, 12.99);
    assert.equal(totals.descuentoUsd, 1.3);
    assert.equal(totals.totalUsd, 11.69);
  });

  it("convierte un descuento fijo en USD y mantiene el total no negativo", () => {
    const totals = calculateSaleTotals(
      [{ productoId: 1, cantidad: 2, precioUnitarioUsd: 5 }],
      { tipo: "usd", valor: 2.5 },
      36.5,
    );

    assert.equal(totals.subtotalUsd, 10);
    assert.equal(totals.descuentoUsd, 2.5);
    assert.equal(totals.totalUsd, 7.5);
    assert.equal(totals.totalBs, 273.75);
  });

  it("rechaza líneas vacías, cantidades inválidas, precios inválidos y descuentos excesivos", () => {
    assert.throws(() => calculateSubtotal([]), /al menos un producto/);
    assert.throws(
      () => calculateSubtotal([{ productoId: 1, cantidad: 0, precioUnitarioUsd: 2 }]),
      /entero mayor que cero/,
    );
    assert.throws(
      () => calculateSubtotal([{ productoId: 1, cantidad: 1, precioUnitarioUsd: 0 }]),
      /mayor que cero/,
    );
    assert.throws(
      () => calculateSaleTotals([{ productoId: 1, cantidad: 1, precioUnitarioUsd: 2 }], { tipo: "usd", valor: 3 }),
      /superar el subtotal/,
    );
  });

  it("rechaza tasas inválidas y porcentajes mayores a cien", () => {
    assert.throws(() => convertUsdToBs(2, 0), /mayor que cero/);
    assert.throws(
      () => calculateSaleTotals([{ productoId: 1, cantidad: 1, precioUnitarioUsd: 2 }], { tipo: "porcentaje", valor: 101 }),
      /no puede superar 100/,
    );
  });
});
