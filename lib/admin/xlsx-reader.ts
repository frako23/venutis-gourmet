import { inflateRawSync } from "node:zlib";

export type CeldaXlsx = string | number | boolean | null;
export type HojaXlsx = { nombre: string; filas: CeldaXlsx[][] };
export type LibroXlsx = { date1904: boolean; hojas: HojaXlsx[] };
export type LimitesXlsx = { maxEntradas: number; maxDescomprimido: number };

const LIMITES: LimitesXlsx = { maxEntradas: 2000, maxDescomprimido: 50 * 1024 * 1024 };
const MAX_FILAS = 200_000;
const MAX_COLUMNAS = 200;

export class ArchivoExcelError extends Error {}

const ERR_INVALIDO = "El archivo no es un Excel (.xlsx) válido.";
const ERR_CONTRASENA = "El archivo está protegido con contraseña o es un Excel antiguo (.xls). Guárdalo como .xlsx sin contraseña.";
const ERR_PROTEGIDO = "El archivo está protegido o no es un Excel válido.";
const ERR_GRANDE = "El archivo es demasiado grande o está dañado.";

type EntradaZip = { metodo: number; datos: Uint8Array };

function leerZip(bytes: Uint8Array, limites: LimitesXlsx) {
  if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new ArchivoExcelError(ERR_CONTRASENA);
  }
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new ArchivoExcelError(ERR_INVALIDO);

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fin = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65_535); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new ArchivoExcelError(ERR_INVALIDO);

  const total = view.getUint16(fin + 10, true);
  const offsetCentral = view.getUint32(fin + 16, true);
  if (total === 0xffff || offsetCentral === 0xffffffff) throw new ArchivoExcelError(ERR_INVALIDO);
  if (total > limites.maxEntradas) throw new ArchivoExcelError(ERR_GRANDE);

  const entradas = new Map<string, EntradaZip>();
  const decoder = new TextDecoder();
  let cursor = offsetCentral;
  let declarado = 0;
  for (let i = 0; i < total; i += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) throw new ArchivoExcelError(ERR_INVALIDO);
    const flags = view.getUint16(cursor + 8, true);
    const metodo = view.getUint16(cursor + 10, true);
    const comprimido = view.getUint32(cursor + 20, true);
    const tamano = view.getUint32(cursor + 24, true);
    const largoNombre = view.getUint16(cursor + 28, true);
    const largoExtra = view.getUint16(cursor + 30, true);
    const largoComentario = view.getUint16(cursor + 32, true);
    const offsetLocal = view.getUint32(cursor + 42, true);
    const nombre = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + largoNombre));
    cursor += 46 + largoNombre + largoExtra + largoComentario;

    if ((flags & 1) === 1 || (metodo !== 0 && metodo !== 8)) throw new ArchivoExcelError(ERR_PROTEGIDO);
    declarado += tamano;
    if (declarado > limites.maxDescomprimido) throw new ArchivoExcelError(ERR_GRANDE);
    if (offsetLocal + 30 > bytes.length || view.getUint32(offsetLocal, true) !== 0x04034b50) throw new ArchivoExcelError(ERR_INVALIDO);
    const inicio = offsetLocal + 30 + view.getUint16(offsetLocal + 26, true) + view.getUint16(offsetLocal + 28, true);
    if (inicio + comprimido > bytes.length) throw new ArchivoExcelError(ERR_INVALIDO);
    entradas.set(nombre, { metodo, datos: bytes.subarray(inicio, inicio + comprimido) });
  }

  let descomprimido = 0;
  return (nombre: string): string | null => {
    const entrada = entradas.get(nombre);
    if (!entrada) return null;
    let datos: Uint8Array = entrada.datos;
    if (entrada.metodo === 8) {
      try {
        datos = inflateRawSync(entrada.datos, { maxOutputLength: Math.max(1, limites.maxDescomprimido - descomprimido) });
      } catch (error) {
        throw new ArchivoExcelError(error instanceof RangeError ? ERR_GRANDE : ERR_INVALIDO);
      }
    }
    descomprimido += datos.length;
    if (descomprimido > limites.maxDescomprimido) throw new ArchivoExcelError(ERR_GRANDE);
    return decoder.decode(datos);
  };
}

