import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createIntegrationClient,
  integrationEnabled,
  uniqueValue,
} from "./test-helpers.js";

if (integrationEnabled) {
  process.env.DATABASE_URL = process.env.CHECKOUT_TEST_DATABASE_URL || process.env.ADMIN_TEST_DATABASE_URL;
}
const checkoutModule = integrationEnabled
  ? await import("../../lib/actions/checkout.js")
  : null;

test("checkout directo devuelve la misma venta en un reintento y rechaza cambios de precio o stock", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0414").slice(0, 12);
  const key = uniqueValue("idempotency");
  let clientId: number | undefined;
  let productId: number | undefined;
  let priceProductId: number | undefined;
  let transactionId: number | undefined;

  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Retry", apellido: "Checkout", nombreBusqueda: "retry checkout", celular } });
    clientId = client.id;
    const product = await prisma.producto.create({ data: { nombre: uniqueValue("Producto retry"), precioDetal: 5, precioMayorista: 4, categoria: "Fixture", inventario: 1 } });
    productId = product.id;
    const priceProduct = await prisma.producto.create({ data: { nombre: uniqueValue("Producto precio"), precioDetal: 6, precioMayorista: 5, categoria: "Fixture", inventario: 1 } });
    priceProductId = priceProduct.id;
    const input = {
      clientId: client.id,
      contexto: "consumidor" as const,
      tipodeRetiro: "recogida" as const,
      direccionId: null,
      claveIdempotencia: key,
      carrito: [{ productoId: product.id, cantidad: 1, precio: 5 }],
      pago: { metodoPago: "EfectivoUsd" as const, montoUsd: 5, montoBs: 175, tasaCambio: 35, fechaPago: null, referencia: null },
    };
    const first = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: client.id }, input);
    assert.equal(first.success, true);
    if (!first.success) return;
    transactionId = first.transactionId;
    const second = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: client.id }, input);
    assert.equal(second.success, true);
    if (!second.success) return;
    assert.equal(second.transactionId, first.transactionId);
    assert.equal(await prisma.transaccion.count({ where: { claveIdempotencia: key } }), 1);
    assert.equal((await prisma.producto.findUnique({ where: { id: product.id } }))?.inventario, 0);

    const empty = await checkoutModule!.procesarCompra(
      { message: "", status: "", clientId: client.id },
      { ...input, claveIdempotencia: uniqueValue("empty"), carrito: [] },
    );
    assert.equal(empty.success, false);
    if (!empty.success) assert.equal(empty.code, "EMPTY_CART");

    const changedPrice = await checkoutModule!.procesarCompra(
      { message: "", status: "", clientId: client.id },
      { ...input, claveIdempotencia: uniqueValue("price"), carrito: [{ productoId: priceProduct.id, cantidad: 1, precio: 999 }] },
    );
    assert.equal(changedPrice.success, false);
    if (!changedPrice.success) assert.equal(changedPrice.code, "PRICE_CHANGED");

    const insufficient = await checkoutModule!.procesarCompra(
      { message: "", status: "", clientId: client.id },
      { ...input, claveIdempotencia: uniqueValue("price"), carrito: [{ productoId: product.id, cantidad: 1, precio: 999 }] },
    );
    assert.equal(insufficient.success, false);
    if (!insufficient.success) assert.equal(insufficient.code, "STOCK_INSUFFICIENT");
  } finally {
    if (transactionId) {
      await prisma.fidelidad.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.pago.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.detalleCompra.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.transaccion.delete({ where: { id: transactionId } });
    }
    if (productId) await prisma.producto.delete({ where: { id: productId } });
    if (priceProductId) await prisma.producto.delete({ where: { id: priceProductId } });
    if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  }
});
