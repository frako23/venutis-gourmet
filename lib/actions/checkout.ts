"use server";

import { EstadoTransaccion, MetodoPago, TipoRetiro } from "@prisma/client";
import {
  getPriceTypeForContext,
  getProductPrice,
  hasValidPrice,
  normalizePurchaseContext,
  PurchaseContext,
} from "@/lib/catalog-context";
import { DELIVERY_ZONES } from "@/lib/constants/constants";
import {
  calculateCheckoutTotals,
  getInitialOrderState,
  isAddressOwnedByClient,
  isValidIdempotencyKey,
  validateDeliveryInput,
  validatePaymentInput,
} from "@/lib/checkout-rules";
import { ajustarInventario, StockInsuficienteError } from "../inventory";
import { nextOrderNumber } from "../order-number";
import { prisma } from "../prisma";

export interface CheckoutData {
  clientId: number;
  contexto: PurchaseContext;
  tipodeRetiro: TipoRetiro;
  direccionId: number | null;
  claveIdempotencia: string;
  carrito: { productoId: number; cantidad: number; precio: number }[];
  pago: {
    montoBs: number;
    montoUsd: number;
    metodoPago: MetodoPago;
    referencia?: string | null;
    fechaPago?: Date | null;
    tasaCambio: number;
  };
}

type CheckoutState = { message: string; status: string; clientId: number | null };
type CheckoutSuccess = {
  success: true;
  transactionId: number;
  numeroOrden: string;
  estado: "por_cobrar" | "en_pedido";
  message: string;
  clientId: number;
};
type CheckoutFailure = {
  success: false;
  code:
    | "EMPTY_CART"
    | "INVALID_CLIENT"
    | "INVALID_ADDRESS"
    | "INVALID_PAYMENT"
    | "PRICE_CHANGED"
    | "STOCK_INSUFFICIENT"
    | "RATE_UNAVAILABLE"
    | "DUPLICATE_CONFIRMATION"
    | "PERSISTENCE_ERROR";
  message: string;
  status: "error";
  clientId: number | null;
};

class CheckoutError extends Error {
  constructor(public readonly code: CheckoutFailure["code"], message: string) {
    super(message);
  }
}

function successMessage(estado: CheckoutSuccess["estado"]) {
  return estado === "por_cobrar"
    ? "Pedido recibido. El pago se coordinará al entregar."
    : "Pedido recibido. Verificaremos el pago declarado antes del despacho.";
}

function asFailure(error: unknown, clientId: number | null): CheckoutFailure {
  if (error instanceof CheckoutError) {
    return { success: false, code: error.code, message: error.message, status: "error", clientId };
  }
  return {
    success: false,
    code: "PERSISTENCE_ERROR",
    message: "No pudimos registrar el pedido. Conservamos tu carrito para intentarlo nuevamente.",
    status: "error",
    clientId,
  };
}

