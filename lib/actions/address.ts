"use server";

import { z } from "zod";
import { DELIVERY_ZONES } from "@/lib/constants/constants";
import { prisma } from "../prisma";

const AddressSchema = z.object({
  clienteId: z.number().int().positive(),
  direccion: z.string().trim().min(1, "La dirección es obligatoria"),
  urbanizacion: z.string().trim().refine(
    (value) => DELIVERY_ZONES.some((zone) => zone.name === value),
    "Selecciona una zona de delivery configurada",
  ),
  tipo: z.string().trim().min(1, "El alias es obligatorio"),
});

export async function deleteAddress(
  prevState: { message: string; status: string; clientId: number | null },
  id: number,
) {
  if (!id) {
    throw new Error("id es necesario para poder eliminar la dirección");
  }

  try {
    await prisma.direccion.delete({ where: { id: Number(id) } });
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
  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return {
      message: "Datos inválidos, revisa el formulario",
      status: "error",
      clientId: null,
    };
  }

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: parsed.data.clienteId },
      select: { id: true },
    });
    if (!cliente) {
      return {
        message: "El cliente seleccionado no existe",
        status: "error",
        clientId: null,
      };
    }

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
    clienteId: Number(formData.get("clienteId")),
    direccion: String(formData.get("direccion")),
    urbanizacion: String(formData.get("urbanizacion")),
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
        direccion: parsed.data.direccion,
        urbanizacion: parsed.data.urbanizacion,
        tipo: parsed.data.tipo,
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
