import assert from "node:assert/strict";
import { test } from "node:test";

import { calcularIndicadoresCliente, type PedidoParaIndicadores } from "../../lib/admin/client-profile.ts";

const pedido = (extra: Partial<PedidoParaIndicadores>): PedidoParaIndicadores => ({
  estado: "pagado",
  montoTotal: 10,
  fechaCompra: new Date("2026-10-01T12:00:00Z"),
  detalles: [],
  ...extra,
});

test("sin pedidos los indicadores son cero", () => {
  assert.deepEqual(calcularIndicadoresCliente([]), { totalCompradoUsd: 0, pedidos: 0, ticketPromedioUsd: 0, ultimaCompra: null, topProductos: [] });
});

test("los pedidos cancelados no cuentan en ningún indicador", () => {
  const resultado = calcularIndicadoresCliente([
    pedido({ montoTotal: 30, detalles: [{ productoId: 1, nombre: "Pasta", cantidad: 2 }] }),
    pedido({ estado: "cancelado", montoTotal: 500, fechaCompra: new Date("2026-12-01T12:00:00Z"), detalles: [{ productoId: 2, nombre: "Salsa", cantidad: 9 }] }),
  ]);
  assert.equal(resultado.totalCompradoUsd, 30);
  assert.equal(resultado.pedidos, 1);
  assert.deepEqual(resultado.ultimaCompra, new Date("2026-10-01T12:00:00Z"));
  assert.deepEqual(resultado.topProductos, [{ productoId: 1, nombre: "Pasta", cantidad: 2 }]);
});

test("el ticket promedio se redondea a 2 decimales", () => {
  const resultado = calcularIndicadoresCliente([pedido({ montoTotal: 10 }), pedido({ montoTotal: 10 }), pedido({ montoTotal: 10.01 })]);
  assert.equal(resultado.ticketPromedioUsd, 10.0);
  assert.equal(resultado.totalCompradoUsd, 30.01);
});

test("el top 5 se ordena por cantidad y suma cantidades decimales", () => {
  const linea = (productoId: number, cantidad: number) => ({ productoId, nombre: `P${productoId}`, cantidad });
  const resultado = calcularIndicadoresCliente([
    pedido({ detalles: [linea(1, 0.1), linea(2, 5), linea(3, 1), linea(4, 2), linea(5, 3), linea(6, 4)] }),
    pedido({ detalles: [linea(1, 0.2)] }),
  ]);
  assert.deepEqual(resultado.topProductos.map((p) => p.productoId), [2, 6, 5, 4, 3]);
  const sumado = calcularIndicadoresCliente([pedido({ detalles: [linea(1, 0.1)] }), pedido({ detalles: [linea(1, 0.2)] })]);
  assert.equal(sumado.topProductos[0].cantidad, 0.3);
});
