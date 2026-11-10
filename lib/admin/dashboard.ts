import { prisma } from "@/lib/prisma";
import {
  topProductos,
  ventasPorMes,
  ventasPorTipoCliente,
  type PedidoResumen,
  type ProductoTop,
  type VentanasResumen,
  type VentasMes,
  type VentasTipoCliente,
} from "./dashboard-core";
import { resumirPorProducto, roundMoney } from "./sales-calculations";
import type { VisitPeriod } from "./types";

export type ResumenPanel = {
  periodo30Dias: VisitPeriod;
  /** "YYYY-MM", para el enlace a las analíticas. */
  mesActual: string;
  indicadores: {
    ventasUsd: number;
    ventasCantidad: number;
    pedidosAbiertos: number;
    alertasInventario: number;
    clientesMayoristas: number;
    notasEntrega: number;
  };
  ventasPorMes: VentasMes[];
  ventasPorTipoCliente: VentasTipoCliente[];
  topProductos: ProductoTop[];
};

export async function consultarResumen(ventanas: VentanasResumen): Promise<ResumenPanel> {
  const { desdeMeses, desde30Dias, hasta } = ventanas;
  const [pedidosDb, lineas, pedidosAbiertos, alertasInventario, clientesMayoristas, notasEntrega] = await Promise.all([
    prisma.transaccion.findMany({
      where: { fechaCompra: { gte: desdeMeses, lt: hasta }, estado: { not: "cancelado" } },
      select: { fechaCompra: true, montoTotal: true, cliente: { select: { tipoCliente: true } } },
    }),
    prisma.detalleCompra.findMany({
      where: { transaccion: { fechaCompra: { gte: desde30Dias, lt: hasta }, estado: { not: "cancelado" } } },
      select: { productoId: true, cantidad: true, precioUnitario: true, producto: { select: { nombre: true } } },
    }),
    prisma.transaccion.count({ where: { estado: { in: ["por_cobrar", "en_pedido", "pendiente"] } } }),
    prisma.producto.count({ where: { inventario: { lte: 5 } } }),
    prisma.cliente.count({ where: { tipoCliente: "mayorista" } }),
    prisma.notaEntrega.count({ where: { fechaEntrega: { gte: desde30Dias } } }),
  ]);

  const pedidos: PedidoResumen[] = pedidosDb.map((p) => ({ fechaCompra: p.fechaCompra, montoTotal: p.montoTotal, tipoCliente: p.cliente.tipoCliente }));
  const porTipo = ventasPorTipoCliente(pedidos, ventanas);
  const lineasProducto = lineas.map((l) => ({ productoId: l.productoId, nombre: l.producto.nombre, cantidad: l.cantidad, precioUnitario: l.precioUnitario }));
  const totalLineas = roundMoney(lineasProducto.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0));

  return {
    periodo30Dias: ventanas.periodo30Dias,
    mesActual: ventanas.meses[ventanas.meses.length - 1],
    indicadores: {
      ventasUsd: roundMoney(porTipo.reduce((suma, g) => suma + g.totalUsd, 0)),
      ventasCantidad: porTipo.reduce((suma, g) => suma + g.cantidadVentas, 0),
      pedidosAbiertos,
      alertasInventario,
      clientesMayoristas,
      notasEntrega,
    },
    ventasPorMes: ventasPorMes(pedidos, ventanas),
    ventasPorTipoCliente: porTipo,
    topProductos: topProductos(resumirPorProducto(lineasProducto, totalLineas)),
  };
}
