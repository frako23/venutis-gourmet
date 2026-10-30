import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { registrarAbonoEnPedido } from "../../lib/admin/abonos.ts";
import { canjearPremioEnPedido } from "../../lib/admin/canje-pedido.ts";
import { registrarVentaManualEnTx } from "../../lib/admin/manual-sale.ts";
import { aplicarCambioEstadoPedido } from "../../lib/admin/order-state-change.ts";
import { ajustarPuntos, puntosDisponiblesDelCliente } from "../../lib/fidelidad.ts";

const actor = { id: "integration", email: "integration@local" };

type Ctx = {
  prisma: ReturnType<typeof createIntegrationClient>;
  clienteId: number;
  pedido: (subtotal: number, extra?: { estado?: "por_cobrar" | "en_pedido" | "pagado"; importada?: boolean; delivery?: number }) => Promise<number>;
  producto: (inventario: number) => Promise<number>;
  puntos: () => Promise<number>;
};

async function conCliente(tipoCliente: "detal" | "mayorista", run: (ctx: Ctx) => Promise<void>) {
  const prisma = createIntegrationClient();
  let clienteId: number | undefined;
  const productoIds: number[] = [];
  try {
    const cliente = await prisma.cliente.create({ data: { tipoCliente, nombre: "Fixture", apellido: "Puntos", nombreBusqueda: "fixture puntos", celular: uniqueValue("0414") } });
    clienteId = cliente.id;
    await run({
      prisma,
      clienteId: cliente.id,
      pedido: async (subtotal, extra = {}) =>
        (
          await prisma.transaccion.create({
            data: { numeroOrden: uniqueValue("INT-PTS"), clienteId: cliente.id, montoSubtotal: subtotal, montoDelivery: extra.delivery ?? 0, montoTotal: subtotal + (extra.delivery ?? 0), estado: extra.estado ?? "por_cobrar", importada: extra.importada ?? false },
          })
        ).id,
      producto: async (inventario) => {
        const creado = await prisma.producto.create({ data: { nombre: uniqueValue("Producto puntos"), precioDetal: 5, precioMayorista: 4, categoria: "Fixture", inventario } });
        productoIds.push(creado.id);
        return creado.id;
      },
      puntos: async () => (await prisma.fidelidad.aggregate({ where: { clienteId: cliente.id }, _sum: { puntos: true } }))._sum.puntos ?? 0,
    });
  } finally {
    if (clienteId) {
      const pedidos = await prisma.transaccion.findMany({ where: { clienteId }, select: { id: true } });
      const ids = pedidos.map((p) => p.id);
      await prisma.movimientoSaldo.deleteMany({ where: { clienteId } });
      await prisma.fidelidad.deleteMany({ where: { clienteId } });
      await prisma.pago.deleteMany({ where: { transaccionId: { in: ids } } });
      await prisma.detalleCompra.deleteMany({ where: { transaccionId: { in: ids } } });
      await prisma.transaccion.deleteMany({ where: { id: { in: ids } } });
      await prisma.cliente.delete({ where: { id: clienteId } });
    }
    if (productoIds.length > 0) {
      await prisma.premio.deleteMany({ where: { productoId: { in: productoIds } } });
      await prisma.producto.deleteMany({ where: { id: { in: productoIds } } });
    }
    await prisma.$disconnect();
  }
}

const abono = (transaccionId: number, monto: number) => ({ transaccionId, moneda: "usd" as const, monto, metodoPago: "Zelle" as const, fechaPago: new Date() });
const pagar = (prisma: Ctx["prisma"], transaccionId: number) => prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, { transaccionId, estadoNuevo: "pagado", confirmacionPago: true }, actor));

test("los puntos se acreditan una sola vez al pagar, sin contar el delivery", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, pedido, puntos }) => {
    const id = await pedido(25.8, { delivery: 3 });
    assert.equal(await puntos(), 0);
    await pagar(prisma, id);
    assert.equal(await puntos(), 25);
    // Pagado -> Por cobrar -> Pagado no vuelve a acreditar.
    await prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, { transaccionId: id, estadoNuevo: "por_cobrar", confirmacionPago: false }, actor));
    await pagar(prisma, id);
    assert.equal(await puntos(), 25);
    assert.equal(await prisma.fidelidad.count({ where: { transaccionId: id, tipoMovimiento: "acumulacion" } }), 1);
  });
});

test("saldar con abonos acredita los puntos del pedido", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, pedido, puntos }) => {
    const id = await pedido(18);
    await prisma.$transaction((tx) => registrarAbonoEnPedido(tx, abono(id, 10), actor));
    assert.equal(await puntos(), 0);
    await prisma.$transaction((tx) => registrarAbonoEnPedido(tx, abono(id, 8), actor));
    assert.equal(await puntos(), 18);
  });
});

