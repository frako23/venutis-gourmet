import type { VisitPeriod, VisitPreset } from "./types.js";

const VISIT_TIME_ZONE = "America/Caracas";
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PRESET_DAYS: Record<Exclude<VisitPreset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

type VisitPeriodInput = {
  preset?: string;
  since?: string;
  until?: string;
  reference?: Date;
};

function datePartsInTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VISIT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function toDateValue(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function isValidDateValue(value: string | undefined): value is string {
  if (!value) return false;
  const match = value.match(DATE_PATTERN);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function rangeLabel(since: string, until: string, prefix?: string) {
  return `${prefix ? `${prefix} · ` : ""}${formatDate(since)} al ${formatDate(until)}`;
}

function invalidPeriod(message: string, input: VisitPeriodInput): VisitPeriod {
  const preset: VisitPreset = input.preset === "custom" ? "custom" : "7d";
  return {
    preset,
    since: isValidDateValue(input.since) ? input.since : "",
    until: isValidDateValue(input.until) ? input.until : "",
    label: "Periodo no válido",
    isValid: false,
    validationMessage: message,
  };
}

export function parseVisitPreset(value: string | undefined): VisitPreset | null {
  if (value === "7d" || value === "30d" || value === "90d" || value === "custom") return value;
  return value === undefined || value === "" ? "7d" : null;
}

export function resolveVisitPeriod({ preset: rawPreset, since, until, reference = new Date() }: VisitPeriodInput = {}): VisitPeriod {
  const preset = parseVisitPreset(rawPreset);
  if (!preset) return invalidPeriod("Selecciona un periodo válido.", { preset: rawPreset, since, until, reference });

  if (preset === "custom") {
    if (!isValidDateValue(since) || !isValidDateValue(until)) {
      return invalidPeriod("El periodo personalizado requiere dos fechas válidas.", { preset, since, until, reference });
    }
    if (until < since) {
      return invalidPeriod("La fecha final no puede ser anterior a la fecha inicial.", { preset, since, until, reference });
    }
    return {
      preset,
      since,
      until,
      label: rangeLabel(since, until, "Periodo personalizado"),
      isValid: true,
    };
  }

  const today = datePartsInTimeZone(reference);
  const untilValue = toDateValue(today.year, today.month, today.day);
  const sinceValue = toDateValue(today.year, today.month, today.day - (PRESET_DAYS[preset] - 1));
  return {
    preset,
    since: sinceValue,
    until: untilValue,
    label: rangeLabel(sinceValue, untilValue, `Últimos ${PRESET_DAYS[preset]} días`),
    isValid: true,
  };
}

export function getVisitPresetOptions() {
  return [
    { value: "7d" as const, label: "Últimos 7 días" },
    { value: "30d" as const, label: "Últimos 30 días" },
    { value: "90d" as const, label: "Últimos 90 días" },
    { value: "custom" as const, label: "Periodo personalizado" },
  ];
}
