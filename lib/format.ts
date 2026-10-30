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

export function formatFecha(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-VE");
}

export function formatFechaHora(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" });
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
