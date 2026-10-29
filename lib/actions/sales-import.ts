"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { aplicarCargaVentas, CargaError, prepararVistaPrevia } from "@/lib/admin/sales-import";
import { CargaInvalidaError, construirCarga, diaCaracas } from "@/lib/admin/sales-import-core";
import type { ConfirmacionState, PrevisualizacionState, ResolucionesCarga } from "@/lib/admin/types";
import { ArchivoExcelError, leerLibroXlsx } from "@/lib/admin/xlsx-reader";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 5 * 1024 * 1024;

const resolucionesSchema = z.object({
  productos: z.record(z.string(), z.number().int().positive()),
  clientes: z.record(
    z.string(),
    z.discriminatedUnion("accion", [
      z.object({ accion: z.literal("vincular"), clienteId: z.number().int().positive() }),
      z.object({ accion: z.literal("crear"), tipoCliente: z.enum(["mayorista", "detal"]) }),
    ]),
  ),
});

function leerArchivo(formData: FormData) {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) throw new CargaInvalidaError("Elige un archivo de Excel (.xlsx).");
  if (archivo.size > MAX_BYTES) throw new CargaInvalidaError("El archivo supera el límite de 5 MB.");
  if (!archivo.name.toLowerCase().endsWith(".xlsx")) throw new CargaInvalidaError("El archivo no es un Excel (.xlsx) válido.");
  return archivo;
}

async function construir(archivo: File) {
  const libro = leerLibroXlsx(new Uint8Array(await archivo.arrayBuffer()));
  return construirCarga(libro, diaCaracas(new Date()));
}

function esErrorDeArchivo(error: unknown): error is Error {
  return error instanceof CargaInvalidaError || error instanceof ArchivoExcelError;
}

export async function previsualizarCargaVentas(_previous: PrevisualizacionState | null, formData: FormData): Promise<PrevisualizacionState> {
  await requireAdmin();
  try {
    const archivo = leerArchivo(formData);
    const carga = await construir(archivo);
    const vista = await prepararVistaPrevia(prisma, carga, archivo.name);
    return { success: true, message: "Revisa la vista previa antes de confirmar.", vista };
  } catch (error) {
    if (esErrorDeArchivo(error)) return { success: false, message: error.message };
    return { success: false, message: "No se pudo leer el archivo." };
  }
}

export async function confirmarCargaVentas(_previous: ConfirmacionState | null, formData: FormData): Promise<ConfirmacionState> {
  const actor = await requireAdmin();

  let resoluciones: ResolucionesCarga;
  try {
    const parsed = resolucionesSchema.safeParse(JSON.parse(formData.get("resoluciones")?.toString() || "{}"));
    if (!parsed.success) return { success: false, message: "Las resoluciones de la carga no son válidas." };
    resoluciones = parsed.data;
  } catch {
    return { success: false, message: "Las resoluciones de la carga no son válidas." };
  }

  try {
    const archivo = leerArchivo(formData);
    const carga = await construir(archivo);
    const fechas = carga.notas.map((nota) => nota.fecha).filter(Boolean).sort();
    const resultado = await prisma.$transaction((tx) => aplicarCargaVentas(tx, carga, resoluciones, actor, archivo.name), { maxWait: 10000, timeout: 60000 });

    revalidatePath("/admin");
    revalidatePath("/admin/transactions");
    revalidatePath("/admin/clients");
    revalidatePath("/admin/analytics/sales");

    const base = { success: true as const, creados: resultado.creados, omitidos: resultado.omitidos, totalUsd: resultado.totalUsd, desde: fechas[0] ?? "", hasta: fechas[fechas.length - 1] ?? "" };
    if (resultado.creados === 0) return { ...base, message: "Todas las notas del archivo ya estaban registradas." };
    return { ...base, message: `Se crearon ${resultado.creados} pedidos por USD ${resultado.totalUsd.toFixed(2)}. ${resultado.omitidos} notas ya estaban registradas.` };
  } catch (error) {
    if (error instanceof CargaError) return { success: false, message: error.message, problemas: error.problemas };
    if (esErrorDeArchivo(error)) return { success: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "Algunas notas ya fueron registradas. Vuelve a previsualizar el archivo." };
    }
    return { success: false, message: "No se pudo guardar la carga. No se registró ningún pedido." };
  }
}