function decodificar(texto: string) {
  return texto
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function atributo(etiqueta: string, nombre: string) {
  const coincidencia = new RegExp(`(?:^|\\s)${nombre}="([^"]*)"`).exec(etiqueta);
  return coincidencia ? decodificar(coincidencia[1]) : undefined;
}

function textosDe(xml: string) {
  let resultado = "";
  for (const m of xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) resultado += decodificar(m[1]);
  return resultado;
}

function indiceColumna(referencia: string) {
  let indice = 0;
  for (const letra of /^[A-Z]+/.exec(referencia)?.[0] ?? "") indice = indice * 26 + (letra.charCodeAt(0) - 64);
  return indice - 1;
}

function rutaHoja(destino: string) {
  return destino.startsWith("/") ? destino.slice(1) : `xl/${destino}`;
}

function leerHoja(xml: string, compartidos: string[]) {
  const filas: CeldaXlsx[][] = [];
  for (const fila of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    for (const celda of (fila[1] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const referencia = atributo(celda[1], "r");
      if (!referencia) continue;
      const numeroFila = Number(/\d+$/.exec(referencia)?.[0]);
      const columna = indiceColumna(referencia);
      if (!numeroFila || numeroFila > MAX_FILAS || columna < 0 || columna >= MAX_COLUMNAS) continue;

      const tipo = atributo(celda[1], "t");
      const cuerpo = celda[2] ?? "";
      const valor = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
      let contenido: CeldaXlsx = null;
      if (tipo === "inlineStr") contenido = textosDe(cuerpo);
      else if (valor !== undefined) {
        if (tipo === "s") contenido = compartidos[Number(valor)] ?? null;
        else if (tipo === "str") contenido = decodificar(valor);
        else if (tipo === "b") contenido = valor.trim() === "1";
        else if (tipo === "e") contenido = null;
        else contenido = valor.trim() === "" || Number.isNaN(Number(valor)) ? null : Number(valor);
      }
      (filas[numeroFila - 1] ??= [])[columna] = contenido;
    }
  }
  for (let i = 0; i < filas.length; i += 1) {
    const fila = (filas[i] ??= []);
    for (let j = 0; j < fila.length; j += 1) fila[j] ??= null;
  }
  return filas;
}

/** Lee un .xlsx (valores guardados, sin estilos) sin dependencias externas. */
export function leerLibroXlsx(bytes: Uint8Array, limites: LimitesXlsx = LIMITES): LibroXlsx {
  const leer = leerZip(bytes, limites);
  const libroXml = leer("xl/workbook.xml");
  if (!libroXml) throw new ArchivoExcelError(ERR_INVALIDO);

  const relaciones = new Map<string, string>();
  for (const m of (leer("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = atributo(m[0], "Id");
    const destino = atributo(m[0], "Target");
    if (id && destino) relaciones.set(id, rutaHoja(destino));
  }

  const compartidos = [...(leer("xl/sharedStrings.xml") ?? "").matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)].map((m) => textosDe(m[1] ?? ""));
  const date1904 = /<workbookPr\b[^>]*\bdate1904="(?:1|true)"/.test(libroXml);

  const hojas: HojaXlsx[] = [];
  for (const m of libroXml.matchAll(/<sheet\b[^>]*>/g)) {
    const nombre = atributo(m[0], "name");
    const ruta = relaciones.get(atributo(m[0], "r:id") ?? "");
    const xml = ruta ? leer(ruta) : null;
    if (nombre && xml !== null) hojas.push({ nombre, filas: leerHoja(xml, compartidos) });
  }
  if (hojas.length === 0) throw new ArchivoExcelError(ERR_INVALIDO);
  return { date1904, hojas };
}
