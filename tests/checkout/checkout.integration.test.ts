import assert from "node:assert/strict";
import { test } from "node:test";

import { claveZona } from "../../lib/delivery-zone-rules.js";
import {
  createIntegrationClient,
  integrationEnabled,
  uniqueValue,
} from "./test-helpers.js";

if (integrationEnabled) {
  process.env.DATABASE_URL = process.env.CHECKOUT_TEST_DATABASE_URL || process.env.ADMIN_TEST_DATABASE_URL;
}
// Se prueba el núcleo transaccional (la acción solo le añade la sesión del cliente).
const checkoutModule = integrationEnabled
  ? await import("../../lib/checkout-core.js").then((core) => ({
      procesarCompra: (_estado: unknown, datos: Parameters<typeof core.registrarCompraWeb>[0], clienteSesionId: number | null = null) => core.registrarCompraWeb(datos, { clienteSesionId }),
    }))
  : null;

test("checkout directo crea venta, snapshot, pago, historial y descuenta stock sin acreditar puntos", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0414");
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
    // Los puntos se acreditan cuando el pedido queda pagado, no al crearlo.
    assert.equal(transaction?.fidelidades.length, 0);
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

test("con sesión vinculada el pedido queda en el cliente de la sesión, no en el que envía el navegador", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const clientes: number[] = [];
  let productId: number | undefined;
  let transactionId: number | undefined;
  try {
    const crear = async (apellido: string) =>
      (await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Cliente", apellido, nombreBusqueda: `cliente ${apellido}`, celular: uniqueValue("0414") } })).id;
    const sesion = await crear("Sesion");
    const otro = await crear("Ajeno");
    clientes.push(sesion, otro);
    const product = await prisma.producto.create({ data: { nombre: uniqueValue("Producto sesión"), precioDetal: 10, precioMayorista: 8, categoria: "Fixture", inventario: 3 } });
    productId = product.id;

    const result = await checkoutModule!.procesarCompra(
      { message: "", status: "", clientId: otro },
      {
        clientId: otro,
        contexto: "consumidor",
        tipodeRetiro: "recogida",
        direccionId: null,
        claveIdempotencia: uniqueValue("checkout-sesion"),
        carrito: [{ productoId: product.id, cantidad: 1, precio: 10 }],
        pago: { metodoPago: "EfectivoUsd", montoUsd: 10, montoBs: 350, tasaCambio: 35 },
      },
      sesion,
    );
    assert.equal(result.success, true);
    if (!result.success) return;
    transactionId = result.transactionId;
    assert.equal(result.clientId, sesion);
    assert.equal((await prisma.transaccion.findUniqueOrThrow({ where: { id: result.transactionId } })).clienteId, sesion);
  } finally {
    if (transactionId) {
      await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.pago.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.detalleCompra.deleteMany({ where: { transaccionId: transactionId } });
      await prisma.transaccion.delete({ where: { id: transactionId } });
    }
    if (productId) await prisma.producto.delete({ where: { id: productId } });
    await prisma.cliente.deleteMany({ where: { id: { in: clientes } } });
    await prisma.$disconnect();
  }
});

// ---- Beneficios (puntos y saldo a favor) en el checkout ----

async function conBeneficios(run: (ctx: { prisma: ReturnType<typeof createIntegrationClient>; clienteId: number; productoId: number; puntos: () => Promise<number>; saldo: () => Promise<number> }) => Promise<void>) {
  const prisma = createIntegrationClient();
  let clienteId: number | undefined;
  let productoId: number | undefined;
  try {
    clienteId = (await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Cliente", apellido: "Beneficios", nombreBusqueda: "cliente beneficios", celular: uniqueValue("0414") } })).id;
    productoId = (await prisma.producto.create({ data: { nombre: uniqueValue("Producto beneficios"), precioDetal: 10, precioMayorista: 8, categoria: "Fixture", inventario: 10 } })).id;
    const id = clienteId;
    await run({
      prisma,
      clienteId: id,
      productoId,
      puntos: async () => (await prisma.fidelidad.aggregate({ where: { clienteId: id }, _sum: { puntos: true } }))._sum.puntos ?? 0,
      saldo: async () => (await prisma.movimientoSaldo.aggregate({ where: { clienteId: id }, _sum: { montoUsd: true } }))._sum.montoUsd ?? 0,
    });
  } finally {
    if (clienteId) {
      const pedidos = await prisma.transaccion.findMany({ where: { clienteId }, select: { id: true } });
      const ids = pedidos.map((p) => p.id);
      await prisma.movimientoSaldo.deleteMany({ where: { clienteId } });
      await prisma.fidelidad.deleteMany({ where: { clienteId } });
      await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccionId: { in: ids } } });
      await prisma.pago.deleteMany({ where: { transaccionId: { in: ids } } });
      await prisma.detalleCompra.deleteMany({ where: { transaccionId: { in: ids } } });
      await prisma.transaccion.deleteMany({ where: { id: { in: ids } } });
      await prisma.cliente.delete({ where: { id: clienteId } });
    }
    await prisma.premio.deleteMany({ where: { nombre: { startsWith: "Premio checkout" } } });
    if (productoId) await prisma.producto.delete({ where: { id: productoId } });
    await prisma.$disconnect();
  }
}

