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
      if (!Number.isInteger(line.cantidad) || line.cantidad <= 0) {
        throw new Error("La cantidad debe ser un entero mayor que cero");
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

  if (descuentoUsd > subtotalUsd) {
    throw new Error("El descuento no puede superar el subtotal");
  }

  const totalUsd = roundMoney(subtotalUsd - descuentoUsd);
  const resolvedRate = tasaCambio && tasaCambio > 0 ? tasaCambio : null;

  return {
    subtotalUsd,
    descuentoUsd,
    totalUsd,
    descuentoBs: resolvedRate ? convertUsdToBs(descuentoUsd, resolvedRate) : null,
    totalBs: resolvedRate ? convertUsdToBs(totalUsd, resolvedRate) : null,
    tasaCambio: resolvedRate,
  };
}
