import type { Prisma, TipoCliente, TipoPremio } from "@prisma/client";

import { roundMoney } from "./admin/sales-calculations.ts";
import { bloquearCliente } from "./cliente-lock.ts";
import { ajustarInventario, StockInsuficienteError } from "./inventory.ts";

type Actor = { id: string; email: string | null };

/** Solo los consumidores acumulan puntos, y no con las ventas cargadas desde Excel. */
export function participaEnFidelidad({ tipoCliente, importada }: { tipoCliente: TipoCliente; importada: boolean }) {
  return tipoCliente === "detal" && !importada;
}

/** 1 punto por cada dólar entero de productos cobrado, después de descuentos y sin contar el delivery. */
export function calcularPuntosGanados({ montoSubtotal, montoDescuento, montoDescuentoPuntos }: { montoSubtotal: number; montoDescuento: number; montoDescuentoPuntos: number }) {
  const base = roundMoney(montoSubtotal - montoDescuento - montoDescuentoPuntos);
  return Math.max(0, Math.floor(base + 1e-9));
}

export function calcularPuntos(movimientos: Array<{ puntos: number }>) {
  return movimientos.reduce((suma, movimiento) => suma + movimiento.puntos, 0);
}

/** Cuántos puntos ganados se pueden revertir sin dejar el saldo del cliente en negativo. */
export function topeReversion({ ganadosNetos, devueltos, disponibles }: { ganadosNetos: number; devueltos: number; disponibles: number }) {
  return Math.max(0, Math.min(ganadosNetos, disponibles + devueltos));
}

export type PremioParaCanje = {
  id: number;
  nombre: string;
  tipo: TipoPremio;
  costoPuntos: number;
  montoDescuentoUsd: number | null;
  productoId: number | null;
  cantidad: number | null;
  activo: boolean;
};

/** Valida un conjunto de canjes contra los puntos del cliente y el monto del pedido. */
export function validarCanjes({ premios, puntosDisponibles, subtotalUsd, descuentoUsd }: { premios: PremioParaCanje[]; puntosDisponibles: number; subtotalUsd: number; descuentoUsd: number }) {
  let costoTotal = 0;
  let descuentoPuntosUsd = 0;
  const lineasGratis: Array<{ productoId: number; cantidad: number; premioId: number }> = [];
  for (const premio of premios) {
    if (!premio.activo) throw new Error(`El premio ${premio.nombre} no está disponible.`);
    costoTotal += premio.costoPuntos;
    if (costoTotal > puntosDisponibles) throw new Error(`No tienes puntos suficientes para ${premio.nombre}.`);
    if (premio.tipo === "descuento") descuentoPuntosUsd = roundMoney(descuentoPuntosUsd + (premio.montoDescuentoUsd ?? 0));
    else if (premio.productoId && premio.cantidad) lineasGratis.push({ productoId: premio.productoId, cantidad: premio.cantidad, premioId: premio.id });
  }
  if (Math.round(descuentoPuntosUsd * 100) > Math.round((subtotalUsd - descuentoUsd) * 100)) {
    throw new Error("El descuento del premio supera el monto del pedido.");
  }
  return { descuentoPuntosUsd, costoTotal, lineasGratis };
}

export async function puntosDisponiblesDelCliente(db: Prisma.TransactionClient, clienteId: number) {
  const suma = await db.fidelidad.aggregate({ where: { clienteId }, _sum: { puntos: true } });
  return suma._sum.puntos ?? 0;
}

/**
 * Acredita los puntos de un pedido pagado, una sola vez. Quien la llama debe haber bloqueado al cliente.
 * No hace nada si el pedido no está pagado, no participa o ya tiene una acumulación (incluidas las antiguas).
 */
export async function acreditarPuntosPorPago(tx: Prisma.TransactionClient, transaccionId: number) {
  const pedido = await tx.transaccion.findUnique({
    where: { id: transaccionId },
    select: {
      estado: true,
      importada: true,
      clienteId: true,
      montoSubtotal: true,
      montoDescuento: true,
      montoDescuentoPuntos: true,
      montoTotal: true,
      montoDelivery: true,
      cliente: { select: { tipoCliente: true } },
    },
  });
  if (!pedido || pedido.estado !== "pagado") return 0;
  if (!participaEnFidelidad({ tipoCliente: pedido.cliente.tipoCliente, importada: pedido.importada })) return 0;
  const previa = await tx.fidelidad.findFirst({ where: { transaccionId, tipoMovimiento: "acumulacion" }, select: { id: true } });
  if (previa) return 0;

  // Los pedidos antiguos pueden no tener subtotal guardado.
  const montoSubtotal = pedido.montoSubtotal > 0 ? pedido.montoSubtotal : Math.max(0, pedido.montoTotal - pedido.montoDelivery + pedido.montoDescuento);
  const puntos = calcularPuntosGanados({ montoSubtotal, montoDescuento: pedido.montoDescuento, montoDescuentoPuntos: pedido.montoDescuentoPuntos });
  if (puntos > 0) {
    await tx.fidelidad.create({ data: { clienteId: pedido.clienteId, transaccionId, puntos, tipoMovimiento: "acumulacion" } });
  }
  return puntos;
}

