import type { EstadoTransaccion, MetodoPago, Prisma, PrismaClient } from "@prisma/client";

import { bloquearCliente } from "../cliente-lock.ts";
import { acreditarPuntosPorPago } from "../fidelidad.ts";
import { roundMoney } from "./sales-calculations.ts";
import { getPaymentMethodLabel } from "./status.ts";

export { bloquearCliente };

export type PagoParaSaldo = { esAbono: boolean; montoUsd: number | null; anuladoEn: Date | null };

export type CuentasPorCobrar = {
  totalUsd: number;
  clientes: Array<{ clienteId: number; cliente: string; deudaUsd: number; pedidos: number; desde: Date }>;
};

const cents = (value: number) => Math.round(value * 100);

export function calcularAbonado(pagos: PagoParaSaldo[]) {
  return roundMoney(pagos.reduce((sum, pago) => (pago.esAbono && !pago.anuladoEn ? sum + (pago.montoUsd ?? 0) : sum), 0));
}

export function calcularSaldo({ estado, montoTotal, pagos }: { estado: EstadoTransaccion; montoTotal: number; pagos: PagoParaSaldo[] }) {
  if (estado === "pagado") return 0;
  return Math.max(0, roundMoney(montoTotal - calcularAbonado(pagos)));
}

/** Estados cuyo saldo pendiente cuenta como deuda del cliente (cuentas por cobrar). */
export const ESTADOS_CON_DEUDA = ["por_cobrar", "pendiente", "en_pedido"] as const;

/** Deuda del cliente: suma de saldos pendientes, con la misma regla que las cuentas por cobrar. */
export async function consultarDeudaCliente(db: Prisma.TransactionClient | PrismaClient, clienteId: number) {
  const pedidos = await db.transaccion.findMany({
    where: { clienteId, estado: { in: [...ESTADOS_CON_DEUDA] } },
    select: { estado: true, montoTotal: true, pagos: { select: { esAbono: true, montoUsd: true, anuladoEn: true } } },
  });
  return roundMoney(pedidos.reduce((suma, pedido) => suma + calcularSaldo(pedido), 0));
}

/** Crédito disponible y si una venta sin cobrar necesita autorización de la administradora. */
export function evaluarCredito({ habilitado, limiteUsd, deudaUsd, montoSinCobrarUsd }: { habilitado: boolean; limiteUsd: number | null; deudaUsd: number; montoSinCobrarUsd: number }) {
  const disponibleUsd = habilitado ? Math.max(0, roundMoney((limiteUsd ?? 0) - deudaUsd)) : 0;
  const requiereAutorizacion = cents(montoSinCobrarUsd) > 0 && cents(montoSinCobrarUsd) > cents(disponibleUsd);
  return { disponibleUsd, requiereAutorizacion, excesoUsd: requiereAutorizacion ? roundMoney(montoSinCobrarUsd - disponibleUsd) : 0 };
}

export function puedeRecibirAbono(estado: EstadoTransaccion) {
  return estado === "por_cobrar" || estado === "pendiente" || estado === "en_pedido";
}

export function puedeAnularAbono(estado: EstadoTransaccion) {
  return estado !== "pagado" && estado !== "cancelado";
}

export function convertirAbonoAUsd({ moneda, monto, tasaCambio }: { moneda: "usd" | "bs"; monto: number; tasaCambio: number | null | undefined }) {
  if (moneda === "usd") return roundMoney(monto);
  if (!tasaCambio || !Number.isFinite(tasaCambio) || tasaCambio <= 0) throw new Error("La tasa de cambio debe ser mayor que cero");
  return roundMoney(monto / tasaCambio);
}

export function validarMontoAbono(montoUsd: number, saldoUsd: number) {
  if (!Number.isFinite(montoUsd) || cents(montoUsd) <= 0 || cents(montoUsd) > cents(saldoUsd)) {
    throw new Error(`El abono debe ser mayor que cero y no superar el saldo pendiente (USD ${saldoUsd.toFixed(2)}).`);
  }
}

/** Reparte un abono entre lo que salda el pedido y lo que queda a favor del cliente (en centavos). */
export function dividirAbono(montoUsd: number, saldoUsd: number) {
  const aplicado = Math.min(cents(montoUsd), cents(Math.max(0, saldoUsd)));
  return { aplicadoUsd: aplicado / 100, excedenteUsd: Math.max(0, cents(montoUsd) - aplicado) / 100 };
}

/** Reparte un abono en bolívares en proporción; el último centavo queda en el excedente. */
export function repartirBs(montoBs: number, aplicadoUsd: number, montoUsd: number) {
  const pagoBs = roundMoney((montoBs * aplicadoUsd) / montoUsd);
  return { pagoBs, excedenteBs: roundMoney(montoBs - pagoBs) };
}

