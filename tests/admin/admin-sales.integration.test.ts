import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";

test("venta manual revierte todas las escrituras cuando falla una línea de stock", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0414");
  const order = uniqueValue("INT-VENTA");
  let clientId: number | undefined;
  let productIds: number[] = [];
  let transactionId: number | undefined;
  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Fixture", apellido: "Venta", nombreBusqueda: "fixture venta", celular } });
    clientId = client.id;
    const available = await prisma.producto.create({ data: { nombre: uniqueValue("Producto disponible"), precioDetal: 5, precioMayorista: 4, categoria: "Fixture", inventario: 2 } });
    const empty = await prisma.producto.create({ data: { nombre: uniqueValue("Producto agotado"), precioDetal: 6, precioMayorista: 5, categoria: "Fixture", inventario: 0 } });
    productIds = [available.id, empty.id];

    await assert.rejects(() => prisma.$transaction(async (tx) => {
      const first = await tx.producto.updateMany({ where: { id: available.id, inventario: { gte: 1 } }, data: { inventario: { decrement: 1 } } });
      if (first.count !== 1) throw new Error("Stock insuficiente");
      const transaction = await tx.transaccion.create({ data: { numeroOrden: order, clienteId: client.id, montoSubtotal: 11, montoTotal: 11, estado: "por_cobrar" } });
      transactionId = transaction.id;
      await tx.detalleCompra.create({ data: { transaccionId: transaction.id, productoId: available.id, cantidad: 1, precioUnitario: 5 } });
      await tx.pago.create({ data: { transaccionId: transaction.id, montoUsd: 0, metodoPago: "EfectivoUsd" } });
      const second = await tx.producto.updateMany({ where: { id: empty.id, inventario: { gte: 1 } }, data: { inventario: { decrement: 1 } } });
      if (second.count !== 1) throw new Error("Stock insuficiente");
    }), /Stock insuficiente/);
    assert.equal((await prisma.producto.findUnique({ where: { id: available.id } }))?.inventario, 2);
    assert.equal(await prisma.transaccion.findUnique({ where: { numeroOrden: order } }), null);
    if (transactionId) assert.equal(await prisma.pago.count({ where: { transaccionId: transactionId } }), 0);
  } finally {
    await prisma.detalleCompra.deleteMany({ where: { productoId: { in: productIds } } });
    await prisma.producto.deleteMany({ where: { id: { in: productIds } } });
    if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  }
});
