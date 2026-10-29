import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { DELIVERY_NOTE_LOGO_BASE64 } from "./delivery-note-logo.ts";

type NoteForPdf = {
  numeroNota: string;
  fechaEntrega: Date;
  direccionEntrega: string | null;
  personaRecibe: string | null;
  observaciones: string | null;
  cliente: { nombre: string; apellido: string; celular: string | null; email: string | null };
  detalles: { productoNombre: string; cantidad: number; precioUnitarioUsd: number | null; subtotalUsd: number | null }[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const margin = 42;
const contentWidth = PAGE_WIDTH - margin * 2;
// Fondo blanco con acentos oscuros (marrón espresso) en bloques pequeños: encabezado de tabla y total.
// `gold` se usa únicamente en líneas (no tiene contraste como texto sobre blanco); el texto de acento usa `primary`.
const colors = { ink: rgb(0.14, 0.16, 0.18), primary: rgb(0.29, 0.184, 0.149), dark: rgb(0.2, 0.129, 0.102), gold: rgb(0.831, 0.686, 0.216), muted: rgb(0.34, 0.37, 0.4), hairline: rgb(0.8, 0.79, 0.77), white: rgb(1, 1, 1) };

const BRAND = {
  tagline: "PASTAS Y SALSAS ARTESANALES",
  whatsapp: "0414-1713932",
  telefono: "0424-2507784",
  instagram: "@venutisgourmet",
  email: "venutiss@gmail.com",
  pagoMovil: { banco: "Banco Mercantil", telefono: "0424-2507784", id: "V-12.749.042" },
  transferencia: { banco: "Banco Mercantil", cuenta: "0105-0242-0112-4202-9354", titular: "Antonieta Di Domenico Venuti", id: "V-12.749.042" },
};

function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size: number, color = colors.ink) {
  page.drawText(value, { x, y, size, font, color });
}

function textRight(page: PDFPage, value: string, right: number, y: number, font: PDFFont, size: number, color = colors.ink) {
  page.drawText(value, { x: right - font.widthOfTextAtSize(value, size), y, size, font, color });
}

function rule(page: PDFPage, y: number, color = colors.hairline, thickness = 0.5, x1 = margin, x2 = PAGE_WIDTH - margin) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
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
  const logo = await pdf.embedPng(DELIVERY_NOTE_LOGO_BASE64);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - margin;

  function header() {
    page.drawImage(logo, { x: margin, y: PAGE_HEIGHT - 120, width: 76, height: 77 });
    const infoX = margin + 90;
    text(page, BRAND.tagline, infoX, PAGE_HEIGHT - 62, bold, 8, colors.dark);
    text(page, `WhatsApp ${BRAND.whatsapp}  ·  Tel. ${BRAND.telefono}`, infoX, PAGE_HEIGHT - 78, regular, 8.5, colors.ink);
    text(page, `Instagram ${BRAND.instagram}`, infoX, PAGE_HEIGHT - 91, regular, 8.5, colors.ink);
    text(page, BRAND.email, infoX, PAGE_HEIGHT - 104, regular, 8.5, colors.ink);
    textRight(page, "NOTA DE ENTREGA", PAGE_WIDTH - margin, PAGE_HEIGHT - 62, bold, 17, colors.dark);
    textRight(page, "Documento de despacho · No fiscal", PAGE_WIDTH - margin, PAGE_HEIGHT - 77, regular, 8, colors.muted);
    rule(page, PAGE_HEIGHT - 130, colors.dark, 1.5);
    y = PAGE_HEIGHT - 156;
  }

  // Contacto en el pie de cada página.
  function footer() {
    rule(page, 62, colors.gold, 0.8);
    const line1 = `WhatsApp ${BRAND.whatsapp}  ·  Tel. ${BRAND.telefono}`;
    const line2 = `Instagram ${BRAND.instagram}  ·  ${BRAND.email}`;
    page.drawText(line1, { x: (PAGE_WIDTH - regular.widthOfTextAtSize(line1, 8.5)) / 2, y: 46, size: 8.5, font: regular, color: colors.ink });
    page.drawText(line2, { x: (PAGE_WIDTH - regular.widthOfTextAtSize(line2, 8.5)) / 2, y: 33, size: 8.5, font: regular, color: colors.ink });
  }

  function newPage() { footer(); page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); header(); }
  header();

  // Datos de la nota y del cliente.
  text(page, "NOTA", margin, y, bold, 8, colors.primary);
  text(page, note.numeroNota, margin + 34, y, bold, 11);
  textRight(page, `Fecha de entrega: ${note.fechaEntrega.toLocaleDateString("es-VE")}`, PAGE_WIDTH - margin, y, regular, 10, colors.ink);
  y -= 16;
  page.drawRectangle({ x: margin, y: y - 74, width: contentWidth, height: 74, borderColor: colors.hairline, borderWidth: 0.7 });
  const col2 = PAGE_WIDTH / 2 + 10;
  text(page, "CLIENTE", margin + 14, y - 18, bold, 8, colors.primary);
  text(page, clipped(`${note.cliente.nombre} ${note.cliente.apellido}`, bold, 12, col2 - margin - 28), margin + 14, y - 36, bold, 12);
  text(page, clipped([note.cliente.celular, note.cliente.email].filter(Boolean).join(" · "), regular, 9, col2 - margin - 28), margin + 14, y - 53, regular, 9, colors.muted);
  text(page, "ENTREGA", col2, y - 18, bold, 8, colors.primary);
  text(page, clipped(note.direccionEntrega || "No especificada", regular, 9, PAGE_WIDTH - margin - col2 - 12), col2, y - 36, regular, 9);
  text(page, clipped(`Recibe: ${note.personaRecibe || "No especificado"}`, regular, 9, PAGE_WIDTH - margin - col2 - 12), col2, y - 53, regular, 9);
  y -= 100;

  // Tabla: solo filetes, sin rellenos.
  const columns = { product: margin + 4, quantity: 340, priceRight: 450, totalRight: PAGE_WIDTH - margin - 4 };
  function tableHeader() {
    page.drawRectangle({ x: margin, y: y - 8, width: contentWidth, height: 24, color: colors.dark });
    text(page, "PRODUCTO", columns.product + 4, y, bold, 8, colors.white);
    text(page, "CANT.", columns.quantity, y, bold, 8, colors.white);
    textRight(page, "PRECIO", columns.priceRight, y, bold, 8, colors.white);
    textRight(page, "IMPORTE", columns.totalRight - 4, y, bold, 8, colors.white);
    y -= 28;
  }
  tableHeader();
  let total = 0;
  let hasTotals = true;
  for (const line of note.detalles) {
    if (y < 90) { newPage(); tableHeader(); }
    text(page, clipped(line.productoNombre, regular, 9, 285), columns.product, y, regular, 9);
    text(page, String(line.cantidad), columns.quantity, y, regular, 9);
    textRight(page, line.precioUnitarioUsd == null ? "—" : `$${line.precioUnitarioUsd.toFixed(2)}`, columns.priceRight, y, regular, 9);
    textRight(page, line.subtotalUsd == null ? "—" : `$${line.subtotalUsd.toFixed(2)}`, columns.totalRight, y, regular, 9);
    rule(page, y - 9, colors.hairline);
    if (line.subtotalUsd == null) hasTotals = false; else total += line.subtotalUsd;
    y -= 22;
  }

  // El cierre (total, observaciones, pago y firma) necesita su propio espacio sobre el pie.
  if (y < 295) { newPage(); }
  y -= 6;
  page.drawRectangle({ x: PAGE_WIDTH - 220, y: y - 28, width: 220 - margin, height: 28, color: colors.dark });
  text(page, "TOTAL", PAGE_WIDTH - 208, y - 18, bold, 11, colors.white);
  textRight(page, hasTotals ? `$${total.toFixed(2)}` : "No disponible", PAGE_WIDTH - margin - 10, y - 19, bold, 13, colors.white);
  y -= 56;
  if (note.observaciones) {
    text(page, "OBSERVACIONES", margin, y, bold, 8, colors.primary);
    text(page, clipped(note.observaciones, regular, 9, contentWidth), margin, y - 14, regular, 9);
  }

  // Datos de pago (posición fija sobre la firma y el pie).
  const payTop = 190;
  rule(page, payTop + 14, colors.hairline);
  text(page, "DATOS DE PAGO", margin, payTop, bold, 8, colors.primary);
  const payCol2 = PAGE_WIDTH / 2 + 10;
  text(page, "Pago móvil", margin, payTop - 15, bold, 9);
  text(page, `${BRAND.pagoMovil.banco} · ${BRAND.pagoMovil.telefono}`, margin, payTop - 28, regular, 9);
  text(page, `Cédula ${BRAND.pagoMovil.id}`, margin, payTop - 41, regular, 9);
  text(page, "Transferencia", payCol2, payTop - 15, bold, 9);
  text(page, `${BRAND.transferencia.banco} · Cta. Corriente`, payCol2, payTop - 28, regular, 9);
  text(page, BRAND.transferencia.cuenta, payCol2, payTop - 41, regular, 9);
  text(page, `${BRAND.transferencia.titular} · ${BRAND.transferencia.id}`, payCol2, payTop - 54, regular, 9);

  // Firma de conformidad.
  page.drawRectangle({ x: margin, y: 72, width: contentWidth, height: 42, borderColor: colors.muted, borderWidth: 0.7 });
  text(page, "RECIBIDO POR", margin + 10, 99, bold, 8, colors.muted);
  text(page, note.personaRecibe || "", margin + 10, 82, regular, 9);
  textRight(page, "Firma y conformidad", PAGE_WIDTH - margin - 10, 82, regular, 8, colors.muted);
  footer();
  return pdf.save();
}
