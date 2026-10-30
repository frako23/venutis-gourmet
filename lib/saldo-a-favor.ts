import type { MetodoPago, Prisma } from "@prisma/client";

import {
  calcularAbonado,
  calcularSaldo,
  convertirAbonoAUsd,
  dividirAbono,
  registrarAbonoEnPedido,
  repartirBs,
  saldoAFavorDisponible,
} from "./admin/abonos.ts";
import { roundMoney } from "./admin/sales-calculations.ts";
import { bloquearCliente } from "./cliente-lock.ts";

export { bloquearCliente, dividirAbono, repartirBs, saldoAFavorDisponible };

type Actor = { id: string; email: string | null };

const cents = (valor: number) => Math.round(valor * 100);
const usdTexto = (valor: number) => `USD ${valor.toFixed(2)}`;

/** Saldo a favor: suma de los movimientos del libro (créditos positivos, usos negativos). */
export function calcularSaldoAFavor(movimientos: Array<{ montoUsd: number }>) {
  return roundMoney(movimientos.reduce((suma, movimiento) => suma + movimiento.montoUsd, 0));
}

/** Valida que se pueda aplicar `montoUsd` de saldo a favor a un pedido con ese saldo pendiente. */
export function validarAplicacionSaldo({ montoUsd, disponibleUsd, saldoPedidoUsd }: { montoUsd: number; disponibleUsd: number; saldoPedidoUsd: number }) {
  if (!Number.isFinite(montoUsd) || cents(montoUsd) <= 0) throw new Error("El monto a aplicar debe ser mayor que cero.");
  if (cents(montoUsd) > cents(disponibleUsd)) throw new Error(`Solo tienes ${usdTexto(disponibleUsd)} a favor.`);
  if (cents(montoUsd) > cents(saldoPedidoUsd)) throw new Error(`El pedido solo debe ${usdTexto(saldoPedidoUsd)}.`);
}

export type PagoACuentaInput = {
  clienteId: number;
  moneda: "usd" | "bs";
  monto: number;
  tasaCambio?: number | null;
  metodoPago: MetodoPago;
  referencia?: string | null;
  fechaPago: Date;
};

/** Registra dinero recibido sin pedido: queda como saldo a favor del cliente. */
export async function registrarPagoACuenta(tx: Prisma.TransactionClient, input: PagoACuentaInput, actor: Actor) {
  await bloquearCliente(tx, input.clienteId);
  const montoUsd = convertirAbonoAUsd({ moneda: input.moneda, monto: input.monto, tasaCambio: input.tasaCambio });
  if (cents(montoUsd) <= 0) throw new Error("El pago debe ser mayor que cero.");
  await tx.movimientoSaldo.create({
    data: {
      clienteId: input.clienteId,
      montoUsd,
      origen: "pago_cuenta",
      metodoPago: input.metodoPago,
      referencia: input.referencia?.trim() || null,
      fechaPago: input.fechaPago,
      montoBs: input.moneda === "bs" ? roundMoney(input.monto) : null,
      tasaCambio: input.moneda === "bs" ? input.tasaCambio ?? null : null,
      actorId: actor.id,
      actorEmail: actor.email,
    },
  });
  return { saldoAFavorUsd: await saldoAFavorDisponible(tx, input.clienteId) };
}

/**
 * Aplica saldo a favor a un pedido pendiente. Cuenta como un abono (método `SaldoAFavor`), así que
 * si salda el pedido lo pasa a "Pagado" con la regla de siempre. `actor` es nulo cuando lo hace el cliente.
 */
export async function aplicarSaldoAFavorEnPedido(tx: Prisma.TransactionClient, input: { transaccionId: number; montoUsd: number }, actor: Actor | null) {
  const previo = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, select: { clienteId: true } });
  if (!previo) throw new Error("La venta no existe.");
  await bloquearCliente(tx, previo.clienteId);

  const pedido = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, include: { pagos: true } });
  if (!pedido) throw new Error("La venta no existe.");
  validarAplicacionSaldo({ montoUsd: input.montoUsd, disponibleUsd: await saldoAFavorDisponible(tx, previo.clienteId), saldoPedidoUsd: calcularSaldo(pedido) });

  const abono = await registrarAbonoEnPedido(
    tx,
    { transaccionId: pedido.id, moneda: "usd", monto: input.montoUsd, metodoPago: "SaldoAFavor", fechaPago: new Date() },
    actor ?? { id: "cliente", email: null },
  );
  await tx.movimientoSaldo.create({
    data: {
      clienteId: previo.clienteId,
      montoUsd: -roundMoney(input.montoUsd),
      origen: "aplicacion_pedido",
      transaccionId: pedido.id,
      pagoId: abono.pagoId,
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
    },
  });
  return abono;
}

/** Ajuste manual (con signo) del saldo a favor. El saldo nunca puede quedar negativo. */
export async function ajustarSaldoAFavor(tx: Prisma.TransactionClient, input: { clienteId: number; montoUsd: number; motivo: string }, actor: Actor) {
  const motivo = input.motivo.trim();
  if (motivo.length < 3 || motivo.length > 240) throw new Error("El motivo debe tener entre 3 y 240 caracteres.");
  if (!Number.isFinite(input.montoUsd) || cents(input.montoUsd) === 0) throw new Error("El ajuste no puede ser cero.");
  await bloquearCliente(tx, input.clienteId);
  const actual = await saldoAFavorDisponible(tx, input.clienteId);
  if (cents(actual) + cents(input.montoUsd) < 0) throw new Error("El ajuste dejaría el saldo a favor en negativo.");
  await tx.movimientoSaldo.create({
    data: { clienteId: input.clienteId, montoUsd: roundMoney(input.montoUsd), origen: "ajuste", motivo, actorId: actor.id, actorEmail: actor.email },
  });
  return { saldoAFavorUsd: roundMoney(actual + input.montoUsd) };
}

/** Al cancelar un pedido, lo que se había abonado pasa al saldo a favor del cliente. Devuelve el monto. */
export async function devolverAbonosDeCancelacion(
  tx: Prisma.TransactionClient,
  pedido: { id: number; clienteId: number; pagos: Array<{ esAbono: boolean; montoUsd: number | null; anuladoEn: Date | null }> },
  actor: Actor,
) {
  const abonado = calcularAbonado(pedido.pagos);
  if (cents(abonado) <= 0) return 0;
  await tx.movimientoSaldo.create({
    data: { clienteId: pedido.clienteId, montoUsd: abonado, origen: "pedido_cancelado", transaccionId: pedido.id, actorId: actor.id, actorEmail: actor.email },
  });
  return abonado;
}
