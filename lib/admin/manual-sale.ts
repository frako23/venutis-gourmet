import type { EstadoTransaccion, MetodoPago, Prisma, TipoRetiro } from "@prisma/client";

import { ajustarInventario } from "../inventory.ts";
import { nextOrderNumber } from "../order-number.ts";
import { bloquearCliente } from "../cliente-lock.ts";
import { acreditarPuntosPorPago, canjearPremios, prepararCanjes } from "../fidelidad.ts";
import { aplicarSaldoAFavorEnPedido } from "../saldo-a-favor.ts";
import { consultarDeudaCliente, evaluarCredito } from "./abonos.ts";
import { calculateSaleTotals, type DiscountInput, type SaleLineInput } from "./sales-calculations.ts";

export type VentaManualInput = {
  clienteId: number;
  fechaCompra: Date;
  numeroOrden?: string;
  tipodeRetiro: TipoRetiro;
  tasaCambio: number | null;
  estadoInicial: "por_cobrar" | "en_pedido" | "pagado";
  lineas: Array<SaleLineInput & { tipoPrecio: "detal" | "mayor" | "promo" }>;
  descuento: DiscountInput | null;
  autorizarCredito: boolean;
  /** Saldo a favor del cliente que se aplica al pedido como un abono. */
  saldoAFavorUsd?: number;
  /** Premios (ids) que el cliente canjea con sus puntos en esta venta. */
  canjes?: number[];
  pago?: {
    montoBs?: number | null;
    montoUsd?: number | null;
    metodoPago: MetodoPago;
    referencia?: string | null;
    fechaPago?: Date | null;
  } | null;
};

export type InfoCredito = { deudaUsd: number; limiteUsd: number | null; disponibleUsd: number; excesoUsd: number };

/** La venta queda sin cobrar por encima del crédito del cliente y falta la autorización de la administradora. */
export class CreditoRequiereAutorizacion extends Error {
  constructor(public readonly info: InfoCredito) {
    super("Esta venta excede el crédito disponible del cliente.");
  }
}

const usdTexto = (valor: number) => `USD ${valor.toFixed(2).replace(".", ",")}`;

/** Registra una venta manual dentro de la transacción recibida. Todo o nada. */
export async function registrarVentaManualEnTx(tx: Prisma.TransactionClient, input: VentaManualInput, actor: { id: string; email: string | null }) {
  await bloquearCliente(tx, input.clienteId);
  const cliente = await tx.cliente.findUnique({ where: { id: input.clienteId }, select: { creditoHabilitado: true, limiteCreditoUsd: true } });
  if (!cliente) throw new Error("El cliente seleccionado no existe.");

  const canjes = input.canjes ?? [];
  const base = calculateSaleTotals(input.lineas, input.descuento, input.tasaCambio);
  const preparados = await prepararCanjes(tx, { clienteId: input.clienteId, premioIds: canjes, subtotalUsd: base.subtotalUsd, descuentoUsd: base.descuentoUsd });
  const totals = calculateSaleTotals(input.lineas, input.descuento, input.tasaCambio, preparados.descuentoPuntosUsd);
  const saldoAFavorUsd = input.saldoAFavorUsd ?? 0;
  if (saldoAFavorUsd > 0 && (input.estadoInicial === "pagado" || input.pago)) {
    throw new Error("El saldo a favor solo se aplica a ventas por cobrar o en pedido, sin pago declarado.");
  }

  // Una venta con pago declarado o cobrada no es crédito; solo lo no cobrado cuenta.
  let motivoCredito = "";
  if (input.estadoInicial !== "pagado" && !input.pago) {
    const deudaUsd = await consultarDeudaCliente(tx, input.clienteId);
    const evaluacion = evaluarCredito({
      habilitado: cliente.creditoHabilitado,
      limiteUsd: cliente.limiteCreditoUsd,
      deudaUsd,
      montoSinCobrarUsd: Math.max(0, totals.totalUsd - saldoAFavorUsd),
    });
    if (evaluacion.requiereAutorizacion) {
      const info = { deudaUsd, limiteUsd: cliente.creditoHabilitado ? cliente.limiteCreditoUsd : null, disponibleUsd: evaluacion.disponibleUsd, excesoUsd: evaluacion.excesoUsd };
      if (!input.autorizarCredito) throw new CreditoRequiereAutorizacion(info);
      const limite = info.limiteUsd === null ? "sin crédito" : usdTexto(info.limiteUsd);
      motivoCredito = ` · Autorizada sobre el crédito: excede ${usdTexto(info.excesoUsd)} (deuda ${usdTexto(deudaUsd)}, límite ${limite})`;
    }
  }

  const cantidades = new Map<number, number>();
  for (const linea of input.lineas) cantidades.set(linea.productoId, (cantidades.get(linea.productoId) ?? 0) + linea.cantidad);
  for (const [productoId, cantidad] of [...cantidades].sort((a, b) => a[0] - b[0])) {
    await ajustarInventario(tx, productoId, -cantidad, { exigirStock: true });
  }

  const transaccion = await tx.transaccion.create({
    data: {
      numeroOrden: input.numeroOrden || (await nextOrderNumber(tx)),
      clienteId: input.clienteId,
      fechaCompra: input.fechaCompra,
      montoSubtotal: totals.subtotalUsd,
      montoDescuento: totals.descuentoUsd,
      montoDescuentoPuntos: totals.descuentoPuntosUsd,
      valorDescuento: input.descuento?.valor ?? null,
      tipoDescuento: input.descuento?.tipo,
      tasaCambio: totals.tasaCambio,
      montoTotal: totals.totalUsd,
      estado: input.estadoInicial as EstadoTransaccion,
      tipodeRetiro: input.tipodeRetiro,
    },
  });
  await tx.detalleCompra.createMany({
    data: input.lineas.map((linea) => ({
      transaccionId: transaccion.id,
      productoId: linea.productoId,
      cantidad: linea.cantidad,
      precioUnitario: linea.precioUnitarioUsd,
      tipoPrecio: linea.tipoPrecio,
    })),
  });
  await tx.estadoTransaccionHistorial.create({
    data: {
      transaccionId: transaccion.id,
      estadoNuevo: input.estadoInicial as EstadoTransaccion,
      actorId: actor.id,
      actorEmail: actor.email,
      motivo: `Venta registrada manualmente${motivoCredito}`,
    },
  });
  if (input.pago) {
    await tx.pago.create({
      data: {
        transaccionId: transaccion.id,
        montoBs: input.pago.montoBs ?? null,
        montoUsd: input.pago.montoUsd ?? totals.totalUsd,
        metodoPago: input.pago.metodoPago,
        referencia: input.pago.referencia ?? null,
        fechaPago: input.pago.fechaPago ?? input.fechaCompra,
        tasaCambio: totals.tasaCambio,
      },
    });
  }
  if (canjes.length > 0) {
    await canjearPremios(tx, { clienteId: input.clienteId, transaccionId: transaccion.id, premioIds: canjes, subtotalUsd: base.subtotalUsd, descuentoUsd: base.descuentoUsd }, actor);
  }
  if (saldoAFavorUsd > 0) {
    await aplicarSaldoAFavorEnPedido(tx, { transaccionId: transaccion.id, montoUsd: saldoAFavorUsd }, actor);
  }
  if (input.estadoInicial === "pagado") await acreditarPuntosPorPago(tx, transaccion.id);
  return { id: transaccion.id, numeroOrden: transaccion.numeroOrden, totals };
}