const compra = (clienteId: number, productoId: number, cantidad: number, extra: Record<string, unknown> = {}) => ({
  clientId: clienteId,
  contexto: "consumidor" as const,
  tipodeRetiro: "recogida" as const,
  direccionId: null,
  claveIdempotencia: uniqueValue("checkout-ben"),
  carrito: [{ productoId, cantidad, precio: 10 }],
  pago: { metodoPago: "Zelle" as const, montoUsd: cantidad * 10, montoBs: cantidad * 350, tasaCambio: 35, fechaPago: new Date("2026-10-15T12:00:00.000Z"), referencia: "REF-BEN" },
  ...extra,
});

const darSaldo = (prisma: ReturnType<typeof createIntegrationClient>, clienteId: number, montoUsd: number) =>
  prisma.movimientoSaldo.create({ data: { clienteId, montoUsd, origen: "ajuste", motivo: "Saldo inicial de prueba" } });
const darPuntos = (prisma: ReturnType<typeof createIntegrationClient>, clienteId: number, puntos: number) =>
  prisma.fidelidad.create({ data: { clienteId, tipoMovimiento: "ajuste", puntos, motivo: "Puntos iniciales de prueba" } });

test("con sesión, un canje de descuento y saldo parcial bajan lo que se declara pagar", { skip: !integrationEnabled }, async () => {
  await conBeneficios(async ({ prisma, clienteId, productoId, puntos, saldo }) => {
    await darSaldo(prisma, clienteId, 10);
    await darPuntos(prisma, clienteId, 250);
    const premio = await prisma.premio.create({ data: { nombre: "Premio checkout descuento", tipo: "descuento", costoPuntos: 200, montoDescuentoUsd: 5 } });
    // 3 x USD 10 = 30; premio -5 y saldo -10 => por pagar 15.
    const datos = compra(clienteId, productoId, 3, {
      beneficios: { premioIds: [premio.id], saldoAFavorUsd: 10 },
      pago: { metodoPago: "Zelle", montoUsd: 15, montoBs: 525, tasaCambio: 35, fechaPago: new Date("2026-10-15T12:00:00.000Z"), referencia: "REF-PARCIAL" },
    });
    const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, datos as never, clienteId);
    assert.equal(resultado.success, true);
    if (!resultado.success) return;
    assert.equal(resultado.estado, "en_pedido");
    const pedido = await prisma.transaccion.findUniqueOrThrow({ where: { id: resultado.transactionId }, include: { pagos: true } });
    assert.equal(pedido.montoDescuentoPuntos, 5);
    assert.equal(pedido.montoTotal, 25);
    assert.equal(pedido.pagos.filter((p) => p.metodoPago === "SaldoAFavor" && p.esAbono).length, 1);
    assert.equal(pedido.pagos.find((p) => !p.esAbono)?.montoUsd, 15);
    assert.equal(await puntos(), 50);
    assert.equal(await saldo(), 0);
  });
});

