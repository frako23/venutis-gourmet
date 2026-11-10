import { prisma } from "@/lib/prisma";
import { calculateMovingAverageForecast, getCompletedPeriods } from "./forecast";
import type { AnalyticsPeriod } from "./periods";
import { resumirPorProducto, resumirPorTipoPrecio } from "./sales-calculations";
import type { AnalyticsResult } from "./types";

export async function consultarAnaliticas({ periodo, productoId, incluirPredictor }: { periodo: AnalyticsPeriod; productoId?: number; incluirPredictor: boolean }): Promise<AnalyticsResult> {
  const lineWhere = { transaccion: { fechaCompra: { gte: periodo.desde, lte: periodo.hasta }, estado: { not: "cancelado" as const } }, ...(productoId ? { productoId } : {}) };
  const lines = await prisma.detalleCompra.findMany({ where: lineWhere, include: { producto: true, transaccion: { select: { id: true, fechaCompra: true } } } });
  const totalUsd = Math.round(lines.reduce((sum, line) => sum + line.precioUnitario * line.cantidad, 0) * 100) / 100;
  const porProducto = resumirPorProducto(lines.map((line) => ({ productoId: line.productoId, nombre: line.producto.nombre, cantidad: line.cantidad, precioUnitario: line.precioUnitario })), totalUsd);
  const porTipoPrecio = resumirPorTipoPrecio(lines, totalUsd);
  let predictor: AnalyticsResult["predictor"] = null;
  if (incluirPredictor) {
    const periods = getCompletedPeriods(periodo.hasta, periodo.tipo, periodo.tipo === "semana" ? 4 : 3);
    const historicalLines = await prisma.detalleCompra.findMany({ where: { transaccion: { fechaCompra: { gte: periods[0].inicio, lt: periods[periods.length - 1].fin }, estado: { not: "cancelado" } }, ...(productoId ? { productoId } : {}) }, select: { cantidad: true, precioUnitario: true, transaccion: { select: { fechaCompra: true } } } });
    for (const line of historicalLines) { const period = periods.find((candidate) => line.transaccion.fechaCompra >= candidate.inicio && line.transaccion.fechaCompra < candidate.fin); if (period) period.totalUsd += line.cantidad * line.precioUnitario; }
    predictor = calculateMovingAverageForecast(periods, periodo.tipo);
  }
  return { periodo, totalUsd, cantidadVentas: new Set(lines.map((line) => line.transaccion.id)).size, porProducto, porTipoPrecio, predictor };
}
