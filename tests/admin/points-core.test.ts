import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clasificarPuntos, filtrarFilasPuntos, indicadoresPuntos, inicioMesCaracas, leerOrdenPuntos, ordenarFilasPuntos, resumirPuntosPorCliente, type ClientePuntos, type GrupoPuntos } from "../../lib/admin/points-core.ts";

const f = (iso: string) => new Date(iso);
const cliente = (id: number, nombre: string, apellido: string, celular: string | null = null): ClientePuntos => ({ id, nombre, apellido, tipoCliente: "detal", celular, nombreBusqueda: `${nombre} ${apellido}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() });
const g = (clienteId: number, tipoMovimiento: GrupoPuntos["tipoMovimiento"], puntos: number, ultimaFecha = "2026-11-01T12:00:00Z"): GrupoPuntos => ({ clienteId, tipoMovimiento, puntos, ultimaFecha: f(ultimaFecha) });

describe("clasificarPuntos", () => {
  it("P1: ganados, canjeados, ajustes y disponibles", () => {
    const grupos = [g(1, "acumulacion", 320), g(1, "reversion", -20), g(1, "redencion", -150), g(1, "ajuste", 10)];
    assert.deepEqual(clasificarPuntos(grupos), { ganados: 300, canjeados: 150, ajustes: 10 });
    const [fila] = resumirPuntosPorCliente(grupos, [cliente(1, "Ana", "Pérez")]);
    assert.equal(fila.disponibles, 160);
  });
  it("P2: una devolución compensa el canje", () => {
    assert.equal(clasificarPuntos([g(1, "redencion", -150), g(1, "devolucion", 150)]).canjeados, 0);
  });
  it("P3: el bono cuenta como ganado", () => {
    assert.equal(clasificarPuntos([g(1, "bono", 25), g(1, "acumulacion", 30)]).ganados, 55);
  });
});

describe("resumirPuntosPorCliente", () => {
  const clientes = [cliente(1, "Ana", "Pérez"), cliente(2, "Luis", "Mora")];
  it("P4: disponibles = ganados − canjeados + ajustes en todas las filas", () => {
    const filas = resumirPuntosPorCliente([g(1, "acumulacion", 50), g(1, "redencion", -20), g(2, "bono", 25), g(2, "ajuste", -5)], clientes);
    for (const fila of filas) assert.equal(fila.disponibles, fila.ganados - fila.canjeados + fila.ajustes);
  });
  it("P5: movimientos que suman 0 dejan la fila con 0", () => {
    const [fila] = resumirPuntosPorCliente([g(1, "acumulacion", 10), g(1, "ajuste", -10)], clientes);
    assert.equal(fila.disponibles, 0);
  });
  it("P6: omite grupos de un cliente ausente", () => {
    assert.equal(resumirPuntosPorCliente([g(99, "bono", 25)], clientes).length, 0);
  });
  it("P7: último movimiento = la mayor fecha", () => {
    const [fila] = resumirPuntosPorCliente([g(1, "bono", 25, "2026-10-01T00:00:00Z"), g(1, "acumulacion", 5, "2026-11-05T00:00:00Z"), g(1, "ajuste", 1, "2026-10-20T00:00:00Z")], clientes);
    assert.equal(fila.ultimoMovimiento.toISOString(), "2026-11-05T00:00:00.000Z");
  });
});

describe("filtrarFilasPuntos y ordenarFilasPuntos", () => {
  const clientes = [cliente(1, "María", "Pérez", "0412-5551234"), cliente(2, "Luis", "Mora", "0414-9990000"), cliente(3, "Ana", "Mora")];
  const filas = resumirPuntosPorCliente([g(1, "bono", 100, "2026-11-01T00:00:00Z"), g(2, "bono", 100, "2026-11-03T00:00:00Z"), g(3, "bono", 40, "2026-11-02T00:00:00Z")], clientes);
  it("P8: ignora acentos y mayúsculas", () => {
    assert.deepEqual(filtrarFilasPuntos(filas, "MARÍA pérez").map((x) => x.clienteId), [1]);
  });
  it("P9: busca por dígitos del celular", () => {
    assert.deepEqual(filtrarFilasPuntos(filas, "555 12").map((x) => x.clienteId), [1]);
    assert.equal(filtrarFilasPuntos(filas, "999").length, 1);
    assert.equal(filtrarFilasPuntos(filas, "777").length, 0);
  });
  it("P10: texto sin coincidencias", () => {
    assert.equal(filtrarFilasPuntos(filas, "ab").length, 0);
  });
  it("P11: orden descendente con desempate por nombre", () => {
    // Luis Mora y María Pérez empatan en 100: gana Luis por nombre.
    assert.deepEqual(ordenarFilasPuntos(filas, "disponibles").map((x) => x.clienteId), [2, 1, 3]);
    assert.deepEqual(ordenarFilasPuntos(filas, "ganados").map((x) => x.clienteId), [2, 1, 3]);
    assert.deepEqual(ordenarFilasPuntos(filas, "reciente").map((x) => x.clienteId), [2, 3, 1]);
    // Todos tienen 0 canjeados: desempate alfabético (Ana, Luis, María).
    assert.deepEqual(ordenarFilasPuntos(filas, "canjeados").map((x) => x.clienteId), [3, 2, 1]);
  });
});

describe("indicadoresPuntos", () => {
  const clientes = [cliente(1, "A", "A"), cliente(2, "B", "B"), cliente(3, "C", "C")];
  const filas = resumirPuntosPorCliente([g(1, "ajuste", 160), g(2, "ajuste", 99), g(3, "ajuste", 5), g(3, "redencion", -5)], clientes);
  it("P12: circulación, con puntos y pueden canjear", () => {
    assert.deepEqual(indicadoresPuntos({ filas, gruposDelMes: [], costoMinimoPremio: 100 }), { enCirculacion: 259, clientesConPuntos: 2, puedenCanjear: 1, ganadosMes: 0, canjeadosMes: 0 });
  });
  it("P13: sin premios activos nadie puede canjear", () => {
    assert.equal(indicadoresPuntos({ filas, gruposDelMes: [], costoMinimoPremio: null }).puedenCanjear, 0);
  });
  it("P14: puntos del mes", () => {
    const r = indicadoresPuntos({ filas, gruposDelMes: [{ tipoMovimiento: "acumulacion", puntos: 80 }, { tipoMovimiento: "bono", puntos: 25 }, { tipoMovimiento: "redencion", puntos: -100 }, { tipoMovimiento: "devolucion", puntos: 100 }], costoMinimoPremio: 100 });
    assert.equal(r.ganadosMes, 105);
    assert.equal(r.canjeadosMes, 0);
  });
});

describe("inicioMesCaracas y leerOrdenPuntos", () => {
  it("P15: el 31 de octubre 22:00 en Caracas pertenece a octubre", () => {
    assert.equal(inicioMesCaracas(f("2026-11-01T02:00:00Z")).toISOString(), "2026-10-01T04:00:00.000Z");
  });
  it("P16: medianoche de Caracas del día 1", () => {
    assert.equal(inicioMesCaracas(f("2026-11-01T04:00:00Z")).toISOString(), "2026-11-01T04:00:00.000Z");
  });
  it("P17: orden desconocido vuelve a disponibles", () => {
    assert.equal(leerOrdenPuntos("xyz"), "disponibles");
    assert.equal(leerOrdenPuntos(undefined), "disponibles");
    assert.equal(leerOrdenPuntos("ganados"), "ganados");
  });
});
