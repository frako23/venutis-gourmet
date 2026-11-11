import type { EstadoTransaccion, Prisma, TipoRetiro } from "@prisma/client";

import { bloquearCliente } from "../cliente-lock.ts";
import { calcularPuntosGanados, participaEnFidelidad, puntosDisponiblesDelCliente } from "../fidelidad.ts";
import { fechaHoraLocalCaracas } from "../format.ts";
import { ajustarInventario } from "../inventory.ts";
import { calcularAbonado, consultarDeudaCliente, evaluarCredito } from "./abonos.ts";
import { CreditoRequiereAutorizacion } from "./manual-sale.ts";
import {
  ajustePuntosPorEdicion,
  diferenciasInventario,
  motivoNoEditable,
  motivoNoEliminable,
  requiereConfirmarDiferencia,
  resumirCambiosPedido,
  versionPedido,
  type PedidoEditable,
  type ResumenPedido,
  type SnapshotPedido,
  type TipoPrecioLinea,
} from "./order-edit-rules.ts";
import { recalcularTotalPedido, roundMoney, type DiscountInput } from "./sales-calculations.ts";
import { getRestockQuantities } from "./status.ts";

const INCLUDE_PEDIDO = {
  detalles: { include: { producto: { select: { nombre: true } } }, orderBy: { id: "asc" } },
  pagos: { select: { id: true, esAbono: true, montoUsd: true, anuladoEn: true } },
  fidelidades: { select: { id: true, tipoMovimiento: true, puntos: true } },
  movimientosSaldo: { select: { id: true } },
  historialEstados: { select: { id: true }, orderBy: { id: "desc" }, take: 1 },
  cliente: { select: { tipoCliente: true, creditoHabilitado: true, limiteCreditoUsd: true } },
} satisfies Prisma.TransaccionInclude;

type PedidoCargado = Prisma.TransaccionGetPayload<{ include: typeof INCLUDE_PEDIDO }>;

/** Se lanza cuando un pedido pagado sube de total y falta confirmar el cobro de la diferencia. */
export class ConfirmarDiferenciaRequerida extends Error {
  constructor(public readonly diferenciaUsd: number) {
    super(`Confirma que cobraste la diferencia de USD ${diferenciaUsd.toFixed(2)} o pasa el pedido a Por cobrar.`);
  }
}

function snapshotDe(pedido: PedidoCargado): SnapshotPedido {
  return {
    estado: pedido.estado,
    montoTotal: pedido.montoTotal,
    numeroOrden: pedido.numeroOrden,
    clienteId: pedido.clienteId,
    fechaCompra: pedido.fechaCompra,
    lineas: pedido.detalles.map((d) => ({ id: d.id, productoId: d.productoId, cantidad: d.cantidad, precioUnitario: d.precioUnitario })),
    pagos: pedido.pagos.map((p) => ({ id: p.id, anuladoEn: p.anuladoEn })),
    movimientosPuntosIds: pedido.fidelidades.map((f) => f.id),
    movimientosSaldoIds: pedido.movimientosSaldo.map((m) => m.id),
    ultimoEventoId: pedido.historialEstados[0]?.id ?? null,
  };
}

function descuentoDe(pedido: { tipoDescuento: "porcentaje" | "usd" | null; valorDescuento: number | null }): DiscountInput | null {
  return pedido.tipoDescuento ? { tipo: pedido.tipoDescuento, valor: pedido.valorDescuento ?? 0 } : null;
}

/** Carga un pedido para el formulario de edición; `null` si no existe o está cancelado. */
export async function cargarPedidoEditable(db: Prisma.TransactionClient | import("@prisma/client").PrismaClient, id: number): Promise<PedidoEditable | null> {
  const pedido = await db.transaccion.findUnique({ where: { id }, include: INCLUDE_PEDIDO });
  if (!pedido || motivoNoEditable({ estado: pedido.estado })) return null;
  const cobradas = pedido.detalles.filter((d) => d.precioUnitario > 0);
  return {
    id: pedido.id,
    version: versionPedido(snapshotDe(pedido)),
    numeroOrden: pedido.numeroOrden,
    clienteId: pedido.clienteId,
    clienteBloqueado: pedido.fidelidades.length + pedido.movimientosSaldo.length > 0,
    fechaLocal: fechaHoraLocalCaracas(pedido.fechaCompra),
    estado: pedido.estado,
    importada: pedido.importada,
    tipodeRetiro: pedido.tipodeRetiro,
    tasaCambio: pedido.tasaCambio,
    descuento: descuentoDe(pedido),
    lineas: cobradas.map((d) => ({ productoId: d.productoId, cantidad: d.cantidad, precioUnitarioUsd: d.precioUnitario, tipoPrecio: (d.tipoPrecio ?? "detal") as TipoPrecioLinea })),
    lineasPremio: pedido.detalles.filter((d) => d.precioUnitario <= 0).map((d) => ({ nombre: d.producto.nombre, cantidad: d.cantidad })),
    descuentoPuntosUsd: pedido.montoDescuentoPuntos,
    montoDeliveryUsd: pedido.montoDelivery,
    descuentoDeliveryUsd: pedido.montoDescuentoDelivery,
    zonaEntrega: pedido.zonaEntrega,
    abonadoUsd: calcularAbonado(pedido.pagos),
    totalAnteriorUsd: pedido.montoTotal,
  };
}

