import type { TipoCliente, TipoMovimiento } from "@prisma/client";

import { normalizeSearchName } from "../client-rules.ts";
import { fechaHoraLocalCaracas, interpretarFechaHoraCaracas } from "../format.ts";

export type GrupoPuntos = { clienteId: number; tipoMovimiento: TipoMovimiento; puntos: number; ultimaFecha: Date };
export type ClientePuntos = { id: number; nombre: string; apellido: string; tipoCliente: TipoCliente; celular: string | null; nombreBusqueda: string };
export type OrdenPuntos = "disponibles" | "ganados" | "canjeados" | "reciente";

export type FilaPuntos = {
  clienteId: number;
  nombre: string;
  tipoCliente: TipoCliente;
  celular: string | null;
  nombreBusqueda: string;
  ganados: number;
  canjeados: number;
  ajustes: number;
  disponibles: number;
  ultimoMovimiento: Date;
};

export type IndicadoresPuntos = {
  enCirculacion: number;
  clientesConPuntos: number;
  puedenCanjear: number;
  ganadosMes: number;
  canjeadosMes: number;
};

/** Ganados = acumulación + bono + reversión; canjeados = −(canje + devolución); ajustes = ajustes manuales. */
export function clasificarPuntos(grupos: Array<{ tipoMovimiento: TipoMovimiento; puntos: number }>) {
  let ganados = 0;
  let canjeados = 0;
  let ajustes = 0;
  for (const { tipoMovimiento, puntos } of grupos) {
    if (tipoMovimiento === "acumulacion" || tipoMovimiento === "bono" || tipoMovimiento === "reversion") ganados += puntos;
    else if (tipoMovimiento === "redencion" || tipoMovimiento === "devolucion") canjeados -= puntos;
    else ajustes += puntos;
  }
  return { ganados, canjeados, ajustes };
}

export function resumirPuntosPorCliente(grupos: GrupoPuntos[], clientes: ClientePuntos[]): FilaPuntos[] {
  const porCliente = new Map(clientes.map((cliente) => [cliente.id, cliente]));
  const agrupados = new Map<number, GrupoPuntos[]>();
  for (const grupo of grupos) {
    if (!porCliente.has(grupo.clienteId)) continue;
    agrupados.set(grupo.clienteId, [...(agrupados.get(grupo.clienteId) ?? []), grupo]);
  }
  return [...agrupados].map(([clienteId, lista]) => {
    const cliente = porCliente.get(clienteId)!;
    const { ganados, canjeados, ajustes } = clasificarPuntos(lista);
    return {
      clienteId,
      nombre: `${cliente.nombre} ${cliente.apellido}`.trim(),
      tipoCliente: cliente.tipoCliente,
      celular: cliente.celular,
      nombreBusqueda: cliente.nombreBusqueda,
      ganados,
      canjeados,
      ajustes,
      disponibles: ganados - canjeados + ajustes,
      ultimoMovimiento: lista.reduce((mayor, g) => (g.ultimaFecha > mayor ? g.ultimaFecha : mayor), lista[0].ultimaFecha),
    };
  });
}

export function filtrarFilasPuntos(filas: FilaPuntos[], texto: string): FilaPuntos[] {
  const buscado = normalizeSearchName(texto);
  if (!buscado) return filas;
  const palabras = buscado.split(" ");
  const digitos = texto.replace(/\D/g, "");
  return filas.filter((fila) => {
    if (palabras.every((palabra) => fila.nombreBusqueda.includes(palabra))) return true;
    return digitos.length >= 3 && (fila.celular ?? "").replace(/\D/g, "").includes(digitos);
  });
}

export function ordenarFilasPuntos(filas: FilaPuntos[], orden: OrdenPuntos): FilaPuntos[] {
  const valor = (fila: FilaPuntos) => (orden === "reciente" ? fila.ultimoMovimiento.getTime() : fila[orden]);
  return [...filas].sort((a, b) => valor(b) - valor(a) || a.nombre.localeCompare(b.nombre, "es"));
}

export function indicadoresPuntos({ filas, gruposDelMes, costoMinimoPremio }: { filas: FilaPuntos[]; gruposDelMes: Array<{ tipoMovimiento: TipoMovimiento; puntos: number }>; costoMinimoPremio: number | null }): IndicadoresPuntos {
  const mes = clasificarPuntos(gruposDelMes);
  return {
    enCirculacion: filas.reduce((suma, fila) => suma + fila.disponibles, 0),
    clientesConPuntos: filas.filter((fila) => fila.disponibles > 0).length,
    puedenCanjear: costoMinimoPremio === null ? 0 : filas.filter((fila) => fila.disponibles >= costoMinimoPremio).length,
    ganadosMes: mes.ganados,
    canjeadosMes: mes.canjeados,
  };
}

/** 00:00 de Caracas del día 1 del mes de `ahora`. */
export function inicioMesCaracas(ahora: Date): Date {
  const inicio = interpretarFechaHoraCaracas(`${fechaHoraLocalCaracas(ahora).slice(0, 7)}-01T00:00`);
  if (!inicio) throw new Error("No se pudo calcular el inicio del mes.");
  return inicio;
}

export function leerOrdenPuntos(valor: string | undefined): OrdenPuntos {
  return valor === "ganados" || valor === "canjeados" || valor === "reciente" ? valor : "disponibles";
}
