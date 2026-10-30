import { EstadoTransaccion, MetodoPago, Prisma, TipoRetiro } from "@prisma/client";
import {
  getPriceTypeForContext,
  getProductPrice,
  hasValidPrice,
  normalizePurchaseContext,
  PurchaseContext,
} from "./catalog-context.ts";
import { DELIVERY_ZONES } from "./constants/constants.ts";
import {
  calculateCheckoutTotals,
  getInitialOrderState,
  isAddressOwnedByClient,
  isValidIdempotencyKey,
  validateDeliveryInput,
  validatePaymentInput,
} from "./checkout-rules.ts";
import { bloquearCliente } from "./cliente-lock.ts";
import { canjearPremios, prepararCanjes } from "./fidelidad.ts";
import { ajustarInventario, StockInsuficienteError } from "./inventory.ts";
import { nextOrderNumber } from "./order-number.ts";
import { prisma } from "./prisma.ts";
import { aplicarSaldoAFavorEnPedido, saldoAFavorDisponible } from "./saldo-a-favor.ts";

export interface CheckoutData {
  clientId: number;
  contexto: PurchaseContext;
  tipodeRetiro: TipoRetiro;
  direccionId: number | null;
  claveIdempotencia: string;
  carrito: { productoId: number; cantidad: number; precio: number }[];
  /** Premios a canjear y saldo a favor a usar; solo con una cuenta vinculada. */
  beneficios?: { premioIds: number[]; saldoAFavorUsd: number };
  /** `null` solo cuando los beneficios cubren todo el pedido. */
  pago: {
    montoBs: number;
    montoUsd: number;
    metodoPago: MetodoPago;
    referencia?: string | null;
    fechaPago?: Date | null;
    tasaCambio: number;
  } | null;
}

export type CheckoutSuccess = {
  success: true;
  transactionId: number;
  numeroOrden: string;
  estado: "por_cobrar" | "en_pedido" | "pagado";
  message: string;
  clientId: number;
};
export type CheckoutFailure = {
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
    | "BENEFITS_UNAVAILABLE"
    | "BENEFITS_CHANGED"
    | "PERSISTENCE_ERROR";
  message: string;
  status: "error";
  clientId: number | null;
};

export class CheckoutError extends Error {
  constructor(public readonly code: CheckoutFailure["code"], message: string) {
    super(message);
  }
}

const BENEFICIOS_CAMBIARON = "Tus puntos, tu saldo a favor o la existencia de un premio cambiaron. Revisa tus beneficios e inténtalo de nuevo.";

function successMessage(estado: CheckoutSuccess["estado"]) {
  if (estado === "pagado") return "Pedido recibido y pagado con tu saldo a favor.";
  return estado === "por_cobrar"
    ? "Pedido recibido. El pago se coordinará al entregar."
    : "Pedido recibido. Verificaremos el pago declarado antes del despacho.";
}

const ESTADOS_REPETIBLES = ["por_cobrar", "en_pedido", "pagado"];

/** Los fallos de validación de beneficios se informan igual; los errores de base de datos no se disfrazan. */
async function validandoBeneficios<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (error) {
    if (error instanceof CheckoutError || error instanceof Prisma.PrismaClientKnownRequestError || !(error instanceof Error)) throw error;
    throw new CheckoutError("BENEFITS_CHANGED", BENEFICIOS_CAMBIARON);
  }
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

/**
 * Registra una compra de la tienda en una sola transacción. Con una sesión vinculada, el cliente del
 * pedido es siempre el de la sesión y se ignora el `clientId` que envía el navegador.
 */