export type EdicionPedidoInput = {
  transaccionId: number;
  version: string;
  clienteId: number;
  numeroOrden: string;
  /** Instante ya interpretado en hora de Caracas. */
  fechaCompra: Date;
  /** `true` si la persona no tocó la fecha: se conserva el instante guardado, con sus segundos. */
  fechaSinCambios: boolean;
  tipodeRetiro: TipoRetiro;
  tasaCambio: number | null;
  lineas: Array<{ productoId: number; cantidad: number; precioUnitarioUsd: number; tipoPrecio: TipoPrecioLinea }>;
  descuento: DiscountInput | null;
  confirmarCobroDiferencia: boolean;
  autorizarCredito: boolean;
};

const usdTexto = (valor: number) => `USD ${valor.toFixed(2).replace(".", ",")}`;
const cents = (valor: number) => Math.round(valor * 100);

async function bloquearPedido(tx: Prisma.TransactionClient, id: number) {
  await tx.$queryRaw`SELECT "id" FROM "Transaccion" WHERE "id" = ${id} FOR UPDATE`;
}

/** Edita un pedido dentro de la transacción recibida. Todo o nada. */
export async function editarPedidoEnTx(tx: Prisma.TransactionClient, input: EdicionPedidoInput, actor: { id: string; email: string | null }) {
  const previo = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, select: { clienteId: true } });
  if (!previo) throw new Error("El pedido ya no existe.");
  for (const clienteId of [...new Set([previo.clienteId, input.clienteId])].sort((a, b) => a - b)) await bloquearCliente(tx, clienteId);
  await bloquearPedido(tx, input.transaccionId);

  const pedido = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, include: INCLUDE_PEDIDO });
  if (!pedido) throw new Error("El pedido ya no existe.");
  const noEditable = motivoNoEditable({ estado: pedido.estado });
  if (noEditable) throw new Error(noEditable);
  if (versionPedido(snapshotDe(pedido)) !== input.version) throw new Error("El pedido cambió mientras lo editabas. Vuelve a abrirlo para ver los datos actuales.");

  const cambiaCliente = pedido.clienteId !== input.clienteId;
  if (cambiaCliente && pedido.fidelidades.length + pedido.movimientosSaldo.length > 0) {
    throw new Error("Este pedido tiene puntos o saldo a favor del cliente actual y no puede cambiar de cliente.");
  }
  const clienteNuevo = cambiaCliente ? await tx.cliente.findUnique({ where: { id: input.clienteId }, select: { tipoCliente: true, creditoHabilitado: true, limiteCreditoUsd: true } }) : pedido.cliente;
  if (!clienteNuevo) throw new Error("El cliente seleccionado no existe.");

  const totals = recalcularTotalPedido({
    lineasCobradas: input.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnitarioUsd: l.precioUnitarioUsd })),
    descuento: input.descuento,
    tasaCambio: input.tasaCambio,
    descuentoPuntosUsd: pedido.montoDescuentoPuntos,
    montoDeliveryUsd: pedido.montoDelivery,
    descuentoDeliveryUsd: pedido.montoDescuentoDelivery,
  });
  const abonado = calcularAbonado(pedido.pagos);
  if (cents(totals.totalUsd) < cents(abonado)) throw new Error(`El total quedaría por debajo de lo ya abonado (USD ${abonado.toFixed(2)}).`);
  if (requiereConfirmarDiferencia({ estado: pedido.estado, totalAnteriorUsd: pedido.montoTotal, totalNuevoUsd: totals.totalUsd }) && !input.confirmarCobroDiferencia) {
    throw new ConfirmarDiferenciaRequerida(roundMoney(totals.totalUsd - pedido.montoTotal));
  }

  let motivoCredito = "";
  if (pedido.estado !== "pagado") {
    const deudaUsd = await consultarDeudaCliente(tx, input.clienteId);
    const montoSinCobrarUsd = cambiaCliente ? Math.max(0, totals.totalUsd - abonado) : Math.max(0, roundMoney(totals.totalUsd - pedido.montoTotal));
    const evaluacion = evaluarCredito({ habilitado: clienteNuevo.creditoHabilitado, limiteUsd: clienteNuevo.limiteCreditoUsd, deudaUsd, montoSinCobrarUsd });
    if (evaluacion.requiereAutorizacion) {
      const limiteUsd = clienteNuevo.creditoHabilitado ? clienteNuevo.limiteCreditoUsd : null;
      if (!input.autorizarCredito) throw new CreditoRequiereAutorizacion({ deudaUsd, limiteUsd, disponibleUsd: evaluacion.disponibleUsd, excesoUsd: evaluacion.excesoUsd });
      motivoCredito = ` · Autorizada sobre el crédito: excede ${usdTexto(evaluacion.excesoUsd)} (deuda ${usdTexto(deudaUsd)}, límite ${limiteUsd === null ? "sin crédito" : usdTexto(limiteUsd)})`;
    }
  }

  const cobradasAntes = pedido.detalles.filter((d) => d.precioUnitario > 0);
  const nombres = new Map(cobradasAntes.map((d) => [d.productoId, d.producto.nombre]));
  const idsNuevos = input.lineas.map((l) => l.productoId).filter((id) => !nombres.has(id));
  if (idsNuevos.length > 0) for (const p of await tx.producto.findMany({ where: { id: { in: idsNuevos } }, select: { id: true, nombre: true } })) nombres.set(p.id, p.nombre);
  if (input.lineas.some((l) => !nombres.has(l.productoId))) throw new Error("Uno de los productos seleccionados no existe.");

  const fechaCompra = input.fechaSinCambios ? pedido.fechaCompra : input.fechaCompra;
  const resumenDe = (datos: ResumenPedido) => datos;
  const resumen = resumirCambiosPedido(
    resumenDe({ numeroOrden: pedido.numeroOrden, clienteId: pedido.clienteId, fechaCompra: pedido.fechaCompra, tipodeRetiro: pedido.tipodeRetiro, tasaCambio: pedido.tasaCambio, descuento: descuentoDe(pedido), lineas: cobradasAntes.map((d) => ({ productoId: d.productoId, nombre: d.producto.nombre, cantidad: d.cantidad, precioUnitarioUsd: d.precioUnitario })), totalUsd: pedido.montoTotal }),
    resumenDe({ numeroOrden: input.numeroOrden, clienteId: input.clienteId, fechaCompra, tipodeRetiro: input.tipodeRetiro, tasaCambio: input.tasaCambio, descuento: input.descuento && input.descuento.valor > 0 ? input.descuento : null, lineas: input.lineas.map((l) => ({ productoId: l.productoId, nombre: nombres.get(l.productoId), cantidad: l.cantidad, precioUnitarioUsd: l.precioUnitarioUsd })), totalUsd: totals.totalUsd }),
  );
  if (!resumen) throw new Error("No hay cambios para guardar.");

  if (!pedido.importada) {
    for (const { productoId, delta } of diferenciasInventario(cobradasAntes, input.lineas)) {
      await ajustarInventario(tx, productoId, -delta, { exigirStock: delta > 0 });
    }
  }

  await tx.detalleCompra.deleteMany({ where: { transaccionId: pedido.id, precioUnitario: { gt: 0 } } });
  await tx.detalleCompra.createMany({ data: input.lineas.map((l) => ({ transaccionId: pedido.id, productoId: l.productoId, cantidad: l.cantidad, precioUnitario: l.precioUnitarioUsd, tipoPrecio: l.tipoPrecio })) });
  try {
    await tx.transaccion.update({
      where: { id: pedido.id },
      data: {
        numeroOrden: input.numeroOrden,
        clienteId: input.clienteId,
        fechaCompra,
        tipodeRetiro: input.tipodeRetiro,
        tasaCambio: totals.tasaCambio,
        tipoDescuento: input.descuento && input.descuento.valor > 0 ? input.descuento.tipo : null,
        valorDescuento: input.descuento && input.descuento.valor > 0 ? input.descuento.valor : null,
        montoSubtotal: totals.subtotalUsd,
        montoDescuento: totals.descuentoUsd,
        montoTotal: totals.totalUsd,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") throw new Error(`Ya existe un pedido con el número ${input.numeroOrden}.`);
    throw error;
  }

  if (pedido.estado === "pagado" && participaEnFidelidad({ tipoCliente: clienteNuevo.tipoCliente, importada: pedido.importada })) {
    const suma = (tipos: string[]) => pedido.fidelidades.filter((f) => tipos.includes(f.tipoMovimiento)).reduce((total, f) => total + f.puntos, 0);
    if (pedido.fidelidades.some((f) => f.tipoMovimiento === "acumulacion")) {
      const ajuste = ajustePuntosPorEdicion({
        ganadosNetos: suma(["acumulacion", "reversion"]),
        esperados: calcularPuntosGanados({ montoSubtotal: totals.subtotalUsd, montoDescuento: totals.descuentoUsd, montoDescuentoPuntos: pedido.montoDescuentoPuntos }),
        disponibles: await puntosDisponiblesDelCliente(tx, pedido.clienteId),
        devueltos: Math.max(0, -suma(["redencion", "devolucion"])),
      });
      if (ajuste !== 0) {
        await tx.fidelidad.create({ data: { clienteId: pedido.clienteId, transaccionId: pedido.id, tipoMovimiento: ajuste > 0 ? "acumulacion" : "reversion", puntos: ajuste, motivo: `Ajuste por edición del pedido ${input.numeroOrden}`, actorId: actor.id, actorEmail: actor.email } });
      }
    }
  }

  await tx.estadoTransaccionHistorial.create({
    data: { transaccionId: pedido.id, estadoAnterior: pedido.estado as EstadoTransaccion, estadoNuevo: pedido.estado as EstadoTransaccion, actorId: actor.id, actorEmail: actor.email, motivo: `Pedido editado: ${resumen}${motivoCredito}`.slice(0, 900) },
  });
  return { id: pedido.id, numeroOrden: input.numeroOrden, totalUsd: totals.totalUsd, clienteAnteriorId: pedido.clienteId };
}

/** Elimina definitivamente un pedido sin cobros, puntos, saldo, notas ni reseñas. Todo o nada. */
export async function eliminarPedidoEnTx(tx: Prisma.TransactionClient, input: { transaccionId: number; estadoEsperado: EstadoTransaccion; totalEsperadoUsd: number }) {
  const previo = await tx.transaccion.findUnique({ where: { id: input.transaccionId }, select: { clienteId: true } });
  if (!previo) throw new Error("El pedido ya no existe.");
  await bloquearCliente(tx, previo.clienteId);
  await bloquearPedido(tx, input.transaccionId);

  const pedido = await tx.transaccion.findUnique({
    where: { id: input.transaccionId },
    include: { detalles: { select: { productoId: true, cantidad: true } }, pagos: { select: { esAbono: true } }, _count: { select: { fidelidades: true, movimientosSaldo: true, notasEntrega: true, resenas: true } } },
  });
  if (!pedido) throw new Error("El pedido ya no existe.");
  if (pedido.estado !== input.estadoEsperado || cents(pedido.montoTotal) !== cents(input.totalEsperadoUsd)) throw new Error("El pedido cambió mientras lo revisabas. Recarga la tabla.");
  const motivo = motivoNoEliminable({ estado: pedido.estado, tieneAbonos: pedido.pagos.some((p) => p.esAbono), movimientosPuntos: pedido._count.fidelidades, movimientosSaldo: pedido._count.movimientosSaldo, notasEntrega: pedido._count.notasEntrega, resenas: pedido._count.resenas });
  if (motivo) throw new Error(motivo);

  if (!pedido.importada && pedido.estado !== "cancelado") {
    for (const { productoId, cantidad } of getRestockQuantities(pedido.detalles).sort((a, b) => a.productoId - b.productoId)) {
      await ajustarInventario(tx, productoId, cantidad, { exigirStock: false });
    }
  }
  await tx.pago.deleteMany({ where: { transaccionId: pedido.id } });
  await tx.detalleCompra.deleteMany({ where: { transaccionId: pedido.id } });
  await tx.transaccion.delete({ where: { id: pedido.id } });
  return { numeroOrden: pedido.numeroOrden, clienteId: pedido.clienteId };
}
