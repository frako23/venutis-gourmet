import { prisma } from "@/lib/prisma";
import { calculateMovingAverageForecast, getCompletedPeriods } from "./forecast";
import type { AnalyticsPeriod } from "./periods";
import type { AnalyticsResult } from "./types";

export async function consultarAnaliticas({ periodo, productoId, incluirPredictor }: { periodo: AnalyticsPeriod; productoId?: number; incluirPredictor: boolean }): Promise<AnalyticsResult> {
  const lineWhere = { transaccion: { fechaCompra: { gte: periodo.desde, lte: periodo.hasta }, estado: { not: "cancelado" as const } }, ...(productoId ? { productoId } : {}) };
  const lines = await prisma.detalleCompra.findMany({ where: lineWhere, include: { producto: true, transaccion: { select: { id: true, fechaCompra: true } } } });
  const totalUsd = Math.round(lines.reduce((sum, line) => sum + line.precioUnitario * line.cantidad, 0) * 100) / 100;
  const productMap = new Map<number, { nombre: string; cantidadVendida: number; totalUsd: number }>();
  for (const line of lines) {
    const current = productMap.get(line.productoId) ?? { nombre: line.producto.nombre, cantidadVendida: 0, totalUsd: 0 };
    current.cantidadVendida += line.cantidad;
    current.totalUsd += line.precioUnitario * line.cantidad;
    productMap.set(line.productoId, current);
  }
  const porProducto = [...productMap.entries()].map(([id, product]) => ({ productoId: id, nombre: product.nombre, cantidadVendida: product.cantidadVendida, totalUsd: Math.round(product.totalUsd * 100) / 100, porcentajeDelTotal: totalUsd ? Math.round(product.totalUsd / totalUsd * 10000) / 100 : 0 })).sort((a, b) => b.totalUsd - a.totalUsd);
  let predictor: AnalyticsResult["predictor"] = null;
  if (incluirPredictor) {
    const periods = getCompletedPeriods(periodo.hasta, periodo.tipo, periodo.tipo === "semana" ? 4 : 3);
    const historicalLines = await prisma.detalleCompra.findMany({ where: { transaccion: { fechaCompra: { gte: periods[0].inicio, lt: periods[periods.length - 1].fin }, estado: { not: "cancelado" } }, ...(productoId ? { productoId } : {}) }, select: { cantidad: true, precioUnitario: true, transaccion: { select: { fechaCompra: true } } } });
    for (const line of historicalLines) { const period = periods.find((candidate) => line.transaccion.fechaCompra >= candidate.inicio && line.transaccion.fechaCompra < candidate.fin); if (period) period.totalUsd += line.cantidad * line.precioUnitario; }
    predictor = calculateMovingAverageForecast(periods, periodo.tipo);
  }
  return { periodo, totalUsd, cantidadVentas: new Set(lines.map((line) => line.transaccion.id)).size, porProducto, predictor };
}
