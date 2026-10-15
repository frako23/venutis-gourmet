import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAddressOwnedByClient,
  validateDeliveryInput,
} from "../../lib/checkout-rules.js";

describe("reglas de delivery del checkout", () => {
  it("acepta una zona configurada con snapshot completo", () => {
    const result = validateDeliveryInput({
      tipodeRetiro: "envio",
      zonaEntrega: "Altamira",
      aliasEntrega: "Casa",
      direccionEntrega: "Av. Principal, edificio 1",
      montoDelivery: 3,
      zonaConfigurada: true,
    });

    assert.equal(result.ok, true);
  });

  it("rechaza dirección incompleta o zona no configurada", () => {
    assert.equal(
      validateDeliveryInput({
        tipodeRetiro: "envio",
        zonaEntrega: "Altamira",
        aliasEntrega: "Casa",
        direccionEntrega: "",
        montoDelivery: 3,
      }).ok,
      false,
    );
    assert.equal(
      validateDeliveryInput({
        tipodeRetiro: "envio",
        zonaEntrega: "Zona desconocida",
        aliasEntrega: "Casa",
        direccionEntrega: "Calle 1",
        montoDelivery: 3,
        zonaConfigurada: false,
      }).ok,
      false,
    );
  });

  it("permite retiro sin dirección y verifica pertenencia", () => {
    assert.equal(
      validateDeliveryInput({ tipodeRetiro: "recogida", montoDelivery: 0 }).ok,
      true,
    );
    assert.equal(isAddressOwnedByClient(12, 12), true);
    assert.equal(isAddressOwnedByClient(12, 13), false);
  });
});
