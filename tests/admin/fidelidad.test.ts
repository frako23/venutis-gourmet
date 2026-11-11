import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calcularPuntos, costoSugeridoPremio, describirRecompensa, estadoPremio, filtrarCanjesValidos, premioMasCercano, calcularPuntosGanados, participaEnFidelidad, topeReversion, validarCanjes, type PremioParaCanje } from "../../lib/fidelidad.ts";

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
  const descuento: PremioParaCanje = { id: 1, nombre: "USD 5 de descuento", tipo: "descuento", costoPuntos: 200, montoDescuentoUsd: 5, productoId: null, cantidad: null, compraMinimaUsd: null, activo: true };
  const producto: PremioParaCanje = { id: 2, nombre: "Salsa gratis", tipo: "producto", costoPuntos: 150, montoDescuentoUsd: null, productoId: 9, cantidad: 2, compraMinimaUsd: null, activo: true };

  it("rechaza un premio inactivo", () => {
    assert.throws(() => validarCanjes({ premios: [{ ...descuento, activo: false }], puntosDisponibles: 500, subtotalUsd: 30, descuentoUsd: 0, montoDeliveryUsd: 0 }), /no está disponible/);
  });

  it("rechaza si no alcanzan los puntos", () => {
    assert.throws(() => validarCanjes({ premios: [descuento], puntosDisponibles: 199, subtotalUsd: 30, descuentoUsd: 0, montoDeliveryUsd: 0 }), /No tienes puntos suficientes para USD 5 de descuento\./);
  });

  it("los puntos se acumulan entre varios premios", () => {
    assert.throws(() => validarCanjes({ premios: [descuento, producto], puntosDisponibles: 300, subtotalUsd: 30, descuentoUsd: 0, montoDeliveryUsd: 0 }), /No tienes puntos suficientes para Salsa gratis\./);
  });

  it("rechaza un descuento mayor que el monto del pedido", () => {
    assert.throws(() => validarCanjes({ premios: [descuento], puntosDisponibles: 500, subtotalUsd: 7, descuentoUsd: 3, montoDeliveryUsd: 0 }), /El descuento del premio supera el monto del pedido\./);
  });

  it("suma descuentos y costos y devuelve las líneas gratis", () => {
    const resultado = validarCanjes({ premios: [descuento, producto], puntosDisponibles: 400, subtotalUsd: 30, descuentoUsd: 0, montoDeliveryUsd: 0 });
    assert.deepEqual(resultado, { descuentoPuntosUsd: 5, descuentoDeliveryUsd: 0, costoTotal: 350, lineasGratis: [{ productoId: 9, cantidad: 2, premioId: 2 }] });
  });
});

describe("describirRecompensa", () => {
  it("describe cada tipo de premio", () => {
    assert.equal(describirRecompensa({ tipo: "descuento", montoDescuentoUsd: 5, cantidad: null, productoNombre: null }), "USD 5,00 de descuento");
    assert.equal(describirRecompensa({ tipo: "producto", montoDescuentoUsd: null, cantidad: 2, productoNombre: "Salsa pomodoro" }), "2 × Salsa pomodoro");
    assert.equal(describirRecompensa({ tipo: "producto", montoDescuentoUsd: null, cantidad: 2, productoNombre: null }), "2 × producto");
    assert.equal(describirRecompensa({ tipo: "delivery", montoDescuentoUsd: null, cantidad: null, productoNombre: null }), "El delivery del pedido");
  });
});

describe("estadoPremio y premioMasCercano", () => {
  const premios = [{ nombre: "A", costoPuntos: 100 }, { nombre: "B", costoPuntos: 140 }, { nombre: "C", costoPuntos: 240 }];
  it("E1: canjeable o cuántos puntos faltan", () => {
    const estados = premios.map((p) => estadoPremio({ costoPuntos: p.costoPuntos, puntosDisponibles: 160, sinExistencia: false }));
    assert.deepEqual(estados, [{ tipo: "canjeable" }, { tipo: "canjeable" }, { tipo: "faltan", faltan: 80 }]);
    assert.deepEqual(premioMasCercano(premios, 160), { nombre: "C", faltan: 80 });
  });
  it("E2: el más cercano con pocos puntos", () => {
    assert.deepEqual(premioMasCercano(premios, 25), { nombre: "A", faltan: 75 });
  });
  it("E3: ya alcanza todos", () => {
    assert.equal(premioMasCercano(premios, 500), null);
  });
  it("E4: sin existencia tiene prioridad", () => {
    assert.deepEqual(estadoPremio({ costoPuntos: 100, puntosDisponibles: 500, sinExistencia: true }), { tipo: "sin_existencia" });
  });
  it("E5: sin premios", () => {
    assert.equal(premioMasCercano([], 100), null);
  });
});

