import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { anularAbonoEnPedido, registrarAbonoEnPedido, saldoAFavorDisponible } from "../../lib/admin/abonos.ts";
import { aplicarCambioEstadoPedido } from "../../lib/admin/order-state-change.ts";
import { aplicarSaldoAFavorEnPedido, ajustarSaldoAFavor, registrarPagoACuenta } from "../../lib/saldo-a-favor.ts";

const actor = { id: "integration", email: "integration@local" };

async function conCliente(run: (ctx: { prisma: ReturnType<typeof createIntegrationClient>; clienteId: number; pedido: (total: number, extra?: { estado?: "por_cobrar" | "en_pedido" | "pagado"; importada?: boolean }) => Promise<number> }) => Promise<void>) {
  const prisma = createIntegrationClient();
  let clienteId: number | undefined;
  try {
    const cliente = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Fixture", apellido: "Saldo", nombreBusqueda: "fixture saldo", celular: uniqueValue("0414") } });
    clienteId = cliente.id;
    const pedido = async (total: number, extra: { estado?: "por_cobrar" | "en_pedido" | "pagado"; importada?: boolean } = {}) => {
      const creado = await prisma.transaccion.create({
        data: { numeroOrden: uniqueValue("INT-SAF"), clienteId: cliente.id, montoSubtotal: total, montoTotal: total, estado: extra.estado ?? "por_cobrar", importada: extra.importada ?? false },
      });
      return creado.id;
    };
    await run({ prisma, clienteId: cliente.id, pedido });
  } finally {
    if (clienteId) {
      const pedidos = await prisma.transaccion.findMany({ where: { clienteId }, select: { id: true } });
      const ids = pedidos.map((p) => p.id);
      await prisma.movimientoSaldo.deleteMany({ where: { clienteId } });
      await prisma.fidelidad.deleteMany({ where: { clienteId } });
      await prisma.pago.deleteMany({ where: { transaccionId: { in: ids } } });
      await prisma.transaccion.deleteMany({ where: { id: { in: ids } } });
      await prisma.cliente.delete({ where: { id: clienteId } });
    }
    await prisma.$disconnect();
  }
}

const abono = (transaccionId: number, monto: number, extra: Record<string, unknown> = {}) => ({ transaccionId, moneda: "usd" as const, monto, metodoPago: "Zelle" as const, fechaPago: new Date(), ...extra });

test("un abono mayor que el saldo deja el excedente a favor y salda el pedido", { skip: !integrationEnabled }, async () => {
  await conCliente(async ({ prisma, clienteId, pedido }) => {
    const id = await pedido(18);
    const resultado = await prisma.$transaction((tx) => registrarAbonoEnPedido(tx, abono(id, 20, { permitirExcedente: true }), actor));
    assert.equal(resultado.estado, "pagado");
    assert.equal(resultado.excedenteUsd, 2);
    const pagos = await prisma.pago.findMany({ where: { transaccionId: id } });
    assert.equal(pagos.length, 1);
    assert.equal(pagos[0].montoUsd, 18);
    const movimiento = await prisma.movimientoSaldo.findFirstOrThrow({ where: { clienteId } });
    assert.equal(movimiento.origen, "sobrepago");
    assert.equal(movimiento.montoUsd, 2);
    assert.equal(movimiento.pagoId, pagos[0].id);
    assert.equal(await saldoAFavorDisponible(prisma, clienteId), 2);
  });
});

test("sin permitir excedente el abono mayor que el saldo se rechaza sin escribir nada", { skip: !integrationEnabled }, async () => {
  await conCliente(async ({ prisma, clienteId, pedido }) => {
    const id = await pedido(18);
    await assert.rejects(() => prisma.$transaction((tx) => registrarAbonoEnPedido(tx, abono(id, 20), actor)), /no superar el saldo pendiente/);
    assert.equal(await prisma.pago.count({ where: { transaccionId: id } }), 0);
    assert.equal(await prisma.movimientoSaldo.count({ where: { clienteId } }), 0);
  });
});

test("un pago a cuenta en bolívares se convierte a USD con la tasa", { skip: !integrationEnabled }, async () => {
  await conCliente(async ({ prisma, clienteId }) => {
    const resultado = await prisma.$transaction((tx) => registrarPagoACuenta(tx, { clienteId, moneda: "bs", monto: 4000, tasaCambio: 40, metodoPago: "PagoMovil", referencia: "REF-9", fechaPago: new Date() }, actor));
    assert.equal(resultado.saldoAFavorUsd, 100);
    const movimiento = await prisma.movimientoSaldo.findFirstOrThrow({ where: { clienteId } });
    assert.equal(movimiento.origen, "pago_cuenta");
    assert.equal(movimiento.montoBs, 4000);
    assert.equal(movimiento.tasaCambio, 40);
  });
});

