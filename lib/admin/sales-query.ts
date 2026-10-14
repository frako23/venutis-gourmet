import type { Prisma } from "@prisma/client";

import type { SalesFilterState } from "@/components/admin/ventas/salesFilters";

const TRANSACTION_STATES = new Set(["por_cobrar", "en_pedido", "pagado", "pendiente", "cancelado"]);

function validDate(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildSalesWhere(values: SalesFilterState): Prisma.TransaccionWhereInput {
  const estado = values.estado && TRANSACTION_STATES.has(values.estado) ? values.estado : undefined;
  const cliente = values.cliente?.trim();
  const orden = values.orden?.trim();
  const desde = validDate(values.desde, false);
  const hasta = validDate(values.hasta, true);

  return {
    ...(estado ? { estado: estado as Prisma.TransaccionWhereInput["estado"] } : {}),
    ...(orden ? { numeroOrden: { contains: orden, mode: "insensitive" } } : {}),
    ...(cliente ? { cliente: { OR: [{ nombre: { contains: cliente, mode: "insensitive" } }, { apellido: { contains: cliente, mode: "insensitive" } }] } } : {}),
    ...(desde || hasta ? { fechaCompra: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lt: hasta } : {}) } } : {}),
  };
}
