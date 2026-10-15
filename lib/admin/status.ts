import type { EstadoTransaccion } from "@prisma/client";

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

export function canSelectOrderState(state: string) {
  return isActiveOrderState(state);
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
    (currentState === "por_cobrar" || currentState === "en_pedido") &&
    nextState === "pagado" &&
    !confirmed
  );
}
