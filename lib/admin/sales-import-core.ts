import { normalizeSearchName } from "../client-rules.ts";
import { isValidQuantity } from "../inventory.ts";
import { roundMoney } from "./sales-calculations.ts";
import type { CeldaXlsx, LibroXlsx } from "./xlsx-reader.ts";

export type TipoPrecioCarga = "detal" | "mayor" | "promo";

export type Problema = {
  fila: number | null;
  columna: string | null;
  nivel: "error" | "advertencia";
  mensaje: string;
  nota: string | null;
};

export type LineaCarga = {
  fila: number;
  fecha: string;
  nota: string;
  textoCliente: string;
  claveCliente: string;
  grupo: string | null;
  producto: string;
  sabor: string | null;
  gramos: number | null;
  claveProducto: string;
  descripcion: string;
  cantidad: number;
  tipoPrecio: TipoPrecioCarga | null;
  precioUnitarioUsd: number;
  importeUsd: number;
  abonadoUsd: number;
};

export type NotaCarga = {
  numero: string;
  fecha: string;
  textoCliente: string;
  claveCliente: string;
  lineas: LineaCarga[];
  totalUsd: number;
  abonadoUsd: number;
  saldoUsd: number;
  estadoResultante: "pagado" | "por_cobrar";
  /** Tiene los datos necesarios para reconocerla (fecha, cliente, importe) y es consistente. */
  identificable: boolean;
  tieneError: boolean;
};

export type CargaConstruida = {
  hoja: string;
  filaEncabezados: number;
  notas: NotaCarga[];
  problemas: Problema[];
  totalLineas: number;
};

export class CargaInvalidaError extends Error {}

export const MAX_LINEAS = 2000;

type Campo = "fecha" | "nota" | "cliente" | "producto" | "cantidad" | "tipo" | "precio" | "pagado" | "grupo" | "sabor" | "gramos" | "abono" | "venta";

const ENCABEZADOS: Record<Campo, { normalizado: string; etiqueta: string; obligatorio: boolean }> = {
  fecha: { normalizado: "FECHA", etiqueta: "FECHA", obligatorio: true },
  nota: { normalizado: "NOTA DE ENTREGA", etiqueta: "NOTA DE ENTREGA", obligatorio: true },
  cliente: { normalizado: "CLIENTE", etiqueta: "CLIENTE", obligatorio: true },
  producto: { normalizado: "PRODUCTO", etiqueta: "PRODUCTO", obligatorio: true },
  cantidad: { normalizado: "CANT X PAQ", etiqueta: "CANT X PAQ.", obligatorio: true },
  tipo: { normalizado: "TIPO", etiqueta: "TIPO", obligatorio: true },
  precio: { normalizado: "PVP UND", etiqueta: "PVP UND", obligatorio: true },
  pagado: { normalizado: "PAGADO", etiqueta: "PAGADO", obligatorio: true },
  grupo: { normalizado: "GRUPO", etiqueta: "GRUPO", obligatorio: false },
  sabor: { normalizado: "SABOR", etiqueta: "SABOR", obligatorio: false },
  gramos: { normalizado: "GR", etiqueta: "GR", obligatorio: false },
  abono: { normalizado: "ABONO", etiqueta: "ABONO", obligatorio: false },
  venta: { normalizado: "VENTA", etiqueta: "VENTA", obligatorio: false },
};

/** Sin acentos, en mayúsculas, con puntuación y saltos de línea convertidos en espacios. */
export function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function texto(valor: CeldaXlsx | undefined) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function numero(valor: CeldaXlsx | undefined) {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string" && /^\s*\d+(?:[.,]\d+)?\s*$/.test(valor)) return Number(valor.replace(",", "."));
  return null;
}

/** Convierte un serial de Excel o un texto d/m/aaaa en AAAA-MM-DD. */
export function interpretarFecha(valor: CeldaXlsx | undefined, date1904: boolean): string | null {
  let fecha: Date | null = null;
  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || valor < 1 || valor > 100_000) return null;
    const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    fecha = new Date(base + Math.floor(valor) * 86_400_000);
  } else if (typeof valor === "string") {
    const m = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$/.exec(valor);
    if (!m) return null;
    const [dia, mes, anio] = [Number(m[1]), Number(m[2]), Number(m[3])];
    fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (fecha.getUTCDate() !== dia || fecha.getUTCMonth() !== mes - 1) return null;
  }
  return fecha ? fecha.toISOString().slice(0, 10) : null;
}

