import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { cargarPedidoEditable, editarPedidoEnTx, eliminarPedidoEnTx, type EdicionPedidoInput } from "../../lib/admin/order-edit.ts";

const actor = { id: "integration", email: "integration@local" };

type Opciones = { estado?: "por_cobrar" | "pagado" | "cancelado"; importada?: boolean; inventario?: number; cantidad?: number; delivery?: number; descuentoDelivery?: number; acumulacion?: number };

async function conPedido(opciones: Opciones, run: (ctx: { prisma: ReturnType<typeof createIntegrationClient>; pedidoId: number; clienteId: number; productoId: number; editar: (cambios: Partial<EdicionPedidoInput>) => ReturnType<typeof editarPedidoEnTx>; inventario: () => Promise<number | undefined> }) => Promise<void>) {
  const prisma = createIntegrationClient();
  const { estado = "por_cobrar", importada = false, inventario = 7, cantidad = 2, delivery = 0, descuentoDelivery = 0, acumulacion } = opciones;
  let clienteId: number | undefined;
  let productoId: number | undefined;
  try {
    const cliente = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Fixture", apellido: "Edicion", nombreBusqueda: "fixture edicion", celular: uniqueValue("0416") } });
    clienteId = cliente.id;
    const producto = await prisma.producto.create({ data: { nombre: uniqueValue("Producto edicion"), precioDetal: 5, precioMayorista: 4, categoria: "Fixture", inventario } });
    productoId = producto.id;
    const subtotal = cantidad * 5;
    const pedido = await prisma.transaccion.create({ data: { numeroOrden: uniqueValue("INT-EDIT"), clienteId: cliente.id, montoSubtotal: subtotal, montoDelivery: delivery, montoDescuentoDelivery: descuentoDelivery, montoTotal: subtotal + delivery - descuentoDelivery, estado, importada } });
    await prisma.detalleCompra.create({ data: { transaccionId: pedido.id, productoId: producto.id, cantidad, precioUnitario: 5, tipoPrecio: "detal" } });
    if (acumulacion) await prisma.fidelidad.create({ data: { clienteId: cliente.id, transaccionId: pedido.id, puntos: acumulacion, tipoMovimiento: "acumulacion" } });

    const editar = async (cambios: Partial<EdicionPedidoInput>) => {
      const cargado = await cargarPedidoEditable(prisma, pedido.id);
      assert.ok(cargado);
      return prisma.$transaction((tx) => editarPedidoEnTx(tx, {
        transaccionId: pedido.id,
        version: cargado.version,
        clienteId: cliente.id,
        numeroOrden: pedido.numeroOrden,
        fechaCompra: pedido.fechaCompra,
        fechaSinCambios: true,
        tipodeRetiro: "envio",
        tasaCambio: null,
        lineas: [{ productoId: producto.id, cantidad, precioUnitarioUsd: 5, tipoPrecio: "detal" }],
        descuento: null,
        confirmarCobroDiferencia: true,
        autorizarCredito: true,
        ...cambios,
      }, actor));
    };
    await run({ prisma, pedidoId: pedido.id, clienteId: cliente.id, productoId: producto.id, editar, inventario: async () => (await prisma.producto.findUnique({ where: { id: producto.id } }))?.inventario });
  } finally {
    if (clienteId !== undefined) {
      await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccion: { clienteId } } });
      await prisma.fidelidad.deleteMany({ where: { clienteId } });
      await prisma.pago.deleteMany({ where: { transaccion: { clienteId } } });
      await prisma.detalleCompra.deleteMany({ where: { transaccion: { clienteId } } });
      await prisma.transaccion.deleteMany({ where: { clienteId } });
      await prisma.cliente.delete({ where: { id: clienteId } });
    }
    if (productoId !== undefined) await prisma.producto.deleteMany({ where: { id: productoId } });
    await prisma.$disconnect();
  }
}

const linea = (productoId: number, cantidad: number) => [{ productoId, cantidad, precioUnitarioUsd: 5, tipoPrecio: "detal" as const }];

test("editar cantidades ajusta el inventario solo por la diferencia", { skip: !integrationEnabled }, async () => {
  await conPedido({ inventario: 7, cantidad: 3 }, async ({ productoId, editar, inventario }) => {
    await editar({ lineas: linea(productoId, 5) });
    assert.equal(await inventario(), 5);
    await editar({ lineas: linea(productoId, 1) });
    assert.equal(await inventario(), 9);
  });
});

test("un aumento sin existencia se rechaza sin cambiar nada", { skip: !integrationEnabled }, async () => {
  await conPedido({ inventario: 0, cantidad: 3 }, async ({ prisma, pedidoId, productoId, editar, inventario }) => {
    await assert.rejects(() => editar({ lineas: linea(productoId, 5) }), /Stock|stock|insuficiente/);
    assert.equal(await inventario(), 0);
    const lineas = await prisma.detalleCompra.findMany({ where: { transaccionId: pedidoId } });
    assert.deepEqual(lineas.map((l) => l.cantidad), [3]);
    assert.equal(await prisma.estadoTransaccionHistorial.count({ where: { transaccionId: pedidoId } }), 0);
  });
});

test("un pedido importado editado no mueve inventario", { skip: !integrationEnabled }, async () => {
  await conPedido({ inventario: 7, cantidad: 2, importada: true }, async ({ productoId, editar, inventario }) => {
    await editar({ lineas: linea(productoId, 4) });
    assert.equal(await inventario(), 7);
  });
});

