"use server";

import { EstadoTransaccion, MetodoPago, TipoRetiro } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { calculateSaleTotals, type DiscountInput, type SaleLineInput } from "@/lib/admin/sales-calculations";
import type { ManualSaleState } from "@/lib/admin/types";
import { prisma } from "@/lib/prisma";

const lineSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().positive(),
  precioUnitarioUsd: z.coerce.number().finite().positive(),
});

const discountSchema = z.object({
  tipo: z.enum(["porcentaje", "usd"]),
  valor: z.coerce.number().finite().nonnegative(),
});

const manualSaleSchema = z.object({
  clienteId: z.coerce.number().int().positive(),
  fechaCompra: z.coerce.date(),
  numeroOrden: z.string().trim().max(80).optional(),
  tipodeRetiro: z.enum(["envio", "recogida"]).default("envio"),
  tasaCambio: z.coerce.number().finite().positive().nullable().optional(),
  estadoInicial: z.enum(["por_cobrar", "en_pedido", "pagado"]),
  lineas: z.array(lineSchema).min(1),
  descuento: discountSchema.nullable().optional(),
  confirmacionPago: z.boolean().default(false),
  pago: z.object({
    montoBs: z.coerce.number().nonnegative().nullable().optional(),
    montoUsd: z.coerce.number().nonnegative().nullable().optional(),
    metodoPago: z.nativeEnum(MetodoPago),
    referencia: z.string().trim().max(120).nullable().optional(),
    fechaPago: z.coerce.date().nullable().optional(),
  }).nullable().optional(),
});

function readJson<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key)?.toString();
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function parseInput(formData: FormData) {
  const tasaRaw = formData.get("tasaCambio")?.toString().trim() ?? "";
  const descuentoRaw = formData.get("descuento")?.toString().trim() ?? "";
  const pagoRaw = formData.get("pago")?.toString().trim() ?? "";
  return manualSaleSchema.safeParse({
    clienteId: formData.get("clienteId"),
    fechaCompra: formData.get("fechaCompra") || new Date().toISOString(),
    numeroOrden: formData.get("numeroOrden")?.toString().trim() || undefined,
    tipodeRetiro: formData.get("tipodeRetiro")?.toString() || "envio",
    tasaCambio: tasaRaw ? Number(tasaRaw) : null,
    estadoInicial: formData.get("estadoInicial")?.toString(),
    lineas: readJson(formData, "lineas", []),
    descuento: descuentoRaw ? readJson<DiscountInput | null>(formData, "descuento", null) : null,
    confirmacionPago: formData.get("confirmacionPago") === "true",
    pago: pagoRaw ? readJson(formData, "pago", null) : null,
  });
}

