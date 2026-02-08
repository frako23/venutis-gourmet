"use server";

import { z } from "zod";
import { prisma } from "../prisma";

const ProductSchema = z.object({
  nombre: z.string(),
  precioDetal: z.number(), // Changed from 'precio'
  precioMayorista: z.number(), // Added new field
  categoria: z.string(),
  inventario: z.number().int(),
  ubicacion: z.string().min(1, "La ubicación es requerida"),
  imagenes: z.string(),
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
  
  // 1. Extraemos el JSON de imágenes del input oculto
  const imagenesRaw = formData.get("imagenes")?.toString();
  const imagenesData = imagenesRaw ? JSON.parse(imagenesRaw) : [];

  const parsed = ProductSchema.safeParse({
    nombre: String(formData.get("nombre")),
    precioDetal: Number(formData.get("precioDetal")),
    precioMayorista: Number(formData.get("precioMayorista")),
    categoria: String(formData.get("categoria")),
    inventario: Number(formData.get("inventario")),
    ubicacion: formData.get("ubicacion")?.toString() || null,
    descripcion: String(formData.get("descripcion")),
  });

  if (!parsed.success) {
    return { message: "Datos inválidos", status: "error" };
  }

  try {
    await prisma.producto.create({
      data: {
        ...parsed.data,
        // 2. Creamos múltiples entradas en la tabla Imagen
        imagenes: {
          create: imagenesData.map((img: { url: string }) => ({
            url: img.url,
          })),
        },
      },
    });

    return { message: "¡Producto y galería guardados!", status: "success" };
  } catch (error) {
    console.error(error);
    return { message: "Error en la base de datos", status: "error" };
  }
}

export async function editProduct(formData: FormData, productoId: number) {
  const parsed = ProductSchema.safeParse({
    nombre: String(formData.get("nombre")),
    precio: Number(formData.get("precio")),
    categoria: String(formData.get("categoria")),
    inventario: Number(formData.get("inventario")),
    ubicacion: formData.get("ubicacion")?.toString(),
    imagenes: String(formData.get("imagenes[0]")),
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
