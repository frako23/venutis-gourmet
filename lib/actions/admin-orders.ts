"use server";

import { MetodoPago } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { aplicarCambioEstadoPedido } from "@/lib/admin/order-state-change";
import { prisma } from "@/lib/prisma";

const stateSchema = z.object({
  transaccionId: z.coerce.number().int().positive(),
  estadoNuevo: z.enum(["por_cobrar", "en_pedido", "pagado", "cancelado"]),
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
    const result = await prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, input, actor));

    revalidatePath("/admin");
    revalidatePath("/admin/transactions");
    revalidatePath(`/admin/transactions/${input.transaccionId}`);
    const canceled = result.current === "cancelado";
    if (canceled) revalidatePath("/admin/inventory");
    return { success: true as const, transactionId: input.transaccionId, estadoAnterior: result.previous, estadoNuevo: result.current, changedAt: result.changedAt, message: canceled ? `Pedido ${result.numeroOrden} cancelado. El inventario se actualizó.` : "Estado actualizado correctamente." };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo actualizar el estado." };
  }
}
