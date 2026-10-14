type SalesExportPayment = {
  metodoPago: string;
  montoUsd: number | null;
  referencia: string | null;
};

export type SalesExportRecord = {
  numeroOrden: string;
  fechaCompra: Date;
  cliente: string;
  tipoCliente: string;
  celular: string;
  email: string | null;
  subtotalUsd: number;
  descuentoUsd: number;
  totalUsd: number;
  tasaCambio: number | null;
  totalBs: number | null;
  estado: string;
  tipoRetiro: string;
  detalles: Array<{ producto: string; cantidad: number }>;
  pago: SalesExportPayment | null;
};

type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();

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
    "Tipo de cliente",
    "Celular",
    "Correo",
    "Subtotal USD",
    "Descuento USD",
    "Total USD",
    "Tasa de cambio",
    "Total Bs",
    "Estado",
    "Tipo de retiro",
    "Productos",
    "Cantidades",
    "Último pago",
    "Monto último pago USD",
    "Referencia último pago",
  ];
  const rows = [row(headers.map((header) => textCell(header, 1)), 1)];

  records.forEach((record, index) => {
    const products = record.detalles.map((detail) => detail.producto).join("; ");
    const quantities = record.detalles.map((detail) => String(detail.cantidad)).join("; ");
    rows.push(row([
      textCell(record.numeroOrden),
      textCell(record.fechaCompra.toLocaleString("es-VE")),
      textCell(record.cliente),
      textCell(record.tipoCliente),
      textCell(record.celular),
      textCell(record.email ?? ""),
      numberCell(record.subtotalUsd),
      numberCell(record.descuentoUsd),
      numberCell(record.totalUsd),
      numberCell(record.tasaCambio),
      numberCell(record.totalBs),
      textCell(record.estado),
      textCell(record.tipoRetiro),
      textCell(products),
      textCell(quantities),
      textCell(record.pago?.metodoPago ?? ""),
      numberCell(record.pago?.montoUsd ?? null),
      textCell(record.pago?.referencia ?? ""),
    ], index + 2));
  });

  const widths = [16, 20, 28, 16, 16, 30, 15, 15, 15, 15, 15, 15, 16, 42, 12, 18, 20, 24];
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${columns}</cols><sheetData>${rows.join("")}</sheetData><autoFilter ref="A1:R${Math.max(1, records.length + 1)}"/></worksheet>`;
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

export function buildSalesWorkbook(records: SalesExportRecord[]) {
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
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Ventas y pedidos" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    },
    {
      name: "xl/styles.xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FF000000"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: encoder.encode(worksheetXml(records)),
    },
  ];
  return zip(files);
}
