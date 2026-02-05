"use server";

import { prisma } from "../prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache"; // 👈 Importante para actualizar la UI

const InventorySchema = z.object({
  productoId: z.number().positive(),
  cantidad: z.number().int(), // Aseguramos que sea entero
  ubicacion: z.string().min(1, "La ubicación es requerida"),
});

export async function addInventory(
  prevState: { message: string },
  formData: FormData,
): Promise<{ message: string }> {
  const parsed = InventorySchema.safeParse({
    productoId: Number(formData.get("productoId")),
    cantidad: Number(formData.get("cantidad")),
    ubicacion: formData.get("ubicacion")?.toString(),
  });

  if (!parsed.success) {
    return { message: "Datos inválidos, revisa el formulario" };
  }

  try {
    await prisma.inventario.create({
      data: {
        productoId: parsed.data.productoId, // 👈 Más directo que 'connect' si ya tienes el ID
        cantidad: parsed.data.cantidad,
        ubicacion: parsed.data.ubicacion,
      },
    });
    
    revalidatePath("/admin/inventario"); // 👈 Actualiza la lista automáticamente
    return { message: "Inventario agregado exitosamente" };
  } catch (error) {
    console.error("Error al agregar inventario:", error);
    return { message: "Error al registrar en el inventario" };
  }
}

export async function editInventory(formData: FormData, inventarioId: number) {
  const parsed = InventorySchema.safeParse({
    productoId: Number(formData.get("productoId")),
    cantidad: Number(formData.get("cantidad")),
    ubicacion: formData.get("ubicacion")?.toString(),
  });

  if (!parsed.success) {
    throw new Error("Datos del formulario inválidos");
  }

  try {
    await prisma.inventario.update({
      where: { id: inventarioId },
      data: {
        productoId: parsed.data.productoId,
        cantidad: parsed.data.cantidad,
        ubicacion: parsed.data.ubicacion,
      },
    });

    revalidatePath("/admin/inventario");
    return { message: "Inventario editado exitosamente" };
  } catch (error) {
    console.error("Error al editar el inventario:", error);
    throw new Error("No se pudo editar el registro de inventario");
  }
}