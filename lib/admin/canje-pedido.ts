import type { EstadoTransaccion, Prisma } from "@prisma/client";

import { bloquearCliente } from "../cliente-lock.ts";
import { acreditarPuntosPorPago, canjearPremios } from "../fidelidad.ts";
import { calcularAbonado, calcularSaldo, puedeRecibirAbono, validarTotalContraAbonado } from "./abonos.ts";
import { roundMoney } from "./sales-calculations.ts";

/** Canjea un premio en un pedido pendiente: baja el total (descuento) o agrega la línea gratis. */
export async function canjearPremioEnPedido(
  tx: Prisma.TransactionClient,
  input: { transaccionId: number; premioId: number },
  actor: { id: string; email: string | null },
) {
  const previo = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, select: { clienteId: true } });
  if (!previo) throw new Error("La venta no existe.");
  await bloquearCliente(tx, previo.clienteId);
  await tx.$queryRaw`SELECT "id" FROM "Transaccion" WHERE "id" = ${input.transaccionId} FOR UPDATE`;
  const pedido = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, include: { pagos: true } });
  if (!pedido) throw new Error("La venta no existe.");
  if (!puedeRecibirAbono(pedido.estado)) throw new Error("Solo se canjean premios en pedidos por cobrar o en pedido.");
  const premio = await tx.premio.findUnique({ where: { id: input.premioId }, select: { nombre: true, costoPuntos: true, tipo: true } });
  if (!premio) throw new Error("El premio seleccionado no existe.");
  if (premio.tipo === "delivery" && pedido.montoDescuentoDelivery > 0) throw new Error("Este pedido ya tiene el delivery cubierto por un premio.");

  // Los pedidos antiguos pueden no tener subtotal guardado.
  const subtotalUsd = pedido.montoSubtotal > 0 ? pedido.montoSubtotal : Math.max(0, pedido.montoTotal - pedido.montoDelivery + pedido.montoDescuento);
  const { descuentoPuntosUsd, descuentoDeliveryUsd } = await canjearPremios(
    tx,
    { clienteId: pedido.clienteId, transaccionId: pedido.id, premioIds: [input.premioId], subtotalUsd, descuentoUsd: roundMoney(pedido.montoDescuento + pedido.montoDescuentoPuntos), montoDeliveryUsd: roundMoney(pedido.montoDelivery - pedido.montoDescuentoDelivery) },
    actor,
  );

  const totalUsd = roundMoney(pedido.montoTotal - descuentoPuntosUsd - descuentoDeliveryUsd);
  validarTotalContraAbonado(totalUsd, calcularAbonado(pedido.pagos));
  await tx.transaccion.update({
    where: { id: pedido.id },
    data: { montoDescuentoPuntos: roundMoney(pedido.montoDescuentoPuntos + descuentoPuntosUsd), montoDescuentoDelivery: roundMoney(pedido.montoDescuentoDelivery + descuentoDeliveryUsd), montoTotal: totalUsd },
  });

  let estado: EstadoTransaccion = pedido.estado;
  const salda = descuentoPuntosUsd + descuentoDeliveryUsd > 0 && calcularSaldo({ estado: pedido.estado, montoTotal: totalUsd, pagos: pedido.pagos }) === 0;
  if (salda) {
    const actualizado = await tx.transaccion.updateMany({ where: { id: pedido.id, estado: pedido.estado }, data: { estado: "pagado" } });
    if (actualizado.count !== 1) throw new Error("El pedido cambió mientras lo editabas. Revisa su estado actual.");
    estado = "pagado";
    await tx.estadoTransaccionHistorial.create({
      data: { transaccionId: pedido.id, estadoAnterior: pedido.estado, estadoNuevo: "pagado", actorId: actor.id, actorEmail: actor.email, motivo: "Saldado con canje de puntos" },
    });
    await acreditarPuntosPorPago(tx, pedido.id);
  } else {
    await tx.estadoTransaccionHistorial.create({
      data: { transaccionId: pedido.id, estadoAnterior: pedido.estado, estadoNuevo: pedido.estado, actorId: actor.id, actorEmail: actor.email, motivo: `Canje: ${premio.nombre} (−${premio.costoPuntos} puntos)` },
    });
  }
  return { totalUsd, estado, clienteId: pedido.clienteId, numeroOrden: pedido.numeroOrden };
}