/** Saldo a favor vigente del cliente: suma de su libro de movimientos. */
export async function saldoAFavorDisponible(db: Prisma.TransactionClient | PrismaClient, clienteId: number) {
  const suma = await db.movimientoSaldo.aggregate({ where: { clienteId }, _sum: { montoUsd: true } });
  return roundMoney(suma._sum.montoUsd ?? 0);
}

export function validarTotalContraAbonado(totalUsd: number, abonadoUsd: number) {
  if (cents(totalUsd) < cents(abonadoUsd)) {
    throw new Error(`El descuento dejaría el total por debajo de lo ya abonado (USD ${abonadoUsd.toFixed(2)}).`);
  }
}

export function agruparCuentasPorCobrar(
  pedidos: Array<{ clienteId: number; cliente: string; fechaCompra: Date; estado: EstadoTransaccion; montoTotal: number; pagos: PagoParaSaldo[] }>,
): CuentasPorCobrar {
  const porCliente = new Map<number, CuentasPorCobrar["clientes"][number]>();
  for (const pedido of pedidos) {
    const saldo = calcularSaldo(pedido);
    if (saldo <= 0) continue;
    const actual = porCliente.get(pedido.clienteId);
    if (actual) {
      actual.deudaUsd = roundMoney(actual.deudaUsd + saldo);
      actual.pedidos += 1;
      if (pedido.fechaCompra < actual.desde) actual.desde = pedido.fechaCompra;
    } else {
      porCliente.set(pedido.clienteId, { clienteId: pedido.clienteId, cliente: pedido.cliente, deudaUsd: saldo, pedidos: 1, desde: pedido.fechaCompra });
    }
  }
  const clientes = [...porCliente.values()].sort((a, b) => b.deudaUsd - a.deudaUsd);
  return { totalUsd: roundMoney(clientes.reduce((sum, c) => sum + c.deudaUsd, 0)), clientes };
}

type Actor = { id: string; email: string | null };

export type AbonoInput = {
  transaccionId: number;
  moneda: "usd" | "bs";
  monto: number;
  tasaCambio?: number | null;
  metodoPago: MetodoPago;
  referencia?: string | null;
  fechaPago: Date;
  /** Si el abono supera el saldo, el excedente queda a favor del cliente en lugar de rechazarse. */
  permitirExcedente?: boolean;
};

/** Registra un abono con cliente y pedido bloqueados; si salda el pedido lo pasa a "Pagado". */
export async function registrarAbonoEnPedido(tx: Prisma.TransactionClient, input: AbonoInput, actor: Actor) {
  const previo = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, select: { clienteId: true } });
  if (!previo) throw new Error("La venta no existe.");
  await bloquearCliente(tx, previo.clienteId);
  await tx.$queryRaw`SELECT "id" FROM "Transaccion" WHERE "id" = ${input.transaccionId} FOR UPDATE`;
  const pedido = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, include: { pagos: true } });
  if (!pedido) throw new Error("La venta no existe.");
  if (!puedeRecibirAbono(pedido.estado)) throw new Error("Solo se registran abonos en pedidos por cobrar o en pedido.");

  const montoUsd = convertirAbonoAUsd({ moneda: input.moneda, monto: input.monto, tasaCambio: input.tasaCambio });
  const saldoActual = calcularSaldo(pedido);
  const permiteExcedente = input.permitirExcedente === true && input.metodoPago !== "SaldoAFavor";
  const { aplicadoUsd, excedenteUsd } = permiteExcedente ? dividirAbono(montoUsd, saldoActual) : { aplicadoUsd: montoUsd, excedenteUsd: 0 };
  validarMontoAbono(aplicadoUsd, saldoActual);

  const enBs = input.moneda === "bs";
  const reparto = enBs && excedenteUsd > 0 ? repartirBs(input.monto, aplicadoUsd, montoUsd) : null;
  const pago = await tx.pago.create({
    data: {
      transaccionId: pedido.id,
      esAbono: true,
      montoUsd: aplicadoUsd,
      montoBs: enBs ? (reparto ? reparto.pagoBs : roundMoney(input.monto)) : null,
      tasaCambio: enBs ? input.tasaCambio ?? null : null,
      metodoPago: input.metodoPago,
      referencia: input.referencia?.trim() || null,
      fechaPago: input.fechaPago,
      actorId: actor.id,
      actorEmail: actor.email,
    },
  });
  if (excedenteUsd > 0) {
    await tx.movimientoSaldo.create({
      data: {
        clienteId: pedido.clienteId,
        montoUsd: excedenteUsd,
        origen: "sobrepago",
        transaccionId: pedido.id,
        pagoId: pago.id,
        metodoPago: input.metodoPago,
        referencia: input.referencia?.trim() || null,
        fechaPago: input.fechaPago,
        montoBs: reparto ? reparto.excedenteBs : null,
        tasaCambio: enBs ? input.tasaCambio ?? null : null,
        actorId: actor.id,
        actorEmail: actor.email,
      },
    });
  }

  const saldoUsd = Math.max(0, roundMoney(saldoActual - aplicadoUsd));
  let estado: EstadoTransaccion = pedido.estado;
  if (saldoUsd === 0) {
    const actualizado = await tx.transaccion.updateMany({ where: { id: pedido.id, estado: pedido.estado }, data: { estado: "pagado" } });
    if (actualizado.count !== 1) throw new Error("El pedido cambió mientras lo editabas. Revisa su estado actual.");
    await tx.estadoTransaccionHistorial.create({
      data: { transaccionId: pedido.id, estadoAnterior: pedido.estado, estadoNuevo: "pagado", actorId: actor.id, actorEmail: actor.email, motivo: "Saldado con abonos" },
    });
    estado = "pagado";
    await acreditarPuntosPorPago(tx, pedido.id);
  }
  return { abonadoUsd: roundMoney(calcularAbonado(pedido.pagos) + aplicadoUsd), saldoUsd, estado, numeroOrden: pedido.numeroOrden, pagoId: pago.id, excedenteUsd, clienteId: pedido.clienteId };
}

