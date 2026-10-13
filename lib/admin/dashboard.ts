import { prisma } from "@/lib/prisma";

export type DashboardSummary = {
  ventasPeriodoUsd: number;
  ventasPeriodoCantidad: number;
  pedidosAbiertos: number;
  alertasInventario: number;
  clientesMayoristas: number;
  notasEntrega: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - 29);

  const [sales, pedidosAbiertos, alertasInventario, clientesMayoristas, notasEntrega] = await Promise.all([
    prisma.transaccion.aggregate({
      where: { fechaCompra: { gte: desde }, estado: { not: "cancelado" } },
      _sum: { montoTotal: true },
      _count: { _all: true },
    }),
    prisma.transaccion.count({ where: { estado: { in: ["por_cobrar", "en_pedido", "pendiente"] } } }),
    prisma.producto.count({ where: { inventario: { lte: 5 } } }),
    prisma.cliente.count({ where: { tipoCliente: "mayorista" } }),
    prisma.notaEntrega.count({ where: { fechaEntrega: { gte: desde } } }),
  ]);

  return {
    ventasPeriodoUsd: sales._sum.montoTotal ?? 0,
    ventasPeriodoCantidad: sales._count._all,
    pedidosAbiertos,
    alertasInventario,
    clientesMayoristas,
    notasEntrega,
  };
}
