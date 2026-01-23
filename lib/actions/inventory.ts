"use server";

import { prisma } from "../prisma";
import { z } from "zod";

const InventorySchema = z.object({
  productoId: z.number(),
  cantidad: z.number(),
  ubicacion: z.string(),
});

export async function deleteAddress(formData: FormData) {
  const id = String(formData.get("id") || "").trim();

  if (!id) {
    throw new Error("Address ID is required for deletion");
  }

  try {
    await prisma.inventario.delete({
      where: {
        id: Number(id),
      },
    });
  } catch (error) {
    console.error("Error al eliminar la inventario:", error);
    throw new Error("Failed to delete inventory");
  }
  return { message: "Inventario eliminado exitosamente" };
}

export async function addInventory(
  prevState: { message: string },
  formData: FormData,
): Promise<{ message: string }> {
  const parsed = InventorySchema.safeParse({
    productoId: Number(formData.get("productoId")),
    cantidad: Number(formData.get("cantidad")),
    ubicacion: String(formData.get("ubicacion")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return { message: "Datos inválidos, revisa el formulario" };
  }

  try {
    await prisma.inventario.create({
      data: {
        producto: {
          connect: { id: parsed.data.productoId },
        },
        cantidad: parsed.data.cantidad,
        ubicacion: parsed.data.ubicacion,
      },
    });
  } catch (error) {
    console.error("Error al agregar cliente:", error);
    return { message: "Error al registrar cliente" };
  }

  return { message: "Inventario agregado exitosamente" };
}

export async function editInventory(formData: FormData, inventarioId: number) {
  const parsed = InventorySchema.safeParse({
    productoId: Number(formData.get("productoId")),
    cantidad: Number(formData.get("cantidad")),
    ubicacion: String(formData.get("ubicacion")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid form data");
  }

  try {
    await prisma.inventario.update({
      where: { id: inventarioId },
      data: {
        ...parsed.data,
      },
    });
  } catch (error) {
    console.error("Error al editar la dirección:", error);
    throw new Error("Failed to edit inventory");
  }

  return { message: "Inventario editado exitosamente" };
}