test("si el saldo a favor cubre todo el pedido no se declara pago y nace pagado con puntos", { skip: !integrationEnabled }, async () => {
  await conBeneficios(async ({ prisma, clienteId, productoId, puntos, saldo }) => {
    await darSaldo(prisma, clienteId, 40);
    const datos = compra(clienteId, productoId, 3, { beneficios: { premioIds: [], saldoAFavorUsd: 30 }, pago: null });
    const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, datos as never, clienteId);
    assert.equal(resultado.success, true);
    if (!resultado.success) return;
    assert.equal(resultado.estado, "pagado");
    const pedido = await prisma.transaccion.findUniqueOrThrow({ where: { id: resultado.transactionId }, include: { pagos: true } });
    assert.equal(pedido.estado, "pagado");
    assert.equal(pedido.pagos.every((p) => p.metodoPago === "SaldoAFavor"), true);
    assert.equal(await saldo(), 10);
    assert.equal(await puntos(), 30);
    // Reproducir la misma confirmación devuelve el mismo pedido.
    const repetido = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, datos as never, clienteId);
    assert.equal(repetido.success && repetido.transactionId, resultado.transactionId);
  });
});

test("usar beneficios sin sesión vinculada se rechaza sin escribir nada", { skip: !integrationEnabled }, async () => {
  await conBeneficios(async ({ prisma, clienteId, productoId, saldo }) => {
    await darSaldo(prisma, clienteId, 10);
    const datos = compra(clienteId, productoId, 1, { beneficios: { premioIds: [], saldoAFavorUsd: 5 } });
    const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, datos as never, null);
    assert.equal(resultado.success, false);
    if (resultado.success) return;
    assert.equal(resultado.code, "BENEFITS_UNAVAILABLE");
    assert.equal(await prisma.transaccion.count({ where: { clienteId } }), 0);
    assert.equal(await saldo(), 10);
  });
});

test("si el saldo ya no alcanza al confirmar, la compra se rechaza sin descontar nada", { skip: !integrationEnabled }, async () => {
  await conBeneficios(async ({ prisma, clienteId, productoId, saldo }) => {
    await darSaldo(prisma, clienteId, 10);
    // Otra operación gastó el saldo antes de confirmar.
    await prisma.movimientoSaldo.create({ data: { clienteId, montoUsd: -8, origen: "ajuste", motivo: "Gasto concurrente de prueba" } });
    const datos = compra(clienteId, productoId, 1, { beneficios: { premioIds: [], saldoAFavorUsd: 10 }, pago: null });
    const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, datos as never, clienteId);
    assert.equal(resultado.success, false);
    if (resultado.success) return;
    assert.equal(resultado.code, "BENEFITS_CHANGED");
    assert.equal(await prisma.transaccion.count({ where: { clienteId } }), 0);
    assert.equal(await saldo(), 2);
    assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id: productoId } })).inventario, 10);
  });
});

test("un premio de producto sin existencia hace fallar la compra completa", { skip: !integrationEnabled }, async () => {
  await conBeneficios(async ({ prisma, clienteId, productoId, puntos }) => {
    await darPuntos(prisma, clienteId, 300);
    const agotado = await prisma.producto.create({ data: { nombre: uniqueValue("Producto agotado"), precioDetal: 5, precioMayorista: 4, categoria: "Fixture", inventario: 0 } });
    const premio = await prisma.premio.create({ data: { nombre: "Premio checkout producto", tipo: "producto", costoPuntos: 100, productoId: agotado.id, cantidad: 1 } });
    try {
      const datos = compra(clienteId, productoId, 1, { beneficios: { premioIds: [premio.id], saldoAFavorUsd: 0 } });
      const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, datos as never, clienteId);
      assert.equal(resultado.success, false);
      if (resultado.success) return;
      assert.equal(resultado.code, "BENEFITS_CHANGED");
      assert.equal(await prisma.transaccion.count({ where: { clienteId } }), 0);
      assert.equal(await puntos(), 300);
      assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id: productoId } })).inventario, 10);
    } finally {
      await prisma.premio.delete({ where: { id: premio.id } });
      await prisma.producto.delete({ where: { id: agotado.id } });
    }
  });
});

