export const SUPPORTED_PAYMENT_METHODS = [
  "PagoMovil",
  "Zelle",
  "TransferenciaBs",
  "EfectivoUsd",
] as const;

export type SupportedPaymentMethod = (typeof SUPPORTED_PAYMENT_METHODS)[number];
export type CheckoutDeliveryMethod = "envio" | "recogida";
export type InitialOrderState = "por_cobrar" | "en_pedido";

export type CheckoutLine = {
  precio: number;
  cantidad: number;
};

export type DeliveryInput = {
  tipodeRetiro: CheckoutDeliveryMethod;
  zonaEntrega?: string | null;
  aliasEntrega?: string | null;
  direccionEntrega?: string | null;
  montoDelivery: number;
  zonaConfigurada?: boolean;
};

export type PaymentInput = {
  metodoPago: string;
  montoUsd: number;
  montoBs: number;
  tasaCambio: number;
  referencia?: string | null;
  fechaPago?: Date | null;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateCheckoutTotals(
  lines: CheckoutLine[],
  montoDelivery: number,
  descuento = 0,
) {
  const subtotalUsd = roundMoney(
    lines.reduce((total, line) => total + line.precio * line.cantidad, 0),
  );
  return {
    subtotalUsd,
    montoDelivery: roundMoney(montoDelivery),
    montoTotal: roundMoney(subtotalUsd + montoDelivery - descuento),
  };
}

export function isSupportedPaymentMethod(
  value: string,
): value is SupportedPaymentMethod {
  return (SUPPORTED_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function getInitialOrderState(method: string): InitialOrderState {
  return method === "EfectivoUsd" ? "por_cobrar" : "en_pedido";
}

export function validateDeliveryInput(input: DeliveryInput) {
  if (!Number.isFinite(input.montoDelivery) || input.montoDelivery < 0) {
    return { ok: false as const, message: "El cargo de delivery no es válido." };
  }

  if (input.tipodeRetiro === "recogida") {
    return input.montoDelivery === 0
      ? { ok: true as const }
      : { ok: false as const, message: "El retiro no puede tener cargo de delivery." };
  }

  if (input.zonaConfigurada === false) {
    return { ok: false as const, message: "La zona de delivery no está configurada." };
  }

  const hasSnapshot = Boolean(
    input.zonaEntrega?.trim() &&
      input.aliasEntrega?.trim() &&
      input.direccionEntrega?.trim(),
  );
  if (!hasSnapshot || input.montoDelivery <= 0) {
    return {
      ok: false as const,
      message: "El delivery requiere zona, alias, dirección y un cargo válido.",
    };
  }
  return { ok: true as const };
}

export function validatePaymentInput(input: PaymentInput, totalUsd: number) {
  if (!isSupportedPaymentMethod(input.metodoPago)) {
    return { ok: false as const, message: "El método de pago no está habilitado." };
  }
  if (!Number.isFinite(input.tasaCambio) || input.tasaCambio <= 0) {
    return { ok: false as const, message: "La tasa de cambio no está disponible." };
  }
  if (!Number.isFinite(input.montoUsd) || input.montoUsd < 0) {
    return { ok: false as const, message: "El monto en dólares no es válido." };
  }
  if (!Number.isFinite(input.montoBs) || input.montoBs < 0) {
    return { ok: false as const, message: "El monto en bolívares no es válido." };
  }

  const expectedBs = roundMoney(totalUsd * input.tasaCambio);
  if (Math.abs(input.montoUsd - totalUsd) > 0.02 || Math.abs(input.montoBs - expectedBs) > 0.1) {
    return { ok: false as const, message: "El pago no coincide con el total final." };
  }

  if (input.metodoPago !== "EfectivoUsd" && !input.referencia?.trim()) {
    return { ok: false as const, message: "La referencia del pago es obligatoria." };
  }
  if (
    input.metodoPago !== "EfectivoUsd" &&
    (!(input.fechaPago instanceof Date) || Number.isNaN(input.fechaPago.getTime()))
  ) {
    return { ok: false as const, message: "La fecha del pago no es válida." };
  }
  return { ok: true as const };
}

export function isValidIdempotencyKey(value: string) {
  return value.trim().length >= 16 && value.trim().length <= 120;
}

export function isAddressOwnedByClient(
  addressClientId: number,
  clientId: number,
) {
  return Number.isInteger(addressClientId) && addressClientId === clientId;
}
