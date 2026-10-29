import { formatQuantity } from "../inventory.ts";
import { getPaymentMethodLabel } from "./status.ts";

type SalesExportPayment = {
  metodoPago: string;
  referencia: string | null;
};

export type SalesExportRecord = {
  numeroOrden: string;
  fechaCompra: Date;
  cliente: string;
  productos: Array<{ nombre: string; cantidad: number }>;
  pagos: SalesExportPayment[];
  subtotalUsd: number;
  descuentoUsd: number;
  totalUsd: number;
  tasaCambio: number | null;
  montoBsPagado: number;
  estado: string;
};

type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();

function formatProducts(products: SalesExportRecord["productos"]) {
  if (products.length === 0) return "Sin productos";
  return products.map((product) => `${product.nombre} × ${formatQuantity(product.cantidad)}`).join("\n");
}

function formatPaymentTypes(payments: SalesExportRecord["pagos"]) {
  if (payments.length === 0) return "Sin pago";
  return payments.map((payment) => getPaymentMethodLabel(payment.metodoPago)).join("\n");
}

function formatPaymentReferences(payments: SalesExportRecord["pagos"]) {
  if (payments.length === 0) return "Sin referencia";
  return payments.map((payment) => payment.referencia || "Sin referencia").join("\n");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function textCell(value: string, style?: number) {
  const styleAttribute = style === undefined ? "" : ` s="${style}"`;
  return `<c${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numberCell(value: number | null, style = 2) {
  if (value === null || !Number.isFinite(value)) return "<c/>";
  return `<c s="${style}"><v>${value}</v></c>`;
}

function row(cells: string[], rowNumber: number) {
  return `<row r="${rowNumber}">${cells.join("")}</row>`;
}

function worksheetXml(records: SalesExportRecord[]) {
  const headers = [
    "Orden",
    "Fecha",
    "Cliente",
    "Productos y cantidades",
    "Tasa del día",
    "Bs pagados",
    "Tipo de pago",
    "Referencia",
    "Subtotal",
    "Descuento",
    "Total",
    "Estado",
  ];
  const rows = [row(headers.map((header) => textCell(header, 1)), 1)];

  records.forEach((record, index) => {
    rows.push(row([
      textCell(record.numeroOrden),
      textCell(record.fechaCompra.toLocaleDateString("es-VE")),
      textCell(record.cliente),
      textCell(formatProducts(record.productos)),
      numberCell(record.tasaCambio),
      numberCell(record.montoBsPagado),
      textCell(formatPaymentTypes(record.pagos)),
      textCell(formatPaymentReferences(record.pagos)),
      numberCell(record.subtotalUsd),
      numberCell(record.descuentoUsd),
      numberCell(record.totalUsd),
      textCell(record.estado),
    ], index + 2));
  });

  const widths = [16, 14, 28, 42, 15, 15, 24, 24, 15, 15, 15, 15];
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${columns}</cols><sheetData>${rows.join("")}</sheetData><autoFilter ref="A1:L${Math.max(1, records.length + 1)}"/></worksheet>`;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function writeUInt16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function joinBytes(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function zip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const localHeader = joinBytes([
      writeUInt32(0x04034b50), writeUInt16(20), writeUInt16(0), writeUInt16(0), writeUInt16(0), writeUInt16(0),
      writeUInt32(checksum), writeUInt32(entry.data.length), writeUInt32(entry.data.length), writeUInt16(name.length), writeUInt16(0), name,
    ]);
    localParts.push(localHeader, entry.data);

    const centralHeader = joinBytes([
      writeUInt32(0x02014b50), writeUInt16(20), writeUInt16(20), writeUInt16(0), writeUInt16(0), writeUInt16(0), writeUInt16(0),
      writeUInt32(checksum), writeUInt32(entry.data.length), writeUInt32(entry.data.length), writeUInt16(name.length), writeUInt16(0), writeUInt16(0),
      writeUInt16(0), writeUInt16(0), writeUInt32(0), writeUInt32(offset), name,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  }

  const localData = joinBytes(localParts);
  const centralData = joinBytes(centralParts);
  const end = joinBytes([
    writeUInt32(0x06054b50), writeUInt16(0), writeUInt16(0), writeUInt16(entries.length), writeUInt16(entries.length),
    writeUInt32(centralData.length), writeUInt32(localData.length), writeUInt16(0),
  ]);
  return joinBytes([localData, centralData, end]);
}

function buildWorkbook(sheetName: string, worksheet: string) {
  const files: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    },
    {
      name: "_rels/.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    },
    {
      name: "xl/workbook.xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Ventas y pedidos" sheetId="1" r:id="rId1"/></sheets></workbook>'.replace("Ventas y pedidos", sheetName)),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    },
    {
      name: "xl/styles.xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FF000000"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: encoder.encode(worksheet),
    },
  ];
  return zip(files);
}

export function buildSalesWorkbook(records: SalesExportRecord[]) {
  return buildWorkbook("Ventas y pedidos", worksheetXml(records));
}

// --- Control de ventas con el formato del Excel de la dueña -------------------------------

export type SalesControlLine = {
  /** Día de la venta en Caracas (AAAA-MM-DD). */
  fecha: string;
  nota: string;
  cliente: string;
  grupo: string;
  producto: string;
  sabor: string;
  gramos: number | null;
  cantidad: number;
  tipoPrecio: "detal" | "mayor" | "promo" | null;
  precioUnitario: number;
  venta: number;
  abono: number;
  deuda: number;
};

const CONTROL_HEADERS = ["FECHA", "NOTA DE ENTREGA", "ORDEN\nCODIGO", "CLIENTE", "GRUPO", "PRODUCTO", "SABOR", "CANT\nX PAQ.", "TIPO", "GR", "PVP\nUND", "VENTA", "PAGADO", "ABONO", "DEUDA", "X\nCOBRAR"];
const COLUMNS = "BCDEFGHIJKLMNOPQ";

function cellText(ref: string, value: string, style?: number) {
  return `<c r="${ref}"${style === undefined ? "" : ` s="${style}"`} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function cellNumber(ref: string, value: number, style = 0) {
  return `<c r="${ref}"${style ? ` s="${style}"` : ""}><v>${value}</v></c>`;
}

function excelSerial(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

const cents = (value: number) => Math.round(value * 100) / 100;

/**
 * Reparte el saldo de un pedido como DEUDA entre sus líneas, empezando por la última.
 * ABONO es VENTA menos DEUDA. Un pedido pagado no tiene deuda.
 */
export function repartirDeudaPorLineas(ventas: number[], estado: string, saldoUsd: number) {
  let restante = estado === "pagado" ? 0 : Math.min(Math.max(saldoUsd, 0), cents(ventas.reduce((suma, venta) => suma + venta, 0)));
  const deuda = ventas.map(() => 0);
  for (let i = ventas.length - 1; i >= 0 && restante > 0; i -= 1) {
    deuda[i] = cents(Math.min(ventas[i], restante));
    restante = cents(restante - deuda[i]);
  }
  return { deuda, abono: ventas.map((venta, i) => cents(venta - deuda[i])) };
}

export function buildSalesControlWorkbook(lines: SalesControlLine[]) {
  const rows = [
    `<row r="1">${cellText("B1", "CONTROL DE VENTAS", 1)}</row>`,
    `<row r="2">${CONTROL_HEADERS.map((header, i) => cellText(`${COLUMNS[i]}2`, header, 1)).join("")}</row>`,
  ];
  lines.forEach((line, index) => {
    const r = index + 3;
    const cells = [
      cellNumber(`B${r}`, excelSerial(line.fecha), 3),
      /^\d+$/.test(line.nota) ? cellNumber(`C${r}`, Number(line.nota)) : cellText(`C${r}`, line.nota),
      cellText(`E${r}`, line.cliente),
      cellText(`F${r}`, line.grupo),
      cellText(`G${r}`, line.producto),
      line.sabor ? cellText(`H${r}`, line.sabor) : "",
      cellNumber(`I${r}`, line.cantidad),
      line.tipoPrecio ? cellText(`J${r}`, line.tipoPrecio.toUpperCase()) : "",
      line.gramos ? cellNumber(`K${r}`, line.gramos) : "",
      cellNumber(`L${r}`, line.precioUnitario, 2),
      cellNumber(`M${r}`, line.venta, 2),
      cellText(`N${r}`, line.deuda === 0 ? "SI" : "NO"),
      cellNumber(`O${r}`, line.abono, 2),
      cellNumber(`P${r}`, line.deuda, 2),
      cellText(`Q${r}`, line.deuda > 0 ? "x" : "-"),
    ];
    rows.push(`<row r="${r}">${cells.join("")}</row>`);
  });
  const widths = [14, 16, 12, 28, 10, 18, 16, 10, 10, 8, 10, 10, 10, 10, 10, 10];
  const columns = widths.map((width, i) => `<col min="${i + 2}" max="${i + 2}" width="${width}" customWidth="1"/>`).join("");
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${columns}</cols><sheetData>${rows.join("")}</sheetData></worksheet>`;
  return buildWorkbook("VENTAS", worksheet);
}
