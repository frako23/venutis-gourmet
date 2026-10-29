import type { EstadoTransaccion, MetodoPago, Prisma } from "@prisma/client";

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
    return { previous: transaction.estado, current: transaction.estado, changedAt: transaction.createdAt, numeroOrden: transaction.numeroOrden };
  }

  const updated = await tx.transaccion.updateMany({ where: { id: transaction.id, estado: transaction.estado }, data: { estado: next } });
  if (updated.count !== 1) throw new Error("El pedido cambió mientras lo editabas. Revisa su estado actual.");

  if (input.pago) {
    await tx.pago.create({ data: { transaccionId: transaction.id, montoBs: input.pago.montoBs ?? null, montoUsd: input.pago.montoUsd ?? null, metodoPago: input.pago.metodoPago, referencia: input.pago.referencia ?? null, fechaPago: input.pago.fechaPago ?? new Date(), tasaCambio: null } });
  }
  if (isCancellation) {
    for (const { productoId, cantidad } of getRestockQuantities(transaction.detalles)) {
      await tx.producto.update({ where: { id: productoId }, data: { inventario: { increment: cantidad } } });
    }
  }
  const history = await tx.estadoTransaccionHistorial.create({
    data: { transaccionId: transaction.id, estadoAnterior: transaction.estado, estadoNuevo: next, actorId: actor.id, actorEmail: actor.email, motivo: normalizeStateReason(input.motivo) },
  });
  return { previous: transaction.estado, current: next, changedAt: history.createdAt, numeroOrden: transaction.numeroOrden };
}
