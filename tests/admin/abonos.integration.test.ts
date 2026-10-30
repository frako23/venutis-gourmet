import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { anularAbonoEnPedido, registrarAbonoEnPedido, type AbonoInput } from "../../lib/admin/abonos.ts";

const actor = { id: "integration", email: "integration@local" };

async function withOrder(
  estado: "por_cobrar" | "pagado" | "cancelado",
  run: (ctx: { prisma: ReturnType<typeof createIntegrationClient>; id: number; abonar: (cambios: Partial<AbonoInput>) => ReturnType<typeof registrarAbonoEnPedido> }) => Promise<void>,
) {
  const prisma = createIntegrationClient();
  let clientId: number | undefined;
  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Fixture", apellido: "Abonos", nombreBusqueda: "fixture abonos", celular: uniqueValue("0417") } });
    clientId = client.id;
    const order = await prisma.transaccion.create({ data: { numeroOrden: uniqueValue("INT-ABONO"), clienteId: client.id, montoSubtotal: 33, montoTotal: 33, estado } });
    const abonar = (cambios: Partial<AbonoInput>) =>
      prisma.$transaction((tx) => registrarAbonoEnPedido(tx, { transaccionId: order.id, moneda: "usd", monto: 20, metodoPago: "Zelle", fechaPago: new Date(), ...cambios }, actor));
    await run({ prisma, id: order.id, abonar });
  } finally {
    if (clientId !== undefined) {
      await prisma.movimientoSaldo.deleteMany({ where: { clienteId: clientId } });
      await prisma.fidelidad.deleteMany({ where: { clienteId: clientId } });
      await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccion: { clienteId: clientId } } });
      await prisma.pago.deleteMany({ where: { transaccion: { clienteId: clientId } } });
      await prisma.transaccion.deleteMany({ where: { clienteId: clientId } });
      await prisma.cliente.delete({ where: { id: clientId } });
    }
    await prisma.$disconnect();
  }
}

test("un abono parcial deja saldo y el pedido sigue por cobrar", { skip: !integrationEnabled }, async () => {
  await withOrder("por_cobrar", async ({ prisma, id, abonar }) => {
    const resultado = await abonar({});
    assert.equal(resultado.saldoUsd, 13);
    assert.equal(resultado.estado, "por_cobrar");
    const pago = await prisma.pago.findFirstOrThrow({ where: { transaccionId: id } });
    assert.equal(pago.esAbono, true);
    assert.equal(pago.actorEmail, "integration@local");
    assert.equal((await prisma.transaccion.findUniqueOrThrow({ where: { id } })).estado, "por_cobrar");
  });
});

test("un abono mayor que el saldo se rechaza con el saldo en el mensaje", { skip: !integrationEnabled }, async () => {
  await withOrder("por_cobrar", async ({ abonar }) => {
    await abonar({});
    await assert.rejects(() => abonar({}), /USD 13\.00/);
  });
});

test("el abono que salda pasa el pedido a pagado y registra el historial", { skip: !integrationEnabled }, async () => {
  await withOrder("por_cobrar", async ({ prisma, id, abonar }) => {
    await abonar({});
    const resultado = await abonar({ monto: 13 });
    assert.equal(resultado.estado, "pagado");
    assert.equal((await prisma.transaccion.findUniqueOrThrow({ where: { id } })).estado, "pagado");
    const historial = await prisma.estadoTransaccionHistorial.findFirstOrThrow({ where: { transaccionId: id } });
    assert.equal(historial.estadoAnterior, "por_cobrar");
    assert.equal(historial.estadoNuevo, "pagado");
    assert.equal(historial.motivo, "Saldado con abonos");
  });
});

test("un abono en bolívares guarda el equivalente en USD", { skip: !integrationEnabled }, async () => {
  await withOrder("por_cobrar", async ({ prisma, id, abonar }) => {
    await abonar({ moneda: "bs", monto: 3650, tasaCambio: 182.5, metodoPago: "PagoMovil" });
    const pago = await prisma.pago.findFirstOrThrow({ where: { transaccionId: id } });
    assert.equal(pago.montoUsd, 20);
    assert.equal(pago.montoBs, 3650);
    assert.equal(pago.tasaCambio, 182.5);
  });
});

test("anular un abono recalcula el saldo y deja constancia", { skip: !integrationEnabled }, async () => {
  await withOrder("por_cobrar", async ({ prisma, id, abonar }) => {
    await abonar({});
    const pago = await prisma.pago.findFirstOrThrow({ where: { transaccionId: id } });
    const resultado = await prisma.$transaction((tx) => anularAbonoEnPedido(tx, pago.id, actor));
    assert.equal(resultado.saldoUsd, 33);
    assert.ok((await prisma.pago.findUniqueOrThrow({ where: { id: pago.id } })).anuladoEn);
    const historial = await prisma.estadoTransaccionHistorial.findFirstOrThrow({ where: { transaccionId: id } });
    assert.equal(historial.estadoAnterior, historial.estadoNuevo);
    assert.equal(historial.motivo, "Abono anulado: USD 20.00 (Zelle)");
    await assert.rejects(() => prisma.$transaction((tx) => anularAbonoEnPedido(tx, pago.id, actor)), /ya fue anulado/);
  });
});

test("no se anulan abonos de un pedido pagado ni se registran en uno cancelado", { skip: !integrationEnabled }, async () => {
  await withOrder("por_cobrar", async ({ prisma, id, abonar }) => {
    await abonar({});
    const pago = await prisma.pago.findFirstOrThrow({ where: { transaccionId: id } });
    await prisma.transaccion.update({ where: { id }, data: { estado: "pagado" } });
    await assert.rejects(() => prisma.$transaction((tx) => anularAbonoEnPedido(tx, pago.id, actor)), /pedido pagado o cancelado/);
  });
  await withOrder("cancelado", async ({ abonar }) => {
    await assert.rejects(() => abonar({}), /Solo se registran abonos en pedidos por cobrar o en pedido/);
  });
});