describe("validarCanjes con delivery y compra mínima", () => {
  const delivery: PremioParaCanje = { id: 3, nombre: "Delivery gratis", tipo: "delivery", costoPuntos: 100, montoDescuentoUsd: null, productoId: null, cantidad: null, compraMinimaUsd: 15, activo: true };
  const descuento: PremioParaCanje = { id: 1, nombre: "USD 5 de descuento", tipo: "descuento", costoPuntos: 50, montoDescuentoUsd: 5, productoId: null, cantidad: null, compraMinimaUsd: null, activo: true };
  const producto: PremioParaCanje = { id: 2, nombre: "Salsa gratis", tipo: "producto", costoPuntos: 50, montoDescuentoUsd: null, productoId: 9, cantidad: 1, compraMinimaUsd: 10, activo: true };
  const base = { puntosDisponibles: 500, descuentoUsd: 0 };

  it("V1: cubre el delivery completo", () => {
    const r = validarCanjes({ ...base, premios: [delivery], puntosDisponibles: 120, subtotalUsd: 20, montoDeliveryUsd: 4 });
    assert.equal(r.descuentoDeliveryUsd, 4);
    assert.equal(r.descuentoPuntosUsd, 0);
    assert.equal(r.costoTotal, 100);
  });
  it("V2: exige delivery", () => {
    assert.throws(() => validarCanjes({ ...base, premios: [delivery], subtotalUsd: 20, montoDeliveryUsd: 0 }), /Delivery gratis solo aplica a pedidos con delivery\./);
  });
  it("V3: un solo delivery por pedido", () => {
    assert.throws(() => validarCanjes({ ...base, premios: [delivery, { ...delivery, id: 4 }], subtotalUsd: 20, montoDeliveryUsd: 4 }), /solo premio de delivery gratis/);
  });
  it("V4: compra mínima no cumplida", () => {
    assert.throws(() => validarCanjes({ ...base, premios: [delivery], subtotalUsd: 12, montoDeliveryUsd: 4 }), /Agrega USD 3,00 más en productos para usar Delivery gratis\./);
  });
  it("V5: compra mínima exacta", () => {
    assert.doesNotThrow(() => validarCanjes({ ...base, premios: [delivery], subtotalUsd: 15, montoDeliveryUsd: 4 }));
  });
  it("V6: la base ya descuenta el otro premio, sin importar el orden", () => {
    for (const premios of [[delivery, descuento], [descuento, delivery]]) {
      assert.throws(() => validarCanjes({ ...base, premios, subtotalUsd: 18, montoDeliveryUsd: 4 }), /USD 2,00 más/);
    }
  });
  it("V7: la compra mínima descuenta el descuento del pedido", () => {
    assert.throws(() => validarCanjes({ ...base, premios: [producto], subtotalUsd: 12, descuentoUsd: 3, montoDeliveryUsd: 0 }), /USD 1,00 más/);
  });
  it("V8: delivery, descuento y producto juntos", () => {
    const r = validarCanjes({ ...base, premios: [delivery, descuento, { ...producto, compraMinimaUsd: null }], subtotalUsd: 30, montoDeliveryUsd: 6 });
    assert.equal(r.descuentoPuntosUsd, 5);
    assert.equal(r.descuentoDeliveryUsd, 6);
    assert.equal(r.lineasGratis.length, 1);
  });
});

describe("filtrarCanjesValidos", () => {
  const delivery: PremioParaCanje = { id: 3, nombre: "Delivery gratis", tipo: "delivery", costoPuntos: 100, montoDescuentoUsd: null, productoId: null, cantidad: null, compraMinimaUsd: null, activo: true };
  const descuento: PremioParaCanje = { id: 1, nombre: "USD 5", tipo: "descuento", costoPuntos: 50, montoDescuentoUsd: 5, productoId: null, cantidad: null, compraMinimaUsd: null, activo: true };
  const contexto = { puntosDisponibles: 500, subtotalUsd: 30, descuentoUsd: 0, montoDeliveryUsd: 4 };
  it("F1: conserva una selección válida", () => {
    assert.deepEqual(filtrarCanjesValidos([delivery, descuento], contexto), [delivery, descuento]);
  });
  it("F2: descarta el delivery si el pedido deja de tenerlo", () => {
    assert.deepEqual(filtrarCanjesValidos([delivery, descuento], { ...contexto, montoDeliveryUsd: 0 }), [descuento]);
  });
  it("F3: descarta lo que los puntos ya no alcanzan", () => {
    assert.deepEqual(filtrarCanjesValidos([delivery, descuento], { ...contexto, puntosDisponibles: 120 }), [delivery]);
  });
  it("F4: lista vacía", () => {
    assert.deepEqual(filtrarCanjesValidos([], contexto), []);
  });
});

describe("costoSugeridoPremio", () => {
  it("C1-C4: 20 puntos por USD del precio al detal, a la decena más cercana", () => {
    assert.equal(costoSugeridoPremio({ precioDetalUsd: 7, cantidad: 1 }), 140);
    assert.equal(costoSugeridoPremio({ precioDetalUsd: 6.5, cantidad: 2 }), 260);
    assert.equal(costoSugeridoPremio({ precioDetalUsd: 12, cantidad: 1 }), 240);
    assert.equal(costoSugeridoPremio({ precioDetalUsd: 7.25, cantidad: 1 }), 150);
  });
  it("C5: nunca baja de 10 puntos", () => {
    assert.equal(costoSugeridoPremio({ precioDetalUsd: 0.2, cantidad: 1 }), 10);
  });
  it("C6: entradas no válidas dan 10", () => {
    for (const precioDetalUsd of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(costoSugeridoPremio({ precioDetalUsd, cantidad: 1 }), 10);
  });
});
