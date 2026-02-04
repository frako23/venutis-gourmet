"use server";

import { revalidatePath } from "next/cache"; // 👈 Importante
import { z } from "zod";
import { prisma } from "../prisma";

const AddressSchema = z.object({
  clienteId: z.number(),
  direccion: z.string(),
  urbanizacion: z.string(),
  tipo: z.string(),
});

export async function deleteAddress(
  prevState: { message: string; status: string; clientId: number | null },
  id: number,
) {
  if (!id) {
    throw new Error("id es necesario para poder eliminar la dirección");
  }

  try {
    await prisma.direccion.delete({
      where: {
        id: Number(id),
      },
    });
  } catch (error) {
    console.error("Error al eliminar la dirección:", error);
    return {
      message: "Error al elminar la dirección",
      status: "error",
      clientId: null,
    };
  }
  return {
    message: "Dirección eliminada exitosamente",
    status: "success",
    clientId: null,
  };
}

export async function addAddress(
  prevState: { message: string; status: string; clientId: number | null },
  formData: FormData,
): Promise<{ message: string; status: string; clientId: number | null }> {
  const parsed = AddressSchema.safeParse({
    clienteId: Number(formData.get("clienteId")),
    direccion: String(formData.get("direccion")),
    urbanizacion: String(formData.get("urbanizacion")),
    tipo: String(formData.get("tipo")),
  });
  console.log(parsed);
  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return {
      message: "Datos inválidos, revisa el formulario",
      status: "error",
      clientId: null,
    };
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
    return {
      message: "Cliente registrado exitosamente",
      status: "success",
      clientId: parsed.data.clienteId,
    };
  } catch (error) {
    console.error("Error al agregar dirección:", error);
    return {
      message: "Error al registrar dirección",
      status: "error",
      clientId: null,
    };
  }
}

export async function editAddress(formData: FormData, direccionId: number) {
  const parsed = AddressSchema.safeParse({
    // This is likely incorrect, should be a product schema
    clienteId: Number(formData.get("clienteId")), // These fields don't match the AddressSchema
    direccion: String(formData.get("direccion")),
    tipo: String(formData.get("tipo")),
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

// lib/actions/address.ts
export async function getAddressesByClient(clientId: number) {
  try {
    const addresses = await prisma.direccion.findMany({
      where: { clienteId: clientId },
      orderBy: { id: "desc" },
    });
    return addresses;
  } catch (error) {
    console.error("Error al obtener direcciones:", error);
    return [];
  }
}