// Escenario común del delivery contra una zona creada en la prueba (no la lista fija de antes).
async function pedidoConZona(opciones: { activa: boolean; costoUsd: number; pagoUsd: number }) {
  const prisma = createIntegrationClient();
  const nombre = uniqueValue("Zona prueba");
  const ids: { zona?: number; cliente?: number; direccion?: number; producto?: number; transaccion?: number } = {};
  const clave = uniqueValue("checkout-zona");
  try {
    const zona = await prisma.zonaDelivery.create({
      data: { nombre, clave: claveZona(nombre), costoUsd: opciones.costoUsd, activa: opciones.activa },
    });
    ids.zona = zona.id;
    const cliente = await prisma.cliente.create({
      data: { tipoCliente: "detal", nombre: "Cliente", apellido: "Zona", nombreBusqueda: "cliente zona", celular: uniqueValue("0414") },
    });
    ids.cliente = cliente.id;
    // La dirección guarda el nombre en mayúsculas: la zona se resuelve por clave, no por texto exacto.
    const direccion = await prisma.direccion.create({
      data: { clienteId: cliente.id, tipo: "Casa", urbanizacion: nombre.toUpperCase(), direccion: "Calle zona" },
    });
    ids.direccion = direccion.id;
    const producto = await prisma.producto.create({
      data: { nombre: uniqueValue("Producto zona"), precioDetal: 10, precioMayorista: 8, categoria: "Fixture", inventario: 3 },
    });
    ids.producto = producto.id;

    const result = await checkoutModule!.procesarCompra(
      { message: "", status: "", clientId: cliente.id },
      {
        clientId: cliente.id,
        contexto: "consumidor",
        tipodeRetiro: "envio",
        direccionId: direccion.id,
        claveIdempotencia: clave,
        carrito: [{ productoId: producto.id, cantidad: 1, precio: 10 }],
        pago: {
          metodoPago: "PagoMovil",
          montoUsd: opciones.pagoUsd,
          montoBs: opciones.pagoUsd * 35,
          tasaCambio: 35,
          fechaPago: new Date("2026-10-15T12:00:00.000Z"),
          referencia: "REF-ZONA",
        },
      },
    );
    if (result.success) ids.transaccion = result.transactionId;
    return {
      result,
      nombre,
      transaccion: ids.transaccion
        ? await prisma.transaccion.findUnique({ where: { id: ids.transaccion } })
        : null,
      pedidosConClave: await prisma.transaccion.count({ where: { claveIdempotencia: clave } }),
      inventario: (await prisma.producto.findUniqueOrThrow({ where: { id: producto.id } })).inventario,
    };
  } finally {
    if (ids.transaccion) {
      await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccionId: ids.transaccion } });
      await prisma.pago.deleteMany({ where: { transaccionId: ids.transaccion } });
      await prisma.detalleCompra.deleteMany({ where: { transaccionId: ids.transaccion } });
      await prisma.transaccion.delete({ where: { id: ids.transaccion } });
    }
    if (ids.direccion) await prisma.direccion.delete({ where: { id: ids.direccion } });
    if (ids.producto) await prisma.producto.delete({ where: { id: ids.producto } });
    if (ids.cliente) await prisma.cliente.delete({ where: { id: ids.cliente } });
    if (ids.zona) await prisma.zonaDelivery.delete({ where: { id: ids.zona } });
    await prisma.$disconnect();
  }
}

test("el delivery se cobra con el costo de la zona guardada en la base y conserva su nombre", { skip: !integrationEnabled }, async () => {
  const { result, nombre, transaccion } = await pedidoConZona({ activa: true, costoUsd: 4.5, pagoUsd: 14.5 });
  assert.equal(result.success, true);
  assert.equal(transaccion?.montoDelivery, 4.5);
  assert.equal(transaccion?.montoTotal, 14.5);
  assert.equal(transaccion?.zonaEntrega, nombre);
});

