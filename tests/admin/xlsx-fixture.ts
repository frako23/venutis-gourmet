import { deflateRawSync } from "node:zlib";

/**
 * Libro .xlsx sintético con la estructura del "Control de ventas" real y nombres ficticios.
 *
 * Totales esperados (hoja VENTAS, notas 5001 a 5003, 5 líneas):
 * - 5001: 114,50 (4 × 8 + 16,5 × 5), pagada.
 * - 5002: 31,00 (2 × 10,5 + 1 × 10), pagada.
 * - 5003: 21,00 (3 × 7, PROMO), PAGADO "NO": por cobrar con saldo 21,00.
 * - Total 166,50 y por cobrar 21,00.
 *
 * Fechas: 5001 = 2026-08-01 (serial 46235), 5002 = 2026-08-02, 5003 = 2026-08-03.
 */
export type Valor = string | number | null;

export const ENCABEZADOS = ["FECHA", "NOTA DE ENTREGA", "ORDEN\nCODIGO", "CLIENTE", "GRUPO", "PRODUCTO", "SABOR", "CANT\nX PAQ.", "TIPO", "GR", "PVP\nUND", "VENTA", "PAGADO", "ABONO", "DEUDA", "X\nCOBRAR"];

// Columnas B..Q: fecha, nota, orden, cliente, grupo, producto, sabor, cantidad, tipo, gr, pvp, pagado, abono
type Linea = [number, number, null, string, string, string, string, number, string, number, number, string, number];

export const LINEAS: Linea[] = [
  [46235, 5001, null, "CLIENTE UNO ", "PASTA", "RAVIOLI ", "ESPINACA", 4, "MAYOR", 500, 8, "SI", 32],
  [46235, 5001, null, "CLIENTE UNO ", "PASTA", "GNOCCHI", "PAPAS", 16.5, "MAYOR", 500, 5, "SI", 82.5],
  [46236, 5002, null, "RICH", "PASTA", "RAVIOLI", "CHAMPIÑON", 2, "DETAL", 500, 10.5, "SI", 21],
  [46236, 5002, null, "RICH", "PASTA", "RAVIOLI", "CHAMPIÑON", 1, "DETAL", 500, 10, "SI", 10],
  [46237, 5003, null, "CLIENTE UNO", "PASTA", "PASTICHO", "CARNE", 3, "PROMO", 450, 7, "NO", 0],
];

function escapar(valor: string) {
  return valor.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "&#10;");
}

function columna(indice: number) {
  let resultado = "";
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) resultado = String.fromCharCode(65 + ((n - 1) % 26)) + resultado;
  return resultado;
}

type Zip = { nombre: string; datos: Uint8Array; metodo: 0 | 8 };

