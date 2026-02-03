import { prisma } from "../prisma";

// lib/actions/checkout.ts
export async function procesarCompra(
  prevState: { message: string; status: string; clientId: number | null },
  datos: any,
) {
  return await prisma.$transaction(async (tx) => {
    try {
      // 1. Crear la Transacción

      const transaccion = await tx.transaccion.create({
        data: {
          numeroOrden: `VEN-${Date.now()}`,
          clienteId: datos.clientId,
          montoTotal: datos.total,
          estado: "pendiente", // Empieza pendiente hasta validar el pago
          tipodeRetiro: datos.tipoRetiro,
        },
      });

      // 2. Crear los Detalles de Compra (Muchos a la vez)
      await tx.detalleCompra.createMany({
        data: datos.carrito.map((item: any) => ({
          transaccionId: transaccion.id,
          productoId: item.id,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
      });

      // 3. Crear el Registro de Pago
      await tx.pago.create({
        data: {
          transaccionId: transaccion.id,
          montoBs: datos.pago.montoBs,
          montoUsd: datos.pago.montoUsd,
          metodoPago: datos.pago.metodoPago,
          referencia: datos.pago.referencia,
          fechaPago: new Date(),
        },
      });

      // 4. Calcular y Crear Puntos de Fidelidad (1 punto por cada $10 ej.)
      const puntosGanados = Math.floor(datos.total / 10);
      await tx.fidelidad.create({
        data: {
          clienteId: datos.clientId,
          transaccionId: transaccion.id,
          puntos: puntosGanados,
          tipoMovimiento: "acumulacion",
        },
      });
      return {
        message: "Transacción procesada exitosamente",
        status: "success",
        clientId: null,
      };
    } catch (error) {
      console.error("Error al procesar la compra:", error);
      return {
        message: "Datos inválidos, al regristrar la compra",
        status: "error",
        clientId: null,
      };
    }
  });
}
