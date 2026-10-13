"use server";

import { EstadoTransaccion, MetodoPago } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { requiresPaymentConfirmation } from "@/lib/admin/status";
import { prisma } from "@/lib/prisma";

const stateSchema = z.object({
  transaccionId: z.coerce.number().int().positive(),
  estadoNuevo: z.enum(["por_cobrar", "en_pedido", "pagado"]),
  motivo: z.string().trim().max(240).optional(),
  confirmacionPago: z.boolean().default(false),
  pago: z.object({
    montoBs: z.coerce.number().nonnegative().nullable().optional(),
    montoUsd: z.coerce.number().nonnegative().nullable().optional(),
    metodoPago: z.nativeEnum(MetodoPago),
    referencia: z.string().trim().max(120).nullable().optional(),
    fechaPago: z.coerce.date().nullable().optional(),
  }).nullable().optional(),
});

export async function actualizarEstadoPedido(formData: FormData) {
  const actor = await requireAdmin();
  let pago: unknown = null;
  const pagoRaw = formData.get("pago")?.toString().trim();
  if (pagoRaw) {
    try { pago = JSON.parse(pagoRaw); } catch { pago = null; }
  }

  const parsed = stateSchema.safeParse({
    transaccionId: formData.get("transaccionId"),
    estadoNuevo: formData.get("estadoNuevo"),
    motivo: formData.get("motivo")?.toString() || undefined,
    confirmacionPago: formData.get("confirmacionPago") === "true",
    pago,
  });
  if (!parsed.success) return { success: false as const, message: "El cambio de estado no es válido." };

  const input = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, include: { pagos: true } });
      if (!transaction) throw new Error("La venta no existe.");
      if (transaction.estado === "cancelado") throw new Error("Una venta cancelada no puede reabrirse desde este flujo.");

      const paidUsd = transaction.pagos.reduce((sum, payment) => sum + (payment.montoUsd ?? 0), 0);
      if (input.estadoNuevo === "pagado" && requiresPaymentConfirmation(transaction.montoTotal, paidUsd, input.confirmacionPago, Boolean(input.pago))) throw new Error("Confirma el pago o registra los datos del cobro antes de marcar la venta como pagada.");
      if (input.estadoNuevo === transaction.estado && !input.pago) return { previous: transaction.estado, current: transaction.estado, changedAt: transaction.createdAt };

      await tx.transaccion.update({ where: { id: transaction.id }, data: { estado: input.estadoNuevo as EstadoTransaccion } });
      if (input.pago) await tx.pago.create({ data: { transaccionId: transaction.id, montoBs: input.pago.montoBs ?? null, montoUsd: input.pago.montoUsd ?? null, metodoPago: input.pago.metodoPago, referencia: input.pago.referencia ?? null, fechaPago: input.pago.fechaPago ?? new Date(), tasaCambio: null } });
      const history = await tx.estadoTransaccionHistorial.create({ data: { transaccionId: transaction.id, estadoAnterior: transaction.estado, estadoNuevo: input.estadoNuevo as EstadoTransaccion, actorId: actor.id, actorEmail: actor.email, motivo: input.motivo ?? null } });
      return { previous: transaction.estado, current: input.estadoNuevo, changedAt: history.createdAt };
    });

    revalidatePath("/admin");
    revalidatePath("/admin/transactions");
    revalidatePath(`/admin/transactions/${input.transaccionId}`);
    return { success: true as const, transactionId: input.transaccionId, estadoAnterior: result.previous, estadoNuevo: result.current, changedAt: result.changedAt, message: "Estado actualizado correctamente." };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo actualizar el estado." };
  }
}
