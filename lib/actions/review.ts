"use server";

import { z } from "zod";
import { prisma } from "../prisma";

const ReviewSchema = z.object({
  clienteId: z.number().positive("El ID del cliente es obligatorio"),
  productoId: z.number().positive("El ID del producto es obligatorio"),
  transaccionId: z.number().positive("El ID de la transacción es obligatorio"),
  // Validamos que las estrellas sean un número entero del 1 al 5
  estrellas: z
    .number()
    .int()
    .min(1, "La calificación mínima es 1 estrella")
    .max(5, "La calificación máxima es 5 estrellas"),
  // El comentario es opcional (puede ser un string vacío o nulo)
  comentario: z
    .string()
    .max(500, "El comentario es muy largo")
    .optional()
    .nullable(),
});

export async function deleteReview(reviewId: number) {
  if (!reviewId) {
    throw new Error("Review ID is required for deletion");
  }

  try {
    await prisma.resena.delete({
      where: {
        id: reviewId,
      },
    });
  } catch (error) {
    console.error("Error al eliminar la reseña:", error);
    throw new Error("Failed to delete review");
  }
  return { message: "Reseña eliminada exitosamente" };
}

export async function addReview(
  prevState: { message: string; status: string; clientId: number | null },
  formData: FormData,
): Promise<{ message: string; status: string; clientId: number | null }> {
  const parsed = ReviewSchema.safeParse({
    clienteId: Number(formData.get("clienteId")),
    productoId: Number(formData.get("productoId")),
    transaccionId: Number(formData.get("transaccionId")),
    estrellas: Number(formData.get("estrellas")),
    comentario: formData.get("comentario")?.toString() || null,
  });

  if (!parsed.success) {
    return {
      message: "Datos inválidos",
      status: "error",
      clientId: prevState.clientId,
    };
  }

  try {
    await prisma.resena.create({
      data: {
        // Usamos los IDs directamente o connect
        clienteId: parsed.data.clienteId,
        productoId: parsed.data.productoId,
        transaccionId: parsed.data.transaccionId,
        estrellas: parsed.data.estrellas, // Ahora sí es un Int
        comentario: parsed.data.comentario,
      },
    });

    return {
      message: "¡Gracias por tu opinión gourmet!",
      status: "success",
      clientId: prevState.clientId,
    };
  } catch (error) {
    console.error("Error al agregar reseña:", error);
    return {
      message: "Error al registrar reseña en la base de datos",
      status: "error",
      clientId: prevState.clientId,
    };
  }
}