test("una venta manual que nace pagada acredita los puntos", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, producto, puntos }) => {
    const productoId = await producto(5);
    await prisma.$transaction((tx) =>
      registrarVentaManualEnTx(
        tx,
        { clienteId, fechaCompra: new Date(), tipodeRetiro: "recogida", tasaCambio: null, estadoInicial: "pagado", lineas: [{ productoId, cantidad: 2, precioUnitarioUsd: 7.5, tipoPrecio: "detal" }], descuento: null, autorizarCredito: false },
        actor,
      ),
    );
    assert.equal(await puntos(), 15);
  });
});

test("los mayoristas y los pedidos importados no acumulan puntos", { skip: !integrationEnabled }, async () => {
  await conCliente("mayorista", async ({ prisma, pedido, puntos }) => {
    await pagar(prisma, await pedido(40));
    assert.equal(await puntos(), 0);
  });
  await conCliente("detal", async ({ prisma, pedido, puntos }) => {
    await pagar(prisma, await pedido(40, { importada: true }));
    assert.equal(await puntos(), 0);
  });
});

test("un pedido que ya acumuló con la regla anterior no vuelve a acumular", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, pedido, puntos }) => {
    const id = await pedido(30);
    await prisma.fidelidad.create({ data: { clienteId, transaccionId: id, tipoMovimiento: "acumulacion", puntos: 30 } });
    await pagar(prisma, id);
    assert.equal(await puntos(), 30);
  });
});

test("cancelar revierte los puntos ganados y respeta el tope si ya se usaron", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, pedido, puntos }) => {
    const id = await pedido(25);
    await prisma.fidelidad.create({ data: { clienteId, transaccionId: id, tipoMovimiento: "acumulacion", puntos: 25 } });
    await prisma.$transaction((tx) => ajustarPuntos(tx, { clienteId, puntos: -20, motivo: "Uso previo de prueba" }, actor));
    await prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, { transaccionId: id, estadoNuevo: "cancelado", confirmacionPago: false }, actor));
    const reversion = await prisma.fidelidad.findFirstOrThrow({ where: { transaccionId: id, tipoMovimiento: "reversion" } });
    assert.equal(reversion.puntos, -5);
    assert.match(reversion.motivo ?? "", /Reversión parcial: el cliente ya había usado 20 puntos/);
    assert.equal(await puntos(), 0);
  });
});

test("un ajuste que dejaría los puntos en negativo se rechaza", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, puntos }) => {
    await prisma.$transaction((tx) => ajustarPuntos(tx, { clienteId, puntos: 10, motivo: "Puntos iniciales de prueba" }, actor));
    await assert.rejects(() => prisma.$transaction((tx) => ajustarPuntos(tx, { clienteId, puntos: -11, motivo: "Corrección" }, actor)), /en negativo/);
    assert.equal(await puntos(), 10);
  });
});

// ---- Canjes ----

async function darPuntos(prisma: Ctx["prisma"], clienteId: number, puntos: number) {
  await prisma.$transaction((tx) => ajustarPuntos(tx, { clienteId, puntos, motivo: "Puntos iniciales de prueba" }, actor));
}

test("canjear un descuento en la venta manual baja el total y descuenta los puntos", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, producto, puntos }) => {
    const productoId = await producto(10);
    const premio = await prisma.premio.create({ data: { nombre: "USD 5 de descuento", tipo: "descuento", costoPuntos: 200, montoDescuentoUsd: 5 } });
    await darPuntos(prisma, clienteId, 250);
    try {
      const venta = await prisma.$transaction((tx) =>
        registrarVentaManualEnTx(
          tx,
          { clienteId, fechaCompra: new Date(), tipodeRetiro: "recogida", tasaCambio: null, estadoInicial: "por_cobrar", lineas: [{ productoId, cantidad: 6, precioUnitarioUsd: 5, tipoPrecio: "detal" }], descuento: null, autorizarCredito: true, canjes: [premio.id] },
          actor,
        ),
      );
      const pedido = await prisma.transaccion.findUniqueOrThrow({ where: { id: venta.id } });
      assert.equal(pedido.montoSubtotal, 30);
      assert.equal(pedido.montoDescuentoPuntos, 5);
      assert.equal(pedido.montoTotal, 25);
      const canje = await prisma.fidelidad.findFirstOrThrow({ where: { transaccionId: venta.id, tipoMovimiento: "redencion" } });
      assert.equal(canje.puntos, -200);
      assert.equal(canje.descripcion, "USD 5 de descuento");
      assert.equal(await puntos(), 50);
    } finally {
      await prisma.fidelidad.deleteMany({ where: { premioId: premio.id } });
      await prisma.premio.delete({ where: { id: premio.id } });
    }
  });
});

