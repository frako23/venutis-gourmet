export type DeliveryLineRuleInput = { productoId?: number | null; productoNombre: string; cantidad: number; precioUnitarioUsd?: number | null };

export function isWholesaleClient(tipoCliente: string) { return tipoCliente === "mayorista"; }
// Las cantidades vienen del pedido y admiten hasta 2 decimales.
export function validateDeliveryLines(lines: DeliveryLineRuleInput[]) { return lines.length > 0 && lines.every((line) => line.productoNombre.trim().length > 0 && Number.isFinite(line.cantidad) && line.cantidad > 0 && (line.precioUnitarioUsd == null || Number.isFinite(line.precioUnitarioUsd) && line.precioUnitarioUsd >= 0)); }
export function snapshotDeliveryLines(lines: DeliveryLineRuleInput[]) { return lines.map((line) => ({ ...line, productoNombre: line.productoNombre.trim(), cantidad: line.cantidad, precioUnitarioUsd: line.precioUnitarioUsd ?? null })); }

/** El número de la nota es el de la orden: una sola numeración para ambos documentos. */
export function numeroNotaDePedido(numeroOrden: string) { return numeroOrden.trim(); }

/** Número de factura opcional: sin espacios sobrantes; vacío = sin factura. */
export function normalizarNumeroFactura(valor: string | null | undefined) { const limpio = (valor ?? "").trim().replace(/\s+/g, " "); return limpio === "" ? null : limpio; }

export type PedidoParaNota = { estado: string; cliente: { tipoCliente: string }; notasEntrega: number };
/** Motivo por el que el pedido no admite nota de entrega, o null si se puede generar. */
export function motivoSinNota({ estado, cliente, notasEntrega }: PedidoParaNota): string | null {
  if (!isWholesaleClient(cliente.tipoCliente)) return "Solo se emiten notas de entrega a clientes mayoristas.";
  if (estado === "cancelado") return "Un pedido cancelado no admite nota de entrega.";
  if (notasEntrega > 0) return "Este pedido ya tiene su nota de entrega.";
  return null;
}