/** Al cancelar: devuelve los puntos canjeados y revierte los ganados (con tope) del pedido. */
export async function revertirPuntosDePedido(tx: Prisma.TransactionClient, input: { transaccionId: number; clienteId: number; numeroOrden: string }, actor: Actor) {
  const movimientos = await tx.fidelidad.findMany({ where: { transaccionId: input.transaccionId }, select: { tipoMovimiento: true, puntos: true } });
  const suma = (tipos: string[]) => movimientos.filter((m) => tipos.includes(m.tipoMovimiento)).reduce((total, m) => total + m.puntos, 0);
  const ganadosNetos = suma(["acumulacion", "reversion"]);
  const canjeados = -suma(["redencion", "devolucion"]);
  const disponibles = await puntosDisponiblesDelCliente(tx, input.clienteId);
  const base = { clienteId: input.clienteId, transaccionId: input.transaccionId, actorId: actor.id, actorEmail: actor.email };

  if (canjeados > 0) {
    await tx.fidelidad.create({ data: { ...base, tipoMovimiento: "devolucion", puntos: canjeados, descripcion: `Devolución por cancelación del pedido ${input.numeroOrden}` } });
  }
  if (ganadosNetos > 0) {
    const tope = topeReversion({ ganadosNetos, devueltos: Math.max(0, canjeados), disponibles });
    if (tope > 0) {
      await tx.fidelidad.create({
        data: {
          ...base,
          tipoMovimiento: "reversion",
          puntos: -tope,
          motivo: tope < ganadosNetos ? `Reversión parcial: el cliente ya había usado ${ganadosNetos - tope} puntos` : `Cancelación del pedido ${input.numeroOrden}`,
        },
      });
    }
  }
}

/** Ajuste manual de puntos (con signo, con motivo). El saldo de puntos nunca queda negativo. */
export async function ajustarPuntos(tx: Prisma.TransactionClient, input: { clienteId: number; puntos: number; motivo: string }, actor: Actor) {
  const motivo = input.motivo.trim();
  if (motivo.length < 3 || motivo.length > 240) throw new Error("El motivo debe tener entre 3 y 240 caracteres.");
  if (!Number.isInteger(input.puntos) || input.puntos === 0) throw new Error("El ajuste debe ser un número entero distinto de cero.");
  await bloquearCliente(tx, input.clienteId);
  const actual = await puntosDisponiblesDelCliente(tx, input.clienteId);
  if (actual + input.puntos < 0) throw new Error("El ajuste dejaría los puntos en negativo.");
  await tx.fidelidad.create({ data: { clienteId: input.clienteId, tipoMovimiento: "ajuste", puntos: input.puntos, motivo, actorId: actor.id, actorEmail: actor.email } });
  return { puntos: actual + input.puntos };
}

/** Lee los premios y valida los canjes sin escribir nada: sirve para conocer el descuento antes de crear el pedido. */
export async function prepararCanjes(tx: Prisma.TransactionClient, input: { clienteId: number; premioIds: number[]; subtotalUsd: number; descuentoUsd: number }) {
  if (input.premioIds.length === 0) return { premios: [], descuentoPuntosUsd: 0, costoTotal: 0, lineasGratis: [] as Array<{ productoId: number; cantidad: number; premioId: number }> };
  const registros = await tx.premio.findMany({ where: { id: { in: [...new Set(input.premioIds)] } }, include: { producto: { select: { nombre: true } } } });
  const porId = new Map(registros.map((premio) => [premio.id, premio]));
  const premios = input.premioIds.map((id) => {
    const premio = porId.get(id);
    if (!premio) throw new Error("El premio seleccionado no existe.");
    return premio;
  });

  const validacion = validarCanjes({
    premios,
    puntosDisponibles: await puntosDisponiblesDelCliente(tx, input.clienteId),
    subtotalUsd: input.subtotalUsd,
    descuentoUsd: input.descuentoUsd,
  });
  return { premios, ...validacion };
}

/**
 * Canjea premios en un pedido: descuenta los puntos, agrega las líneas gratis (precio 0) y su inventario.
 * Quien la llama debe haber bloqueado al cliente. Devuelve el descuento en USD que debe sumar al pedido.
 */
export async function canjearPremios(
  tx: Prisma.TransactionClient,
  input: { clienteId: number; transaccionId: number; premioIds: number[]; subtotalUsd: number; descuentoUsd: number },
  actor: Actor | null,
) {
  const { premios, descuentoPuntosUsd, costoTotal, lineasGratis } = await prepararCanjes(tx, input);
  const porId = new Map(premios.map((premio) => [premio.id, premio]));

  for (const premio of premios) {
    await tx.fidelidad.create({
      data: {
        clienteId: input.clienteId,
        transaccionId: input.transaccionId,
        tipoMovimiento: "redencion",
        puntos: -premio.costoPuntos,
        premioId: premio.id,
        descripcion: premio.nombre,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
      },
    });
  }
  for (const linea of [...lineasGratis].sort((a, b) => a.productoId - b.productoId)) {
    const premio = porId.get(linea.premioId);
    try {
      await ajustarInventario(tx, linea.productoId, -linea.cantidad, { exigirStock: true });
    } catch (error) {
      if (error instanceof StockInsuficienteError) throw new Error(`No hay existencia para el premio ${premio?.nombre ?? "seleccionado"}.`);
      throw error;
    }
    await tx.detalleCompra.create({ data: { transaccionId: input.transaccionId, productoId: linea.productoId, cantidad: linea.cantidad, precioUnitario: 0, tipoPrecio: "promo" } });
  }
  return { descuentoPuntosUsd, costoTotal };
}
