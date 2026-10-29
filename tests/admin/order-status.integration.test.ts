import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { aplicarCambioEstadoPedido, type OrderStateChangeInput } from "../../lib/admin/order-state-change.ts";

const actor = { id: "integration", email: "integration@local" };

async function withFixture(
  run: (ctx: { prisma: ReturnType<typeof createIntegrationClient>; products: [number, number]; orderId: (estado: "por_cobrar" | "en_pedido" | "pagado") => Promise<number>; change: (id: number, input: Omit<OrderStateChangeInput, "transaccionId">) => Promise<Awaited<ReturnType<typeof aplicarCambioEstadoPedido>>>; stock: (id: number) => Promise<number | undefined> }) => Promise<void>,
) {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0415").slice(0, 12);
  let clientId: number | undefined;
  let productIds: number[] = [];
  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Fixture", apellido: "Estado", nombreBusqueda: "fixture estado", celular } });
    clientId = client.id;
    const a = await prisma.producto.create({ data: { nombre: uniqueValue("Producto A"), precioDetal: 5, precioMayorista: 4, categoria: "Fixture", inventario: 10 } });
    const b = await prisma.producto.create({ data: { nombre: uniqueValue("Producto B"), precioDetal: 6, precioMayorista: 5, categoria: "Fixture", inventario: 20 } });
    productIds = [a.id, b.id];
    const orderId = async (estado: "por_cobrar" | "en_pedido" | "pagado") => {
      const transaction = await prisma.transaccion.create({ data: { numeroOrden: uniqueValue("INT-ESTADO"), clienteId: client.id, montoSubtotal: 28, montoTotal: 28, estado } });
      await prisma.detalleCompra.createMany({ data: [{ transaccionId: transaction.id, productoId: a.id, cantidad: 2, precioUnitario: 5 }, { transaccionId: transaction.id, productoId: b.id, cantidad: 3, precioUnitario: 6 }] });
      await prisma.pago.create({ data: { transaccionId: transaction.id, montoUsd: 5, metodoPago: "EfectivoUsd" } });
      return transaction.id;
    };
    const change = (id: number, input: Omit<OrderStateChangeInput, "transaccionId">) => prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, { transaccionId: id, ...input }, actor));
    const stock = async (id: number) => (await prisma.producto.findUnique({ where: { id }, select: { inventario: true } }))?.inventario;
    await run({ prisma, products: [a.id, b.id], orderId, change, stock });
  } finally {
    await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccion: { clienteId } } });
    await prisma.pago.deleteMany({ where: { transaccion: { clienteId } } });
    await prisma.detalleCompra.deleteMany({ where: { productoId: { in: productIds } } });
    await prisma.transaccion.deleteMany({ where: { clienteId } });
    await prisma.producto.deleteMany({ where: { id: { in: productIds } } });
    if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  }
}

test("cambio de estado persiste historial y respeta confirmación de pago", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ prisma, orderId, change }) => {
    const id = await orderId("por_cobrar");
    const result = await change(id, { estadoNuevo: "en_pedido", confirmacionPago: false });
    assert.equal(result.current, "en_pedido");
    const history = await prisma.estadoTransaccionHistorial.findMany({ where: { transaccionId: id } });
    assert.equal(history.length, 1);
    assert.equal(history[0].estadoAnterior, "por_cobrar");
    assert.equal(history[0].actorId, "integration");
    assert.equal(history[0].motivo, null);

    await assert.rejects(() => change(id, { estadoNuevo: "pagado", confirmacionPago: false }), /Confirma explícitamente el cobro/);
    await prisma.transaccion.update({ where: { id }, data: { estado: "pendiente" } });
    await assert.rejects(() => change(id, { estadoNuevo: "pagado", confirmacionPago: false }), /Confirma explícitamente el cobro/);

    await prisma.transaccion.update({ where: { id }, data: { estado: "en_pedido" } });
    const before = await prisma.estadoTransaccionHistorial.count({ where: { transaccionId: id } });
    await change(id, { estadoNuevo: "en_pedido", confirmacionPago: false });
    assert.equal(await prisma.estadoTransaccionHistorial.count({ where: { transaccionId: id } }), before);
  });
});

test("cancelar devuelve el inventario una sola vez y conserva líneas y pagos", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ prisma, products, orderId, change, stock }) => {
    const id = await orderId("por_cobrar");
    const [a, b] = products;
    const result = await change(id, { estadoNuevo: "cancelado", motivo: "   ", confirmacionPago: false });
    assert.equal(result.current, "cancelado");
    assert.equal(await stock(a), 12);
    assert.equal(await stock(b), 23);
    const history = await prisma.estadoTransaccionHistorial.findFirstOrThrow({ where: { transaccionId: id } });
    assert.equal(history.estadoAnterior, "por_cobrar");
    assert.equal(history.estadoNuevo, "cancelado");
    assert.equal(history.motivo, null);
    assert.equal(await prisma.detalleCompra.count({ where: { transaccionId: id } }), 2);
    assert.equal(await prisma.pago.count({ where: { transaccionId: id } }), 1);

    await assert.rejects(() => change(id, { estadoNuevo: "cancelado", confirmacionPago: false }), /ya está cancelado/);
    await assert.rejects(() => change(id, { estadoNuevo: "en_pedido", confirmacionPago: false }), /ya está cancelado/);
    assert.equal(await stock(a), 12);
  });
});

test("cancelar guarda la razón escrita y recorta los espacios", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ prisma, orderId, change }) => {
    const id = await orderId("en_pedido");
    await change(id, { estadoNuevo: "cancelado", motivo: "  El cliente desistió  ", confirmacionPago: false });
    const history = await prisma.estadoTransaccionHistorial.findFirstOrThrow({ where: { transaccionId: id } });
    assert.equal(history.motivo, "El cliente desistió");
  });
});

test("dos cancelaciones concurrentes devuelven el inventario una sola vez", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ products, orderId, change, stock }) => {
    const id = await orderId("por_cobrar");
    const results = await Promise.allSettled([
      change(id, { estadoNuevo: "cancelado", confirmacionPago: false }),
      change(id, { estadoNuevo: "cancelado", confirmacionPago: false }),
    ]);
    assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(await stock(products[0]), 12);
    assert.equal(await stock(products[1]), 23);
  });
});

test("no se cancela un pedido pagado ni se acepta un pago al cancelar", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ products, orderId, change, stock }) => {
    const paid = await orderId("pagado");
    await assert.rejects(() => change(paid, { estadoNuevo: "cancelado", confirmacionPago: false }), /Solo se pueden cancelar pedidos por cobrar o en pedido/);
    const open = await orderId("por_cobrar");
    await assert.rejects(() => change(open, { estadoNuevo: "cancelado", confirmacionPago: false, pago: { metodoPago: "EfectivoUsd", montoUsd: 5 } }), /No se puede registrar un pago al cancelar/);
    assert.equal(await stock(products[0]), 10);
  });
});
