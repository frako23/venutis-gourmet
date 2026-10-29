import type { Prisma } from "@prisma/client";

/** Cantidad válida: mayor que cero y con 2 decimales como máximo. */
export function isValidQuantity(value: number) {
  return Number.isFinite(value) && value > 0 && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
}

export function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Unidades enteras que ve la tienda, la venta rápida y la cotización. */
export function unidadesDisponibles(inventario: number) {
  return Math.max(0, Math.floor(roundQuantity(inventario)));
}

export function formatQuantity(value: number) {
  return roundQuantity(value).toLocaleString("es-VE", { maximumFractionDigits: 2 });
}

export class StockInsuficienteError extends Error {
  constructor(public readonly productoNombre: string) {
    super(`Stock insuficiente para ${productoNombre}.`);
  }
}

/**
 * Único punto que modifica `Producto.inventario` en ventas y cancelaciones.
 * Bloquea la fila, redondea a 2 decimales y rechaza negativos si `exigirStock`.
 */
export async function ajustarInventario(
  tx: Prisma.TransactionClient,
  productoId: number,
  delta: number,
  opciones: { exigirStock: boolean },
) {
  const filas = await tx.$queryRaw<Array<{ inventario: number; nombre: string }>>`SELECT "inventario", "nombre" FROM "Producto" WHERE "id" = ${productoId} FOR UPDATE`;
  if (filas.length === 0) throw new Error("Uno de los productos seleccionados no existe.");
  const siguiente = roundQuantity(filas[0].inventario + delta);
  if (opciones.exigirStock && siguiente < 0) throw new StockInsuficienteError(filas[0].nombre);
  await tx.producto.update({ where: { id: productoId }, data: { inventario: siguiente } });
  return siguiente;
}
