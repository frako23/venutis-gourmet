import { isValidQuantity, roundQuantity } from "../inventory.ts";
import { getPriceTypeLabel } from "./status.ts";

export type SaleLineInput = {
  productoId: number;
  cantidad: number;
  precioUnitarioUsd: number;
};

export type DiscountInput = {
  tipo: "porcentaje" | "usd";
  valor: number;
};

export type SaleTotals = {
  subtotalUsd: number;
  descuentoUsd: number;
  /** Descuento por premios canjeados con puntos; se suma al descuento al calcular el total. */
  descuentoPuntosUsd: number;
  totalUsd: number;
  descuentoBs: number | null;
  totalBs: number | null;
  tasaCambio: number | null;
};

export function roundMoney(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("El importe debe ser un número válido");
  }

  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertUsdToBs(valueUsd: number, tasaCambio: number) {
  if (!Number.isFinite(tasaCambio) || tasaCambio <= 0) {
    throw new Error("La tasa de cambio debe ser mayor que cero");
  }

  return roundMoney(valueUsd * tasaCambio);
}

export function calculateSubtotal(lines: SaleLineInput[]) {
  if (!lines.length) {
    throw new Error("La venta debe tener al menos un producto");
  }

  return roundMoney(
    lines.reduce((total, line) => {
      if (!isValidQuantity(line.cantidad)) {
        throw new Error("La cantidad debe ser mayor que cero y tener como máximo 2 decimales");
      }

      if (!Number.isFinite(line.precioUnitarioUsd) || line.precioUnitarioUsd <= 0) {
        throw new Error("El precio unitario debe ser mayor que cero");
      }

      return total + line.cantidad * line.precioUnitarioUsd;
    }, 0),
  );
}

export function calculateSaleTotals(
  lines: SaleLineInput[],
  discount: DiscountInput | null = null,
  tasaCambio: number | null = null,
  descuentoPuntosUsd = 0,
): SaleTotals {
  const subtotalUsd = calculateSubtotal(lines);
  let descuentoUsd = 0;

  if (discount) {
    if (!Number.isFinite(discount.valor) || discount.valor < 0) {
      throw new Error("El descuento debe ser un número no negativo");
    }

    if (discount.tipo === "porcentaje") {
      if (discount.valor > 100) {
        throw new Error("El descuento porcentual no puede superar 100%");
      }
      descuentoUsd = roundMoney((subtotalUsd * discount.valor) / 100);
    } else {
      descuentoUsd = roundMoney(discount.valor);
    }
  }

  if (Math.round((descuentoUsd + descuentoPuntosUsd) * 100) > Math.round(subtotalUsd * 100)) {
    throw new Error("El descuento no puede superar el subtotal");
  }

  const totalUsd = roundMoney(subtotalUsd - descuentoUsd - descuentoPuntosUsd);
  const resolvedRate = tasaCambio && tasaCambio > 0 ? tasaCambio : null;

  return {
    subtotalUsd,
    descuentoUsd,
    descuentoPuntosUsd,
    totalUsd,
    descuentoBs: resolvedRate ? convertUsdToBs(descuentoUsd, resolvedRate) : null,
    totalBs: resolvedRate ? convertUsdToBs(totalUsd, resolvedRate) : null,
    tasaCambio: resolvedRate,
  };
}

type TipoPrecioLinea = "detal" | "mayor" | "promo" | null;

/** Desglose de líneas por tipo de precio; `null` se presenta como "Sin especificar". */
export function resumirPorTipoPrecio(lines: Array<{ tipoPrecio: TipoPrecioLinea; cantidad: number; precioUnitario: number }>, totalUsd: number) {
  const porTipo = new Map<TipoPrecioLinea, { cantidadVendida: number; totalUsd: number }>();
  for (const line of lines) {
    const actual = porTipo.get(line.tipoPrecio) ?? { cantidadVendida: 0, totalUsd: 0 };
    actual.cantidadVendida += line.cantidad;
    actual.totalUsd += line.precioUnitario * line.cantidad;
    porTipo.set(line.tipoPrecio, actual);
  }
  return [...porTipo.entries()]
    .map(([tipoPrecio, valor]) => ({
      tipoPrecio,
      etiqueta: getPriceTypeLabel(tipoPrecio),
      cantidadVendida: roundQuantity(valor.cantidadVendida),
      totalUsd: roundMoney(valor.totalUsd),
      porcentajeDelTotal: totalUsd ? Math.round((valor.totalUsd / totalUsd) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.totalUsd - a.totalUsd);
}
