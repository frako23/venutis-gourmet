"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { motivoSinNota, normalizarNumeroFactura, numeroNotaDePedido, snapshotDeliveryLines, validateDeliveryLines } from "@/lib/admin/delivery-note-rules";
import { roundMoney } from "@/lib/admin/sales-calculations";
import { interpretarFechaHoraCaracas } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const noteSchema = z.object({
  transaccionId: z.coerce.number().int().positive(),
  fechaEntrega: z.coerce.date(),
  numeroFactura: z.string().trim().max(60, "El número de factura es demasiado largo").nullable().optional(),
  direccionEntrega: z.string().trim().max(240).nullable().optional(),
  personaRecibe: z.string().trim().max(120).nullable().optional(),
  observaciones: z.string().trim().max(600).nullable().optional(),
});

/** Crea la nota de entrega de un pedido existente: número = número de orden y líneas copiadas del pedido. */
export async function crearNotaEntrega(formData: FormData) {
  const actor = await requireAdmin();
  const fecha = interpretarFechaHoraCaracas(formData.get("fechaEntrega")?.toString() ?? "") ?? new Date();
  const parsed = noteSchema.safeParse({
    transaccionId: formData.get("transaccionId"),
    fechaEntrega: fecha,
    numeroFactura: normalizarNumeroFactura(formData.get("numeroFactura")?.toString()),
    direccionEntrega: formData.get("direccionEntrega")?.toString() || null,
    personaRecibe: formData.get("personaRecibe")?.toString() || null,
    observaciones: formData.get("observaciones")?.toString() || null,
  });
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Revisa los datos de la nota de entrega." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pedido = await tx.transaccion.findUnique({
        where: { id: parsed.data.transaccionId },
        select: { id: true, numeroOrden: true, estado: true, clienteId: true, cliente: { select: { tipoCliente: true } }, _count: { select: { notasEntrega: true } }, detalles: { orderBy: { id: "asc" }, select: { productoId: true, cantidad: true, precioUnitario: true, producto: { select: { nombre: true } } } } },
      });
      if (!pedido) throw new Error("El pedido no existe.");
      const motivo = motivoSinNota({ estado: pedido.estado, cliente: pedido.cliente, notasEntrega: pedido._count.notasEntrega });
      if (motivo) throw new Error(motivo);
      const lineas = snapshotDeliveryLines(pedido.detalles.map((d) => ({ productoId: d.productoId, productoNombre: d.producto.nombre, cantidad: d.cantidad, precioUnitarioUsd: d.precioUnitario })));
      if (!validateDeliveryLines(lineas)) throw new Error("El pedido no tiene líneas válidas para la nota.");
      const note = await tx.notaEntrega.create({ data: { numeroNota: numeroNotaDePedido(pedido.numeroOrden), numeroFactura: parsed.data.numeroFactura ?? null, clienteId: pedido.clienteId, transaccionId: pedido.id, fechaEntrega: parsed.data.fechaEntrega, direccionEntrega: parsed.data.direccionEntrega ?? null, personaRecibe: parsed.data.personaRecibe ?? null, observaciones: parsed.data.observaciones ?? null, creadoPorId: actor.id, creadoPorEmail: actor.email } });
      await tx.detalleNotaEntrega.createMany({ data: lineas.map((line) => ({ notaEntregaId: note.id, productoId: line.productoId ?? null, productoNombre: line.productoNombre, cantidad: line.cantidad, precioUnitarioUsd: line.precioUnitarioUsd, subtotalUsd: line.precioUnitarioUsd == null ? null : roundMoney(line.precioUnitarioUsd * line.cantidad) })) });
      return { id: note.id, numeroNota: note.numeroNota };
    });
    revalidatePath("/admin/delivery-notes");
    revalidatePath("/admin/transactions");
    return { success: true as const, notaEntregaId: result.id, numeroNota: result.numeroNota, pdfUrl: `/admin/delivery-notes/${result.id}/pdf`, message: "Nota de entrega creada correctamente." };
  } catch (error) {
    // numeroNota es único: dos clics simultáneos chocan aquí en lugar de duplicar la nota.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false as const, message: "Este pedido ya tiene su nota de entrega." };
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo crear la nota de entrega." };
  }
}

export async function getDeliveryNote(id: number) {
  await requireAdmin();
  return prisma.notaEntrega.findUnique({ where: { id }, include: { cliente: true, detalles: { orderBy: { id: "asc" } }, transaccion: { select: { id: true, numeroOrden: true } } } });
}

export async function getDeliveryNotes() {
  await requireAdmin();
  return prisma.notaEntrega.findMany({ orderBy: { fechaEntrega: "desc" }, include: { cliente: true, transaccion: { select: { numeroOrden: true } } } });
}

/** Agrega, cambia o quita el número de factura de una nota ya emitida (vacío = sin factura). */
export async function actualizarNumeroFactura(notaEntregaId: number, valor: string) {
  await requireAdmin();
  if (!Number.isInteger(notaEntregaId) || notaEntregaId <= 0) return { success: false as const, message: "Nota no encontrada." };
  const numeroFactura = normalizarNumeroFactura(valor);
  if (numeroFactura && numeroFactura.length > 60) return { success: false as const, message: "El número de factura es demasiado largo." };
  try {
    await prisma.notaEntrega.update({ where: { id: notaEntregaId }, data: { numeroFactura } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false as const, message: "Nota no encontrada." };
    return { success: false as const, message: "No se pudo guardar el número de factura." };
  }
  revalidatePath("/admin/delivery-notes");
  revalidatePath(`/admin/delivery-notes/${notaEntregaId}`);
  return { success: true as const, numeroFactura, message: numeroFactura ? "Número de factura guardado." : "Número de factura quitado." };
}
