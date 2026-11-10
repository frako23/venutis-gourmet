import { fechaHoraLocalCaracas, interpretarFechaHoraCaracas } from "../format.ts";
import { roundMoney } from "./sales-calculations.ts";
import type { AnalyticsProductRow, VisitPeriod } from "./types.js";
import { resolveVisitPeriod } from "./visit-periods.ts";

export type PedidoResumen = { fechaCompra: Date; montoTotal: number; tipoCliente: "detal" | "mayorista" };

export type VentanasResumen = {
  /** "YYYY-MM-DD" en Caracas. */
  hoy: string;
  /** 12 claves "YYYY-MM", de la más antigua al mes en curso. */
  meses: string[];
  desdeMeses: Date;
  desde30Dias: Date;
  /** 00:00 de Caracas de mañana (excluido). */
  hasta: Date;
  periodo30Dias: VisitPeriod;
};

export type VentasMes = { mes: string; etiqueta: string; etiquetaCorta: string; totalUsd: number; cantidadVentas: number; ticketPromedioUsd: number; enCurso: boolean };
export type VentasTipoCliente = { tipoCliente: "detal" | "mayorista"; etiqueta: "Consumidores" | "Mayoristas"; cantidadVentas: number; totalUsd: number; porcentajeDelMonto: number; porcentajeDeVentas: number };
export type ProductoTop = { productoId: number; nombre: string; cantidadVendida: number; totalUsd: number };

function medianocheCaracas(fecha: string): Date {
  const instante = interpretarFechaHoraCaracas(`${fecha}T00:00`);
  if (!instante) throw new Error(`Fecha no válida: ${fecha}`);
  return instante;
}

export function ventanasResumen(ahora: Date): VentanasResumen {
  const hoy = fechaHoraLocalCaracas(ahora).slice(0, 10);
  const [anio, mes, dia] = hoy.split("-").map(Number);
  const manana = new Date(Date.UTC(anio, mes - 1, dia + 1)).toISOString().slice(0, 10);
  const meses = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(anio, mes - 1 - (11 - i), 1)).toISOString().slice(0, 7));
  const periodo30Dias = resolveVisitPeriod({ preset: "30d", reference: ahora });
  return {
    hoy,
    meses,
    desdeMeses: medianocheCaracas(`${meses[0]}-01`),
    desde30Dias: medianocheCaracas(periodo30Dias.since),
    hasta: medianocheCaracas(manana),
    periodo30Dias,
  };
}

function formatoMes(mes: string, opciones: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-VE", { ...opciones, timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));
}

export function ventasPorMes(pedidos: PedidoResumen[], ventanas: VentanasResumen): VentasMes[] {
  const acumulado = new Map(ventanas.meses.map((mes) => [mes, { total: 0, cantidad: 0 }]));
  for (const p of pedidos) {
    if (p.fechaCompra < ventanas.desdeMeses || p.fechaCompra >= ventanas.hasta) continue;
    const entrada = acumulado.get(fechaHoraLocalCaracas(p.fechaCompra).slice(0, 7));
    if (!entrada) continue;
    entrada.total += p.montoTotal;
    entrada.cantidad += 1;
  }
  const actual = ventanas.meses[ventanas.meses.length - 1];
  return ventanas.meses.map((mes) => {
    const { total, cantidad } = acumulado.get(mes)!;
    const totalUsd = roundMoney(total);
    return {
      mes,
      etiqueta: formatoMes(mes, { month: "long", year: "numeric" }),
      etiquetaCorta: formatoMes(mes, { month: "short" }).replace(/\.$/, ""),
      totalUsd,
      cantidadVentas: cantidad,
      ticketPromedioUsd: cantidad ? roundMoney(totalUsd / cantidad) : 0,
      enCurso: mes === actual,
    };
  });
}

export function ventasPorTipoCliente(pedidos: PedidoResumen[], ventanas: VentanasResumen): VentasTipoCliente[] {
  const grupos = { detal: { total: 0, cantidad: 0 }, mayorista: { total: 0, cantidad: 0 } };
  for (const p of pedidos) {
    if (p.fechaCompra < ventanas.desde30Dias || p.fechaCompra >= ventanas.hasta) continue;
    grupos[p.tipoCliente].total += p.montoTotal;
    grupos[p.tipoCliente].cantidad += 1;
  }
  const totalUsd = grupos.detal.total + grupos.mayorista.total;
  const totalVentas = grupos.detal.cantidad + grupos.mayorista.cantidad;
  const porcentaje = (parte: number, todo: number) => (todo ? Math.round((parte / todo) * 1000) / 10 : 0);
  const construir = (tipoCliente: "detal" | "mayorista", etiqueta: "Consumidores" | "Mayoristas"): VentasTipoCliente => ({
    tipoCliente,
    etiqueta,
    cantidadVentas: grupos[tipoCliente].cantidad,
    totalUsd: roundMoney(grupos[tipoCliente].total),
    porcentajeDelMonto: porcentaje(grupos[tipoCliente].total, totalUsd),
    porcentajeDeVentas: porcentaje(grupos[tipoCliente].cantidad, totalVentas),
  });
  return [construir("detal", "Consumidores"), construir("mayorista", "Mayoristas")];
}

export function topProductos(porProducto: AnalyticsProductRow[], limite = 5): ProductoTop[] {
  return [...porProducto]
    .sort((a, b) => b.cantidadVendida - a.cantidadVendida || b.totalUsd - a.totalUsd)
    .slice(0, limite)
    .map(({ productoId, nombre, cantidadVendida, totalUsd }) => ({ productoId, nombre, cantidadVendida, totalUsd }));
}
