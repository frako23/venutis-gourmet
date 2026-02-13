"use server";

import { MetodoPago, TipoRetiro } from "@prisma/client";
import { prisma } from "../prisma";

export interface CheckoutData {
  clientId: number;
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
  console.log(datos);
  return await prisma
    .$transaction(async (tx) => {
      try {
        // 1. Reducción de Inventario (Validación producto por producto)
        for (const item of datos.carrito) {
          const producto = await tx.producto.findUnique({
            where: { id: item.productoId },
            select: { inventario: true, nombre: true },
          });

          if (!producto || producto.inventario < item.cantidad) {
            throw new Error(
              `Stock insuficiente para: ${producto?.nombre || "Producto desconocido"}`,
            );
          }

          await tx.producto.update({
            where: { id: item.productoId },
            data: {
              inventario: {
                decrement: item.cantidad,
              },
            },
          });
        }

        // 2. Crear la Transacción (Cabecera)
        const transaccion = await tx.transaccion.create({
          data: {
            numeroOrden: `VEN-${Date.now()}`,
            clienteId: datos.clientId,
            montoTotal: datos.montoTotal,
            estado: "pagado", // Si ya tenemos los datos de pago, podemos marcarla como pagada
            tipodeRetiro: datos.tipodeRetiro,
          },
        });

        // 3. Crear los Detalles de Compra
        await tx.detalleCompra.createMany({
          data: datos.carrito.map((item) => ({
            transaccionId: transaccion.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precio,
          })),
        });

        // 4. Crear el Registro de Pago
        const pagoCreado = await tx.pago.create({
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

        // 5. Puntos de Fidelidad (1 punto por cada $1, redondeado hacia abajo)
        // Usamos Math.floor para decimales (ej: $15.8 = 15 puntos)
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

        return {
          success: true,
          message: "¡Venta procesada con éxito!",
          orderId: transaccion.id,
          resumen: {
            montoBs: pagoCreado.montoBs,
            montoUsd: pagoCreado.montoUsd,
            tasaCambio: pagoCreado.tasaCambio,
            items: datos.carrito,
            metodoPago: pagoCreado.metodoPago,
            tipoRetiro: transaccion.tipodeRetiro,
            puntosGanados,
          },
        };
      } catch (error: any) {
        console.error("Error en checkout:", error.message);
        // Al relanzar el error, Prisma hace rollback automático de todo lo anterior
        throw error;
      }
    })
    .catch((err) => {
      return {
        success: false,
        message: err.message || "Error al procesar la compra",
        orderId: null,
        resumen: null,
      };
    });
}
