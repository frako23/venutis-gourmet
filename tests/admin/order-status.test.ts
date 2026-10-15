import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canSelectOrderState, getOrderStateLabel, normalizeLegacyState, requiresExplicitPaymentConfirmation, requiresPaymentConfirmation } from "../../lib/admin/status.js";

describe("estados operativos", () => {
  it("presenta pendiente como por cobrar y conserva cancelado como histórico", () => {
    assert.equal(getOrderStateLabel("pendiente"), "Por cobrar");
    assert.equal(normalizeLegacyState("pendiente"), "por_cobrar");
    assert.equal(normalizeLegacyState("cancelado"), "cancelado");
  });

  it("solo ofrece estados activos", () => {
    assert.equal(canSelectOrderState("por_cobrar"), true);
    assert.equal(canSelectOrderState("en_pedido"), true);
    assert.equal(canSelectOrderState("pagado"), true);
    assert.equal(canSelectOrderState("pendiente"), false);
    assert.equal(canSelectOrderState("cancelado"), false);
  });

  it("exige confirmación cuando el pago acumulado no cubre el total", () => {
    assert.equal(requiresPaymentConfirmation(20, 0, false, false), true);
    assert.equal(requiresPaymentConfirmation(20, 20, false, false), false);
    assert.equal(requiresPaymentConfirmation(20, 0, true, false), false);
  });

  it("exige confirmación explícita para cerrar un pedido directo", () => {
    assert.equal(requiresExplicitPaymentConfirmation("en_pedido", "pagado", false), true);
    assert.equal(requiresExplicitPaymentConfirmation("por_cobrar", "pagado", true), false);
    assert.equal(requiresExplicitPaymentConfirmation("en_pedido", "en_pedido", false), false);
  });
});