test("una zona inactiva rechaza el pedido sin crearlo ni tocar el inventario", { skip: !integrationEnabled }, async () => {
  const { result, pedidosConClave, inventario } = await pedidoConZona({ activa: false, costoUsd: 4.5, pagoUsd: 14.5 });
  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.code, "INVALID_ADDRESS");
  assert.equal(result.message, "Tu sector ya no tiene delivery. Elige otro sector o retira en tienda.");
  assert.equal(pedidosConClave, 0);
  assert.equal(inventario, 3);
});

/** Cliente con sesión, producto de USD 10, una zona de USD 4 con su dirección y puntos iniciales. */
async function conDeliveryGratis(run: (ctx: { prisma: ReturnType<typeof createIntegrationClient>; clienteId: number; productoId: number; direccionId: number; premioId: number; puntos: () => Promise<number>; saldo: () => Promise<number> }) => Promise<void>) {
  await conBeneficios(async ({ prisma, clienteId, productoId, puntos, saldo }) => {
    const nombre = uniqueValue("Zona Premio");
    const zona = await prisma.zonaDelivery.create({ data: { nombre, clave: claveZona(nombre), costoUsd: 4, activa: true } });
    const direccion = await prisma.direccion.create({ data: { clienteId, tipo: "Casa", urbanizacion: nombre, direccion: "Calle de prueba" } });
    const premio = await prisma.premio.create({ data: { nombre: "Premio checkout Delivery gratis", tipo: "delivery", costoPuntos: 100, compraMinimaUsd: 15 } });
    await prisma.fidelidad.create({ data: { clienteId, tipoMovimiento: "ajuste", puntos: 120, motivo: "Puntos iniciales de prueba" } });
    try {
      await run({ prisma, clienteId, productoId, direccionId: direccion.id, premioId: premio.id, puntos, saldo });
    } finally {
      // Los pedidos de la prueba referencian la dirección solo por texto; conBeneficios los borra después.
      await prisma.fidelidad.deleteMany({ where: { premioId: premio.id } });
      await prisma.premio.delete({ where: { id: premio.id } });
      await prisma.zonaDelivery.delete({ where: { id: zona.id } });
      await prisma.direccion.deleteMany({ where: { clienteId } });
    }
  });
}

const compraConEnvio = (clienteId: number, productoId: number, direccionId: number, cantidad: number, premioIds: number[], extra: Record<string, unknown> = {}) =>
  compra(clienteId, productoId, cantidad, {
    tipodeRetiro: "envio" as const,
    direccionId,
    beneficios: { premioIds, saldoAFavorUsd: 0 },
    pago: { metodoPago: "Zelle" as const, montoUsd: cantidad * 10, montoBs: cantidad * 350, tasaCambio: 35, fechaPago: new Date("2026-10-15T12:00:00.000Z"), referencia: "REF-DELIVERY" },
    ...extra,
  });

test("delivery gratis: el pedido conserva el delivery, descuenta aparte y los puntos del premio", { skip: !integrationEnabled }, async () => {
  await conDeliveryGratis(async ({ prisma, clienteId, productoId, direccionId, premioId, puntos }) => {
    const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, compraConEnvio(clienteId, productoId, direccionId, 2, [premioId]) as never, clienteId);
    assert.equal(resultado.success, true);
    if (!resultado.success) return;
    const pedido = await prisma.transaccion.findUniqueOrThrow({ where: { id: resultado.transactionId } });
    assert.equal(pedido.montoDelivery, 4);
    assert.equal(pedido.montoDescuentoDelivery, 4);
    assert.equal(pedido.montoDescuentoPuntos, 0);
    assert.equal(pedido.montoTotal, 20);
    const canje = await prisma.fidelidad.findFirstOrThrow({ where: { transaccionId: pedido.id, tipoMovimiento: "redencion" } });
    assert.equal(canje.puntos, -100);
    assert.equal(await puntos(), 20);

    // Al quedar pagado gana los puntos de sus productos, igual que si hubiera pagado el delivery.
    await prisma.transaccion.update({ where: { id: pedido.id }, data: { estado: "pagado" } });
    const { acreditarPuntosPorPago } = await import("../../lib/fidelidad.js");
    assert.equal(await prisma.$transaction((tx) => acreditarPuntosPorPago(tx, pedido.id)), 20);
  });
});

