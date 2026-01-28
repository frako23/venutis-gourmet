"use server";

import { prisma } from "../prisma";
import { z } from "zod";
import { redirect } from "next/navigation";
import { TipoCliente } from "@/prisma/types";

const ClientSchema = z.object({
  tipoCliente: z.enum(TipoCliente),
  nombre: z.string(),
  apellido: z.string(),
  celular: z.string(),
  email: z.string().optional(),
  urbanizacion: z.string(),
});

export async function deleteClient(formData: FormData) {
  const id = String(formData.get("id") || "").trim();

  if (!id) {
    throw new Error("Client ID is required for deletion");
  }

  try {
    await prisma.cliente.delete({
      where: {
        id: Number(id),
      },
    });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    throw new Error("Failed to delete client");
  }

  redirect("/clients");
}

export async function addClient(
  prevState: { message: string },
  formData: FormData,
): Promise<{ message: string }> {
  const parsed = ClientSchema.safeParse({
    nombre: String(formData.get("name")),
    apellido: String(formData.get("lastname")),
    celular: String(formData.get("celular")),
    email: String(formData.get("email")),
    urbanizacion: String(formData.get("urbanizacion")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return { message: "Datos inválidos, revisa el formulario" };
  }

  try {
    const existingClient = await prisma.cliente.findUnique({
      where: { celular: parsed.data.celular },
    });

    if (existingClient) {
      return { message: "El código de cliente ingresado ya existe" };
    }

    await prisma.cliente.create({
      data: {
        ...parsed.data,
      },
    });
  } catch (error) {
    console.error("Error al agregar cliente:", error);
    return { message: "Error al registrar cliente" };
  }

  redirect("/clients");
}

export async function editClient(formData: FormData, clientId: number) {
  const parsed = ClientSchema.safeParse({
    nombre: String(formData.get("name")),
    apellido: String(formData.get("lastname")),
    celular: String(formData.get("celular")),
    email: String(formData.get("email")),
    urbanizacion: String(formData.get("urbanizacion")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid form data");
  }

  try {
    await prisma.cliente.update({
      where: { id: clientId },
      data: {
        ...parsed.data,
      },
    });
  } catch (error) {
    console.error("Error al editar cliente:", error);
    throw new Error("Failed to edit client");
  }

  redirect("/clients");
}
