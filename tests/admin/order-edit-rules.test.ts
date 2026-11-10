import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ajustePuntosPorEdicion,
  diferenciasInventario,
  motivoNoEditable,
  motivoNoEliminable,
  requiereConfirmarDiferencia,
  resumirCambiosPedido,
  versionPedido,
  type ResumenPedido,
  type SnapshotPedido,
} from "../../lib/admin/order-edit-rules.ts";

const snapshot: SnapshotPedido = {
  estado: "por_cobrar",
  montoTotal: 10,
  numeroOrden: "A-1",
  clienteId: 1,
  fechaCompra: new Date("2026-11-10T12:00:00Z"),
  lineas: [{ id: 1, productoId: 5, cantidad: 2, precioUnitario: 5 }],
  pagos: [{ id: 1, anuladoEn: null }],
  movimientosPuntosIds: [],
  movimientosSaldoIds: [],
  ultimoEventoId: 7,
};

describe("reglas de edición de pedidos", () => {
  it("solo los cancelados no se editan", () => {
    assert.match(motivoNoEditable({ estado: "cancelado" }) ?? "", /cancelados/);
    for (const estado of ["por_cobrar", "pendiente", "en_pedido", "pagado"] as const) assert.equal(motivoNoEditable({ estado }), null);
  });

  it("calcula diferencias de inventario por producto", () => {
    assert.deepEqual(diferenciasInventario([{ productoId: 1, cantidad: 3 }], [{ productoId: 1, cantidad: 5 }]), [{ productoId: 1, delta: 2 }]);
    assert.deepEqual(diferenciasInventario([{ productoId: 1, cantidad: 3 }], [{ productoId: 1, cantidad: 2 }]), [{ productoId: 1, delta: -1 }]);
    assert.deepEqual(diferenciasInventario([{ productoId: 2, cantidad: 4 }], [{ productoId: 1, cantidad: 1.5 }]), [{ productoId: 1, delta: 1.5 }, { productoId: 2, delta: -4 }]);
    assert.deepEqual(diferenciasInventario([{ productoId: 1, cantidad: 1 }, { productoId: 1, cantidad: 1 }], [{ productoId: 1, cantidad: 2 }]), []);
  });

  it("exige confirmar la diferencia solo en pagados cuyo total sube", () => {
    assert.equal(requiereConfirmarDiferencia({ estado: "pagado", totalAnteriorUsd: 10, totalNuevoUsd: 12 }), true);
    assert.equal(requiereConfirmarDiferencia({ estado: "pagado", totalAnteriorUsd: 10, totalNuevoUsd: 9 }), false);
    assert.equal(requiereConfirmarDiferencia({ estado: "por_cobrar", totalAnteriorUsd: 10, totalNuevoUsd: 12 }), false);
    assert.equal(requiereConfirmarDiferencia({ estado: "pagado", totalAnteriorUsd: 10, totalNuevoUsd: 10.001 }), false);
  });

  it("ajusta los puntos con tope", () => {
    assert.equal(ajustePuntosPorEdicion({ ganadosNetos: 10, esperados: 15, disponibles: 20, devueltos: 0 }), 5);
    assert.equal(ajustePuntosPorEdicion({ ganadosNetos: 10, esperados: 4, disponibles: 20, devueltos: 0 }), -6);
    assert.equal(ajustePuntosPorEdicion({ ganadosNetos: 10, esperados: 0, disponibles: 3, devueltos: 0 }), -3);
    assert.equal(ajustePuntosPorEdicion({ ganadosNetos: 10, esperados: 10, disponibles: 3, devueltos: 0 }), 0);
  });

  it("la huella es estable y cambia con el pedido", () => {
    const base = versionPedido(snapshot);
    assert.match(base, /^[0-9a-f]{16}$/);
    assert.equal(versionPedido({ ...snapshot }), base);
    assert.notEqual(versionPedido({ ...snapshot, estado: "pagado" }), base);
    assert.notEqual(versionPedido({ ...snapshot, montoTotal: 11 }), base);
    assert.notEqual(versionPedido({ ...snapshot, pagos: [{ id: 1, anuladoEn: new Date() }] }), base);
    assert.notEqual(versionPedido({ ...snapshot, lineas: [{ id: 1, productoId: 5, cantidad: 3, precioUnitario: 5 }] }), base);
    assert.notEqual(versionPedido({ ...snapshot, ultimoEventoId: 8 }), base);
  });

  it("resume los cambios y respeta el límite", () => {
    const antes: ResumenPedido = { numeroOrden: "A-1", clienteId: 1, fechaCompra: new Date("2026-11-10T12:00:00Z"), tipodeRetiro: "envio", tasaCambio: null, descuento: null, lineas: [{ productoId: 1, nombre: "Pasta", cantidad: 3, precioUnitarioUsd: 5 }], totalUsd: 15 };
    assert.equal(resumirCambiosPedido(antes, antes), "");
    const texto = resumirCambiosPedido(antes, { ...antes, lineas: [{ productoId: 1, nombre: "Pasta", cantidad: 5, precioUnitarioUsd: 5 }, { productoId: 2, nombre: "Salsa", cantidad: 1, precioUnitarioUsd: 4 }], totalUsd: 29 });
    assert.match(texto, /Pasta: 3 → 5/);
    assert.match(texto, /agrega 1 × Salsa/);
    assert.match(texto, /total USD 15\.00 → 29\.00/);
    const largo = resumirCambiosPedido(antes, { ...antes, lineas: Array.from({ length: 60 }, (_, i) => ({ productoId: 100 + i, nombre: `Producto largo ${i}`, cantidad: 1, precioUnitarioUsd: 1 })), totalUsd: 60 });
    assert.ok(largo.length <= 500 && largo.endsWith("…"));
  });
});

describe("motivoNoEliminable", () => {
  const libre = { estado: "por_cobrar" as const, tieneAbonos: false, movimientosPuntos: 0, movimientosSaldo: 0, notasEntrega: 0, resenas: 0 };
  it("permite pedidos sin movimientos, incluso cancelados", () => {
    assert.equal(motivoNoEliminable(libre), null);
    assert.equal(motivoNoEliminable({ ...libre, estado: "cancelado" }), null);
  });
  it("bloquea pagados, abonos (aunque estén anulados) y documentos asociados", () => {
    assert.match(motivoNoEliminable({ ...libre, estado: "pagado" }) ?? "", /pagados/);
    assert.match(motivoNoEliminable({ ...libre, tieneAbonos: true }) ?? "", /abonos.*Cancélalo/);
    assert.match(motivoNoEliminable({ ...libre, movimientosPuntos: 1 }) ?? "", /puntos/);
    assert.match(motivoNoEliminable({ ...libre, movimientosSaldo: 1 }) ?? "", /saldo/);
    assert.match(motivoNoEliminable({ ...libre, notasEntrega: 1 }) ?? "", /nota de entrega/);
    assert.match(motivoNoEliminable({ ...libre, resenas: 1 }) ?? "", /reseñas/);
  });
});