test("delivery gratis en retiro en tienda se rechaza sin escribir nada", { skip: !integrationEnabled }, async () => {
  await conDeliveryGratis(async ({ prisma, clienteId, productoId, premioId, puntos }) => {
    const datos = compra(clienteId, productoId, 2, { beneficios: { premioIds: [premioId], saldoAFavorUsd: 0 } });
    const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, datos as never, clienteId);
    assert.equal(resultado.success, false);
    if (resultado.success) return;
    assert.equal(resultado.code, "BENEFITS_CHANGED");
    assert.equal(await prisma.transaccion.count({ where: { clienteId } }), 0);
    assert.equal(await puntos(), 120);
    assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id: productoId } })).inventario, 10);
  });
});

test("delivery gratis bajo la compra mínima se rechaza sin escribir nada", { skip: !integrationEnabled }, async () => {
  await conDeliveryGratis(async ({ prisma, clienteId, productoId, direccionId, premioId, puntos }) => {
    const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, compraConEnvio(clienteId, productoId, direccionId, 1, [premioId]) as never, clienteId);
    assert.equal(resultado.success, false);
    if (resultado.success) return;
    assert.equal(resultado.code, "BENEFITS_CHANGED");
    assert.equal(await prisma.transaccion.count({ where: { clienteId } }), 0);
    assert.equal(await puntos(), 120);
  });
});

test("dos premios de delivery en el mismo pedido se rechazan", { skip: !integrationEnabled }, async () => {
  await conDeliveryGratis(async ({ prisma, clienteId, productoId, direccionId, premioId, puntos }) => {
    const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, compraConEnvio(clienteId, productoId, direccionId, 2, [premioId, premioId]) as never, clienteId);
    assert.equal(resultado.success, false);
    assert.equal(await prisma.transaccion.count({ where: { clienteId } }), 0);
    assert.equal(await puntos(), 120);
  });
});

test("delivery gratis junto con un descuento y saldo a favor", { skip: !integrationEnabled }, async () => {
  await conDeliveryGratis(async ({ prisma, clienteId, productoId, direccionId, premioId, puntos, saldo }) => {
    await darSaldo(prisma, clienteId, 3);
    await darPuntos(prisma, clienteId, 100);
    const descuento = await prisma.premio.create({ data: { nombre: "Premio checkout descuento 5", tipo: "descuento", costoPuntos: 50, montoDescuentoUsd: 5 } });
    try {
      // 3 x 10 = 30 + delivery 4; premios -5 y -4; saldo -3 => por pagar 22.
      const datos = compraConEnvio(clienteId, productoId, direccionId, 3, [premioId, descuento.id], {
        beneficios: { premioIds: [premioId, descuento.id], saldoAFavorUsd: 3 },
        pago: { metodoPago: "Zelle", montoUsd: 22, montoBs: 770, tasaCambio: 35, fechaPago: new Date("2026-10-15T12:00:00.000Z"), referencia: "REF-COMBO" },
      });
      const resultado = await checkoutModule!.procesarCompra({ message: "", status: "", clientId: clienteId }, datos as never, clienteId);
      assert.equal(resultado.success, true);
      if (!resultado.success) return;
      const pedido = await prisma.transaccion.findUniqueOrThrow({ where: { id: resultado.transactionId } });
      assert.equal(pedido.montoTotal, 25);
      assert.equal(pedido.montoDescuentoDelivery, 4);
      assert.equal(pedido.montoDescuentoPuntos, 5);
      assert.equal(await puntos(), 220 - 150);
      assert.equal(await saldo(), 0);
    } finally {
      await prisma.fidelidad.deleteMany({ where: { premioId: descuento.id } });
      await prisma.premio.delete({ where: { id: descuento.id } });
    }
  });
});
