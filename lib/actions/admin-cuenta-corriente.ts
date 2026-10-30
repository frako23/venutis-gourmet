"use server";

import { MetodoPago } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { aplicarSaldoAFavorEnPedido, ajustarSaldoAFavor, registrarPagoACuenta as registrarPagoACuentaEnTx } from "@/lib/saldo-a-favor";

const dosDecimales = (valor: number) => Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
const usdTexto = (valor: number) => `USD ${valor.toFixed(2)}`;

const metodoDeCobro = z
  .nativeEnum(MetodoPago)
  .refine((metodo) => metodo !== "NoEspecificado" && metodo !== "SaldoAFavor", "Elige el método de pago.");

const pagoACuentaSchema = z
  .object({
    clienteId: z.coerce.number().int().positive(),
    moneda: z.enum(["usd", "bs"]),
    monto: z.coerce.number().positive("El monto debe ser mayor que cero.").refine(dosDecimales, "El monto admite como máximo 2 decimales."),
    tasaCambio: z.coerce.number().positive().nullable().optional(),
    metodoPago: metodoDeCobro,
    referencia: z.string().trim().max(120).nullable().optional(),
    fechaPago: z.coerce.date().refine((fecha) => fecha.getTime() <= Date.now() + 24 * 60 * 60 * 1000, "La fecha no puede ser posterior a hoy."),
  })
  .superRefine((valor, ctx) => {
    if (valor.moneda === "bs" && !valor.tasaCambio) ctx.addIssue({ code: "custom", path: ["tasaCambio"], message: "La tasa de cambio es obligatoria para pagos en bolívares." });
  });

function revalidarCliente(clienteId: number, transaccionId?: number) {
  revalidatePath(`/admin/clients/${clienteId}`);
  revalidatePath("/admin/transactions");
  if (transaccionId) revalidatePath(`/admin/transactions/${transaccionId}`);
  revalidatePath("/mi-cuenta");
}

export async function registrarPagoACuenta(formData: FormData) {
  const actor = await requireAdmin();
  const tasa = formData.get("tasaCambio")?.toString().trim();
  const parsed = pagoACuentaSchema.safeParse({
    clienteId: formData.get("clienteId"),
    moneda: formData.get("moneda"),
    monto: formData.get("monto"),
    tasaCambio: tasa ? tasa : null,
    metodoPago: formData.get("metodoPago"),
    referencia: formData.get("referencia")?.toString() || null,
    fechaPago: formData.get("fechaPago") || new Date().toISOString(),
  });
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Revisa los datos del pago." };

  try {
    const resultado = await prisma.$transaction((tx) => registrarPagoACuentaEnTx(tx, parsed.data, actor));
    revalidarCliente(parsed.data.clienteId);
    return { success: true as const, message: `Pago a cuenta registrado. Saldo a favor: ${usdTexto(resultado.saldoAFavorUsd)}.` };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo registrar el pago." };
  }
}

const aplicarSchema = z.object({
  transaccionId: z.coerce.number().int().positive(),
  montoUsd: z.coerce.number().positive("El monto debe ser mayor que cero.").refine(dosDecimales, "El monto admite como máximo 2 decimales."),
});

export async function aplicarSaldoAFavor(formData: FormData) {
  const actor = await requireAdmin();
  const parsed = aplicarSchema.safeParse({ transaccionId: formData.get("transaccionId"), montoUsd: formData.get("montoUsd") });
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Revisa el monto a aplicar." };

  try {
    const resultado = await prisma.$transaction((tx) => aplicarSaldoAFavorEnPedido(tx, parsed.data, actor));
    revalidarCliente(resultado.clienteId, parsed.data.transaccionId);
    const message =
      resultado.estado === "pagado"
        ? `Saldo aplicado. El pedido ${resultado.numeroOrden} quedó pagado.`
        : `Saldo aplicado. Saldo pendiente: ${usdTexto(resultado.saldoUsd)}.`;
    return { success: true as const, message };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo aplicar el saldo." };
  }
}

const ajusteSchema = z.object({
  clienteId: z.coerce.number().int().positive(),
  montoUsd: z.coerce.number().refine((valor) => valor !== 0, "El ajuste no puede ser cero.").refine(dosDecimales, "El monto admite como máximo 2 decimales."),
  motivo: z.string().trim().min(3, "Indica el motivo del ajuste.").max(240, "El motivo es demasiado largo."),
});

export async function ajustarSaldoAFavorCliente(formData: FormData) {
  const actor = await requireAdmin();
  const parsed = ajusteSchema.safeParse({ clienteId: formData.get("clienteId"), montoUsd: formData.get("montoUsd"), motivo: formData.get("motivo") });
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Revisa los datos del ajuste." };

  try {
    const resultado = await prisma.$transaction((tx) => ajustarSaldoAFavor(tx, parsed.data, actor));
    revalidarCliente(parsed.data.clienteId);
    return { success: true as const, message: `Ajuste registrado. Saldo a favor: ${usdTexto(resultado.saldoAFavorUsd)}.` };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo registrar el ajuste." };
  }
}
