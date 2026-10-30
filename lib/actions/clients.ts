"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { CAMPOS_INTERNOS_CLIENTE, type ClienteTienda, normalizeSearchName } from "@/lib/client-rules";
import { prisma } from "../prisma";

const ClientSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  apellido: z.string().trim().min(1, "El apellido es obligatorio"),
  celular: z.string().trim().min(10, "Formato de teléfono inválido"),
  email: z.string().email().optional().or(z.literal("")), // Sigue siendo opcional
  tipoCliente: z.enum(["detal", "mayorista"]),
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
  prevState: { message: string; status: string; client: ClienteTienda | null },
  formData: FormData,
): Promise<{ message: string; status: string; client: ClienteTienda | null }> {
  const parsed = ClientSchema.safeParse({
    nombre: formData.get("nombre")?.toString() ?? "",
    apellido: formData.get("apellido")?.toString() ?? "",
    celular: formData.get("celular")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    tipoCliente: formData.get("tipoCliente")?.toString() ?? "detal",
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return {
      message: "Datos inválidos, revisa el formulario",
      status: "error",
      client: null,
    };
  }
  if (parsed.data.tipoCliente !== "detal") {
    return {
      message: "Este checkout solo permite clientes detal",
      status: "error",
      client: null,
    };
  }
  try {
    const existingClient = await prisma.cliente.findUnique({
      where: { celular: parsed.data.celular },
      omit: CAMPOS_INTERNOS_CLIENTE,
    });

    if (existingClient) {
      return {
        message: "El cliente ya se encuentra registrado",
        status: "error",
        client: existingClient,
      };
    }

    const normalizedEmail = parsed.data.email || null;
    if (normalizedEmail) {
      const existingEmail = await prisma.cliente.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail) {
        return {
          message: "Ese correo ya pertenece a otro cliente. Conservamos los datos ingresados.",
          status: "error",
          client: null,
        };
      }
    }

    const newClient = await prisma.cliente.create({
      data: {
        ...parsed.data,
        email: normalizedEmail,
        nombreBusqueda: normalizeSearchName(parsed.data.nombre, parsed.data.apellido),
      },
      omit: CAMPOS_INTERNOS_CLIENTE,
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
        email: parsed.data.email || null,
        nombreBusqueda: normalizeSearchName(parsed.data.nombre, parsed.data.apellido),
      },
    });
  } catch (error) {
    console.error("Error al editar cliente:", error);
    throw new Error("Failed to edit client");
  }

  return { message: "Cliente editado exitosamente" };
}

export async function getClientByPhone(phone: string) {
  const normalizedPhone = phone.trim();
  if (!normalizedPhone || normalizedPhone.length < 10) return null;

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { celular: normalizedPhone },
      omit: CAMPOS_INTERNOS_CLIENTE,
    });
    return cliente;
  } catch (error) {
    return null;
  }
}