test("un pedido pagado ajusta los puntos al subir y al bajar el total", { skip: !integrationEnabled }, async () => {
  await conPedido({ estado: "pagado", cantidad: 2, acumulacion: 10 }, async ({ prisma, clienteId, productoId, editar }) => {
    await editar({ lineas: linea(productoId, 3) });
    const suma = async () => (await prisma.fidelidad.aggregate({ where: { clienteId }, _sum: { puntos: true } }))._sum.puntos;
    assert.equal(await suma(), 15);
    await editar({ lineas: linea(productoId, 1) });
    assert.equal(await suma(), 5);
  });
});

test("un pedido pagado cuyo total sube exige confirmar el cobro", { skip: !integrationEnabled }, async () => {
  await conPedido({ estado: "pagado", cantidad: 2, acumulacion: 10 }, async ({ productoId, editar }) => {
    await assert.rejects(() => editar({ lineas: linea(productoId, 3), confirmarCobroDiferencia: false }), /Confirma que cobraste/);
  });
});

test("una versión distinta se rechaza sin escribir", { skip: !integrationEnabled }, async () => {
  await conPedido({ cantidad: 2 }, async ({ productoId, editar, inventario }) => {
    await assert.rejects(() => editar({ version: "0000000000000000", lineas: linea(productoId, 4) }), /cambió mientras lo editabas/);
    assert.equal(await inventario(), 7);
  });
});

test("editar un pedido con delivery conserva el delivery en el total", { skip: !integrationEnabled }, async () => {
  await conPedido({ cantidad: 2, delivery: 3 }, async ({ prisma, pedidoId, productoId, editar }) => {
    await editar({ lineas: linea(productoId, 3) });
    assert.equal((await prisma.transaccion.findUnique({ where: { id: pedidoId } }))?.montoTotal, 18);
  });
});

test("eliminar un pedido por cobrar devuelve el inventario y borra todo", { skip: !integrationEnabled }, async () => {
  await conPedido({ inventario: 7, cantidad: 3 }, async ({ prisma, pedidoId, inventario }) => {
    await prisma.pago.create({ data: { transaccionId: pedidoId, montoUsd: 15, metodoPago: "Zelle" } });
    await prisma.estadoTransaccionHistorial.create({ data: { transaccionId: pedidoId, estadoNuevo: "por_cobrar" } });
    await prisma.$transaction((tx) => eliminarPedidoEnTx(tx, { transaccionId: pedidoId, estadoEsperado: "por_cobrar", totalEsperadoUsd: 15 }));
    assert.equal(await inventario(), 10);
    assert.equal(await prisma.transaccion.findUnique({ where: { id: pedidoId } }), null);
    assert.equal(await prisma.detalleCompra.count({ where: { transaccionId: pedidoId } }), 0);
    assert.equal(await prisma.pago.count({ where: { transaccionId: pedidoId } }), 0);
  });
});

test("eliminar un pedido cancelado no devuelve inventario otra vez", { skip: !integrationEnabled }, async () => {
  await conPedido({ estado: "cancelado", inventario: 7, cantidad: 3 }, async ({ prisma, pedidoId, inventario }) => {
    await prisma.$transaction((tx) => eliminarPedidoEnTx(tx, { transaccionId: pedidoId, estadoEsperado: "cancelado", totalEsperadoUsd: 15 }));
    assert.equal(await inventario(), 7);
  });
});

test("un pedido con abono (aunque esté anulado) no se elimina", { skip: !integrationEnabled }, async () => {
  await conPedido({ inventario: 7, cantidad: 3 }, async ({ prisma, pedidoId, inventario }) => {
    await prisma.pago.create({ data: { transaccionId: pedidoId, montoUsd: 5, metodoPago: "Zelle", esAbono: true, anuladoEn: new Date() } });
    await assert.rejects(() => prisma.$transaction((tx) => eliminarPedidoEnTx(tx, { transaccionId: pedidoId, estadoEsperado: "por_cobrar", totalEsperadoUsd: 15 })), /abonos/);
    assert.ok(await prisma.transaccion.findUnique({ where: { id: pedidoId } }));
    assert.equal(await inventario(), 7);
  });
});

test("eliminar con estado o total distinto se rechaza", { skip: !integrationEnabled }, async () => {
  await conPedido({ cantidad: 3 }, async ({ prisma, pedidoId }) => {
    await assert.rejects(() => prisma.$transaction((tx) => eliminarPedidoEnTx(tx, { transaccionId: pedidoId, estadoEsperado: "en_pedido", totalEsperadoUsd: 15 })), /cambió/);
    await assert.rejects(() => prisma.$transaction((tx) => eliminarPedidoEnTx(tx, { transaccionId: pedidoId, estadoEsperado: "por_cobrar", totalEsperadoUsd: 99 })), /cambió/);
  });
});

test("editar un pedido con delivery gratis conserva el delivery y el descuento y recalcula el total", { skip: !integrationEnabled }, async () => {
  await conPedido({ delivery: 4, descuentoDelivery: 4 }, async ({ prisma, pedidoId, productoId, editar }) => {
    await editar({ lineas: [{ productoId, cantidad: 3, precioUnitarioUsd: 5, tipoPrecio: "detal" }] });
    const pedido = await prisma.transaccion.findUniqueOrThrow({ where: { id: pedidoId } });
    assert.equal(pedido.montoTotal, 15);
    assert.equal(pedido.montoDelivery, 4);
    assert.equal(pedido.montoDescuentoDelivery, 4);
  });
});
