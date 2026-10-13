import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

type NoteForPdf = {
  numeroNota: string;
  fechaEntrega: Date;
  direccionEntrega: string | null;
  personaRecibe: string | null;
  observaciones: string | null;
  cliente: { nombre: string; apellido: string; celular: string; email: string | null };
  detalles: { productoNombre: string; cantidad: number; precioUnitarioUsd: number | null; subtotalUsd: number | null }[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const margin = 42;
const colors = { charcoal: rgb(0.08, 0.1, 0.12), gold: rgb(0.78, 0.58, 0.18), ink: rgb(0.14, 0.16, 0.18), muted: rgb(0.39, 0.42, 0.45), pale: rgb(0.96, 0.95, 0.91) };

function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size: number, color = colors.ink) {
  page.drawText(value, { x, y, size, font, color });
}

function clipped(value: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let result = value;
  while (result.length > 4 && font.widthOfTextAtSize(`${result}…`, size) > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
}

export async function buildDeliveryNotePdf(note: NoteForPdf) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - margin;

  function header() {
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 112, width: PAGE_WIDTH, height: 112, color: colors.charcoal });
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 118, width: PAGE_WIDTH, height: 6, color: colors.gold });
    text(page, "VENUTI'S", margin, PAGE_HEIGHT - 52, serif, 25, rgb(1, 1, 1));
    text(page, "GOURMET", margin + 2, PAGE_HEIGHT - 72, bold, 9, colors.gold);
    text(page, "NOTA DE ENTREGA", PAGE_WIDTH - margin - 190, PAGE_HEIGHT - 56, bold, 17, rgb(1, 1, 1));
    text(page, "Documento de despacho · No fiscal", PAGE_WIDTH - margin - 190, PAGE_HEIGHT - 76, regular, 8, rgb(0.78, 0.8, 0.82));
    y = PAGE_HEIGHT - 150;
  }

  function newPage() { page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); header(); }
  header();
  text(page, `Nota: ${note.numeroNota}`, margin, y, bold, 11);
  text(page, `Fecha: ${note.fechaEntrega.toLocaleDateString("es-VE")}`, PAGE_WIDTH - margin - 130, y, regular, 10, colors.muted);
  y -= 30;
  page.drawRectangle({ x: margin, y: y - 72, width: PAGE_WIDTH - margin * 2, height: 72, color: colors.pale });
  text(page, "CLIENTE MAYORISTA", margin + 14, y - 20, bold, 8, colors.gold);
  text(page, `${note.cliente.nombre} ${note.cliente.apellido}`, margin + 14, y - 38, bold, 12);
  text(page, `${note.cliente.celular}${note.cliente.email ? ` · ${note.cliente.email}` : ""}`, margin + 14, y - 55, regular, 9, colors.muted);
  text(page, `Entrega: ${note.direccionEntrega || "No especificada"}`, PAGE_WIDTH / 2 + 10, y - 38, regular, 9, colors.ink);
  text(page, `Recibe: ${note.personaRecibe || "No especificado"}`, PAGE_WIDTH / 2 + 10, y - 55, regular, 9, colors.ink);
  y -= 100;
  const columns = { product: margin, quantity: 355, price: 420, total: 500 };
  function tableHeader() {
    page.drawRectangle({ x: margin, y: y - 24, width: PAGE_WIDTH - margin * 2, height: 24, color: colors.charcoal });
    text(page, "PRODUCTO", columns.product + 8, y - 16, bold, 8, rgb(1, 1, 1));
    text(page, "CANT.", columns.quantity, y - 16, bold, 8, rgb(1, 1, 1));
    text(page, "PRECIO", columns.price, y - 16, bold, 8, rgb(1, 1, 1));
    text(page, "IMPORTE", columns.total, y - 16, bold, 8, rgb(1, 1, 1));
    y -= 40;
  }
  tableHeader();
  let total = 0;
  let hasTotals = true;
  for (const [index, line] of note.detalles.entries()) {
    if (y < 112) { newPage(); y -= 18; tableHeader(); }
    if (index % 2 === 0) page.drawRectangle({ x: margin, y: y - 13, width: PAGE_WIDTH - margin * 2, height: 24, color: rgb(0.98, 0.98, 0.98) });
    text(page, clipped(line.productoNombre, regular, 9, 285), columns.product + 8, y - 6, regular, 9);
    text(page, String(line.cantidad), columns.quantity, y - 6, regular, 9);
    text(page, line.precioUnitarioUsd == null ? "—" : `$${line.precioUnitarioUsd.toFixed(2)}`, columns.price, y - 6, regular, 9);
    text(page, line.subtotalUsd == null ? "—" : `$${line.subtotalUsd.toFixed(2)}`, columns.total, y - 6, regular, 9);
    if (line.subtotalUsd == null) hasTotals = false; else total += line.subtotalUsd;
    y -= 24;
  }
  y -= 10;
  page.drawLine({ start: { x: PAGE_WIDTH - 190, y }, end: { x: PAGE_WIDTH - margin, y }, thickness: 1, color: colors.gold });
  text(page, "TOTAL", PAGE_WIDTH - 190, y - 20, bold, 11);
  text(page, hasTotals ? `$${total.toFixed(2)}` : "No disponible", PAGE_WIDTH - margin - 80, y - 20, bold, 12, colors.gold);
  y -= 60;
  if (note.observaciones) { text(page, "OBSERVACIONES", margin, y, bold, 8, colors.gold); y -= 17; text(page, clipped(note.observaciones, regular, 9, PAGE_WIDTH - margin * 2), margin, y, regular, 9); y -= 28; }
  page.drawRectangle({ x: margin, y: 45, width: PAGE_WIDTH - margin * 2, height: 42, borderColor: colors.muted, borderWidth: 0.7 });
  text(page, "RECIBIDO POR", margin + 10, 72, bold, 8, colors.muted);
  text(page, note.personaRecibe || "", margin + 10, 55, regular, 9);
  text(page, "Firma y conformidad", PAGE_WIDTH - margin - 105, 55, regular, 8, colors.muted);
  return pdf.save();
}
