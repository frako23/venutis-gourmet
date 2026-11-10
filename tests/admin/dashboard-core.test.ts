import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  topProductos,
  ventanasResumen,
  ventasPorMes,
  ventasPorTipoCliente,
  type PedidoResumen,
} from "../../lib/admin/dashboard-core.ts";

const AHORA = new Date("2026-11-10T19:00:00Z");
const ventanas = ventanasResumen(AHORA);

function pedido(fecha: string, monto: number, tipoCliente: "detal" | "mayorista" = "detal"): PedidoResumen {
  return { fechaCompra: new Date(fecha), montoTotal: monto, tipoCliente };
}

describe("ventanasResumen", () => {
  it("calcula las ventanas en hora de Caracas", () => {
    assert.equal(ventanas.hoy, "2026-11-10");
    assert.equal(ventanas.meses.length, 12);
    assert.equal(ventanas.meses[0], "2025-12");
    assert.equal(ventanas.meses[11], "2026-11");
    assert.equal(ventanas.periodo30Dias.since, "2026-10-12");
    assert.equal(ventanas.periodo30Dias.until, "2026-11-10");
    assert.equal(ventanas.desde30Dias.toISOString(), "2026-10-12T04:00:00.000Z");
    assert.equal(ventanas.hasta.toISOString(), "2026-11-11T04:00:00.000Z");
    assert.equal(ventanas.desdeMeses.toISOString(), "2025-12-01T04:00:00.000Z");
  });

  it("usa el día de Caracas aunque en UTC ya sea el siguiente", () => {
    const v = ventanasResumen(new Date("2026-11-01T02:00:00Z"));
    assert.equal(v.hoy, "2026-10-31");
    assert.equal(v.meses[11], "2026-10");
  });

  it("cruza el año sin saltos ni repetidos", () => {
    const v = ventanasResumen(new Date("2026-01-15T15:00:00Z"));
    assert.equal(v.meses[0], "2025-02");
    assert.equal(v.meses[11], "2026-01");
    assert.equal(new Set(v.meses).size, 12);
  });
});

describe("ventasPorTipoCliente", () => {
  const dia = "2026-11-05T15:00:00Z";

  it("reparte ventas y monto por tipo de cliente", () => {
    const pedidos = [
      ...Array.from({ length: 7 }, () => pedido(dia, 30, "detal")),
      ...Array.from({ length: 3 }, () => pedido(dia, 180, "mayorista")),
    ];
    assert.deepEqual(ventasPorTipoCliente(pedidos, ventanas), [
      { tipoCliente: "detal", etiqueta: "Consumidores", cantidadVentas: 7, totalUsd: 210, porcentajeDelMonto: 28, porcentajeDeVentas: 70 },
      { tipoCliente: "mayorista", etiqueta: "Mayoristas", cantidadVentas: 3, totalUsd: 540, porcentajeDelMonto: 72, porcentajeDeVentas: 30 },
    ]);
  });

  it("mantiene el grupo vacío en cero", () => {
    const [detal, mayorista] = ventasPorTipoCliente([pedido(dia, 10)], ventanas);
    assert.equal(detal.porcentajeDelMonto, 100);
    assert.equal(detal.porcentajeDeVentas, 100);
    assert.equal(mayorista.cantidadVentas, 0);
    assert.equal(mayorista.totalUsd, 0);
  });

  it("devuelve ceros sin ventas en los 30 días", () => {
    const grupos = ventasPorTipoCliente([pedido("2026-09-01T15:00:00Z", 50)], ventanas);
    for (const g of grupos) {
      assert.equal(g.cantidadVentas, 0);
      assert.equal(g.porcentajeDelMonto, 0);
      assert.equal(g.porcentajeDeVentas, 0);
    }
  });

  it("respeta los bordes de la ventana", () => {
    const antes = new Date(ventanas.desde30Dias.getTime() - 1);
    const pedidos: PedidoResumen[] = [
      { fechaCompra: antes, montoTotal: 1, tipoCliente: "detal" },
      { fechaCompra: ventanas.desde30Dias, montoTotal: 2, tipoCliente: "detal" },
      { fechaCompra: ventanas.hasta, montoTotal: 4, tipoCliente: "detal" },
    ];
    const [detal] = ventasPorTipoCliente(pedidos, ventanas);
    assert.equal(detal.cantidadVentas, 1);
    assert.equal(detal.totalUsd, 2);
  });
});

