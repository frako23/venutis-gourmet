"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import {
  claveZona,
  validarCostoZona,
  validarNombreZona,
  type ZonaDeliveryPanel,
} from "@/lib/delivery-zone-rules";
import { prisma } from "@/lib/prisma";

export type ResultadoZona =
  | { success: true; message: string; zona: ZonaDeliveryPanel }
  | { success: false; message: string; campo?: "nombre" | "costoUsd" };

const ERROR_GENERICO = "No se pudo guardar la zona. Intenta de nuevo.";
const SELECT_ZONA = { id: true, nombre: true, costoUsd: true, activa: true } as const;

const CrearSchema = z.object({ nombre: z.string().max(200), costoUsd: z.number() }).strict();
const ActualizarSchema = z
  .object({
    id: z.number().int().positive(),
    cambios: z
      .object({
        nombre: z.string().max(200).optional(),
        costoUsd: z.number().optional(),
        activa: z.boolean().optional(),
      })
      .strict()
      .refine((c) => Object.values(c).some((v) => v !== undefined)),
  })
  .strict();

const usd = (valor: number) => `$${valor.toFixed(2)}`;

function esDuplicado(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function mensajeDuplicado(nombre: string, clave: string): Promise<ResultadoZona> {
  const existente = await prisma.zonaDelivery.findUnique({ where: { clave }, select: { activa: true } });
  const sufijo = existente && !existente.activa ? " Está inactiva: reactívala en lugar de crearla." : "";
  return { success: false, campo: "nombre", message: `Ya existe una zona llamada «${nombre}».${sufijo}` };
}

export async function crearZonaDelivery(input: { nombre: string; costoUsd: number }): Promise<ResultadoZona> {
  await requireAdmin();
  const parsed = CrearSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Los datos enviados no son válidos. Recarga la página." };

  const nombre = validarNombreZona(parsed.data.nombre);
  if (!nombre.ok) return { success: false, campo: nombre.campo, message: nombre.message };
  const costo = validarCostoZona(parsed.data.costoUsd);
  if (!costo.ok) return { success: false, campo: costo.campo, message: costo.message };

  try {
    const zona = await prisma.zonaDelivery.create({
      data: { nombre: nombre.value.nombre, clave: nombre.value.clave, costoUsd: costo.value, activa: true },
      select: SELECT_ZONA,
    });
    revalidatePath("/", "layout");
    return { success: true, message: `Zona «${zona.nombre}» agregada a ${usd(zona.costoUsd)}.`, zona };
  } catch (error) {
    if (esDuplicado(error)) return mensajeDuplicado(nombre.value.nombre, nombre.value.clave);
    console.error("Error al crear la zona de delivery:", error);
    return { success: false, message: ERROR_GENERICO };
  }
}

export async function actualizarZonaDelivery(
  id: number,
  cambios: { nombre?: string; costoUsd?: number; activa?: boolean },
): Promise<ResultadoZona> {
  await requireAdmin();
  const parsed = ActualizarSchema.safeParse({ id, cambios });
  if (!parsed.success) return { success: false, message: "Los cambios enviados no son válidos. Recarga la página." };

  const datos: { nombre?: string; clave?: string; costoUsd?: number; activa?: boolean } = {};
  let claveNueva: string | null = null;

  if (parsed.data.cambios.nombre !== undefined) {
    const nombre = validarNombreZona(parsed.data.cambios.nombre);
    if (!nombre.ok) return { success: false, campo: nombre.campo, message: nombre.message };
    datos.nombre = nombre.value.nombre;
    datos.clave = nombre.value.clave;
    claveNueva = nombre.value.clave;
  }
  if (parsed.data.cambios.costoUsd !== undefined) {
    const costo = validarCostoZona(parsed.data.cambios.costoUsd);
    if (!costo.ok) return { success: false, campo: costo.campo, message: costo.message };
    datos.costoUsd = costo.value;
  }
  if (parsed.data.cambios.activa !== undefined) datos.activa = parsed.data.cambios.activa;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const actual = await tx.zonaDelivery.findUnique({ where: { id: parsed.data.id } });
      if (!actual) return null;

      const zona = await tx.zonaDelivery.update({ where: { id: actual.id }, data: datos, select: SELECT_ZONA });

      // Renombrar mantiene asociadas las direcciones guardadas en esta zona (FR-014).
      let direcciones = 0;
      if (datos.nombre !== undefined && datos.nombre !== actual.nombre) {
        const usadas = await tx.direccion.findMany({ distinct: ["urbanizacion"], select: { urbanizacion: true } });
        const valores = usadas.map((d) => d.urbanizacion).filter((v) => claveZona(v) === actual.clave);
        if (valores.length > 0) {
          const { count } = await tx.direccion.updateMany({
            where: { urbanizacion: { in: valores } },
            data: { urbanizacion: datos.nombre },
          });
          direcciones = count;
        }
      }
      return { actual, zona, direcciones };
    });

    if (!resultado) return { success: false, message: "La zona ya no existe. Recarga la página." };

    const { actual, zona, direcciones } = resultado;
    revalidatePath("/", "layout");

    let message: string;
    if (datos.nombre !== undefined && datos.nombre !== actual.nombre) {
      message = `Zona renombrada a «${zona.nombre}».${direcciones > 0 ? ` Se actualizaron ${direcciones} direcciones.` : ""}`;
    } else if (datos.costoUsd !== undefined && datos.costoUsd !== actual.costoUsd) {
      message = `Costo de «${zona.nombre}» actualizado a ${usd(zona.costoUsd)}.`;
    } else if (datos.activa !== undefined && datos.activa !== actual.activa) {
      message = zona.activa
        ? `«${zona.nombre}» reactivada.`
        : `«${zona.nombre}» desactivada: ya no se ofrece en la tienda.`;
    } else {
      message = `Zona «${zona.nombre}» sin cambios.`;
    }
    return { success: true, message, zona };
  } catch (error) {
    if (esDuplicado(error) && claveNueva && datos.nombre) return mensajeDuplicado(datos.nombre, claveNueva);
    console.error("Error al actualizar la zona de delivery:", error);
    return { success: false, message: ERROR_GENERICO };
  }
}
