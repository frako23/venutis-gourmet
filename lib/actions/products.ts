"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "../admin/auth";
import { ORDEN_CATALOGO, ordenFinal } from "../catalog-order";
import { isValidQuantity, roundQuantity } from "../inventory";
import { prisma } from "../prisma";

interface ProductActionState {
  message: string;
  status: string;
  errors?: Record<string, string[]>; // El '?' significa que es opcional
  timestamp?: number;
}

const ProductSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  precioDetal: z.coerce.number().positive("El precio debe ser mayor a 0"),
  precioMayorista: z.coerce.number().positive("El precio debe ser mayor a 0"),
  categoria: z.string().min(1, "Selecciona una categoría"),
  inventario: z.coerce
    .number()
    .refine((value) => isValidQuantity(value), "El inventario debe ser mayor a 0 y tener como máximo 2 decimales")
    .transform(roundQuantity),
  ubicacion: z.string().min(1, "La ubicación es requerida"),
  descripcion: z.string().optional().or(z.literal("")),
});

const InventoryUpdateSchema = z.object({
  inventario: z.number().refine((value) => value === 0 || isValidQuantity(value), "El inventario no puede ser negativo y admite como máximo 2 decimales").transform(roundQuantity),
  precioDetal: z.number().finite().nonnegative("El precio detal no puede ser negativo"),
  precioMayorista: z.number().finite().nonnegative("El precio mayorista no puede ser negativo"),
});

const OrdenProductosSchema = z
  .array(z.number().int().positive())
  .min(1)
  .max(1000)
  .refine((ids) => new Set(ids).size === ids.length, "Hay productos repetidos.");

const BulkInventorySchema = z.object({
  productos: z.array(InventoryUpdateSchema.extend({ id: z.number().int().positive() })).min(1).max(500),
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
    redirect("/admin/inventory?status=error");

    return { message: "Error al eliminar el producto", status: "error" };
  }
  redirect("/admin/inventory?status=deleted");
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
      timestamp: Date.now(),
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
    redirect("/admin/inventory?status=error");
  }

  redirect("/admin/inventory?status=added");
}

export async function editProduct(
  productoId: number,
  prevState: ProductActionState, // Usa la interfaz que definimos antes
  formData: FormData,
): Promise<ProductActionState> {
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
      timestamp: Date.now(),
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
    redirect("/admin/inventory?status=error");
  }
  redirect("/admin/inventory?status=updated");
}

export async function editInventory(
  id: number,
  data: { inventario: number; precioDetal: number; precioMayorista: number },
) {
  await requireAdmin();
  const parsed = InventoryUpdateSchema.safeParse(data);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    throw new Error("Los datos del inventario no son válidos.");
  }

  try {
    await prisma.producto.update({
      where: { id },
      data: parsed.data,
    });
    revalidatePath("/admin/inventory");
    revalidatePath("/productos/consumidores");
    return { success: true };
  } catch (error) {
    console.error(error);
    throw new Error("Fallo al actualizar");
  }
}

type BulkInventoryState = { success: boolean; message: string; updated?: number };

export async function editInventoryMasiva(_previous: BulkInventoryState, formData: FormData): Promise<BulkInventoryState> {
  await requireAdmin();
  const raw = formData.get("inventarioMasivo")?.toString() ?? "";

  let parsed;
  try {
    parsed = BulkInventorySchema.safeParse({ productos: raw ? JSON.parse(raw) : null });
  } catch {
    return { success: false, message: "El formato de la edición masiva no es válido." };
  }
  if (!parsed.success) return { success: false, message: "Revisa existencias y precios antes de guardar." };

  const ids = parsed.data.productos.map((product) => product.id);
  if (new Set(ids).size !== ids.length) return { success: false, message: "Hay productos repetidos en el lote." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.producto.findMany({ where: { id: { in: ids } }, select: { id: true } });
      if (existing.length !== ids.length) throw new Error("Uno de los productos ya no existe.");

      for (const product of parsed.data.productos) {
        await tx.producto.update({
          where: { id: product.id },
          data: {
            inventario: product.inventario,
            precioDetal: product.precioDetal,
            precioMayorista: product.precioMayorista,
          },
        });
      }
      return { updated: parsed.data.productos.length };
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/productos/consumidores");
    return { success: true, message: `${result.updated} producto(s) actualizado(s).`, updated: result.updated };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "No se pudo guardar la edición masiva." };
  }
}

export async function guardarOrdenProductos(ids: number[]): Promise<{ success: boolean; message: string }> {
  await requireAdmin();
  const parsed = OrdenProductosSchema.safeParse(ids);
  if (!parsed.success) return { success: false, message: "El orden enviado no es válido. Recarga la página e inténtalo de nuevo." };

  try {
    await prisma.$transaction(async (tx) => {
      const actuales = await tx.producto.findMany({ orderBy: ORDEN_CATALOGO, select: { id: true } });
      const posiciones = ordenFinal(parsed.data, actuales.map((producto) => producto.id)).map((id, index) => [id, index + 1] as const);
      // Por id ascendente, para que dos guardados simultáneos bloqueen las filas en el mismo orden.
      for (const [id, orden] of posiciones.sort((a, b) => a[0] - b[0])) {
        await tx.producto.updateMany({ where: { id }, data: { orden } });
      }
    });
    revalidatePath("/", "layout");
    return { success: true, message: "Orden guardado. Todas las vistas ya lo muestran." };
  } catch (error) {
    console.error("Error al guardar el orden de los productos:", error);
    return { success: false, message: "No se pudo guardar el orden. Intenta de nuevo." };
  }
}
