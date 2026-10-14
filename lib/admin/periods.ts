export type AnalyticsPeriodType = "semana" | "mes";

export type AnalyticsPeriod = {
  tipo: AnalyticsPeriodType;
  valor: string;
  desde: Date;
  hasta: Date;
  etiqueta: string;
};

type PeriodRange = Pick<AnalyticsPeriod, "desde" | "hasta">;

function startOfIsoWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - (day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function getIsoWeekInfo(date: Date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const year = utcDate.getUTCFullYear();
  const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((utcDate.getTime() - firstDayOfYear.getTime()) / 86400000 + 1) / 7);
  return { year, week };
}

function endOfRange(start: Date, unit: "semana" | "mes") {
  const result = new Date(start);
  if (unit === "semana") result.setDate(result.getDate() + 7);
  else result.setMonth(result.getMonth() + 1);
  result.setMilliseconds(-1);
  return result;
}

function parseWeek(value: string | undefined): PeriodRange & { valor: string } | null {
  const match = value?.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);
  const firstThursday = new Date(year, 0, 4);
  const desde = startOfIsoWeek(firstThursday);
  desde.setDate(desde.getDate() + (week - 1) * 7);

  const info = getIsoWeekInfo(desde);
  if (info.year !== year || info.week !== week) return null;

  return { valor: value!, desde, hasta: endOfRange(desde, "semana") };
}

function parseMonth(value: string | undefined): PeriodRange & { valor: string } | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const desde = new Date(year, month - 1, 1, 0, 0, 0, 0);
  if (desde.getFullYear() !== year || desde.getMonth() !== month - 1) return null;

  return { valor: value!, desde, hasta: endOfRange(desde, "mes") };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short" }).format(date);
}

function makeWeekPeriod(range: PeriodRange & { valor: string }): AnalyticsPeriod {
  const { year, week } = getIsoWeekInfo(range.desde);
  return {
    tipo: "semana",
    valor: range.valor,
    desde: range.desde,
    hasta: range.hasta,
    etiqueta: `Semana ${week} de ${year} · ${formatDate(range.desde)} al ${formatDate(range.hasta)}`,
  };
}

function makeMonthPeriod(range: PeriodRange & { valor: string }): AnalyticsPeriod {
  return {
    tipo: "mes",
    valor: range.valor,
    desde: range.desde,
    hasta: range.hasta,
    etiqueta: new Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric" }).format(range.desde),
  };
}

export function getCurrentWeekValue(reference = new Date()) {
  const { year, week } = getIsoWeekInfo(reference);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function formatWeekSelection(value: string) {
  const range = parseWeek(value);
  if (!range) return "Selecciona una semana";
  const { year, week } = getIsoWeekInfo(range.desde);
  return `Semana ${week} · ${formatShortDate(range.desde)}–${formatShortDate(range.hasta)} ${year}`;
}

export function formatMonthSelection(value: string) {
  const range = parseMonth(value);
  if (!range) return "Selecciona un mes";
  return new Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric" }).format(range.desde);
}

export function resolveAnalyticsPeriod({ semana, mes, reference = new Date() }: { semana?: string; mes?: string; reference?: Date }): AnalyticsPeriod {
  const week = parseWeek(semana);
  if (week) return makeWeekPeriod(week);

  const month = parseMonth(mes);
  if (month) return makeMonthPeriod(month);

  return makeWeekPeriod(parseWeek(getCurrentWeekValue(reference))!);
}
