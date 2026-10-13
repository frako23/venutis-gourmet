export type DeliveryLineRuleInput = { productoId?: number | null; productoNombre: string; cantidad: number; precioUnitarioUsd?: number | null };

export function isWholesaleClient(tipoCliente: string) { return tipoCliente === "mayorista"; }
export function validateDeliveryLines(lines: DeliveryLineRuleInput[]) { return lines.length > 0 && lines.every((line) => line.productoNombre.trim().length > 0 && Number.isInteger(line.cantidad) && line.cantidad > 0 && (line.precioUnitarioUsd == null || Number.isFinite(line.precioUnitarioUsd) && line.precioUnitarioUsd >= 0)); }
export function snapshotDeliveryLines(lines: DeliveryLineRuleInput[]) { return lines.map((line) => ({ ...line, productoNombre: line.productoNombre.trim(), cantidad: line.cantidad, precioUnitarioUsd: line.precioUnitarioUsd ?? null })); }