export async function registrarCompraWeb(
  datos: CheckoutData,
  contexto: { clienteSesionId: number | null },
): Promise<CheckoutSuccess | CheckoutFailure> {
  const solicitado = Number.isInteger(datos.clientId) ? datos.clientId : null;
  const clientId = contexto.clienteSesionId ?? solicitado;
  const idempotencyKey = datos.claveIdempotencia?.trim() ?? "";
  if (!clientId) return asFailure(new CheckoutError("INVALID_CLIENT", "El cliente no es válido."), clientId);
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return asFailure(new CheckoutError("INVALID_PAYMENT", "La confirmación del pedido no es válida."), clientId);
  }

  const beneficios = datos.beneficios ?? { premioIds: [], saldoAFavorUsd: 0 };
  const usaBeneficios = beneficios.premioIds.length > 0 || beneficios.saldoAFavorUsd > 0;
  if (usaBeneficios && contexto.clienteSesionId === null) {
    return asFailure(new CheckoutError("BENEFITS_UNAVAILABLE", "Inicia sesión con tu cuenta para usar tus puntos o tu saldo a favor."), clientId);
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
        if (!ESTADOS_REPETIBLES.includes(previous.estado)) {
          throw new CheckoutError("DUPLICATE_CONFIRMATION", "La confirmación del pedido ya fue procesada.");
        }
        const estadoPrevio = previous.estado as CheckoutSuccess["estado"];
        return {
          success: true as const,
          transactionId: previous.id,
          numeroOrden: previous.numeroOrden,
          estado: estadoPrevio,
          message: successMessage(estadoPrevio),
          clientId,
        };
      }

      // Orden de bloqueo Cliente -> pedido: los puntos y el saldo se leen con el cliente bloqueado.
      if (usaBeneficios) await bloquearCliente(tx, clientId);

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

      const subtotalUsd = calculateCheckoutTotals(validatedLines.map((line) => ({ precio: line.precioUnitario, cantidad: line.cantidad })), 0).subtotalUsd;
      const canjes = await validandoBeneficios(() => prepararCanjes(tx, { clienteId: clientId, premioIds: beneficios.premioIds, subtotalUsd, descuentoUsd: 0 }));
      const totals = calculateCheckoutTotals(
        validatedLines.map((line) => ({ precio: line.precioUnitario, cantidad: line.cantidad })),
        montoDelivery,
        canjes.descuentoPuntosUsd,
      );

      const saldoAplicarUsd = Math.round(beneficios.saldoAFavorUsd * 100) / 100;
      if (!Number.isFinite(saldoAplicarUsd) || saldoAplicarUsd < 0) throw new CheckoutError("BENEFITS_CHANGED", BENEFICIOS_CAMBIARON);
      if (saldoAplicarUsd > 0) {
        const disponible = await saldoAFavorDisponible(tx, clientId);
        if (Math.round(saldoAplicarUsd * 100) > Math.round(disponible * 100) || Math.round(saldoAplicarUsd * 100) > Math.round(totals.montoTotal * 100)) {
          throw new CheckoutError("BENEFITS_CHANGED", BENEFICIOS_CAMBIARON);
        }
      }

      // Lo que el cliente aún debe pagar después de los beneficios; si es cero no declara ningún pago.
      const montoAPagar = Math.round((totals.montoTotal - saldoAplicarUsd) * 100) / 100;
      let pagoDeclarado: NonNullable<CheckoutData["pago"]> | null = null;
      if (montoAPagar > 0) {
        if (!datos.pago) throw new CheckoutError("INVALID_PAYMENT", "El pago no es válido.");
        const paymentValidation = validatePaymentInput(datos.pago, montoAPagar);
        if (!paymentValidation.ok) {
          const code = paymentValidation.message.includes("tasa") ? "RATE_UNAVAILABLE" : "INVALID_PAYMENT";
          throw new CheckoutError(code, paymentValidation.message);
        }
        pagoDeclarado = datos.pago;
      } else if (datos.pago) {
        throw new CheckoutError("INVALID_PAYMENT", "Tus beneficios cubren todo el pedido: no hay pago que declarar.");
      }

      const estado: "por_cobrar" | "en_pedido" = pagoDeclarado ? getInitialOrderState(pagoDeclarado.metodoPago) : "por_cobrar";
      const transaccion = await tx.transaccion.create({
        data: {
          numeroOrden: await nextOrderNumber(tx),
          clienteId: clientId,
          montoSubtotal: totals.subtotalUsd,
          montoDelivery: totals.montoDelivery,
          montoDescuentoPuntos: canjes.descuentoPuntosUsd,
          montoTotal: totals.montoTotal,
          tasaCambio: pagoDeclarado?.tasaCambio ?? null,
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
      if (pagoDeclarado) {
        await tx.pago.create({
          data: {
            transaccionId: transaccion.id,
            montoBs: pagoDeclarado.montoBs,
            montoUsd: pagoDeclarado.montoUsd,
            metodoPago: pagoDeclarado.metodoPago,
            referencia: pagoDeclarado.metodoPago === "EfectivoUsd" ? null : pagoDeclarado.referencia?.trim() || null,
            fechaPago: pagoDeclarado.metodoPago === "EfectivoUsd" ? null : pagoDeclarado.fechaPago ?? null,
            tasaCambio: pagoDeclarado.tasaCambio,
          },
        });
      }
      await tx.estadoTransaccionHistorial.create({
        data: {
          transaccionId: transaccion.id,
          estadoAnterior: null,
          estadoNuevo: estado as EstadoTransaccion,
          motivo: "Pedido directo desde venta rápida",
        },
      });

      // Premios y saldo a favor se aplican en la misma transacción; si algo ya no alcanza, no se escribe nada.
      await validandoBeneficios(() => canjearPremios(tx, { clienteId: clientId, transaccionId: transaccion.id, premioIds: beneficios.premioIds, subtotalUsd, descuentoUsd: 0 }, null));
      let estadoFinal: CheckoutSuccess["estado"] = estado;
      if (saldoAplicarUsd > 0) {
        const abono = await validandoBeneficios(() => aplicarSaldoAFavorEnPedido(tx, { transaccionId: transaccion.id, montoUsd: saldoAplicarUsd }, null));
        estadoFinal = abono.estado === "pagado" ? "pagado" : estado;
      }

      return {
        success: true as const,
        transactionId: transaccion.id,
        numeroOrden: transaccion.numeroOrden,
        estado: estadoFinal,
        message: successMessage(estadoFinal),
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
        ESTADOS_REPETIBLES.includes(previous.estado)
      ) {
        const estadoPrevio = previous.estado as CheckoutSuccess["estado"];
        return {
          success: true,
          transactionId: previous.id,
          numeroOrden: previous.numeroOrden,
          estado: estadoPrevio,
          message: successMessage(estadoPrevio),
          clientId,
        };
      }
    } catch {
      // Conserva la respuesta controlada de abajo si la consulta de recuperación falla.
    }
    return asFailure(error, clientId);
  }
}
