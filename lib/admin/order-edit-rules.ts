import { createHash } from "node:crypto";

import type { EstadoTransaccion, TipoRetiro } from "@prisma/client";

import { topeReversion } from "../fidelidad.ts";
import { formatFechaHora } from "../format.ts";
import { roundQuantity } from "../inventory.ts";
import { roundMoney, type DiscountInput } from "./sales-calculations.ts";

export type TipoPrecioLinea = "detal" | "mayor" | "promo";

/** Lo que identifica el estado de un pedido para detectar ediciones concurrentes. */
export type SnapshotPedido = {
  estado: EstadoTransaccion;
  montoTotal: number;
  numeroOrden: string;
  clienteId: number;
  fechaCompra: Date;
  lineas: Array<{ id: number; productoId: number; cantidad: number; precioUnitario: number }>;
  pagos: Array<{ id: number; anuladoEn: Date | null }>;
  movimientosPuntosIds: number[];
  movimientosSaldoIds: number[];
  ultimoEventoId: number | null;
};

export type PedidoEditable = {
  id: number;
  version: string;
  numeroOrden: string;
  clienteId: number;
  clienteBloqueado: boolean;
  fechaLocal: string;
  estado: EstadoTransaccion;
  importada: boolean;
  tipodeRetiro: TipoRetiro;
  tasaCambio: number | null;
  descuento: DiscountInput | null;
  lineas: Array<{ productoId: number; cantidad: number; precioUnitarioUsd: number; tipoPrecio: TipoPrecioLinea }>;
  lineasPremio: Array<{ nombre: string; cantidad: number }>;
  descuentoPuntosUsd: number;
  montoDeliveryUsd: number;
  zonaEntrega: string | null;
  abonadoUsd: number;
  totalAnteriorUsd: number;
};

/** Datos comparables de un pedido para el resumen del historial. */
export type ResumenPedido = {
  numeroOrden: string;
  clienteId: number;
  fechaCompra: Date;
  tipodeRetiro: string;
  tasaCambio: number | null;
  descuento: DiscountInput | null;
  lineas: Array<{ productoId: number; nombre?: string; cantidad: number; precioUnitarioUsd: number }>;
  totalUsd: number;
};

const cents = (valor: number) => Math.round(valor * 100);

export function motivoNoEditable({ estado }: { estado: EstadoTransaccion }): string | null {
  return estado === "cancelado" ? "Los pedidos cancelados no se pueden editar." : null;
}

/** Diferencia de cantidad por producto (nueva − anterior), sin deltas en 0 y ordenada por producto. */
export function diferenciasInventario(anteriores: Array<{ productoId: number; cantidad: number }>, nuevas: Array<{ productoId: number; cantidad: number }>) {
  const deltas = new Map<number, number>();
  for (const linea of anteriores) deltas.set(linea.productoId, (deltas.get(linea.productoId) ?? 0) - linea.cantidad);
  for (const linea of nuevas) deltas.set(linea.productoId, (deltas.get(linea.productoId) ?? 0) + linea.cantidad);
  return [...deltas]
    .map(([productoId, delta]) => ({ productoId, delta: roundQuantity(delta) }))
    .filter((item) => item.delta !== 0)
    .sort((a, b) => a.productoId - b.productoId);
}

/** Un pedido pagado cuyo total sube exige confirmar que se cobró la diferencia. */
export function requiereConfirmarDiferencia({ estado, totalAnteriorUsd, totalNuevoUsd }: { estado: EstadoTransaccion; totalAnteriorUsd: number; totalNuevoUsd: number }) {
  return estado === "pagado" && cents(totalNuevoUsd) > cents(totalAnteriorUsd);
}

/** Puntos con signo a registrar al editar un pedido pagado: positivo acredita, negativo revierte con tope, 0 no mueve. */
export function ajustePuntosPorEdicion({ ganadosNetos, esperados, disponibles, devueltos }: { ganadosNetos: number; esperados: number; disponibles: number; devueltos: number }) {
  const diferencia = esperados - ganadosNetos;
  if (diferencia >= 0) return diferencia;
  return -topeReversion({ ganadosNetos: -diferencia, devueltos, disponibles });
}

/** Huella del pedido: cambia con cualquier edición, abono, anulación, canje o cambio de estado. */
export function versionPedido(snapshot: SnapshotPedido) {
  const datos = {
    e: snapshot.estado,
    t: cents(snapshot.montoTotal),
    n: snapshot.numeroOrden,
    c: snapshot.clienteId,
    f: snapshot.fechaCompra.getTime(),
    l: [...snapshot.lineas].sort((a, b) => a.id - b.id).map((linea) => [linea.id, linea.productoId, linea.cantidad, linea.precioUnitario]),
    p: [...snapshot.pagos].sort((a, b) => a.id - b.id).map((pago) => [pago.id, pago.anuladoEn ? 1 : 0]),
    fi: [...snapshot.movimientosPuntosIds].sort((a, b) => a - b),
    ms: [...snapshot.movimientosSaldoIds].sort((a, b) => a - b),
    h: snapshot.ultimoEventoId,
  };
  return createHash("sha256").update(JSON.stringify(datos)).digest("hex").slice(0, 16);
}

