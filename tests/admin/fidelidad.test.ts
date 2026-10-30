import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calcularPuntos, calcularPuntosGanados, participaEnFidelidad, topeReversion, validarCanjes, type PremioParaCanje } from "../../lib/fidelidad.ts";

describe("participaEnFidelidad", () => {
  it("solo participan los consumidores con ventas no importadas", () => {
    assert.equal(participaEnFidelidad({ tipoCliente: "detal", importada: false }), true);
    assert.equal(participaEnFidelidad({ tipoCliente: "mayorista", importada: false }), false);
    assert.equal(participaEnFidelidad({ tipoCliente: "detal", importada: true }), false);
  });
});

describe("calcularPuntosGanados", () => {
  it("da 1 punto por dólar entero de productos, sin contar el delivery", () => {
    assert.equal(calcularPuntosGanados({ montoSubtotal: 25.8, montoDescuento: 0, montoDescuentoPuntos: 0 }), 25);
  });

  it("descuenta primero los descuentos, incluidos los de puntos", () => {
    assert.equal(calcularPuntosGanados({ montoSubtotal: 30, montoDescuento: 3, montoDescuentoPuntos: 5 }), 22);
  });

  it("no se equivoca por coma flotante (0.1 + 0.2 centavos)", () => {
    assert.equal(calcularPuntosGanados({ montoSubtotal: 0.1 + 0.2 + 9.7, montoDescuento: 0, montoDescuentoPuntos: 0 }), 10);
  });

  it("nunca es negativo", () => {
    assert.equal(calcularPuntosGanados({ montoSubtotal: 5, montoDescuento: 4, montoDescuentoPuntos: 5 }), 0);
  });
});

describe("calcularPuntos", () => {
  it("suma movimientos con signo", () => {
    assert.equal(calcularPuntos([{ puntos: 250 }, { puntos: -200 }, { puntos: 25 }]), 75);
    assert.equal(calcularPuntos([]), 0);
  });
});

describe("topeReversion", () => {
  it("revierte todo si el cliente no ha usado los puntos", () => {
    assert.equal(topeReversion({ ganadosNetos: 25, devueltos: 0, disponibles: 100 }), 25);
  });

  it("revierte solo hasta dejar el saldo en cero si ya gastó parte", () => {
    assert.equal(topeReversion({ ganadosNetos: 25, devueltos: 0, disponibles: 10 }), 10);
    assert.equal(topeReversion({ ganadosNetos: 25, devueltos: 5, disponibles: 10 }), 15);
  });

  it("no revierte nada si no quedan puntos", () => {
    assert.equal(topeReversion({ ganadosNetos: 25, devueltos: 0, disponibles: 0 }), 0);
  });
});

describe("validarCanjes", () => {
  const descuento: PremioParaCanje = { id: 1, nombre: "USD 5 de descuento", tipo: "descuento", costoPuntos: 200, montoDescuentoUsd: 5, productoId: null, cantidad: null, activo: true };
  const producto: PremioParaCanje = { id: 2, nombre: "Salsa gratis", tipo: "producto", costoPuntos: 150, montoDescuentoUsd: null, productoId: 9, cantidad: 2, activo: true };

  it("rechaza un premio inactivo", () => {
    assert.throws(() => validarCanjes({ premios: [{ ...descuento, activo: false }], puntosDisponibles: 500, subtotalUsd: 30, descuentoUsd: 0 }), /no está disponible/);
  });

  it("rechaza si no alcanzan los puntos", () => {
    assert.throws(() => validarCanjes({ premios: [descuento], puntosDisponibles: 199, subtotalUsd: 30, descuentoUsd: 0 }), /No tienes puntos suficientes para USD 5 de descuento\./);
  });

  it("los puntos se acumulan entre varios premios", () => {
    assert.throws(() => validarCanjes({ premios: [descuento, producto], puntosDisponibles: 300, subtotalUsd: 30, descuentoUsd: 0 }), /No tienes puntos suficientes para Salsa gratis\./);
  });

  it("rechaza un descuento mayor que el monto del pedido", () => {
    assert.throws(() => validarCanjes({ premios: [descuento], puntosDisponibles: 500, subtotalUsd: 7, descuentoUsd: 3 }), /El descuento del premio supera el monto del pedido\./);
  });

  it("suma descuentos y costos y devuelve las líneas gratis", () => {
    const resultado = validarCanjes({ premios: [descuento, producto], puntosDisponibles: 400, subtotalUsd: 30, descuentoUsd: 0 });
    assert.deepEqual(resultado, { descuentoPuntosUsd: 5, costoTotal: 350, lineasGratis: [{ productoId: 9, cantidad: 2, premioId: 2 }] });
  });
});
