import type { EstadoTransaccion, MetodoPago, Prisma } from "@prisma/client";

import { roundMoney } from "./sales-calculations.ts";
import { getPaymentMethodLabel } from "./status.ts";

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
};

/** Registra un abono con la fila del pedido bloqueada; si salda el pedido lo pasa a "Pagado". */
export async function registrarAbonoEnPedido(tx: Prisma.TransactionClient, input: AbonoInput, actor: Actor) {
  await tx.$queryRaw`SELECT "id" FROM "Transaccion" WHERE "id" = ${input.transaccionId} FOR UPDATE`;
  const pedido = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, include: { pagos: true } });
  if (!pedido) throw new Error("La venta no existe.");
  if (!puedeRecibirAbono(pedido.estado)) throw new Error("Solo se registran abonos en pedidos por cobrar o en pedido.");

  const montoUsd = convertirAbonoAUsd({ moneda: input.moneda, monto: input.monto, tasaCambio: input.tasaCambio });
  const saldoActual = calcularSaldo(pedido);
  validarMontoAbono(montoUsd, saldoActual);

  await tx.pago.create({
    data: {
      transaccionId: pedido.id,
      esAbono: true,
      montoUsd,
      montoBs: input.moneda === "bs" ? roundMoney(input.monto) : null,
      tasaCambio: input.moneda === "bs" ? input.tasaCambio ?? null : null,
      metodoPago: input.metodoPago,
      referencia: input.referencia?.trim() || null,
      fechaPago: input.fechaPago,
      actorId: actor.id,
      actorEmail: actor.email,
    },
  });

  const saldoUsd = Math.max(0, roundMoney(saldoActual - montoUsd));
  let estado: EstadoTransaccion = pedido.estado;
  if (saldoUsd === 0) {
    const actualizado = await tx.transaccion.updateMany({ where: { id: pedido.id, estado: pedido.estado }, data: { estado: "pagado" } });
    if (actualizado.count !== 1) throw new Error("El pedido cambió mientras lo editabas. Revisa su estado actual.");
    await tx.estadoTransaccionHistorial.create({
      data: { transaccionId: pedido.id, estadoAnterior: pedido.estado, estadoNuevo: "pagado", actorId: actor.id, actorEmail: actor.email, motivo: "Saldado con abonos" },
    });
    estado = "pagado";
  }
  return { abonadoUsd: roundMoney(calcularAbonado(pedido.pagos) + montoUsd), saldoUsd, estado, numeroOrden: pedido.numeroOrden };
}

/** Anula un abono (queda registrado como anulado) y deja constancia en el historial del pedido. */
export async function anularAbonoEnPedido(tx: Prisma.TransactionClient, pagoId: number, actor: Actor) {
  const pago = await tx.pago.findUnique({ where: { id: pagoId } });
  if (!pago || !pago.esAbono || pago.anuladoEn) throw new Error("El abono no existe o ya fue anulado.");

  await tx.$queryRaw`SELECT "id" FROM "Transaccion" WHERE "id" = ${pago.transaccionId} FOR UPDATE`;
  const pedido = await tx.transaccion.findUnique({ where: { id: pago.transaccionId }, include: { pagos: true } });
  if (!pedido) throw new Error("La venta no existe.");
  if (!puedeAnularAbono(pedido.estado)) {
    throw new Error('No se puede anular un abono de un pedido pagado o cancelado. Si el cobro se revirtió, pasa el pedido a "Por cobrar" primero.');
  }

  const anulado = await tx.pago.updateMany({ where: { id: pagoId, anuladoEn: null }, data: { anuladoEn: new Date() } });
  if (anulado.count !== 1) throw new Error("El abono no existe o ya fue anulado.");
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
