import type { Prisma } from "@prisma/client";

import type { SalesFilterState } from "@/components/admin/ventas/salesFilters";
import { agruparCuentasPorCobrar } from "@/lib/admin/abonos";
import { prisma } from "@/lib/prisma";

const PENDING_STATES = ["por_cobrar", "pendiente", "en_pedido"] as const;
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

  const pending = PENDING_STATES as readonly string[];
  const estadoWhere: Prisma.TransaccionWhereInput["estado"] | undefined =
    values.saldo === "pendiente"
      ? estado
        ? pending.includes(estado) ? (estado as Prisma.TransaccionWhereInput["estado"]) : { in: [] }
        : { in: [...PENDING_STATES] }
      : (estado as Prisma.TransaccionWhereInput["estado"] | undefined);

  return {
    ...(estadoWhere ? { estado: estadoWhere } : {}),
    ...(orden ? { numeroOrden: { contains: orden, mode: "insensitive" } } : {}),
    ...(cliente ? { cliente: { OR: [{ nombre: { contains: cliente, mode: "insensitive" } }, { apellido: { contains: cliente, mode: "insensitive" } }] } } : {}),
    ...(desde || hasta ? { fechaCompra: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lt: hasta } : {}) } } : {}),
  };
}

/** Resumen de lo que se debe: pedidos abiertos con saldo, agrupados por cliente. */
export async function consultarCuentasPorCobrar() {
  const pedidos = await prisma.transaccion.findMany({
    where: { estado: { in: ["por_cobrar", "pendiente", "en_pedido"] } },
    select: {
      clienteId: true,
      fechaCompra: true,
      estado: true,
      montoTotal: true,
      cliente: { select: { nombre: true, apellido: true } },
      pagos: { select: { esAbono: true, montoUsd: true, anuladoEn: true } },
    },
  });
  return agruparCuentasPorCobrar(pedidos.map((pedido) => ({ ...pedido, cliente: `${pedido.cliente.nombre} ${pedido.cliente.apellido}`.trim() })));
}
