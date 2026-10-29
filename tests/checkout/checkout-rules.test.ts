import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPriceTypeForContext } from "../../lib/catalog-context.js";
import {
  calculateCheckoutTotals,
  getInitialOrderState,
  isSupportedPaymentMethod,
  validateDeliveryInput,
  validatePaymentInput,
} from "../../lib/checkout-rules.js";

describe("reglas de checkout directo", () => {
  it("asigna el tipo de precio según el contexto de compra", () => {
    assert.equal(getPriceTypeForContext("consumidor"), "detal");
    assert.equal(getPriceTypeForContext("mayorista"), "mayor");
  });

  it("calcula subtotal, delivery y total con redondeo monetario", () => {
    assert.deepEqual(
      calculateCheckoutTotals(
        [
          { precio: 3.5, cantidad: 2 },
          { precio: 1.25, cantidad: 1 },
        ],
        4,
      ),
      { subtotalUsd: 8.25, montoDelivery: 4, montoTotal: 12.25 },
    );
  });

  it("exige snapshot para envío y deja retiro sin delivery", () => {
    assert.equal(
      validateDeliveryInput({
        tipodeRetiro: "envio",
        zonaEntrega: "Chacao",
        aliasEntrega: "Casa",
        direccionEntrega: "Av. Principal, casa 4",
        montoDelivery: 3,
      }).ok,
      true,
    );
    assert.equal(
      validateDeliveryInput({ tipodeRetiro: "envio", montoDelivery: 0 }).ok,
      false,
    );
    assert.equal(
      validateDeliveryInput({ tipodeRetiro: "recogida", montoDelivery: 0 }).ok,
      true,
    );
    assert.equal(
      validateDeliveryInput({ tipodeRetiro: "recogida", montoDelivery: 3 }).ok,
      false,
    );
  });

  it("distingue métodos habilitados y estado inicial de cobro", () => {
    assert.equal(isSupportedPaymentMethod("PagoMovil"), true);
    assert.equal(isSupportedPaymentMethod("TransferenciaUsd"), false);
    assert.equal(getInitialOrderState("EfectivoUsd"), "por_cobrar");
    assert.equal(getInitialOrderState("Zelle"), "en_pedido");
  });

  it("valida el pago contra el total y la tasa vigente", () => {
    assert.equal(
      validatePaymentInput({
        metodoPago: "PagoMovil",
        montoUsd: 12.25,
        montoBs: 429.88,
        tasaCambio: 35.092,
        referencia: "123456",
        fechaPago: new Date("2026-10-15"),
      }, 12.25).ok,
      true,
    );
    assert.equal(
      validatePaymentInput({
        metodoPago: "Zelle",
        montoUsd: 12,
        montoBs: 420.0,
        tasaCambio: 35,
        referencia: "",
        fechaPago: new Date("2026-10-15"),
      }, 12.25).ok,
      false,
    );
    assert.equal(
      validatePaymentInput({
        metodoPago: "EfectivoUsd",
        montoUsd: 12.25,
        montoBs: 429.88,
        tasaCambio: 35.092,
        referencia: "",
        fechaPago: null,
      }, 12.25).ok,
      true,
    );
  });
});