test("aplicar saldo a favor salda el pedido y descuenta el saldo", { skip: !integrationEnabled }, async () => {
  await conCliente(async ({ prisma, clienteId, pedido }) => {
    await prisma.$transaction((tx) => ajustarSaldoAFavor(tx, { clienteId, montoUsd: 50, motivo: "Saldo inicial de prueba" }, actor));
    const id = await pedido(35);
    const resultado = await prisma.$transaction((tx) => aplicarSaldoAFavorEnPedido(tx, { transaccionId: id, montoUsd: 35 }, actor));
    assert.equal(resultado.estado, "pagado");
    const pago = await prisma.pago.findFirstOrThrow({ where: { transaccionId: id } });
    assert.equal(pago.metodoPago, "SaldoAFavor");
    assert.equal(pago.esAbono, true);
    assert.equal(await saldoAFavorDisponible(prisma, clienteId), 15);
    // No se puede aplicar más de lo que hay a favor.
    const otro = await pedido(40);
    await assert.rejects(() => prisma.$transaction((tx) => aplicarSaldoAFavorEnPedido(tx, { transaccionId: otro, montoUsd: 16 }, actor)), /Solo tienes USD 15\.00 a favor/);
  });
});

test("cancelar un pedido con abonos los devuelve al saldo a favor, también si es importado", { skip: !integrationEnabled }, async () => {
  await conCliente(async ({ prisma, clienteId, pedido }) => {
    const normal = await pedido(30);
    await prisma.$transaction((tx) => registrarAbonoEnPedido(tx, abono(normal, 10), actor));
    const cancelacion = await prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, { transaccionId: normal, estadoNuevo: "cancelado", confirmacionPago: false }, actor));
    assert.equal(cancelacion.saldoDevueltoUsd, 10);

    const importado = await pedido(30, { importada: true });
    await prisma.$transaction((tx) => registrarAbonoEnPedido(tx, abono(importado, 7), actor));
    await prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, { transaccionId: importado, estadoNuevo: "cancelado", confirmacionPago: false }, actor));

    const movimientos = await prisma.movimientoSaldo.findMany({ where: { clienteId, origen: "pedido_cancelado" }, orderBy: { id: "asc" } });
    assert.deepEqual(movimientos.map((m) => m.montoUsd), [10, 7]);
    assert.equal(await saldoAFavorDisponible(prisma, clienteId), 17);
  });
});

test("anular un abono revierte su excedente solo si ese saldo no se ha usado", { skip: !integrationEnabled }, async () => {
  await conCliente(async ({ prisma, clienteId, pedido }) => {
    const a = await pedido(18);
    const abonoA = await prisma.$transaction((tx) => registrarAbonoEnPedido(tx, abono(a, 20, { permitirExcedente: true }), actor));
    // El pedido vuelve a "Por cobrar" (cobro revertido) para poder anular el abono.
    await prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, { transaccionId: a, estadoNuevo: "por_cobrar", confirmacionPago: false }, actor));

    // El excedente (USD 2) se gasta en otro pedido: la anulación se rechaza.
    const b = await pedido(5);
    await prisma.$transaction((tx) => aplicarSaldoAFavorEnPedido(tx, { transaccionId: b, montoUsd: 2 }, actor));
    await assert.rejects(() => prisma.$transaction((tx) => anularAbonoEnPedido(tx, abonoA.pagoId, actor)), /el excedente de este abono ya se usó/);
    assert.equal((await prisma.pago.findUniqueOrThrow({ where: { id: abonoA.pagoId } })).anuladoEn, null);

    // Se revierte la aplicación (anula el abono de saldo) y entonces sí se puede anular el abono original.
    const abonoSaldo = await prisma.pago.findFirstOrThrow({ where: { transaccionId: b, metodoPago: "SaldoAFavor" } });
    await prisma.$transaction((tx) => anularAbonoEnPedido(tx, abonoSaldo.id, actor));
    assert.equal(await saldoAFavorDisponible(prisma, clienteId), 2);
    await prisma.$transaction((tx) => anularAbonoEnPedido(tx, abonoA.pagoId, actor));
    assert.equal(await saldoAFavorDisponible(prisma, clienteId), 0);
  });
});

test("dos aplicaciones simultáneas que superan el saldo no lo dejan negativo", { skip: !integrationEnabled }, async () => {
  await conCliente(async ({ prisma, clienteId, pedido }) => {
    await prisma.$transaction((tx) => ajustarSaldoAFavor(tx, { clienteId, montoUsd: 10, motivo: "Saldo inicial de prueba" }, actor));
    const p1 = await pedido(10);
    const p2 = await pedido(10);
    const resultados = await Promise.allSettled([
      prisma.$transaction((tx) => aplicarSaldoAFavorEnPedido(tx, { transaccionId: p1, montoUsd: 10 }, actor)),
      prisma.$transaction((tx) => aplicarSaldoAFavorEnPedido(tx, { transaccionId: p2, montoUsd: 10 }, actor)),
    ]);
    assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(resultados.filter((r) => r.status === "rejected").length, 1);
    assert.equal(await saldoAFavorDisponible(prisma, clienteId), 0);
  });
});

test("un ajuste que dejaría el saldo negativo se rechaza", { skip: !integrationEnabled }, async () => {
  await conCliente(async ({ prisma, clienteId }) => {
    await prisma.$transaction((tx) => ajustarSaldoAFavor(tx, { clienteId, montoUsd: 5, motivo: "Saldo inicial de prueba" }, actor));
    await assert.rejects(() => prisma.$transaction((tx) => ajustarSaldoAFavor(tx, { clienteId, montoUsd: -5.01, motivo: "Corrección" }, actor)), /en negativo/);
    assert.equal(await saldoAFavorDisponible(prisma, clienteId), 5);
  });
});
