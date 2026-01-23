"use server";

import { prisma } from "../prisma";
import { z } from "zod";

const ProductSchema = z.object({
  nombre: z.string(),
  precio: z.number(),
  categoria: z.string(),
  imgUrl: z.string(),
  descripcion: z.string(),
});

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") || "").trim();

  if (!id) {
    throw new Error("Product ID is required for deletion");
  }

  try {
    await prisma.producto.delete({
      where: {
        id: Number(id),
      },
    });
  } catch (error) {
    console.error("Error al eliminar el producto:", error);
    return { message: "Error al eliminar el producto", status: "error" };
  }
  return { message: "Producto eliminado exitosamente", status: "success" };
}

export async function addProduct(
  prevState: { message: string; status: string },
  formData: FormData,
): Promise<{ message: string; status: string }> {
  const parsed = ProductSchema.safeParse({
    nombre: String(formData.get("nombre")),
    precio: Number(formData.get("precio")),
    categoria: String(formData.get("categoria")),
    imgUrl: String(formData.get("imgUrl")),
    descripcion: String(formData.get("descripcion")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return {
      message: "Datos inválidos, revisa el formulario",
      status: "error",
    };
  }

  try {
    await prisma.producto.create({
      data: {
        ...parsed.data,
      },
    });
  } catch (error) {
    console.error("Error al agregar cliente:", error);
    return { message: "Error al registrar cliente", status: "error" };
  }

  return { message: "Producto agregado exitosamente", status: "success" };
}

export async function editProduct(formData: FormData, productoId: number) {
  const parsed = ProductSchema.safeParse({
    nombre: String(formData.get("nombre")),
    precio: Number(formData.get("precio")),
    categoria: String(formData.get("categoria")),
    imgUrl: String(formData.get("imgUrl")),
    descripcion: String(formData.get("descripcion")),
  });

  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid form data");
  }

  try {
    await prisma.producto.update({
      where: { id: productoId },
      data: {
        ...parsed.data,
      },
    });
  } catch (error) {
    console.error("Error al editar producto:", error);
    throw new Error("Failed to edit product");
  }

  return { message: "Producto editado exitosamente", status: "success" };
}
