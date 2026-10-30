"use server";

import { MetodoPago } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { anularAbonoEnPedido, registrarAbonoEnPedido } from "@/lib/admin/abonos";
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
    revalidatePath("/admin/clients", "layout");
    revalidatePath("/mi-cuenta");
    const aFavor = result.saldoDevueltoUsd > 0 ? ` USD ${result.saldoDevueltoUsd.toFixed(2)} quedaron a favor del cliente.` : "";
    return { success: true as const, transactionId: input.transaccionId, estadoAnterior: result.previous, estadoNuevo: result.current, changedAt: result.changedAt, message: canceled ? `Pedido ${result.numeroOrden} cancelado. El inventario se actualizó.${aFavor}` : "Estado actualizado correctamente." };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo actualizar el estado." };
  }
}

const abonoSchema = z
  .object({
    transaccionId: z.coerce.number().int().positive(),
    moneda: z.enum(["usd", "bs"]),
    monto: z.coerce.number().positive().refine((value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6, "El monto admite como máximo 2 decimales."),
    tasaCambio: z.coerce.number().positive().nullable().optional(),
    metodoPago: z.nativeEnum(MetodoPago).refine((metodo) => metodo !== "NoEspecificado" && metodo !== "SaldoAFavor", "Elige el método de pago."),
    permitirExcedente: z.boolean().default(false),
    referencia: z.string().trim().max(120).nullable().optional(),
    fechaPago: z.coerce.date().refine((fecha) => fecha.getTime() <= Date.now() + 24 * 60 * 60 * 1000, "La fecha no puede ser posterior a hoy."),
  })
  .superRefine((value, ctx) => {
    if (value.moneda === "bs" && !value.tasaCambio) ctx.addIssue({ code: "custom", path: ["tasaCambio"], message: "La tasa de cambio es obligatoria para abonos en bolívares." });
  });

function revalidarPedido(transaccionId: number) {
  revalidatePath("/admin");
  revalidatePath("/admin/transactions");
  revalidatePath(`/admin/transactions/${transaccionId}`);
}

export async function registrarAbono(formData: FormData) {
  const actor = await requireAdmin();
  const tasa = formData.get("tasaCambio")?.toString().trim();
  const parsed = abonoSchema.safeParse({
    transaccionId: formData.get("transaccionId"),
    moneda: formData.get("moneda"),
    monto: formData.get("monto"),
    tasaCambio: tasa ? tasa : null,
    metodoPago: formData.get("metodoPago"),
    referencia: formData.get("referencia")?.toString() || null,
    fechaPago: formData.get("fechaPago") || new Date().toISOString(),
    permitirExcedente: formData.get("permitirExcedente") === "true",
  });
  if (!parsed.success) return { success: false as const, message: "Revisa los datos del abono." };

  try {
    const result = await prisma.$transaction((tx) => registrarAbonoEnPedido(tx, parsed.data, actor));
    revalidarPedido(parsed.data.transaccionId);
    revalidatePath(`/admin/clients/${result.clienteId}`);
    revalidatePath("/mi-cuenta");
    const aFavor = result.excedenteUsd > 0 ? ` y USD ${result.excedenteUsd.toFixed(2)} quedaron a favor del cliente` : "";
    const message = result.estado === "pagado" ? `Abono registrado. El pedido ${result.numeroOrden} quedó pagado${aFavor}.` : `Abono registrado. Saldo pendiente: USD ${result.saldoUsd.toFixed(2)}.`;
    return { success: true as const, message, abonadoUsd: result.abonadoUsd, saldoUsd: result.saldoUsd, estado: result.estado, excedenteUsd: result.excedenteUsd };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo registrar el abono." };
  }
}

export async function anularAbono(formData: FormData) {
  const actor = await requireAdmin();
  const parsed = z.object({ pagoId: z.coerce.number().int().positive(), transaccionId: z.coerce.number().int().positive() }).safeParse({ pagoId: formData.get("pagoId"), transaccionId: formData.get("transaccionId") });
  if (!parsed.success) return { success: false as const, message: "El abono no es válido." };

  try {
    const result = await prisma.$transaction((tx) => anularAbonoEnPedido(tx, parsed.data.pagoId, actor));
    revalidarPedido(parsed.data.transaccionId);
    return { success: true as const, message: `Abono anulado. Saldo pendiente: USD ${result.saldoUsd.toFixed(2)}.` };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo anular el abono." };
  }
}
