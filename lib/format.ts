const usd = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatUsd(value: number) {
  return usd.format(value);
}

/** USD con signo explícito para los libros de movimientos (+USD 5,00 / −USD 5,00). */
export function formatUsdConSigno(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${usd.format(Math.abs(value))}`;
}

export function formatPuntosConSigno(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("es-VE")}`;
}

/** Zona horaria oficial del negocio (Caracas, UTC-4). Los servidores corren en UTC. */
export const ZONA_HORARIA = "America/Caracas";

export function formatFecha(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-VE", { timeZone: ZONA_HORARIA });
}

export function formatFechaHora(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short", timeZone: ZONA_HORARIA });
}

const origenSaldo: Record<string, string> = {
  sobrepago: "Sobrepago",
  pago_cuenta: "Pago a cuenta",
  pedido_cancelado: "Pedido cancelado",
  aplicacion_pedido: "Aplicado a un pedido",
  anulacion: "Anulación",
  ajuste: "Ajuste",
};

export function origenSaldoLabel(origen: string) {
  return origenSaldo[origen] ?? origen;
}

const tipoPuntos: Record<string, string> = {
  acumulacion: "Acumulación",
  redencion: "Canje",
  devolucion: "Devolución",
  reversion: "Reversión",
  ajuste: "Ajuste",
};

export function tipoPuntosLabel(tipo: string) {
  return tipoPuntos[tipo] ?? tipo;
}

/** Instante -> "YYYY-MM-DDTHH:mm" en hora de Caracas (valor para <input type="datetime-local">). */
export function fechaHoraLocalCaracas(instante: Date | string): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instante));
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "00";
  return `${valor("year")}-${valor("month")}-${valor("day")}T${valor("hour")}:${valor("minute")}`;
}

/** "YYYY-MM-DDTHH:mm" escrito en hora de Caracas -> instante. Caracas es UTC-4 todo el año (sin horario de verano). */
export function interpretarFechaHoraCaracas(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) return null;
  const fecha = new Date(`${texto}:00-04:00`);
  if (Number.isNaN(fecha.getTime())) return null;
  return fechaHoraLocalCaracas(fecha) === texto ? fecha : null;
}