export async function procesarCompra(
  _prevState: CheckoutState,
  datos: CheckoutData,
): Promise<CheckoutSuccess | CheckoutFailure> {
  const clientId = Number.isInteger(datos.clientId) ? datos.clientId : null;
  const idempotencyKey = datos.claveIdempotencia?.trim() ?? "";
  if (!clientId) return asFailure(new CheckoutError("INVALID_CLIENT", "El cliente no es válido."), clientId);
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return asFailure(new CheckoutError("INVALID_PAYMENT", "La confirmación del pedido no es válida."), clientId);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const previous = await tx.transaccion.findUnique({
        where: { claveIdempotencia: idempotencyKey },
        select: { id: true, numeroOrden: true, estado: true, clienteId: true },
      });
      if (previous) {
        if (previous.clienteId !== clientId) {
          throw new CheckoutError("DUPLICATE_CONFIRMATION", "La clave de confirmación ya fue utilizada.");
        }
        if (previous.estado !== "por_cobrar" && previous.estado !== "en_pedido") {
          throw new CheckoutError("DUPLICATE_CONFIRMATION", "La confirmación del pedido ya fue procesada.");
        }
        return {
          success: true as const,
          transactionId: previous.id,
          numeroOrden: previous.numeroOrden,
          estado: previous.estado,
          message: successMessage(previous.estado),
          clientId,
        };
      }

      const cliente = await tx.cliente.findUnique({ where: { id: clientId }, select: { id: true } });
      if (!cliente) throw new CheckoutError("INVALID_CLIENT", "El cliente no existe.");
      if (!datos.carrito.length) throw new CheckoutError("EMPTY_CART", "El carrito está vacío.");

      let montoDelivery = 0;
      let snapshot: { zonaEntrega: string; aliasEntrega: string; direccionEntrega: string } | null = null;
      if (datos.tipodeRetiro === "envio") {
        if (!datos.direccionId) throw new CheckoutError("INVALID_ADDRESS", "Selecciona una dirección de delivery.");
        const address = await tx.direccion.findUnique({ where: { id: datos.direccionId } });
        if (!address || !isAddressOwnedByClient(address.clienteId, clientId)) {
          throw new CheckoutError("INVALID_ADDRESS", "La dirección seleccionada no pertenece al cliente.");
        }
        const zone = DELIVERY_ZONES.find((item) => item.name === address.urbanizacion);
        if (!zone) throw new CheckoutError("INVALID_ADDRESS", "La zona de delivery no está configurada.");
        montoDelivery = zone.price;
        snapshot = {
          zonaEntrega: address.urbanizacion,
          aliasEntrega: address.tipo,
          direccionEntrega: address.direccion.trim(),
        };
      } else if (datos.tipodeRetiro === "recogida") {
        if (datos.direccionId) throw new CheckoutError("INVALID_ADDRESS", "El retiro no puede incluir una dirección de delivery.");
      } else {
        throw new CheckoutError("INVALID_ADDRESS", "La modalidad de entrega no es válida.");
      }

      const deliveryValidation = validateDeliveryInput({
        tipodeRetiro: datos.tipodeRetiro,
        montoDelivery,
        zonaEntrega: snapshot?.zonaEntrega,
        aliasEntrega: snapshot?.aliasEntrega,
        direccionEntrega: snapshot?.direccionEntrega,
        zonaConfigurada: Boolean(snapshot),
      });
      if (!deliveryValidation.ok) throw new CheckoutError("INVALID_ADDRESS", deliveryValidation.message);

      const normalizedContext = normalizePurchaseContext(datos.contexto);
      const seenProducts = new Set<number>();
      const validatedLines: Array<{ productoId: number; cantidad: number; precioUnitario: number; tipoPrecio: "detal" | "mayor" }> = [];
      for (const line of datos.carrito) {
        if (!Number.isInteger(line.productoId) || line.productoId <= 0 || !Number.isInteger(line.cantidad) || line.cantidad <= 0) {
          throw new CheckoutError("EMPTY_CART", "Una línea del pedido no es válida.");
        }
        if (seenProducts.has(line.productoId)) throw new CheckoutError("EMPTY_CART", "El carrito contiene un producto repetido.");
        seenProducts.add(line.productoId);

        const producto = await tx.producto.findUnique({
          where: { id: line.productoId },
          select: { inventario: true, nombre: true, precioDetal: true, precioMayorista: true },
        });
        if (!producto || producto.inventario < line.cantidad) {
          throw new CheckoutError("STOCK_INSUFFICIENT", `No hay inventario suficiente para ${producto?.nombre ?? "el producto seleccionado"}.`);
        }
        const precioUnitario = getProductPrice(producto, normalizedContext);
        if (!hasValidPrice(precioUnitario) || !Number.isFinite(line.precio) || Math.abs(line.precio - precioUnitario) > 0.01) {
          throw new CheckoutError("PRICE_CHANGED", `El precio de ${producto.nombre} cambió. Actualiza el carrito antes de confirmar.`);
        }
        validatedLines.push({ productoId: line.productoId, cantidad: line.cantidad, precioUnitario, tipoPrecio: getPriceTypeForContext(normalizedContext) });
      }

      const totals = calculateCheckoutTotals(
        validatedLines.map((line) => ({ precio: line.precioUnitario, cantidad: line.cantidad })),
        montoDelivery,
      );
      const paymentValidation = validatePaymentInput(datos.pago, totals.montoTotal);
      if (!paymentValidation.ok) {
        const code = paymentValidation.message.includes("tasa") ? "RATE_UNAVAILABLE" : "INVALID_PAYMENT";
        throw new CheckoutError(code, paymentValidation.message);
      }

      const estado = getInitialOrderState(datos.pago.metodoPago);
      const transaccion = await tx.transaccion.create({
        data: {
          numeroOrden: await nextOrderNumber(tx),
          clienteId: clientId,
          montoSubtotal: totals.subtotalUsd,
          montoDelivery: totals.montoDelivery,
          montoTotal: totals.montoTotal,
          tasaCambio: datos.pago.tasaCambio,
          estado: estado as EstadoTransaccion,
          tipodeRetiro: datos.tipodeRetiro,
          zonaEntrega: snapshot?.zonaEntrega ?? null,
          aliasEntrega: snapshot?.aliasEntrega ?? null,
          direccionEntrega: snapshot?.direccionEntrega ?? null,
          claveIdempotencia: idempotencyKey,
        },
      });
      await tx.detalleCompra.createMany({
        data: validatedLines.map((line) => ({ ...line, transaccionId: transaccion.id })),
      });
      for (const line of [...validatedLines].sort((a, b) => a.productoId - b.productoId)) {
        try {
          await ajustarInventario(tx, line.productoId, -line.cantidad, { exigirStock: true });
        } catch (error) {
          if (error instanceof StockInsuficienteError) {
            throw new CheckoutError("STOCK_INSUFFICIENT", "El inventario cambió. Revisa el carrito e inténtalo nuevamente.");
          }
          throw error;
        }
      }
      await tx.pago.create({
        data: {
          transaccionId: transaccion.id,
          montoBs: datos.pago.montoBs,
          montoUsd: datos.pago.montoUsd,
          metodoPago: datos.pago.metodoPago,
          referencia: datos.pago.metodoPago === "EfectivoUsd" ? null : datos.pago.referencia?.trim() || null,
          fechaPago: datos.pago.metodoPago === "EfectivoUsd" ? null : datos.pago.fechaPago ?? null,
          tasaCambio: datos.pago.tasaCambio,
        },
      });
      await tx.estadoTransaccionHistorial.create({
        data: {
          transaccionId: transaccion.id,
          estadoAnterior: null,
          estadoNuevo: estado as EstadoTransaccion,
          motivo: "Pedido directo desde venta rápida",
        },
      });

      const puntosGanados = Math.floor(totals.montoTotal);
      if (puntosGanados > 0) {
        await tx.fidelidad.create({ data: { clienteId: clientId, transaccionId: transaccion.id, puntos: puntosGanados, tipoMovimiento: "acumulacion" } });
      }
      return {
        success: true as const,
        transactionId: transaccion.id,
        numeroOrden: transaccion.numeroOrden,
        estado,
        message: successMessage(estado),
        clientId,
      };
    });
  } catch (error) {
    try {
      const previous = await prisma.transaccion.findUnique({
        where: { claveIdempotencia: idempotencyKey },
        select: { id: true, numeroOrden: true, estado: true, clienteId: true },
      });
      if (
        previous &&
        previous.clienteId === clientId &&
        (previous.estado === "por_cobrar" || previous.estado === "en_pedido")
      ) {
        return {
          success: true,
          transactionId: previous.id,
          numeroOrden: previous.numeroOrden,
          estado: previous.estado,
          message: successMessage(previous.estado),
          clientId,
        };
      }
    } catch {
      // Conserva la respuesta controlada de abajo si la consulta de recuperación falla.
    }
    return asFailure(error, clientId);
  }
}
