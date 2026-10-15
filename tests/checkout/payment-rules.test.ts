import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getInitialOrderState,
  validatePaymentInput,
} from "../../lib/checkout-rules.js";

const base = {
  montoUsd: 13,
  montoBs: 455,
  tasaCambio: 35,
  fechaPago: new Date("2026-10-15T12:00:00.000Z"),
};

describe("reglas de pago del checkout", () => {
  it("valida los métodos digitales con total incluido delivery", () => {
    for (const metodoPago of ["PagoMovil", "Zelle", "TransferenciaBs"]) {
      const result = validatePaymentInput(
        { ...base, metodoPago, referencia: "REF-123" },
        13,
      );
      assert.equal(result.ok, true, metodoPago);
      assert.equal(getInitialOrderState(metodoPago), "en_pedido");
    }
  });

  it("permite efectivo sin referencia y lo deja por cobrar", () => {
    const result = validatePaymentInput(
      { ...base, metodoPago: "EfectivoUsd", referencia: null, fechaPago: null },
      13,
    );
    assert.equal(result.ok, true);
    assert.equal(getInitialOrderState("EfectivoUsd"), "por_cobrar");
  });

  it("rechaza referencia digital faltante y montos que no incluyen delivery", () => {
    assert.equal(
      validatePaymentInput({ ...base, metodoPago: "Zelle", referencia: "" }, 13).ok,
      false,
    );
    assert.equal(
      validatePaymentInput({ ...base, metodoPago: "PagoMovil", referencia: "REF", montoUsd: 10 }, 13).ok,
      false,
    );
  });
});
