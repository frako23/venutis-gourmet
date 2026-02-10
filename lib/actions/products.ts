"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "../prisma";

interface ProductActionState {
  message: string;
  status: string;
  errors?: Record<string, string[]>; // El '?' significa que es opcional
}

const ProductSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  precioDetal: z.coerce.number().positive("El precio debe ser mayor a 0"),
  precioMayorista: z.coerce.number().positive("El precio debe ser mayor a 0"),
  categoria: z.string().min(1, "Selecciona una categoría"),
  inventario: z.coerce
    .number()
    .int()
    .positive("El inventario debe ser mayor a 0"),
  ubicacion: z.string().min(1, "La ubicación es requerida"),
  descripcion: z.string().optional().or(z.literal("")),
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
    revalidatePath("/admin/inventory");
  } catch (error) {
    console.error("Error al eliminar el producto:", error);
    return { message: "Error al eliminar el producto", status: "error" };
  }
  redirect("/admin/inventory");
}

export async function addProduct(
  prevState: ProductActionState, // 2. Actualizamos el tipo del estado previo
  formData: FormData,
): Promise<ProductActionState> {
  // 3. Actualizamos el tipo de la Promesa

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
    return {
      status: "error",
      message: "Revisa los campos marcados",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.producto.create({
      data: {
        ...parsed.data,
        imagenes: {
          create: imagenesData.map((img: { url: string }) => ({
            url: img.url,
          })),
        },
      },
    });
    revalidatePath("/admin/inventory");
  } catch (error) {
    console.error(error);
    return {
      message: "Error en la base de datos",
      status: "error",
      errors: {}, // 4. Mantenemos la consistencia devolviendo un objeto de error vacío
    };
  }

  redirect("/admin/inventory");
}

export async function editProduct(
  productoId: number,
  prevState: ProductActionState, // Usa la interfaz que definimos antes
  formData: FormData,
): Promise<ProductActionState> {
  const imagenesRaw = formData.get("imagenes")?.toString();

  // LOG DE SEGURIDAD: Verifica en tu consola qué está llegando realmente
  console.log("Imagenes recibidas:", imagenesRaw);

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
    return {
      status: "error",
      message: "Revisa los campos marcados",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // Usamos una transacción para asegurar que si algo falla, no se borren las fotos viejas
    await prisma.$transaction(async (tx) => {
      // 1. Borramos las relaciones de imágenes actuales
      await tx.imagen.deleteMany({
        where: { productoId: productoId },
      });

      // 2. Actualizamos el producto y creamos las nuevas imágenes
      await tx.producto.update({
        where: { id: productoId },
        data: {
          ...parsed.data,
          imagenes: {
            create: imagenesData.map((img: { url: string }) => ({
              url: img.url,
            })),
          },
        },
      });
    });

    revalidatePath("/admin/inventory");
  } catch (error) {
    console.error("Error al editar producto:", error);
    return {
      message: "No se pudo actualizar el producto",
      status: "error",
      errors: {},
    };
  }
  redirect("/admin/inventory");
}
