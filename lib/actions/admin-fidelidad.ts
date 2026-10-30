"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { canjearPremioEnPedido } from "@/lib/admin/canje-pedido";
import { ajustarPuntos } from "@/lib/fidelidad";
import { prisma } from "@/lib/prisma";

const dosDecimales = (valor: number) => Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;

function revalidarFidelidad(clienteId?: number, transaccionId?: number) {
  revalidatePath("/admin/clients/rewards");
  if (clienteId) revalidatePath(`/admin/clients/${clienteId}`);
  if (transaccionId) revalidatePath(`/admin/transactions/${transaccionId}`);
  revalidatePath("/mi-cuenta");
}

const ajustePuntosSchema = z.object({
  clienteId: z.coerce.number().int().positive(),
  puntos: z.coerce.number().int("Los puntos deben ser un número entero.").refine((valor) => valor !== 0, "El ajuste no puede ser cero."),
  motivo: z.string().trim().min(3, "Indica el motivo del ajuste.").max(240, "El motivo es demasiado largo."),
});

export async function ajustarPuntosCliente(formData: FormData) {
  const actor = await requireAdmin();
  const parsed = ajustePuntosSchema.safeParse({ clienteId: formData.get("clienteId"), puntos: formData.get("puntos"), motivo: formData.get("motivo") });
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Revisa los datos del ajuste." };

  try {
    const resultado = await prisma.$transaction((tx) => ajustarPuntos(tx, parsed.data, actor));
    revalidarFidelidad(parsed.data.clienteId);
    return { success: true as const, message: `Ajuste registrado. Puntos disponibles: ${resultado.puntos}.` };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo registrar el ajuste." };
  }
}

const premioSchema = z
  .object({
    nombre: z.string().trim().min(3, "El nombre debe tener entre 3 y 80 caracteres.").max(80, "El nombre debe tener entre 3 y 80 caracteres."),
    descripcion: z.string().trim().max(240, "La descripción admite hasta 240 caracteres.").optional(),
    tipo: z.enum(["descuento", "producto"]),
    costoPuntos: z.coerce.number().int("El costo debe ser un número entero.").positive("El costo en puntos debe ser mayor que cero."),
    montoDescuentoUsd: z.coerce.number().positive("El descuento debe ser mayor que cero.").refine(dosDecimales, "El descuento admite como máximo 2 decimales.").optional(),
    productoId: z.coerce.number().int().positive().optional(),
    cantidad: z.coerce.number().int("La cantidad debe ser un número entero.").positive("La cantidad debe ser mayor que cero.").optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.tipo === "descuento" && valor.montoDescuentoUsd === undefined) ctx.addIssue({ code: "custom", path: ["montoDescuentoUsd"], message: "Indica el monto del descuento." });
    if (valor.tipo === "producto") {
      if (valor.productoId === undefined) ctx.addIssue({ code: "custom", path: ["productoId"], message: "Elige el producto del premio." });
      if (valor.cantidad === undefined) ctx.addIssue({ code: "custom", path: ["cantidad"], message: "Indica la cantidad del producto." });
    }
  });

type PremioState = { status: "idle" | "success" | "error"; message: string };

function leerPremio(formData: FormData) {
  const texto = (campo: string) => formData.get(campo)?.toString().trim() || undefined;
  return premioSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: texto("descripcion"),
    tipo: formData.get("tipo"),
    costoPuntos: formData.get("costoPuntos"),
    montoDescuentoUsd: texto("montoDescuentoUsd"),
    productoId: texto("productoId"),
    cantidad: texto("cantidad"),
  });
}

function datosDelPremio(valor: z.infer<typeof premioSchema>) {
  const esDescuento = valor.tipo === "descuento";
  return {
    nombre: valor.nombre,
    descripcion: valor.descripcion || null,
    tipo: valor.tipo,
    costoPuntos: valor.costoPuntos,
    montoDescuentoUsd: esDescuento ? valor.montoDescuentoUsd ?? null : null,
    productoId: esDescuento ? null : valor.productoId ?? null,
    cantidad: esDescuento ? null : valor.cantidad ?? null,
  };
}

export async function crearPremio(_previous: PremioState, formData: FormData): Promise<PremioState> {
  await requireAdmin();
  const parsed = leerPremio(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos del premio." };
  try {
    if (parsed.data.tipo === "producto") {
      const producto = await prisma.producto.findUnique({ where: { id: parsed.data.productoId! }, select: { id: true } });
      if (!producto) return { status: "error", message: "El producto elegido no existe." };
    }
    await prisma.premio.create({ data: datosDelPremio(parsed.data) });
  } catch {
    return { status: "error", message: "No se pudo crear el premio." };
  }
  revalidarFidelidad();
  return { status: "success", message: "Premio creado." };
}

export async function actualizarPremio(_previous: PremioState, formData: FormData): Promise<PremioState> {
  await requireAdmin();
  const premioId = Number(formData.get("premioId"));
  if (!Number.isInteger(premioId) || premioId <= 0) return { status: "error", message: "El premio no es válido." };
  const parsed = leerPremio(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos del premio." };
  try {
    if (parsed.data.tipo === "producto") {
      const producto = await prisma.producto.findUnique({ where: { id: parsed.data.productoId! }, select: { id: true } });
      if (!producto) return { status: "error", message: "El producto elegido no existe." };
    }
    // Los canjes ya hechos conservan su copia del nombre y el costo en el movimiento de puntos.
    await prisma.premio.update({ where: { id: premioId }, data: datosDelPremio(parsed.data) });
  } catch {
    return { status: "error", message: "No se pudo actualizar el premio." };
  }
  revalidarFidelidad();
  return { status: "success", message: "Premio actualizado." };
}

export async function cambiarEstadoPremio(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ premioId: z.coerce.number().int().positive(), activo: z.enum(["true", "false"]) }).safeParse({ premioId: formData.get("premioId"), activo: formData.get("activo") });
  if (!parsed.success) return { success: false as const, message: "El premio no es válido." };
  const activo = parsed.data.activo === "true";
  try {
    await prisma.premio.update({ where: { id: parsed.data.premioId }, data: { activo } });
  } catch {
    return { success: false as const, message: "No se pudo cambiar el estado del premio." };
  }
  revalidarFidelidad();
  return { success: true as const, message: activo ? "Premio activado." : "Premio desactivado." };
}

export async function canjearPremio(formData: FormData) {
  const actor = await requireAdmin();
  const parsed = z.object({ transaccionId: z.coerce.number().int().positive(), premioId: z.coerce.number().int().positive() }).safeParse({ transaccionId: formData.get("transaccionId"), premioId: formData.get("premioId") });
  if (!parsed.success) return { success: false as const, message: "El canje no es válido." };

  try {
    const resultado = await prisma.$transaction((tx) => canjearPremioEnPedido(tx, parsed.data, actor));
    revalidarFidelidad(resultado.clienteId, parsed.data.transaccionId);
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/transactions");
    return { success: true as const, message: `Premio canjeado. Total del pedido: USD ${resultado.totalUsd.toFixed(2)}.` };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo canjear el premio." };
  }
}
