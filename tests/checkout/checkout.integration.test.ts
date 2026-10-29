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

test("checkout directo crea venta, snapshot, pago, historial, puntos y descuenta stock", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0414").slice(0, 12);
  const clave = uniqueValue("checkout-key");
  let clientId: number | undefined;
  let addressId: number | undefined;
  let productId: number | undefined;
  let transactionId: number | undefined;

  try {
    const client = await prisma.cliente.create({
      data: {
        tipoCliente: "detal",
        nombre: "Cliente",
        apellido: "Checkout",
        nombreBusqueda: "cliente checkout",
        celular,
      },
    });
    clientId = client.id;
    const address = await prisma.direccion.create({
      data: { clienteId: client.id, tipo: "Casa", urbanizacion: "Altamira", direccion: "Calle principal" },
    });
    addressId = address.id;
    const product = await prisma.producto.create({
      data: { nombre: uniqueValue("Producto checkout"), precioDetal: 10, precioMayorista: 8, categoria: "Fixture", inventario: 3 },
    });
    productId = product.id;

    const result = await checkoutModule!.procesarCompra(
      { message: "", status: "", clientId: client.id },
      {
        clientId: client.id,
        contexto: "consumidor",
        tipodeRetiro: "envio",
        direccionId: address.id,
        claveIdempotencia: clave,
        carrito: [{ productoId: product.id, cantidad: 1, precio: 10 }],
        pago: {
          metodoPago: "PagoMovil",
          montoUsd: 13,
          montoBs: 455,
          tasaCambio: 35,
          fechaPago: new Date("2026-10-15T12:00:00.000Z"),
          referencia: "REF-CHECKOUT",
        },
      },
    );

    assert.equal(result.success, true);
    if (!result.success) return;
    transactionId = result.transactionId;
    assert.equal(result.estado, "en_pedido");
    const transaction = await prisma.transaccion.findUnique({
      where: { id: result.transactionId },
      include: { detalles: true, pagos: true, historialEstados: true, fidelidades: true },
    });
    assert.equal(transaction?.montoSubtotal, 10);
    assert.equal(transaction?.montoDelivery, 3);
    assert.equal(transaction?.montoTotal, 13);
    assert.equal(transaction?.zonaEntrega, "Altamira");
    assert.equal(transaction?.direccionEntrega, "Calle principal");
    assert.equal(transaction?.detalles[0]?.precioUnitario, 10);
    assert.equal(transaction?.detalles[0]?.tipoPrecio, "detal");
    assert.equal(transaction?.pagos[0]?.referencia, "REF-CHECKOUT");
    assert.equal(transaction?.historialEstados[0]?.estadoNuevo, "en_pedido");
    assert.equal(transaction?.fidelidades[0]?.puntos, 13);
    assert.equal((await prisma.producto.findUnique({ where: { id: product.id } }))?.inventario, 2);
  } finally {
    if (transactionId) {
      await prisma.fidelidad.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.pago.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.detalleCompra.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.transaccion.delete({ where: { id: transactionId } });
    }
    if (addressId) await prisma.direccion.delete({ where: { id: addressId } });
    if (productId) await prisma.producto.delete({ where: { id: productId } });
    if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  }
});