test("canjear un producto gratis agrega una línea a precio 0, descuenta inventario y se devuelve al cancelar", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, pedido, producto, puntos }) => {
    const productoId = await producto(3);
    const premio = await prisma.premio.create({ data: { nombre: "Salsa gratis", tipo: "producto", costoPuntos: 150, productoId, cantidad: 1 } });
    await darPuntos(prisma, clienteId, 200);
    try {
      const id = await pedido(20);
      const resultado = await prisma.$transaction((tx) => canjearPremioEnPedido(tx, { transaccionId: id, premioId: premio.id }, actor));
      assert.equal(resultado.totalUsd, 20);
      const linea = await prisma.detalleCompra.findFirstOrThrow({ where: { transaccionId: id, productoId } });
      assert.equal(linea.precioUnitario, 0);
      assert.equal(linea.tipoPrecio, "promo");
      assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id: productoId } })).inventario, 2);
      assert.equal(await puntos(), 50);

      // Al cancelar vuelven los puntos del canje y el inventario de la línea gratis.
      await prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, { transaccionId: id, estadoNuevo: "cancelado", confirmacionPago: false }, actor));
      assert.equal(await puntos(), 200);
      assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id: productoId } })).inventario, 3);
      assert.equal(await prisma.fidelidad.count({ where: { transaccionId: id, tipoMovimiento: "devolucion" } }), 1);
    } finally {
      await prisma.fidelidad.deleteMany({ where: { premioId: premio.id } });
      await prisma.premio.delete({ where: { id: premio.id } });
    }
  });
});

test("un premio de producto sin existencia se rechaza sin descontar puntos", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, pedido, producto, puntos }) => {
    const productoId = await producto(0);
    const premio = await prisma.premio.create({ data: { nombre: "Salsa agotada", tipo: "producto", costoPuntos: 100, productoId, cantidad: 1 } });
    await darPuntos(prisma, clienteId, 200);
    try {
      const id = await pedido(20);
      await assert.rejects(() => prisma.$transaction((tx) => canjearPremioEnPedido(tx, { transaccionId: id, premioId: premio.id }, actor)), /No hay existencia para el premio Salsa agotada/);
      assert.equal(await puntos(), 200);
      assert.equal(await prisma.detalleCompra.count({ where: { transaccionId: id } }), 0);
    } finally {
      await prisma.premio.delete({ where: { id: premio.id } });
    }
  });
});

test("un canje que deja el saldo en cero salda el pedido y acredita sobre la base sin el descuento", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, pedido, puntos }) => {
    const premio = await prisma.premio.create({ data: { nombre: "USD 5 de descuento", tipo: "descuento", costoPuntos: 100, montoDescuentoUsd: 5 } });
    await darPuntos(prisma, clienteId, 100);
    try {
      const id = await pedido(30);
      await prisma.$transaction((tx) => registrarAbonoEnPedido(tx, abono(id, 25), actor));
      const resultado = await prisma.$transaction((tx) => canjearPremioEnPedido(tx, { transaccionId: id, premioId: premio.id }, actor));
      assert.equal(resultado.estado, "pagado");
      assert.equal(resultado.totalUsd, 25);
      const acumulacion = await prisma.fidelidad.findFirstOrThrow({ where: { transaccionId: id, tipoMovimiento: "acumulacion" } });
      assert.equal(acumulacion.puntos, 25);
      assert.equal(await puntos(), 25);
    } finally {
      await prisma.fidelidad.deleteMany({ where: { premioId: premio.id } });
      await prisma.premio.delete({ where: { id: premio.id } });
    }
  });
});

test("dos canjes simultáneos que superan los puntos no los dejan negativos", { skip: !integrationEnabled }, async () => {
  await conCliente("detal", async ({ prisma, clienteId, pedido }) => {
    const premio = await prisma.premio.create({ data: { nombre: "USD 5 de descuento", tipo: "descuento", costoPuntos: 150, montoDescuentoUsd: 5 } });
    await darPuntos(prisma, clienteId, 200);
    try {
      const p1 = await pedido(30);
      const p2 = await pedido(30);
      const resultados = await Promise.allSettled([
        prisma.$transaction((tx) => canjearPremioEnPedido(tx, { transaccionId: p1, premioId: premio.id }, actor)),
        prisma.$transaction((tx) => canjearPremioEnPedido(tx, { transaccionId: p2, premioId: premio.id }, actor)),
      ]);
      assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(await puntosDisponiblesDelCliente(prisma as never, clienteId), 50);
    } finally {
      await prisma.fidelidad.deleteMany({ where: { premioId: premio.id } });
      await prisma.premio.delete({ where: { id: premio.id } });
    }
  });
});