/** Anula un abono (queda registrado como anulado) y deja constancia en el historial del pedido. */
export async function anularAbonoEnPedido(tx: Prisma.TransactionClient, pagoId: number, actor: Actor) {
  const pago = await tx.pago.findUnique({ where: { id: pagoId } });
  if (!pago || !pago.esAbono || pago.anuladoEn) throw new Error("El abono no existe o ya fue anulado.");

  const previo = await tx.transaccion.findUnique({ where: { id: pago.transaccionId }, select: { clienteId: true } });
  if (!previo) throw new Error("La venta no existe.");
  await bloquearCliente(tx, previo.clienteId);
  await tx.$queryRaw`SELECT "id" FROM "Transaccion" WHERE "id" = ${pago.transaccionId} FOR UPDATE`;
  const pedido = await tx.transaccion.findUnique({ where: { id: pago.transaccionId }, include: { pagos: true } });
  if (!pedido) throw new Error("La venta no existe.");
  if (!puedeAnularAbono(pedido.estado)) {
    throw new Error('No se puede anular un abono de un pedido pagado o cancelado. Si el cobro se revirtió, pasa el pedido a "Por cobrar" primero.');
  }

  // Un sobrepago ligado a este abono se revierte, pero solo si ese saldo a favor no se ha usado.
  const sobrepago = await tx.movimientoSaldo.findUnique({ where: { pagoId } });
  if (sobrepago?.origen === "sobrepago" && cents(await saldoAFavorDisponible(tx, pedido.clienteId)) < cents(sobrepago.montoUsd)) {
    throw new Error("No se puede anular: el excedente de este abono ya se usó. Revierte primero la aplicación de ese saldo.");
  }

  const anulado = await tx.pago.updateMany({ where: { id: pagoId, anuladoEn: null }, data: { anuladoEn: new Date() } });
  if (anulado.count !== 1) throw new Error("El abono no existe o ya fue anulado.");
  if (pago.metodoPago === "SaldoAFavor") {
    await tx.movimientoSaldo.create({
      data: { clienteId: pedido.clienteId, montoUsd: pago.montoUsd ?? 0, origen: "anulacion", transaccionId: pedido.id, motivo: "Anulación de saldo aplicado", actorId: actor.id, actorEmail: actor.email },
    });
  }
  if (sobrepago?.origen === "sobrepago") {
    await tx.movimientoSaldo.create({
      data: { clienteId: pedido.clienteId, montoUsd: -sobrepago.montoUsd, origen: "anulacion", transaccionId: pedido.id, motivo: "Anulación del excedente del abono", actorId: actor.id, actorEmail: actor.email },
    });
  }
  await tx.estadoTransaccionHistorial.create({
    data: {
      transaccionId: pedido.id,
      estadoAnterior: pedido.estado,
      estadoNuevo: pedido.estado,
      actorId: actor.id,
      actorEmail: actor.email,
      motivo: `Abono anulado: USD ${(pago.montoUsd ?? 0).toFixed(2)} (${getPaymentMethodLabel(pago.metodoPago)})`,
    },
  });
  const restante = pedido.pagos.map((p) => (p.id === pagoId ? { ...p, anuladoEn: new Date() } : p));
  return { abonadoUsd: calcularAbonado(restante), saldoUsd: calcularSaldo({ estado: pedido.estado, montoTotal: pedido.montoTotal, pagos: restante }) };
}
