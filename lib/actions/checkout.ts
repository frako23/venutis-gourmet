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
  return await prisma
    .$transaction(async (tx) => {
      try {
        // 1. Crear la Transacción (Cabecera de la orden)
        const transaccion = await tx.transaccion.create({
          data: {
            numeroOrden: `VEN-${Date.now()}`,
            clienteId: datos.clientId,
            // OJO: Usa datos.montoTotal (el valor monetario), no datos.total (cantidad de items)
            montoTotal: datos.montoTotal,
            estado: "pendiente",
            tipodeRetiro: datos.tipodeRetiro,
          },
        });

        // 2. Crear los Detalles de Compra
        // Nota: Corregí item.id por item.productoId según tu interfaz CheckoutData
        await tx.detalleCompra.createMany({
          data: datos.carrito.map((item) => ({
            transaccionId: transaccion.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precio,
          })),
        });

        // 3. Crear el Registro de Pago
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

        // 4. Puntos de Fidelidad
        const puntosGanados = Math.floor(datos.montoTotal / 10);
        await tx.fidelidad.create({
          data: {
            clienteId: datos.clientId,
            transaccionId: transaccion.id,
            puntos: puntosGanados,
            tipoMovimiento: "acumulacion",
          },
        });

        // 5. RETORNO DE DATOS PARA LA UI
        // Aquí devolvemos el objeto con la estructura que espera tu componente
        return {
          success: true,
          message: "¡Pedido realizado con éxito!",
          orderId: transaccion.id,
          resumen: {
            montoBs: pagoCreado.montoBs,
            montoUsd: pagoCreado.montoUsd,
            tasaCambio: pagoCreado.tasaCambio,
            // Pasamos el carrito de 'datos' ya que createMany no retorna los objetos creados
            items: datos.carrito,
            metodoPago: pagoCreado.metodoPago,
            tipoRetiro: transaccion.tipodeRetiro,
            puntosGanados,
          },
        };
      } catch (error) {
        console.error("Error al procesar la compra:", error);
        // Es importante lanzar el error dentro de la transacción para que haga Rollback
        throw error;
      }
    })
    .catch((err) => {
      return {
        success: false,
        message: "Error al procesar la compra",
        orderId: null,
        resumen: {
          montoBs: null,
          montoUsd: null,
          tasaCambio: null,
          items: datos.carrito,
          metodoPago: null,
          tipoRetiro: null,
          puntosGanados: null,
        },
      };
    });
}
