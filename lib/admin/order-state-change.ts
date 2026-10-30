import type { EstadoTransaccion, MetodoPago, Prisma } from "@prisma/client";

import { bloquearCliente } from "../cliente-lock.ts";
import { ajustarInventario } from "../inventory.ts";
import { acreditarPuntosPorPago, revertirPuntosDePedido } from "../fidelidad.ts";
import { devolverAbonosDeCancelacion } from "../saldo-a-favor.ts";
import { canCancelOrder, getRestockQuantities, normalizeStateReason, requiresExplicitPaymentConfirmation } from "./status.ts";

export type OrderStateChangeInput = {
  transaccionId: number;
  estadoNuevo: "por_cobrar" | "en_pedido" | "pagado" | "cancelado";
  motivo?: string | null;
  confirmacionPago: boolean;
  pago?: {
    montoBs?: number | null;
    montoUsd?: number | null;
    metodoPago: MetodoPago;
    referencia?: string | null;
    fechaPago?: Date | null;
  } | null;
};

export async function aplicarCambioEstadoPedido(
  tx: Prisma.TransactionClient,
  input: OrderStateChangeInput,
  actor: { id: string; email: string | null },
) {
  // Orden de bloqueo: Cliente y luego pedido. Así los abonos y el saldo a favor leídos abajo son los vigentes.
  const previo = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, select: { clienteId: true } });
  if (!previo) throw new Error("La venta no existe.");
  await bloquearCliente(tx, previo.clienteId);
  const transaction = await tx.transaccion.findUnique({
    where: { id: input.transaccionId },
    include: { pagos: true, detalles: { select: { productoId: true, cantidad: true } } },
  });
  if (!transaction) throw new Error("La venta no existe.");
  if (transaction.estado === "cancelado") throw new Error("El pedido ya está cancelado y no admite cambios.");

  const next = input.estadoNuevo as EstadoTransaccion;
  const isCancellation = next === "cancelado";
  if (isCancellation) {
    if (!canCancelOrder(transaction.estado)) throw new Error("Solo se pueden cancelar pedidos por cobrar o en pedido.");
    if (input.pago) throw new Error("No se puede registrar un pago al cancelar un pedido.");
  }
  if (requiresExplicitPaymentConfirmation(transaction.estado, next, input.confirmacionPago)) {
    throw new Error("Confirma explícitamente el cobro antes de marcar la venta como pagada.");
  }
  if (next === transaction.estado && !input.pago) {
    return { previous: transaction.estado, current: transaction.estado, changedAt: transaction.createdAt, numeroOrden: transaction.numeroOrden, saldoDevueltoUsd: 0 };
  }

  const updated = await tx.transaccion.updateMany({ where: { id: transaction.id, estado: transaction.estado }, data: { estado: next } });
  if (updated.count !== 1) throw new Error("El pedido cambió mientras lo editabas. Revisa su estado actual.");

  if (input.pago) {
    await tx.pago.create({ data: { transaccionId: transaction.id, montoBs: input.pago.montoBs ?? null, montoUsd: input.pago.montoUsd ?? null, metodoPago: input.pago.metodoPago, referencia: input.pago.referencia ?? null, fechaPago: input.pago.fechaPago ?? new Date(), tasaCambio: null } });
  }
  let saldoDevueltoUsd = 0;
  if (isCancellation) {
    saldoDevueltoUsd = await devolverAbonosDeCancelacion(tx, transaction, actor);
    await revertirPuntosDePedido(tx, { transaccionId: transaction.id, clienteId: transaction.clienteId, numeroOrden: transaction.numeroOrden }, actor);
  }
  if (isCancellation && !transaction.importada) {
    const restock = getRestockQuantities(transaction.detalles).sort((a, b) => a.productoId - b.productoId);
    for (const { productoId, cantidad } of restock) {
      await ajustarInventario(tx, productoId, cantidad, { exigirStock: false });
    }
  }
  if (next === "pagado") await acreditarPuntosPorPago(tx, transaction.id);
  const history = await tx.estadoTransaccionHistorial.create({
    data: { transaccionId: transaction.id, estadoAnterior: transaction.estado, estadoNuevo: next, actorId: actor.id, actorEmail: actor.email, motivo: normalizeStateReason(input.motivo) },
  });
  return { previous: transaction.estado, current: next, changedAt: history.createdAt, numeroOrden: transaction.numeroOrden, saldoDevueltoUsd };
}
