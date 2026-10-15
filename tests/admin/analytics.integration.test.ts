import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";

test("analítica de fixture excluye transacciones canceladas", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0416").slice(0, 12);
  let clientId: number | undefined;
  let productId: number | undefined;
  let transactionIds: number[] = [];
  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Fixture", apellido: "Analytics", nombreBusqueda: "fixture analytics", celular } });
    clientId = client.id;
    const product = await prisma.producto.create({ data: { nombre: uniqueValue("Producto analytics"), precioDetal: 10, precioMayorista: 8, categoria: "Fixture", inventario: 10 } });
    productId = product.id;
    const active = await prisma.transaccion.create({ data: { numeroOrden: uniqueValue("INT-ACTIVA"), clienteId: client.id, montoSubtotal: 10, montoTotal: 10, estado: "pagado", detalles: { create: { productoId: product.id, cantidad: 1, precioUnitario: 10 } } } });
    const canceled = await prisma.transaccion.create({ data: { numeroOrden: uniqueValue("INT-CANCELADA"), clienteId: client.id, montoSubtotal: 50, montoTotal: 50, estado: "cancelado", detalles: { create: { productoId: product.id, cantidad: 5, precioUnitario: 10 } } } });
    transactionIds = [active.id, canceled.id];
    const lines = await prisma.detalleCompra.findMany({ where: { transaccion: { id: { in: [active.id, canceled.id] }, estado: { not: "cancelado" } } } });
    assert.equal(lines.reduce((sum, line) => sum + line.cantidad * line.precioUnitario, 0), 10);
  } finally {
    if (productId) await prisma.detalleCompra.deleteMany({ where: { productoId: productId } });
    if (transactionIds.length) await prisma.transaccion.deleteMany({ where: { id: { in: transactionIds } } });
    if (productId) await prisma.producto.delete({ where: { id: productId } });
    if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  }
});
