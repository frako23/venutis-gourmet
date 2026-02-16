"use server";

import { MetodoPago, TipoRetiro } from "@prisma/client";
import { redirect } from "next/navigation";
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
  // 1. Guardamos el resultado de la transacción en una constante
  const resultadoTransaccion = await prisma
    .$transaction(async (tx) => {
      try {
        // --- LÓGICA DE INVENTARIO ---
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
            precioUnitario: item.precio,
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

        // Retornamos el éxito y el ID
        return { success: true as const, id: transaccion.id };
      } catch (error: any) {
        console.error("Error en checkout:", error.message);
        // No hacemos redirect aquí, lanzamos el error para que el catch externo lo maneje
        throw error;
      }
    })
    .catch((err) => {
      // Captura cualquier error de la transacción
      return {
        success: false as const,
        message: err.message || "Error al procesar la compra",
      };
    });

  // 2. Usar un "Type Guard" (el if) para que TS sepa que aquí SÍ existe el ID
  if (resultadoTransaccion.success === true) {
    // Aquí dentro, TS ya sabe que resultadoTransaccion tiene la forma { success: true, id: number }
    redirect(`/confirmacion?id=${resultadoTransaccion.id}`);
  }

  // 3. Manejo del error si llegamos aquí
  return {
    success: false as const, // <-- AGREGA ESTO
    message:
      (resultadoTransaccion as any).message || "Error al procesar la compra",
    status: "error",
    clientId: datos.clientId,
  };
}