describe("ventasPorMes", () => {
  it("ubica el pedido de las 9 p. m. del último día en su mes de Caracas", () => {
    const meses = ventasPorMes([pedido("2026-11-01T01:00:00Z", 40)], ventanas);
    assert.equal(meses.find((m) => m.mes === "2026-10")?.totalUsd, 40);
    assert.equal(meses.find((m) => m.mes === "2026-11")?.totalUsd, 0);
  });

  it("calcula total, cantidad y ticket promedio", () => {
    const meses = ventasPorMes([
      pedido("2026-09-03T15:00:00Z", 10),
      pedido("2026-09-10T15:00:00Z", 20),
      pedido("2026-09-20T15:00:00Z", 30.5),
    ], ventanas);
    const sep = meses.find((m) => m.mes === "2026-09")!;
    assert.equal(sep.totalUsd, 60.5);
    assert.equal(sep.cantidadVentas, 3);
    assert.equal(sep.ticketPromedioUsd, 20.17);
  });

  it("devuelve 12 meses en cero y solo el último en curso", () => {
    const meses = ventasPorMes([], ventanas);
    assert.equal(meses.length, 12);
    assert.deepEqual(meses.map((m) => m.mes), ventanas.meses);
    assert.ok(meses.every((m) => m.totalUsd === 0 && m.cantidadVentas === 0 && m.ticketPromedioUsd === 0));
    assert.deepEqual(meses.map((m) => m.enCurso), [...Array(11).fill(false), true]);
    assert.equal(meses[11].etiqueta, "noviembre de 2026");
    assert.equal(meses[11].etiquetaCorta, "nov");
  });

  it("ignora pedidos fuera de la ventana", () => {
    const meses = ventasPorMes([
      { fechaCompra: ventanas.hasta, montoTotal: 9, tipoCliente: "detal" },
      { fechaCompra: new Date(ventanas.desdeMeses.getTime() - 1), montoTotal: 9, tipoCliente: "detal" },
    ], ventanas);
    assert.ok(meses.every((m) => m.cantidadVentas === 0));
  });

  it("los grupos por tipo nunca suman más que los meses", () => {
    const pedidos = [pedido("2026-11-02T15:00:00Z", 10), pedido("2026-08-02T15:00:00Z", 20, "mayorista")];
    const meses = ventasPorMes(pedidos, ventanas).reduce((s, m) => s + m.totalUsd, 0);
    const grupos = ventasPorTipoCliente(pedidos, ventanas).reduce((s, g) => s + g.totalUsd, 0);
    assert.ok(grupos <= meses);
  });
});

describe("topProductos", () => {
  const fila = (productoId: number, cantidadVendida: number, totalUsd: number) => ({ productoId, nombre: `P${productoId}`, cantidadVendida, totalUsd, porcentajeDelTotal: 0 });

  it("devuelve los 5 de más unidades", () => {
    const top = topProductos([1, 2, 3, 4, 5, 6].map((n) => fila(n, n * 2, 10)));
    assert.deepEqual(top.map((p) => p.productoId), [6, 5, 4, 3, 2]);
  });

  it("desempata por monto", () => {
    const top = topProductos([fila(1, 4, 10), fila(2, 4, 30)]);
    assert.deepEqual(top.map((p) => p.productoId), [2, 1]);
  });

  it("no rellena posiciones", () => {
    assert.equal(topProductos([fila(1, 1, 1), fila(2, 2, 2), fila(3, 3, 3)]).length, 3);
    assert.deepEqual(topProductos([]), []);
  });

  it("conserva los decimales", () => {
    assert.equal(topProductos([fila(1, 2.5, 10)])[0].cantidadVendida, 2.5);
  });
});
