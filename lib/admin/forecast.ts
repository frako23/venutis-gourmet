import type { AnalyticsPeriodType } from "./periods";

export type ForecastPeriod = { inicio: Date; fin: Date; totalUsd: number };
export type ForecastResult = { valorUsd: number; periodoObjetivo: string; historialUsado: string; estado: "disponible" | "datos_insuficientes" };

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function startOfMonth(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(1);
  return result;
}

export function getCompletedPeriods(reference: Date, tipoPeriodo: AnalyticsPeriodType, count: number): ForecastPeriod[] {
  const periods: ForecastPeriod[] = [];
  const currentStart = tipoPeriodo === "semana" ? startOfWeek(reference) : startOfMonth(reference);
  for (let index = count; index >= 1; index -= 1) {
    const inicio = new Date(currentStart);
    if (tipoPeriodo === "semana") inicio.setDate(inicio.getDate() - index * 7);
    else inicio.setMonth(inicio.getMonth() - index);
    const fin = new Date(inicio);
    if (tipoPeriodo === "semana") fin.setDate(fin.getDate() + 7);
    else fin.setMonth(fin.getMonth() + 1);
    periods.push({ inicio, fin, totalUsd: 0 });
  }
  return periods;
}

export function calculateMovingAverageForecast(periods: ForecastPeriod[], tipoPeriodo: AnalyticsPeriodType): ForecastResult {
  const minimum = tipoPeriodo === "semana" ? 4 : 3;
  const usable = periods.slice(-minimum);
  const history = usable.map((period) => `${period.inicio.toLocaleDateString("es-VE")}–${new Date(period.fin.getTime() - 1).toLocaleDateString("es-VE")}`).join(", ");
  const target = usable.length > 0 ? `${tipoPeriodo === "semana" ? "Semana" : "Mes"} siguiente a ${new Date(usable[usable.length - 1].fin.getTime() - 1).toLocaleDateString("es-VE")}` : "Periodo siguiente";
  if (usable.length < minimum) return { valorUsd: 0, periodoObjetivo: target, historialUsado: history || "Se requieren más periodos completos", estado: "datos_insuficientes" };
  const valorUsd = Math.round(usable.reduce((sum, period) => sum + period.totalUsd, 0) / usable.length * 100) / 100;
  return { valorUsd, periodoObjetivo: target, historialUsado: history, estado: "disponible" };
}
