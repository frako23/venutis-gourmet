import { prisma } from "@/lib/prisma";

import {
  filtrarFilasPuntos,
  indicadoresPuntos,
  inicioMesCaracas,
  ordenarFilasPuntos,
  resumirPuntosPorCliente,
  type GrupoPuntos,
  type OrdenPuntos,
} from "./points-core";

/** Puntos de todos los clientes con movimientos: una fila por cliente, calculada de `Fidelidad`. */
export async function consultarPuntosClientes({ q, orden, ahora }: { q: string; orden: OrdenPuntos; ahora: Date }) {
  const [porCliente, delMes, premio] = await Promise.all([
    prisma.fidelidad.groupBy({ by: ["clienteId", "tipoMovimiento"], _sum: { puntos: true }, _max: { fecha: true } }),
    prisma.fidelidad.groupBy({ by: ["tipoMovimiento"], where: { fecha: { gte: inicioMesCaracas(ahora) } }, _sum: { puntos: true } }),
    prisma.premio.aggregate({ where: { activo: true }, _min: { costoPuntos: true } }),
  ]);
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: [...new Set(porCliente.map((grupo) => grupo.clienteId))] } },
    select: { id: true, nombre: true, apellido: true, tipoCliente: true, celular: true, nombreBusqueda: true },
  });

  const grupos: GrupoPuntos[] = porCliente.map((grupo) => ({
    clienteId: grupo.clienteId,
    tipoMovimiento: grupo.tipoMovimiento,
    puntos: grupo._sum.puntos ?? 0,
    ultimaFecha: grupo._max.fecha ?? new Date(0),
  }));
  const todas = resumirPuntosPorCliente(grupos, clientes);
  return {
    filas: ordenarFilasPuntos(filtrarFilasPuntos(todas, q), orden),
    total: todas.length,
    indicadores: indicadoresPuntos({
      filas: todas,
      gruposDelMes: delMes.map((grupo) => ({ tipoMovimiento: grupo.tipoMovimiento, puntos: grupo._sum.puntos ?? 0 })),
      costoMinimoPremio: premio._min.costoPuntos,
    }),
  };
}