/** Las fechas importadas se guardan a las 12:00 de Caracas (16:00 UTC). */
export function fechaAlMediodiaCaracas(iso: string) {
  return new Date(`${iso}T16:00:00.000Z`);
}

export function diaCaracas(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function claveProducto(datos: { grupo?: string | null; producto: string; sabor?: string | null; gramos?: number | null }) {
  return [datos.grupo ?? "", datos.producto, datos.sabor ?? ""].map(normalizarTexto).join("|") + `|${datos.gramos ?? ""}`;
}

function describir(datos: { producto: string; sabor: string | null; gramos: number | null }) {
  return [datos.producto, datos.sabor, datos.gramos ? `${datos.gramos} g` : null].filter(Boolean).join(" ");
}

type Tabla = { hoja: string; filaEncabezados: number; columnas: Partial<Record<Campo, number>>; nombres: Partial<Record<Campo, string>> };

function localizarTabla(libro: LibroXlsx): Tabla {
  let mejor: { faltan: string[]; encontrados: number } | null = null;
  for (const hoja of libro.hojas) {
    for (let i = 0; i < Math.min(10, hoja.filas.length); i += 1) {
      const columnas: Partial<Record<Campo, number>> = {};
      const nombres: Partial<Record<Campo, string>> = {};
      (hoja.filas[i] ?? []).forEach((celda, indice) => {
        const normalizado = normalizarTexto(texto(celda));
        const campo = (Object.keys(ENCABEZADOS) as Campo[]).find((c) => ENCABEZADOS[c].normalizado === normalizado);
        if (campo && columnas[campo] === undefined) {
          columnas[campo] = indice;
          nombres[campo] = texto(celda).replace(/\s+/g, " ");
        }
      });
      const faltan = (Object.keys(ENCABEZADOS) as Campo[]).filter((c) => ENCABEZADOS[c].obligatorio && columnas[c] === undefined).map((c) => ENCABEZADOS[c].etiqueta);
      if (faltan.length === 0) return { hoja: hoja.nombre, filaEncabezados: i + 1, columnas, nombres };
      const encontrados = Object.keys(columnas).length;
      if (!mejor || encontrados > mejor.encontrados) mejor = { faltan, encontrados };
    }
  }
  const faltan = mejor?.faltan ?? (Object.keys(ENCABEZADOS) as Campo[]).filter((c) => ENCABEZADOS[c].obligatorio).map((c) => ENCABEZADOS[c].etiqueta);
  throw new CargaInvalidaError(`No se encontraron las columnas obligatorias: ${faltan.join(", ")}.`);
}

const dinero = (valor: number) => valor.toFixed(2);

/** Lee la tabla, valida cada línea y agrupa por nota de entrega. */
export function construirCarga(libro: LibroXlsx, hoy: string): CargaConstruida {
  const tabla = localizarTabla(libro);
  const hoja = libro.hojas.find((h) => h.nombre === tabla.hoja)!;
  const problemas: Problema[] = [];
  const lineas: LineaCarga[] = [];
  const notasConError = new Set<string>();
  const notasSinIdentificar = new Set<string>();
  let totalFilas = 0;

  const celda = (fila: CeldaXlsx[], campo: Campo) => (tabla.columnas[campo] === undefined ? undefined : fila[tabla.columnas[campo]!]);

  for (let i = tabla.filaEncabezados; i < hoja.filas.length; i += 1) {
    const fila = hoja.filas[i] ?? [];
    const numeroFila = i + 1;
    if (!texto(celda(fila, "fecha")) && !texto(celda(fila, "nota")) && !texto(celda(fila, "cliente")) && !texto(celda(fila, "producto"))) continue;
    totalFilas += 1;
    if (totalFilas > MAX_LINEAS) throw new CargaInvalidaError("El archivo tiene más de 2.000 líneas. Divídelo en varias cargas.");

    const notaTexto = texto(celda(fila, "nota"));
    const notaNumero = numero(celda(fila, "nota"));
    const nota = notaNumero !== null && Number.isInteger(notaNumero) && notaNumero > 0 ? String(notaNumero) : null;
    const errores: Problema[] = [];
    const avisos: Problema[] = [];
    const agregar = (nivel: "error" | "advertencia", campo: Campo, mensaje: string) => {
      (nivel === "error" ? errores : avisos).push({ fila: numeroFila, columna: tabla.nombres[campo] ?? ENCABEZADOS[campo].etiqueta, nivel, mensaje, nota });
    };
    let identificable = true;

    if (!notaTexto) {
      agregar("error", "nota", "Falta el número de nota de entrega.");
    } else if (!nota) {
      agregar("error", "nota", "El número de nota no es válido.");
    }

    const fecha = interpretarFecha(celda(fila, "fecha"), libro.date1904);
    if (!fecha) {
      agregar("error", "fecha", "La fecha no es válida.");
      identificable = false;
    } else if (fecha > hoy) {
      agregar("error", "fecha", "La fecha es posterior a hoy.");
      identificable = false;
    }

    const textoCliente = texto(celda(fila, "cliente")).replace(/\s+/g, " ");
    if (!textoCliente) {
      agregar("error", "cliente", "Falta el cliente.");
      identificable = false;
    }
    const producto = texto(celda(fila, "producto")).replace(/\s+/g, " ");
    if (!producto) {
      agregar("error", "producto", "Falta el producto.");
      identificable = false;
    }

    const cantidad = numero(celda(fila, "cantidad"));
    if (cantidad === null || !isValidQuantity(cantidad)) {
      agregar("error", "cantidad", "La cantidad debe ser mayor que cero y tener como máximo 2 decimales.");
      identificable = false;
    }
    const precio = numero(celda(fila, "precio"));
    if (precio === null || !(precio > 0)) {
      agregar("error", "precio", "El precio unitario debe ser mayor que cero.");
      identificable = false;
    }

    const tipoNormalizado = normalizarTexto(texto(celda(fila, "tipo")));
    const tipoPrecio: TipoPrecioCarga | null = tipoNormalizado === "DETAL" ? "detal" : tipoNormalizado === "MAYOR" ? "mayor" : tipoNormalizado === "PROMO" ? "promo" : null;
    if (!tipoPrecio) agregar("error", "tipo", "El tipo debe ser DETAL, MAYOR o PROMO.");

    const pagadoTexto = normalizarTexto(texto(celda(fila, "pagado")));
    let pagado: "SI" | "NO" = "NO";
    if (pagadoTexto === "SI") pagado = "SI";
    else if (pagadoTexto === "NO") pagado = "NO";
    else if (pagadoTexto === "") agregar("advertencia", "pagado", "PAGADO está vacío; se toma como NO.");
    else agregar("error", "pagado", "PAGADO debe ser SI o NO.");

    const grupo = texto(celda(fila, "grupo")).replace(/\s+/g, " ") || null;
    const sabor = texto(celda(fila, "sabor")).replace(/\s+/g, " ") || null;
    let gramos: number | null = null;
    const crudoGramos = celda(fila, "gramos");
    if (texto(crudoGramos)) {
      const m = /^\s*(\d+)/.exec(texto(crudoGramos));
      if (m) gramos = Number(m[1]);
      else agregar("advertencia", "gramos", "GR no tiene un número; se ignora.");
    }

    const importeUsd = cantidad !== null && precio !== null && identificable ? roundMoney(cantidad * precio) : 0;
    let abonadoUsd = 0;
    if (identificable) {
      const abono = numero(celda(fila, "abono"));
      const abonoNegativo = typeof celda(fila, "abono") === "number" && (celda(fila, "abono") as number) < 0;
      if (abonoNegativo || (abono !== null && abono > importeUsd + 0.005)) {
        agregar("error", "abono", "El abono no puede ser negativo ni mayor que la venta de la línea.");
      } else if (abono !== null) {
        abonadoUsd = roundMoney(abono);
        if ((pagado === "SI" && abonadoUsd === 0) || (pagado === "NO" && abonadoUsd > 0 && Math.abs(abonadoUsd - importeUsd) < 0.005)) {
          agregar("advertencia", "abono", `PAGADO y ABONO no coinciden; se usa el ABONO (${dinero(abonadoUsd)}).`);
        }
      } else {
        abonadoUsd = pagado === "SI" ? importeUsd : 0;
      }
      const venta = numero(celda(fila, "venta"));
      if (venta !== null && Math.abs(venta - importeUsd) > 0.005) {
        agregar("advertencia", "venta", `La VENTA del archivo (${dinero(venta)}) no coincide con CANT × PVP (${dinero(importeUsd)}); se usa ${dinero(importeUsd)}.`);
      }
    }

    problemas.push(...errores, ...avisos);
    if (nota && errores.length > 0) notasConError.add(nota);
    if (!identificable) {
      if (nota) notasSinIdentificar.add(nota);
      continue;
    }
    if (!nota) continue;

    lineas.push({
      fila: numeroFila,
      fecha: fecha!,
      nota,
      textoCliente,
      claveCliente: normalizeSearchName(textoCliente),
      grupo,
      producto,
      sabor,
      gramos,
      claveProducto: claveProducto({ grupo, producto, sabor, gramos }),
      descripcion: describir({ producto, sabor, gramos }),
      cantidad: cantidad!,
      tipoPrecio,
      precioUnitarioUsd: precio!,
      importeUsd,
      abonadoUsd,
    });
  }

  if (totalFilas === 0) throw new CargaInvalidaError("El archivo no tiene líneas de venta.");

  const porNota = new Map<string, LineaCarga[]>();
  for (const linea of lineas) porNota.set(linea.nota, [...(porNota.get(linea.nota) ?? []), linea]);

  const notas: NotaCarga[] = [];
  const todasLasNotas = new Set([...porNota.keys(), ...notasSinIdentificar]);
  for (const numeroNota of [...todasLasNotas].sort((a, b) => Number(a) - Number(b))) {
    const lineasNota = porNota.get(numeroNota) ?? [];
    const primera = lineasNota[0];
    let consistente = lineasNota.length > 0 && !notasSinIdentificar.has(numeroNota);
    if (primera && lineasNota.some((l) => l.fecha !== primera.fecha || l.claveCliente !== primera.claveCliente)) {
      consistente = false;
      problemas.push({ fila: null, columna: null, nivel: "error", mensaje: `La nota ${numeroNota} tiene líneas con distinta fecha o cliente.`, nota: numeroNota });
      notasConError.add(numeroNota);
    }
    const totalUsd = roundMoney(lineasNota.reduce((suma, l) => suma + l.importeUsd, 0));
    const abonadoUsd = roundMoney(lineasNota.reduce((suma, l) => suma + l.abonadoUsd, 0));
    notas.push({
      numero: numeroNota,
      fecha: primera?.fecha ?? "",
      textoCliente: primera?.textoCliente ?? "",
      claveCliente: primera?.claveCliente ?? "",
      lineas: lineasNota,
      totalUsd,
      abonadoUsd,
      saldoUsd: Math.max(0, roundMoney(totalUsd - abonadoUsd)),
      estadoResultante: abonadoUsd >= totalUsd - 0.005 ? "pagado" : "por_cobrar",
      identificable: consistente,
      tieneError: notasConError.has(numeroNota),
    });
  }

  return { hoja: tabla.hoja, filaEncabezados: tabla.filaEncabezados, notas, problemas, totalLineas: totalFilas };
}

// --- Conciliación de productos y clientes ---------------------------------------------------

const PALABRAS_VACIAS = new Set(["DE", "DEL", "Y", "A", "AL", "LA", "LAS", "LOS", "CON", "EN"]);

function palabras(valor: string) {
  return normalizarTexto(valor).split(" ").filter((palabra) => palabra && !PALABRAS_VACIAS.has(palabra));
}

export type ProductoCatalogo = { id: number; nombre: string };

function palabrasDeLinea(datos: { producto: string; sabor?: string | null }) {
  return palabras(`${datos.producto} ${datos.sabor ?? ""}`);
}

export function coincidenciaExactaProducto(datos: { producto: string; sabor?: string | null }, catalogo: ProductoCatalogo[]): number | null {
  const buscado = new Set(palabrasDeLinea(datos));
  if (buscado.size === 0) return null;
  const coincidentes = catalogo.filter((p) => {
    const conjunto = new Set(palabras(p.nombre));
    return conjunto.size === buscado.size && [...buscado].every((palabra) => conjunto.has(palabra));
  });
  return coincidentes.length === 1 ? coincidentes[0].id : null;
}

function puntaje(buscado: string[], nombre: string) {
  const candidatas = palabras(nombre);
  let total = 0;
  for (const palabra of buscado) {
    if (candidatas.includes(palabra)) total += 2;
    else if (candidatas.some((c) => Math.min(c.length, palabra.length) >= 5 && c.slice(0, 5) === palabra.slice(0, 5))) total += 1;
  }
  return total;
}

export function sugerirProducto(datos: { producto: string; sabor?: string | null }, catalogo: ProductoCatalogo[]): number | null {
  const buscado = palabrasDeLinea(datos);
  const puntajes = catalogo.map((p) => ({ id: p.id, puntos: puntaje(buscado, p.nombre) })).sort((a, b) => b.puntos - a.puntos);
  if (puntajes.length === 0 || puntajes[0].puntos <= 0) return null;
  if (puntajes.length > 1 && puntajes[1].puntos === puntajes[0].puntos) return null;
  return puntajes[0].id;
}

export type ClaveProductoCarga = { clave: string; grupo: string | null; producto: string; sabor: string | null; gramos: number | null; lineas: number };

export type ResolucionProducto =
  | { tipo: "equivalencia" | "exacta"; productoId: number; nombre: string }
  | { tipo: "sugerida"; productoId: number; nombre: string }
  | { tipo: "pendiente" };

export function clavesDeProductos(notas: NotaCarga[]): ClaveProductoCarga[] {
  const claves = new Map<string, ClaveProductoCarga>();
  for (const nota of notas) {
    for (const linea of nota.lineas) {
      const actual = claves.get(linea.claveProducto);
      if (actual) actual.lineas += 1;
      else claves.set(linea.claveProducto, { clave: linea.claveProducto, grupo: linea.grupo, producto: linea.producto, sabor: linea.sabor, gramos: linea.gramos, lineas: 1 });
    }
  }
  return [...claves.values()];
}

export function resolverProductos(claves: ClaveProductoCarga[], catalogo: ProductoCatalogo[], equivalencias: Map<string, number>) {
  const porId = new Map(catalogo.map((p) => [p.id, p.nombre]));
  return claves.map((clave) => {
    const guardado = equivalencias.get(clave.clave);
    let resolucion: ResolucionProducto;
    if (guardado !== undefined && porId.has(guardado)) {
      resolucion = { tipo: "equivalencia", productoId: guardado, nombre: porId.get(guardado)! };
    } else {
      const exacto = coincidenciaExactaProducto(clave, catalogo);
      const sugerido = exacto === null ? sugerirProducto(clave, catalogo) : null;
      if (exacto !== null) resolucion = { tipo: "exacta", productoId: exacto, nombre: porId.get(exacto)! };
      else if (sugerido !== null) resolucion = { tipo: "sugerida", productoId: sugerido, nombre: porId.get(sugerido)! };
      else resolucion = { tipo: "pendiente" };
    }
    return { ...clave, resolucion };
  });
}

export type ClienteExistente = { id: number; nombre: string; apellido: string; nombreBusqueda: string };
export type ClaveClienteCarga = { clave: string; texto: string; tipoPropuesto: "mayorista" | "detal" };

export type ResolucionCliente =
  | { tipo: "equivalencia" | "exacta"; clienteId: number; nombre: string }
  | { tipo: "pendiente"; coincidencias: Array<{ clienteId: number; nombre: string }> };

export function clavesDeClientes(notas: NotaCarga[]): ClaveClienteCarga[] {
  const claves = new Map<string, ClaveClienteCarga>();
  for (const nota of notas) {
    const mayorista = nota.lineas.some((l) => l.tipoPrecio === "mayor");
    const actual = claves.get(nota.claveCliente);
    if (actual) {
      if (mayorista) actual.tipoPropuesto = "mayorista";
    } else if (nota.claveCliente) {
      claves.set(nota.claveCliente, { clave: nota.claveCliente, texto: nota.textoCliente, tipoPropuesto: mayorista ? "mayorista" : "detal" });
    }
  }
  return [...claves.values()];
}

export function resolverClientes(claves: ClaveClienteCarga[], clientes: ClienteExistente[], equivalencias: Map<string, number>) {
  const nombreCompleto = (c: ClienteExistente) => `${c.nombre} ${c.apellido}`.trim();
  const porId = new Map(clientes.map((c) => [c.id, c]));
  return claves.map((clave) => {
    const guardado = equivalencias.get(clave.clave);
    let resolucion: ResolucionCliente;
    if (guardado !== undefined && porId.has(guardado)) {
      resolucion = { tipo: "equivalencia", clienteId: guardado, nombre: nombreCompleto(porId.get(guardado)!) };
    } else {
      const coincidentes = clientes.filter((c) => c.nombreBusqueda === clave.clave);
      resolucion = coincidentes.length === 1
        ? { tipo: "exacta", clienteId: coincidentes[0].id, nombre: nombreCompleto(coincidentes[0]) }
        : { tipo: "pendiente", coincidencias: coincidentes.map((c) => ({ clienteId: c.id, nombre: nombreCompleto(c) })) };
    }
    return { ...clave, resolucion };
  });
}

// --- Situación de cada nota -----------------------------------------------------------------

export type PedidoExistente = {
  id: number;
  numeroOrden: string;
  clienteId: number;
  clienteNombre: string;
  clienteClave: string;
  /** Día de la venta en Caracas (AAAA-MM-DD). */
  dia: string;
  /** Importe de productos: `montoSubtotal`, o `montoTotal` si el subtotal es 0. */
  importeUsd: number;
  totalUsd: number;
};

export type SituacionNota = "nueva" | "ya_registrada" | "conflicto" | "con_error";
export type NotaEvaluada = NotaCarga & { situacion: SituacionNota; pedidoExistente: PedidoExistente | null };

export function situacionNota(nota: NotaCarga, existente: PedidoExistente | null, clienteIdResuelto: number | null): SituacionNota {
  if (!nota.identificable) return "con_error";
  if (existente) {
    const mismoCliente = (clienteIdResuelto !== null && existente.clienteId === clienteIdResuelto) || existente.clienteClave === nota.claveCliente;
    const mismoDia = existente.dia === nota.fecha;
    const mismoImporte = Math.abs(Math.round(existente.importeUsd * 100) - Math.round(nota.totalUsd * 100)) <= 1;
    return mismoCliente && mismoDia && mismoImporte ? "ya_registrada" : "conflicto";
  }
  return nota.tieneError ? "con_error" : "nueva";
}

function fechaLegible(iso: string) {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function evaluarCarga(carga: CargaConstruida, existentes: Map<string, PedidoExistente>, clienteIdPorClave: Map<string, number | null>) {
  const problemas = [...carga.problemas];
  const notas: NotaEvaluada[] = carga.notas.map((nota) => {
    const pedidoExistente = existentes.get(nota.numero) ?? null;
    const situacion = situacionNota(nota, pedidoExistente, clienteIdPorClave.get(nota.claveCliente) ?? null);
    if (situacion === "conflicto" && pedidoExistente) {
      problemas.push({
        fila: null,
        columna: null,
        nivel: "error",
        mensaje: `El número ${nota.numero} ya pertenece al pedido de ${pedidoExistente.clienteNombre} del ${fechaLegible(pedidoExistente.dia)} por USD ${dinero(pedidoExistente.totalUsd)}.`,
        nota: nota.numero,
      });
    }
    return { ...nota, situacion, pedidoExistente };
  });
  const registradas = new Set(notas.filter((n) => n.situacion === "ya_registrada").map((n) => n.numero));
  const bloqueantes = problemas.filter((p) => p.nivel === "error" && (p.nota === null || !registradas.has(p.nota)));
  const puedeConfirmar = bloqueantes.length === 0 && !notas.some((n) => n.situacion === "con_error" || n.situacion === "conflicto");
  return { notas, problemas, puedeConfirmar };
}
