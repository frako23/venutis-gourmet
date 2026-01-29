"use server";

import { TipoDireccion } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";

const AddressSchema = z.object({
  clienteId: z.number(),
  direccion: z.string(),
  urbanizacion: z.string(),
  tipo: z.enum(TipoDireccion),
});

export async function deleteAddress(formData: FormData) {
  const id = String(formData.get("id") || "").trim();

  if (!id) {
    throw new Error("Address ID is required for deletion");
  }

  try {
    await prisma.direccion.delete({
      where: {
        id: Number(id),
      },
    });
  } catch (error) {
    console.error("Error al eliminar la dirección:", error);
    throw new Error("Failed to delete address");
  }
  return { message: "Dirección eliminada exitosamente" };
}

export async function addAddress(
  prevState: { message: string },
  formData: FormData,
): Promise<{ message: string }> {
  const parsed = AddressSchema.safeParse({
    clienteId: Number(formData.get("clienteId")),
    direccion: String(formData.get("direccion")),
    tipo: String(formData.get("tipo") as TipoDireccion),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return { message: "Datos inválidos, revisa el formulario" };
  }

  try {
    await prisma.direccion.create({
      data: {
        urbanizacion: parsed.data.urbanizacion,
        direccion: parsed.data.direccion,
        tipo: parsed.data.tipo,
        cliente: {
          connect: { id: parsed.data.clienteId }, // En lugar de clientId: number
        },
      },
    });
  } catch (error) {
    console.error("Error al agregar cliente:", error);
    return { message: "Error al registrar cliente" };
  }

  return { message: "Dirección agregada exitosamente" };
}

export async function editAddress(formData: FormData, direccionId: number) {
  const parsed = AddressSchema.safeParse({
    // This is likely incorrect, should be a product schema
    clienteId: Number(formData.get("clienteId")), // These fields don't match the AddressSchema
    direccion: String(formData.get("direccion")),
    tipo: String(formData.get("tipo") as TipoDireccion),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid form data");
  }

  try {
    await prisma.direccion.update({
      where: { id: direccionId },
      data: {
        ...parsed.data,
      },
    });
  } catch (error) {
    console.error("Error al editar la dirección:", error);
    throw new Error("Failed to edit address");
  }

  return { message: "Dirección editada exitosamente" };
}
