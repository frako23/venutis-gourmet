import type { Prisma } from "@prisma/client";

/** Único orden de las listas de productos: posición manual, luego nombre, luego id. */
export const ORDEN_CATALOGO: Prisma.ProductoOrderByWithRelationInput[] = [
  { orden: { sort: "asc", nulls: "last" } },
  { nombre: "asc" },
  { id: "asc" },
];

/**
 * Secuencia de ids que se guarda: primero los enviados que aún existen (en el orden
 * enviado, sin repetir) y después los que existen pero no se enviaron, en su orden actual.
 */
export function ordenFinal(enviados: number[], actuales: number[]): number[] {
  const existentes = new Set(actuales);
  const resultado: number[] = [];
  const vistos = new Set<number>();
  for (const id of [...enviados, ...actuales]) {
    if (!existentes.has(id) || vistos.has(id)) continue;
    vistos.add(id);
    resultado.push(id);
  }
  return resultado;
}
