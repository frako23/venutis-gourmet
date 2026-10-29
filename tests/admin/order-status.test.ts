import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canCancelOrder, getNextOrderStates, getOrderStateLabel, getRestockQuantities, normalizeLegacyState, normalizeStateReason, requiresExplicitPaymentConfirmation, requiresPaymentConfirmation } from "../../lib/admin/status.js";

describe("estados operativos", () => {
  it("presenta pendiente como por cobrar y conserva cancelado como histórico", () => {
    assert.equal(getOrderStateLabel("pendiente"), "Por cobrar");
    assert.equal(normalizeLegacyState("pendiente"), "por_cobrar");
    assert.equal(normalizeLegacyState("cancelado"), "cancelado");
  });

  it("ofrece los estados siguientes según el estado actual", () => {
    assert.deepEqual(getNextOrderStates("cancelado"), []);
    assert.deepEqual(getNextOrderStates("pagado"), ["por_cobrar", "en_pedido", "pagado"]);
    for (const state of ["por_cobrar", "en_pedido", "pendiente"] as const) {
      assert.deepEqual(getNextOrderStates(state), ["por_cobrar", "en_pedido", "pagado", "cancelado"]);
    }
  });

  it("solo permite cancelar pedidos no cobrados", () => {
    assert.equal(canCancelOrder("por_cobrar"), true);
    assert.equal(canCancelOrder("en_pedido"), true);
    assert.equal(canCancelOrder("pendiente"), true);
    assert.equal(canCancelOrder("pagado"), false);
    assert.equal(canCancelOrder("cancelado"), false);
  });

  it("normaliza la razón opcional", () => {
    assert.equal(normalizeStateReason("  Cliente desistió  "), "Cliente desistió");
    for (const value of ["   ", "", undefined, null]) assert.equal(normalizeStateReason(value), null);
  });

  it("agrupa las cantidades a devolver por producto", () => {
    assert.deepEqual(
      getRestockQuantities([{ productoId: 1, cantidad: 2 }, { productoId: 2, cantidad: 1 }, { productoId: 1, cantidad: 3 }, { productoId: 3, cantidad: 0 }]),
      [{ productoId: 1, cantidad: 5 }, { productoId: 2, cantidad: 1 }],
    );
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
    assert.equal(requiresExplicitPaymentConfirmation("pendiente", "pagado", false), true);
  });
});
