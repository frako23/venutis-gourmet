import type { EstadoTransaccion, OrigenMovimientoSaldo, Prisma, PrismaClient, TipoCliente, TipoMovimiento } from "@prisma/client";

import { calcularSaldo, consultarDeudaCliente } from "./abonos.ts";
import { roundMoney } from "./sales-calculations.ts";

type Db = Prisma.TransactionClient | PrismaClient;

export type PedidoParaIndicadores = {
  estado: EstadoTransaccion;
  montoTotal: number;
  fechaCompra: Date;
  detalles: Array<{ productoId: number; nombre: string; cantidad: number }>;
};

export type IndicadoresCliente = {
  totalCompradoUsd: number;
  pedidos: number;
  ticketPromedioUsd: number;
  ultimaCompra: Date | null;
  topProductos: Array<{ productoId: number; nombre: string; cantidad: number }>;
};

/** Indicadores de compra del cliente; los pedidos cancelados no cuentan. */
export function calcularIndicadoresCliente(pedidos: PedidoParaIndicadores[]): IndicadoresCliente {
  const vigentes = pedidos.filter((pedido) => pedido.estado !== "cancelado");
  const totalCompradoUsd = roundMoney(vigentes.reduce((suma, pedido) => suma + pedido.montoTotal, 0));
  const porProducto = new Map<number, { productoId: number; nombre: string; cantidad: number }>();
  let ultimaCompra: Date | null = null;
  for (const pedido of vigentes) {
    if (!ultimaCompra || pedido.fechaCompra > ultimaCompra) ultimaCompra = pedido.fechaCompra;
    for (const linea of pedido.detalles) {
      const actual = porProducto.get(linea.productoId);
      if (actual) actual.cantidad = roundMoney(actual.cantidad + linea.cantidad);
      else porProducto.set(linea.productoId, { productoId: linea.productoId, nombre: linea.nombre, cantidad: roundMoney(linea.cantidad) });
    }
  }
  return {
    totalCompradoUsd,
    pedidos: vigentes.length,
    ticketPromedioUsd: vigentes.length ? roundMoney(totalCompradoUsd / vigentes.length) : 0,
    ultimaCompra,
    topProductos: [...porProducto.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
  };
}

export type ClientProfile = {
  cliente: {
    id: number;
    tipoCliente: TipoCliente;
    nombre: string;
    apellido: string;
    rif: string | null;
    celular: string | null;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
    notasInternas: string | null;
  };
  direcciones: Array<{ id: number; urbanizacion: string; direccion: string; tipo: string }>;
  cuenta: { id: number; email: string; estado: "vinculada" | "pendiente"; confirmadaPorEmail: string | null; confirmadaEn: Date | null } | null;
  indicadores: IndicadoresCliente;
  financiero: {
    deudaUsd: number;
    saldoAFavorUsd: number;
    puntos: number;
    credito: { habilitado: boolean; limiteUsd: number | null; disponibleUsd: number | null };
  };
  pedidos: Array<{ id: number; numeroOrden: string; fechaCompra: Date; totalUsd: number; estado: EstadoTransaccion; saldoUsd: number }>;
  movimientosSaldo: Array<{
    id: number;
    createdAt: Date;
    montoUsd: number;
    origen: OrigenMovimientoSaldo;
    numeroOrden: string | null;
    actorEmail: string | null;
    motivo: string | null;
    metodoPago: string | null;
    referencia: string | null;
  }>;
  movimientosPuntos: Array<{
    id: number;
    fecha: Date;
    puntos: number;
    tipo: TipoMovimiento;
    descripcion: string | null;
    numeroOrden: string | null;
    actorEmail: string | null;
    motivo: string | null;
  }>;
  historial: Array<{ createdAt: Date; actorEmail: string | null; accion: string; camposModificados: string[]; detalle: string | null }>;
};

const MOVIMIENTOS_VISIBLES = 100;

/** Ficha completa del cliente para el panel. Devuelve `null` si no existe. */
export async function getClientProfile(db: Db, id: number): Promise<ClientProfile | null> {
  const cliente = await db.cliente.findUnique({
    where: { id },
    include: {
      direcciones: { orderBy: { createdAt: "asc" } },
      cuenta: true,
      transacciones: {
        orderBy: { fechaCompra: "desc" },
        include: {
          detalles: { select: { productoId: true, cantidad: true, producto: { select: { nombre: true } } } },
          pagos: { select: { esAbono: true, montoUsd: true, anuladoEn: true } },
        },
      },
      historialCliente: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!cliente) return null;

  const [deudaUsd, saldo, puntos, movimientosSaldo, movimientosPuntos] = await Promise.all([
    consultarDeudaCliente(db, id),
    db.movimientoSaldo.aggregate({ where: { clienteId: id }, _sum: { montoUsd: true } }),
    db.fidelidad.aggregate({ where: { clienteId: id }, _sum: { puntos: true } }),
    db.movimientoSaldo.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
      take: MOVIMIENTOS_VISIBLES,
      include: { transaccion: { select: { numeroOrden: true } } },
    }),
    db.fidelidad.findMany({
      where: { clienteId: id },
      orderBy: { fecha: "desc" },
      take: MOVIMIENTOS_VISIBLES,
      include: { transaccion: { select: { numeroOrden: true } } },
    }),
  ]);

  const limiteUsd = cliente.limiteCreditoUsd;
  const credito = {
    habilitado: cliente.creditoHabilitado,
    limiteUsd,
    disponibleUsd: cliente.creditoHabilitado ? Math.max(0, roundMoney((limiteUsd ?? 0) - deudaUsd)) : null,
  };

  return {
    cliente: {
      id: cliente.id,
      tipoCliente: cliente.tipoCliente,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      rif: cliente.rif,
      celular: cliente.celular,
      email: cliente.email,
      createdAt: cliente.createdAt,
      updatedAt: cliente.updatedAt,
      notasInternas: cliente.notasInternas,
    },
    direcciones: cliente.direcciones.map(({ id: direccionId, urbanizacion, direccion, tipo }) => ({ id: direccionId, urbanizacion, direccion, tipo })),
    cuenta: cliente.cuenta
      ? {
          id: cliente.cuenta.id,
          email: cliente.cuenta.email,
          estado: cliente.cuenta.estado,
          confirmadaPorEmail: cliente.cuenta.confirmadaPorEmail,
          confirmadaEn: cliente.cuenta.confirmadaEn,
        }
      : null,
    indicadores: calcularIndicadoresCliente(
      cliente.transacciones.map((pedido) => ({
        estado: pedido.estado,
        montoTotal: pedido.montoTotal,
        fechaCompra: pedido.fechaCompra,
        detalles: pedido.detalles.map((linea) => ({ productoId: linea.productoId, nombre: linea.producto.nombre, cantidad: linea.cantidad })),
      })),
    ),
    financiero: {
      deudaUsd,
      saldoAFavorUsd: roundMoney(saldo._sum.montoUsd ?? 0),
      puntos: puntos._sum.puntos ?? 0,
      credito,
    },
    pedidos: cliente.transacciones.map((pedido) => ({
      id: pedido.id,
      numeroOrden: pedido.numeroOrden,
      fechaCompra: pedido.fechaCompra,
      totalUsd: pedido.montoTotal,
      estado: pedido.estado,
      saldoUsd: calcularSaldo(pedido),
    })),
    movimientosSaldo: movimientosSaldo.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      montoUsd: m.montoUsd,
      origen: m.origen,
      numeroOrden: m.transaccion?.numeroOrden ?? null,
      actorEmail: m.actorEmail,
      motivo: m.motivo,
      metodoPago: m.metodoPago,
      referencia: m.referencia,
    })),
    movimientosPuntos: movimientosPuntos.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      puntos: m.puntos,
      tipo: m.tipoMovimiento,
      descripcion: m.descripcion,
      numeroOrden: m.transaccion?.numeroOrden ?? null,
      actorEmail: m.actorEmail,
      motivo: m.motivo,
    })),
    historial: cliente.historialCliente.map((h) => ({
      createdAt: h.createdAt,
      actorEmail: h.actorEmail,
      accion: h.accion,
      camposModificados: h.camposModificados,
      detalle: h.detalle,
    })),
  };
}
