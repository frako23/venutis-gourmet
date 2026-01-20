"use server";

import { getCurrentUser } from "../auth";
import { prisma } from "../prisma";
import { z } from "zod";
import { redirect } from "next/navigation";

const ClientSchema = z.object({
  name: z.string(),
  lastname: z.string(),
  cedula: z.string(),
  phone: z.string(),
  mailAgency: z.string(),
  pickupType: z.string(),
  state: z.number().nullable(),
  city: z.number().nullable(),
  address: z.string(),
  clientCode: z.string(),
});

export async function deleteClient(formData: FormData) {
  const id = String(formData.get("id") || "").trim();

  if (!id) {
    throw new Error("Client ID is required for deletion");
  }

  try {
    await prisma.client.delete({
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
  formData: FormData
): Promise<{ message: string }> {
  const user = await getCurrentUser();

  const parsed = ClientSchema.safeParse({
    name: String(formData.get("name")),
    lastname: String(formData.get("lastname")),
    cedula: String(formData.get("cedula")),
    phone: String(formData.get("phone")),
    mailAgency: String(formData.get("mailAgency")),
    pickupType: String(formData.get("pickupType")),
    state: formData.get("state") ? Number(formData.get("state")) : null,
    city: formData.get("city") ? Number(formData.get("city")) : null,
    address: String(formData.get("address")),
    clientCode: String(formData.get("clientCode")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return { message: "Datos inválidos, revisa el formulario" };
  }

  try {
    const existingClient = await prisma.client.findUnique({
      where: { clientCode: parsed.data.clientCode },
    });

    if (existingClient) {
      return { message: "El código de cliente ingresado ya existe" };
    }

    await prisma.client.create({
      data: {
        ...parsed.data,
        userId: user ? user.id : "Creado por cliente",
      },
    });
  } catch (error) {
    console.error("Error al agregar cliente:", error);
    return { message: "Error al registrar cliente" };
  }

  redirect("/clients");
}

export async function editClient(formData: FormData, clientId: number) {
  const user = await getCurrentUser();

  const parsed = ClientSchema.safeParse({
    name: String(formData.get("name")),
    lastname: String(formData.get("lastname")),
    cedula: String(formData.get("cedula")),
    phone: String(formData.get("phone")),
    mailAgency: String(formData.get("mailAgency")),
    pickupType: String(formData.get("pickupType")),
    state: formData.get("state") ? Number(formData.get("state")) : null,
    city: formData.get("city") ? Number(formData.get("city")) : null,
    address: String(formData.get("address")),
    clientCode: String(formData.get("clientCode")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid form data");
  }

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Error al editar cliente:", error);
    throw new Error("Failed to edit client");
  }

  redirect("/clients");
}

export async function addClientPublic(
  prevState: { message: string },
  formData: FormData
): Promise<{ message: string }> {
  const parsed = ClientSchema.safeParse({
    name: String(formData.get("name")),
    lastname: String(formData.get("lastname")),
    cedula: String(formData.get("cedula")),
    phone: String(formData.get("phone")),
    mailAgency: String(formData.get("mailAgency")),
    pickupType: String(formData.get("pickupType")),
    state: formData.get("state") ? Number(formData.get("state")) : null,
    city: formData.get("city") ? Number(formData.get("city")) : null,
    address: String(formData.get("address")),
    clientCode: String(formData.get("clientCode")),
  });

  if (!parsed.success) {
    return { message: "Datos inválidos, revisa el formulario" };
  }

  const existingClient = await prisma.client.findUnique({
    where: { clientCode: parsed.data.clientCode },
  });

  if (existingClient) {
    return { message: "El código de cliente ingresado ya existe" };
  }

  try {
    await prisma.client.create({
      data: {
        ...parsed.data,
        userId: "Creado por cliente",
      },
    });
  } catch (error) {
    console.error("Error al agregar cliente:", error);
    return { message: "Error al registrar cliente" };
  }

  redirect("/thank-you");
}