const LIMITE_RESUMEN = 500;

/** Texto legible de lo que cambió; "" si no hay cambios. Máximo 500 caracteres. */
export function resumirCambiosPedido(antes: ResumenPedido, despues: ResumenPedido) {
  const cambios: string[] = [];
  if (antes.numeroOrden !== despues.numeroOrden) cambios.push(`número ${antes.numeroOrden} → ${despues.numeroOrden}`);
  if (antes.clienteId !== despues.clienteId) cambios.push(`cliente #${antes.clienteId} → #${despues.clienteId}`);
  if (antes.fechaCompra.getTime() !== despues.fechaCompra.getTime()) cambios.push(`fecha ${formatFechaHora(antes.fechaCompra)} → ${formatFechaHora(despues.fechaCompra)}`);
  if (antes.tipodeRetiro !== despues.tipodeRetiro) cambios.push(`entrega ${antes.tipodeRetiro} → ${despues.tipodeRetiro}`);
  if ((antes.tasaCambio ?? null) !== (despues.tasaCambio ?? null)) cambios.push(`tasa ${antes.tasaCambio ?? "—"} → ${despues.tasaCambio ?? "—"}`);
  const descripcionDescuento = (d: DiscountInput | null) => (d && d.valor > 0 ? `${d.valor}${d.tipo === "porcentaje" ? "%" : " USD"}` : "ninguno");
  if (descripcionDescuento(antes.descuento) !== descripcionDescuento(despues.descuento)) cambios.push(`descuento ${descripcionDescuento(antes.descuento)} → ${descripcionDescuento(despues.descuento)}`);

  const agrupar = (lineas: ResumenPedido["lineas"]) => {
    const mapa = new Map<number, { nombre: string; cantidad: number; precio: number }>();
    for (const linea of lineas) {
      const actual = mapa.get(linea.productoId);
      mapa.set(linea.productoId, { nombre: linea.nombre ?? `producto #${linea.productoId}`, cantidad: roundQuantity((actual?.cantidad ?? 0) + linea.cantidad), precio: linea.precioUnitarioUsd });
    }
    return mapa;
  };
  const a = agrupar(antes.lineas);
  const d = agrupar(despues.lineas);
  for (const [id, linea] of d) {
    const previa = a.get(id);
    if (!previa) cambios.push(`agrega ${linea.cantidad} × ${linea.nombre}`);
    else {
      if (previa.cantidad !== linea.cantidad) cambios.push(`${linea.nombre}: ${previa.cantidad} → ${linea.cantidad}`);
      if (cents(previa.precio) !== cents(linea.precio)) cambios.push(`${linea.nombre}: precio ${previa.precio.toFixed(2)} → ${linea.precio.toFixed(2)}`);
    }
  }
  for (const [id, linea] of a) if (!d.has(id)) cambios.push(`quita ${linea.cantidad} × ${linea.nombre}`);

  if (cambios.length === 0) return "";
  if (cents(antes.totalUsd) !== cents(despues.totalUsd)) cambios.push(`total USD ${roundMoney(antes.totalUsd).toFixed(2)} → ${roundMoney(despues.totalUsd).toFixed(2)}`);
  const texto = cambios.join("; ");
  return texto.length > LIMITE_RESUMEN ? `${texto.slice(0, LIMITE_RESUMEN - 1)}…` : texto;
}

export type DatosEliminacion = {
  estado: EstadoTransaccion;
  tieneAbonos: boolean;
  movimientosPuntos: number;
  movimientosSaldo: number;
  notasEntrega: number;
  resenas: number;
};

/** Primer motivo por el que un pedido no se puede eliminar, o `null` si se puede. */
export function motivoNoEliminable({ estado, tieneAbonos, movimientosPuntos, movimientosSaldo, notasEntrega, resenas }: DatosEliminacion): string | null {
  if (estado === "pagado") return "Los pedidos pagados no se eliminan.";
  const cancelar = " Cancélalo en lugar de eliminarlo.";
  if (tieneAbonos) return `Este pedido tiene abonos registrados.${cancelar}`;
  if (movimientosPuntos > 0) return `Este pedido tiene movimientos de puntos.${cancelar}`;
  if (movimientosSaldo > 0) return `Este pedido tiene movimientos de saldo a favor.${cancelar}`;
  if (notasEntrega > 0) return `Este pedido tiene una nota de entrega.${cancelar}`;
  if (resenas > 0) return `Este pedido tiene reseñas.${cancelar}`;
  return null;
}
