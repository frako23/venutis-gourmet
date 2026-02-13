"use server";

import { Cliente } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "../prisma";

const ClientSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  celular: z.string().min(10, "Formato de teléfono inválido"),
  email: z.string().email().optional().or(z.literal("")), // Sigue siendo opcional
  tipoCliente: z.enum(["mayorista", "detal"]),
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
  prevState: { message: string; status: string; client: Cliente | null },
  formData: FormData,
): Promise<{ message: string; status: string; client: Cliente | null }> {
  const parsed = ClientSchema.safeParse({
    nombre: String(formData.get("nombre")),
    apellido: String(formData.get("apellido")),
    celular: String(formData.get("celular")),
    email: String(formData.get("email")),
    tipoCliente: String(formData.get("tipoCliente")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return {
      message: "Datos inválidos, revisa el formulario",
      status: "error",
      client: null,
    };
  }
  try {
    const existingClient = await prisma.cliente.findUnique({
      where: { celular: parsed.data.celular },
    });

    if (existingClient) {
      return {
        message: "El cliente ya se encuentra registrado",
        status: "error",
        client: existingClient,
      };
    }

    const newClient = await prisma.cliente.create({
      data: {
        ...parsed.data,
      },
    });
    return {
      message: "Cliente registrado exitosamente",
      status: "success",
      client: newClient,
    };
  } catch (error) {
    console.error("Error al agregar cliente:", error);
    return {
      message: "Error al registrar cliente",
      status: "error",
      client: null,
    };
  }
}

export async function editClient(formData: FormData, clientId: number) {
  const parsed = ClientSchema.safeParse({
    nombre: String(formData.get("name")),
    apellido: String(formData.get("lastname")),
    celular: String(formData.get("celular")),
    email: String(formData.get("email")),
    tipoCliente: String(formData.get("tipoCliente")),
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

  return { message: "Cliente editado exitosamente" };
}

export async function getClientByPhone(phone: string) {
  if (!phone || phone.length < 8) return null;

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { celular: phone },
    });
    return cliente;
  } catch (error) {
    return null;
  }
}
