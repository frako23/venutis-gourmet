"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { isWholesaleClient, snapshotDeliveryLines } from "@/lib/admin/delivery-note-rules";
import { roundMoney } from "@/lib/admin/sales-calculations";
import { prisma } from "@/lib/prisma";

const noteLineSchema = z.object({
  productoId: z.coerce.number().int().positive().nullable().optional(),
  productoNombre: z.string().trim().min(1, "El nombre del producto es obligatorio").max(180),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor que cero"),
  precioUnitarioUsd: z.coerce.number().finite().nonnegative().nullable().optional(),
});

const noteSchema = z.object({
  clienteId: z.coerce.number().int().positive(),
  transaccionId: z.coerce.number().int().positive().nullable().optional(),
  fechaEntrega: z.coerce.date(),
  direccionEntrega: z.string().trim().max(240).nullable().optional(),
  personaRecibe: z.string().trim().max(120).nullable().optional(),
  observaciones: z.string().trim().max(600).nullable().optional(),
  lineas: z.array(noteLineSchema).min(1, "Agrega al menos un producto"),
});

export async function crearNotaEntrega(formData: FormData) {
  const actor = await requireAdmin();
  let lineas: unknown = [];
  try { lineas = JSON.parse(formData.get("lineas")?.toString() ?? "[]"); } catch { lineas = []; }
  const parsed = noteSchema.safeParse({
    clienteId: formData.get("clienteId"),
    transaccionId: formData.get("transaccionId")?.toString() || null,
    fechaEntrega: formData.get("fechaEntrega") || new Date().toISOString(),
    direccionEntrega: formData.get("direccionEntrega")?.toString() || null,
    personaRecibe: formData.get("personaRecibe")?.toString() || null,
    observaciones: formData.get("observaciones")?.toString() || null,
    lineas,
  });
  if (!parsed.success) return { success: false as const, message: "Revisa los datos de la nota de entrega." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.cliente.findUnique({ where: { id: parsed.data.clienteId }, select: { id: true, tipoCliente: true } });
      if (!client || !isWholesaleClient(client.tipoCliente)) throw new Error("Solo se pueden emitir notas para clientes mayoristas.");
      if (parsed.data.transaccionId) {
        const transaction = await tx.transaccion.findUnique({ where: { id: parsed.data.transaccionId }, select: { id: true, clienteId: true } });
        if (!transaction || transaction.clienteId !== client.id) throw new Error("La venta seleccionada no pertenece a este cliente.");
      }
      const numeroNota = `NE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
      const note = await tx.notaEntrega.create({ data: { numeroNota, clienteId: client.id, transaccionId: parsed.data.transaccionId ?? null, fechaEntrega: parsed.data.fechaEntrega, direccionEntrega: parsed.data.direccionEntrega ?? null, personaRecibe: parsed.data.personaRecibe ?? null, observaciones: parsed.data.observaciones ?? null, creadoPorId: actor.id, creadoPorEmail: actor.email } });
      await tx.detalleNotaEntrega.createMany({ data: snapshotDeliveryLines(parsed.data.lineas).map((line) => ({ notaEntregaId: note.id, productoId: line.productoId ?? null, productoNombre: line.productoNombre, cantidad: line.cantidad, precioUnitarioUsd: line.precioUnitarioUsd ?? null, subtotalUsd: line.precioUnitarioUsd == null ? null : roundMoney(line.precioUnitarioUsd * line.cantidad) })) });
      return { id: note.id, numeroNota: note.numeroNota };
    });
    revalidatePath("/admin/delivery-notes");
    return { success: true as const, notaEntregaId: result.id, numeroNota: result.numeroNota, pdfUrl: `/admin/delivery-notes/${result.id}/pdf`, message: "Nota de entrega creada correctamente." };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "No se pudo crear la nota de entrega." };
  }
}

export async function getDeliveryNote(id: number) {
  await requireAdmin();
  return prisma.notaEntrega.findUnique({ where: { id }, include: { cliente: true, detalles: { orderBy: { id: "asc" } }, transaccion: { select: { numeroOrden: true } } } });
}

export async function getDeliveryNotes() {
  await requireAdmin();
  return prisma.notaEntrega.findMany({ orderBy: { fechaEntrega: "desc" }, include: { cliente: true, transaccion: { select: { numeroOrden: true } } } });
}