export async function registrarVentaManual(_previous: ManualSaleState, formData: FormData): Promise<ManualSaleState> {
  const actor = await requireAdmin();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { success: false, message: "Revisa los datos de la venta.", issues: parsed.error.issues.map((issue) => ({ field: issue.path.join(".") || "formulario", message: issue.message })) };
  }

  const input = parsed.data;
  if (input.estadoInicial === "pagado" && !input.confirmacionPago && !input.pago) {
    return { success: false, message: "Confirma el cobro o registra los datos de pago para iniciar la venta como pagada." };
  }
  const discount = input.descuento as DiscountInput | null | undefined;
  let totals;
  try {
    totals = calculateSaleTotals(input.lineas as SaleLineInput[], discount ?? null, input.tasaCambio ?? null);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Los importes no son válidos." };
  }

  const uniqueQuantities = new Map<number, number>();
  for (const line of input.lineas) uniqueQuantities.set(line.productoId, (uniqueQuantities.get(line.productoId) ?? 0) + line.cantidad);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.cliente.findUnique({ where: { id: input.clienteId }, select: { id: true } });
      if (!client) throw new Error("El cliente seleccionado no existe.");

      for (const [productoId, cantidad] of uniqueQuantities) {
        const product = await tx.producto.findUnique({ where: { id: productoId }, select: { id: true, nombre: true } });
        if (!product) throw new Error("Uno de los productos seleccionados no existe.");
        const updated = await tx.producto.updateMany({ where: { id: productoId, inventario: { gte: cantidad } }, data: { inventario: { decrement: cantidad } } });
        if (updated.count !== 1) throw new Error(`Stock insuficiente para ${product.nombre}.`);
      }

      const orderNumber = input.numeroOrden || `VEN-${Date.now()}`;
      const transaction = await tx.transaccion.create({
        data: {
          numeroOrden: orderNumber,
          clienteId: input.clienteId,
          fechaCompra: input.fechaCompra,
          montoSubtotal: totals.subtotalUsd,
          montoDescuento: totals.descuentoUsd,
          valorDescuento: discount?.valor ?? null,
          tipoDescuento: discount?.tipo,
          tasaCambio: totals.tasaCambio,
          montoTotal: totals.totalUsd,
          estado: input.estadoInicial as EstadoTransaccion,
          tipodeRetiro: input.tipodeRetiro as TipoRetiro,
        },
      });
      await tx.detalleCompra.createMany({ data: input.lineas.map((line) => ({ transaccionId: transaction.id, productoId: line.productoId, cantidad: line.cantidad, precioUnitario: line.precioUnitarioUsd })) });
      await tx.estadoTransaccionHistorial.create({ data: { transaccionId: transaction.id, estadoNuevo: input.estadoInicial as EstadoTransaccion, actorId: actor.id, actorEmail: actor.email, motivo: "Venta registrada manualmente" } });
      if (input.pago) await tx.pago.create({ data: { transaccionId: transaction.id, montoBs: input.pago.montoBs ?? null, montoUsd: input.pago.montoUsd ?? totals.totalUsd, metodoPago: input.pago.metodoPago, referencia: input.pago.referencia ?? null, fechaPago: input.pago.fechaPago ?? input.fechaCompra, tasaCambio: totals.tasaCambio } });
      return { id: transaction.id, numeroOrden: transaction.numeroOrden };
    });

    revalidatePath("/admin");
    revalidatePath("/admin/transactions");
    revalidatePath("/admin/inventory");
    return { success: true, message: "Venta registrada correctamente.", transactionId: result.id, numeroOrden: result.numeroOrden, estado: input.estadoInicial, subtotalUsd: totals.subtotalUsd, descuentoUsd: totals.descuentoUsd, totalUsd: totals.totalUsd };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "No se pudo registrar la venta." };
  }
}

export async function actualizarDescuentoVenta(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ transactionId: z.coerce.number().int().positive(), tipo: z.enum(["porcentaje", "usd"]), valor: z.coerce.number().finite().nonnegative() }).safeParse({ transactionId: formData.get("transactionId"), tipo: formData.get("tipo"), valor: formData.get("valor") });
  if (!parsed.success) return { success: false as const, message: "El descuento no es válido." };
  try {
    const transaction = await prisma.transaccion.findUnique({ where: { id: parsed.data.transactionId }, include: { detalles: true } });
    if (!transaction) return { success: false as const, message: "La venta no existe." };
    const totals = calculateSaleTotals(transaction.detalles.map((line) => ({ productoId: line.productoId, cantidad: line.cantidad, precioUnitarioUsd: line.precioUnitario })), { tipo: parsed.data.tipo, valor: parsed.data.valor }, transaction.tasaCambio);
    await prisma.transaccion.update({ where: { id: transaction.id }, data: { montoSubtotal: totals.subtotalUsd, montoDescuento: totals.descuentoUsd, valorDescuento: parsed.data.valor, tipoDescuento: parsed.data.tipo, montoTotal: totals.totalUsd } });
    revalidatePath("/admin/transactions");
    revalidatePath(`/admin/transactions/${transaction.id}`);
    return { success: true as const, message: "Descuento actualizado." };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo actualizar el descuento." };
  }
}
