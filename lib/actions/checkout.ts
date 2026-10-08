"use server";

import { MetodoPago, TipoRetiro } from "@prisma/client";
import {
  getProductPrice,
  hasValidPrice,
  normalizePurchaseContext,
  PurchaseContext,
} from "@/lib/catalog-context";
import { prisma } from "../prisma";

export interface CheckoutData {
  clientId: number;
  contexto: PurchaseContext;
  montoTotal: number;
  tipodeRetiro: TipoRetiro;
  total: number;
  carrito: {
    productoId: number;
    cantidad: number;
    precio: number;
  }[];

  pago: {
    montoBs: number;
    montoUsd: number;
    metodoPago: MetodoPago;
    referencia: string;
    fechaPago: Date;
    tasaCambio: number;
  };
}

// lib/actions/checkout.ts
export async function procesarCompra(
  prevState: { message: string; status: string; clientId: number | null },
  datos: CheckoutData,
) {
  const contexto = normalizePurchaseContext(datos.contexto);

  // 1. Ejecutamos la transacción
  const resultadoTransaccion = await prisma
    .$transaction(async (tx) => {
      try {
        if (datos.carrito.length === 0) {
          throw new Error("El carrito está vacío");
        }

        // --- LÓGICA DE INVENTARIO ---
        const validatedPrices = new Map<number, number>();
        for (const item of datos.carrito) {
          const producto = await tx.producto.findUnique({
            where: { id: item.productoId },
            select: {
              inventario: true,
              nombre: true,
              precioDetal: true,
              precioMayorista: true,
            },
          });

          if (
            !producto ||
            !Number.isInteger(item.cantidad) ||
            item.cantidad <= 0 ||
            producto.inventario < item.cantidad
          ) {
            throw new Error(
              `Stock insuficiente para: ${producto?.nombre || "Producto desconocido"}`,
            );
          }

          const precioVigente = getProductPrice(producto, contexto);
          if (
            !hasValidPrice(precioVigente) ||
            !Number.isFinite(item.precio) ||
            Math.abs(item.precio - precioVigente) > 0.01
          ) {
            throw new Error(
              `El precio de ${producto.nombre} cambió. Actualiza el carrito antes de confirmar.`,
            );
          }

          validatedPrices.set(item.productoId, precioVigente);

          await tx.producto.update({
            where: { id: item.productoId },
            data: { inventario: { decrement: item.cantidad } },
          });
        }

        // --- CREAR TRANSACCIÓN ---
        const transaccion = await tx.transaccion.create({
          data: {
            numeroOrden: `VEN-${Date.now()}`,
            clienteId: datos.clientId,
            montoTotal: datos.montoTotal,
            estado: "pagado",
            tipodeRetiro: datos.tipodeRetiro,
          },
        });

        // --- DETALLES Y PAGO ---
        await tx.detalleCompra.createMany({
          data: datos.carrito.map((item) => ({
            transaccionId: transaccion.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: validatedPrices.get(item.productoId)!,
          })),
        });

        await tx.pago.create({
          data: {
            transaccionId: transaccion.id,
            montoBs: datos.pago.montoBs,
            montoUsd: datos.pago.montoUsd,
            metodoPago: datos.pago.metodoPago,
            referencia: datos.pago.referencia,
            fechaPago: datos.pago.fechaPago,
            tasaCambio: datos.pago.tasaCambio,
          },
        });

        // --- PUNTOS ---
        const puntosGanados = Math.floor(datos.montoTotal);
        if (puntosGanados > 0) {
          await tx.fidelidad.create({
            data: {
              clienteId: datos.clientId,
              transaccionId: transaccion.id,
              puntos: puntosGanados,
              tipoMovimiento: "acumulacion",
            },
          });
        }

        // IMPORTANTE: Este objeto se guarda en 'resultadoTransaccion'
        return {
          success: true as const,
          id: transaccion.id,
          message: "Éxito",
          status: "success",
        };
      } catch (error: any) {
        console.error("Error en checkout:", error.message);
        throw error; // Lanza para que el .catch de abajo lo tome
      }
    })
    .catch((err) => {
      return {
        success: false as const,
        message: err.message || "Error al procesar la compra",
        status: "error",
        id: null,
      };
    });

  // --- EL CAMBIO CLAVE AQUÍ ---

  // Si la transacción fue exitosa, retornamos ese resultado al cliente
  if (resultadoTransaccion.success) {
    return {
      ...resultadoTransaccion,
      clientId: datos.clientId, // Mantenemos la estructura de tu estado
    };
  }

  // Si falló, retornamos el error estructurado
  return {
    success: false,
    message: resultadoTransaccion.message,
    status: "error",
    clientId: datos.clientId,
    id: null,
  };
}