function crc32(datos: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of datos) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function empaquetarZip(entradas: Zip[], opciones: { bitCifrado?: boolean; metodoForzado?: number } = {}) {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let offset = 0;
  for (const entrada of entradas) {
    const nombre = Buffer.from(entrada.nombre);
    const comprimido = entrada.metodo === 8 ? deflateRawSync(entrada.datos) : Buffer.from(entrada.datos);
    const metodo = opciones.metodoForzado ?? entrada.metodo;
    const flags = opciones.bitCifrado ? 1 : 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(metodo, 8);
    local.writeUInt32LE(crc32(entrada.datos), 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(entrada.datos.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    locales.push(local, nombre, comprimido);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(metodo, 10);
    central.writeUInt32LE(crc32(entrada.datos), 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(entrada.datos.length, 24);
    central.writeUInt16LE(nombre.length, 28);
    central.writeUInt32LE(offset, 42);
    centrales.push(central, nombre);
    offset += local.length + nombre.length + comprimido.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locales, directorio, fin]));
}

/** `sobrescribir` reemplaza celdas por referencia (por ejemplo `{ I3: "abc" }`). */
export function crearLibroControlVentas(opciones: { sobrescribir?: Record<string, Valor>; lineas?: Linea[] } = {}) {
  const compartidos: string[] = [];
  const indice = (texto: string) => {
    let i = compartidos.indexOf(texto);
    if (i < 0) i = compartidos.push(texto) - 1;
    return i;
  };
  const sobrescribir = opciones.sobrescribir ?? {};
  const celda = (ref: string, valor: Valor) => {
    const final = ref in sobrescribir ? sobrescribir[ref] : valor;
    if (final === null) return "";
    if (typeof final === "number") return `<c r="${ref}"><v>${final}</v></c>`;
    return `<c r="${ref}" t="s"><v>${indice(final)}</v></c>`;
  };
  const formula = (ref: string, f: string, valor: number | string) =>
    ref in sobrescribir ? celda(ref, null) :
    typeof valor === "number" ? `<c r="${ref}"><f>${f}</f><v>${valor}</v></c>` : `<c r="${ref}" t="str"><f>${f}</f><v>${valor}</v></c>`;

  const filas: string[] = [];
  filas.push(`<row r="1">${celda("B1", "CONTROL DE VENTAS")}</row>`);
  filas.push(`<row r="2">${ENCABEZADOS.map((texto, i) => celda(`${columna(i + 1)}2`, texto)).join("")}</row>`);
  (opciones.lineas ?? LINEAS).forEach((linea, i) => {
    const r = i + 3;
    const [fecha, nota, orden, cliente, grupo, producto, sabor, cantidad, tipo, gr, pvp, pagado, abono] = linea;
    const venta = Math.round(cantidad * pvp * 100) / 100;
    const deuda = Math.round((venta - abono) * 100) / 100;
    let extra = "";
    if (i === 0) extra = `<c r="S${r}" t="b"><v>1</v></c><c r="T${r}" t="inlineStr"><is><t>nota</t></is></c>`;
    const textoCliente = cliente === "RICH" ? "" : cliente;
    const clienteXml = cliente === "RICH" ? `<c r="E${r}" t="s"><v>${indice("\u0000RICH")}</v></c>` : celda(`E${r}`, textoCliente);
    filas.push(
      `<row r="${r}">${celda(`B${r}`, fecha)}${celda(`C${r}`, nota)}${celda(`D${r}`, orden)}${clienteXml}${celda(`F${r}`, grupo)}${celda(`G${r}`, producto)}${celda(`H${r}`, sabor)}${celda(`I${r}`, cantidad)}${celda(`J${r}`, tipo)}${celda(`K${r}`, gr)}${celda(`L${r}`, pvp)}${formula(`M${r}`, `+L${r}*I${r}`, venta)}${celda(`N${r}`, pagado)}${formula(`O${r}`, `+IF(N${r}="si",M${r},0)`, abono)}${formula(`P${r}`, `+M${r}-O${r}`, deuda)}${formula(`Q${r}`, `IF(P${r}=0,"-","x")`, deuda === 0 ? "-" : "x")}${extra}</row>`,
    );
  });
  const ultima = (opciones.lineas ?? LINEAS).length + 3;
  filas.push(`<row r="${ultima}">${formula(`M${ultima}`, `+L${ultima}*I${ultima}`, 0)}${formula(`Q${ultima}`, `IF(P${ultima}=0,"-","x")`, "-")}</row>`);

  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filas.join("")}</sheetData></worksheet>`;
  const hojaVacia = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`;
  const textos = compartidos.map((texto) =>
    texto === "\u0000RICH"
      ? `<si><r><t xml:space="preserve">CLÍNICA </t></r><r><t>DEMO</t></r></si>`
      : `<si><t xml:space="preserve">${escapar(texto)}</t></si>`,
  );
  const encoder = new TextEncoder();
  const bytes = (xml: string) => encoder.encode(xml);
  return empaquetarZip([
    { nombre: "[Content_Types].xml", metodo: 0, datos: bytes('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>') },
    { nombre: "xl/workbook.xml", metodo: 8, datos: bytes('<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><sheets><sheet name="VENTAS" sheetId="1" r:id="rId1"/><sheet name="Hoja1" sheetId="2" r:id="rId2"/></sheets></workbook>') },
    { nombre: "xl/_rels/workbook.xml.rels", metodo: 8, datos: bytes('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x" Target="/xl/worksheets/sheet2.xml"/></Relationships>') },
    { nombre: "xl/sharedStrings.xml", metodo: 8, datos: bytes(`<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${textos.length}" uniqueCount="${textos.length}">${textos.join("")}</sst>`) },
    { nombre: "xl/worksheets/sheet1.xml", metodo: 8, datos: bytes(hoja) },
    { nombre: "xl/worksheets/sheet2.xml", metodo: 8, datos: bytes(hojaVacia) },
  ]);
}
