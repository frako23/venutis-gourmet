import type { EstadoTransaccion, TipoPrecio } from "@prisma/client";

export const ACTIVE_ORDER_STATES = ["por_cobrar", "en_pedido", "pagado"] as const;

export type ActiveOrderState = (typeof ACTIVE_ORDER_STATES)[number];

const labels: Record<EstadoTransaccion, string> = {
  por_cobrar: "Por cobrar",
  pendiente: "Por cobrar",
  en_pedido: "En pedido",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

export function getOrderStateLabel(state: EstadoTransaccion) {
  return labels[state] ?? state;
}

export function isActiveOrderState(
  state: string,
): state is ActiveOrderState {
  return ACTIVE_ORDER_STATES.includes(state as ActiveOrderState);
}

export function normalizeLegacyState(state: EstadoTransaccion): ActiveOrderState | "cancelado" {
  if (state === "pendiente") return "por_cobrar";
  if (state === "cancelado") return "cancelado";
  return state as ActiveOrderState;
}

export function getNextOrderStates(state: EstadoTransaccion): EstadoTransaccion[] {
  if (state === "cancelado") return [];
  if (state === "pagado") return ["por_cobrar", "en_pedido", "pagado"];
  return ["por_cobrar", "en_pedido", "pagado", "cancelado"];
}

export function canCancelOrder(state: EstadoTransaccion) {
  return state === "por_cobrar" || state === "en_pedido" || state === "pendiente";
}

export function normalizeStateReason(value?: string | null) {
  const reason = value?.trim();
  return reason ? reason : null;
}

export function getRestockQuantities(lines: Array<{ productoId: number; cantidad: number }>) {
  const totals = new Map<number, number>();
  for (const line of lines) {
    if (line.cantidad > 0) totals.set(line.productoId, (totals.get(line.productoId) ?? 0) + line.cantidad);
  }
  return [...totals].map(([productoId, cantidad]) => ({ productoId, cantidad }));
}

export function requiresPaymentConfirmation(totalUsd: number, paidUsd: number, confirmed: boolean, hasNewPayment: boolean) {
  return totalUsd > paidUsd && !confirmed && !hasNewPayment;
}

export function requiresExplicitPaymentConfirmation(
  currentState: EstadoTransaccion,
  nextState: EstadoTransaccion,
  confirmed: boolean,
) {
  return (
    (currentState === "por_cobrar" || currentState === "pendiente" || currentState === "en_pedido") &&
    nextState === "pagado" &&
    !confirmed
  );
}

const paymentLabels: Record<string, string> = {
  TransferenciaBs: "Transferencia Bs",
  EfectivoUsd: "Efectivo USD",
  Zelle: "Zelle",
  PagoMovil: "Pago móvil",
  TransferenciaUsd: "Transferencia USD",
  NoEspecificado: "No especificado",
  SaldoAFavor: "Saldo a favor",
};

export function getPaymentMethodLabel(method: string) {
  return paymentLabels[method] ?? method;
}

export function getPriceTypeLabel(tipo: TipoPrecio | null) {
  return tipo === "detal" ? "Detal" : tipo === "mayor" ? "Mayor" : tipo === "promo" ? "Promo" : "Sin especificar";
}
