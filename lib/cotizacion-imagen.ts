import {
  buildQuoteWhatsAppText,
  buildWhatsAppUrl,
  canShareQuoteFile,
  fmtBs,
  fmtUsd,
  isQuoteShareCancellation,
  type QuoteDraft,
} from "@/lib/cotizacion-rapida";
import { WHATSAPP_PHONE_NUMBER } from "@/lib/constants/constants";

export type QuoteImageArtifact = {
  blob: Blob;
  file: File;
  objectUrl: string;
  fingerprint: string;
  generatedAt: string;
};

export type QuoteShareResult =
  | "native-share-started"
  | "fallback-download-and-whatsapp"
  | "user-cancelled"
  | "recoverable-error";

const quoteFilename = (date: Date) => {
  const datePart = date.toISOString().slice(0, 10);
  return `cotizacion-venutis-${datePart}.png`;
};

const CANVAS_WIDTH = 720;
const OUTER_PADDING = 20;
const PANEL_PADDING = 32;
const PANEL_WIDTH = CANVAS_WIDTH - OUTER_PADDING * 2;
const CONTENT_WIDTH = PANEL_WIDTH - PANEL_PADDING * 2;
const PIXEL_RATIO = 2;

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function loadQuoteLogo(): Promise<HTMLImageElement | null> {
  try {
    const response = await fetch("/logo-venutis.avif", { cache: "force-cache" });
    if (!response.ok) return null;

    const sourceUrl = URL.createObjectURL(await response.blob());
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = sourceUrl;
      if (image.decode) await image.decode();
      else await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("No se pudo cargar el logo."));
      });
      return image;
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  } catch {
    return null;
  }
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("El navegador no pudo convertir la cotización en PNG."));
    }, "image/png");
  });
}

async function renderQuoteCanvas(draft: QuoteDraft) {
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) throw new Error("El navegador no soporta la generación de imágenes.");

  measureContext.font = "600 16px Arial, sans-serif";
  const rows = draft.lines.map((line) => {
    const nameLines = wrapText(measureContext, line.product.nombre, 390);
    return { line, nameLines, height: Math.max(58, nameLines.length * 22 + 38) };
  });
  const recipientLines = [
    draft.recipient.nombre ? `Para: ${draft.recipient.nombre}` : "",
    draft.recipient.telefono ? `Teléfono: ${draft.recipient.telefono}` : "",
  ].filter(Boolean);

  let contentHeight = 116;
  if (recipientLines.length) contentHeight += recipientLines.length * 22 + 36;
  contentHeight += 64;
  contentHeight += rows.reduce((total, row) => total + row.height + 1, 0);
  contentHeight += 150;
  const canvasHeight = contentHeight + OUTER_PADDING * 2;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH * PIXEL_RATIO;
  canvas.height = canvasHeight * PIXEL_RATIO;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no soporta la generación de imágenes.");
  context.scale(PIXEL_RATIO, PIXEL_RATIO);
  context.textBaseline = "top";

  context.fillStyle = "#14110f";
  context.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);
  roundedRect(context, OUTER_PADDING, OUTER_PADDING, PANEL_WIDTH, contentHeight, 22);
  context.fillStyle = "#1d1814";
  context.fill();
  context.strokeStyle = "rgba(212, 175, 55, 0.45)";
  context.lineWidth = 1;
  context.stroke();

  const left = OUTER_PADDING + PANEL_PADDING;
  const right = left + CONTENT_WIDTH;
  let cursor = OUTER_PADDING + PANEL_PADDING;
  const logo = await loadQuoteLogo();

  if (logo) {
    context.save();
    context.beginPath();
    context.arc(left + 40, cursor + 40, 40, 0, Math.PI * 2);
    context.clip();
    context.drawImage(logo, left, cursor, 80, 80);
    context.restore();
  }
  context.font = "600 12px Arial, sans-serif";
  context.fillStyle = "#d4af37";
  context.fillText("VENUTI'S GOURMET", left + 105, cursor + 6);
  context.font = "700 46px Arial, sans-serif";
  context.fillText("Cotización", left + 105, cursor + 27);
  context.font = "14px Arial, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.65)";
  context.fillText(new Date(draft.issuedAt).toLocaleDateString("es-VE"), left + 105, cursor + 83);
  cursor += 116;

  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.beginPath();
  context.moveTo(left, cursor);
  context.lineTo(right, cursor);
  context.stroke();
  cursor += 24;

  if (recipientLines.length) {
    const recipientHeight = recipientLines.length * 22 + 20;
    roundedRect(context, left, cursor, CONTENT_WIDTH, recipientHeight, 12);
    context.fillStyle = "rgba(255,255,255,0.05)";
    context.fill();
    context.font = "14px Arial, sans-serif";
    context.fillStyle = "rgba(255,255,255,0.8)";
    recipientLines.forEach((line, index) => context.fillText(line, left + 14, cursor + 10 + index * 22));
    cursor += recipientHeight + 24;
  }

  context.font = "700 11px Arial, sans-serif";
  context.fillStyle = "#d4af37";
  context.fillText("DETALLE DE LA COTIZACIÓN", left, cursor);
  cursor += 28;

  for (const row of rows) {
    const { line, nameLines, height } = row;
    context.font = "700 18px Arial, sans-serif";
    context.fillStyle = "#d4af37";
    context.textAlign = "center";
    context.fillText(`${line.cantidad}x`, left + 28, cursor + 4);
    context.textAlign = "left";

    context.font = "600 16px Arial, sans-serif";
    context.fillStyle = "#ffffff";
    nameLines.forEach((name, index) => context.fillText(name, left + 56, cursor + index * 22));
    context.font = "11px Arial, sans-serif";
    context.fillStyle = "rgba(255,255,255,0.45)";
    context.fillText(
      `${line.product.categoria} · ${fmtUsd(line.product.precioUsd)} c/u`,
      left + 56,
      cursor + nameLines.length * 22 + 3,
    );
    context.font = "700 16px Arial, sans-serif";
    context.fillStyle = "#ffffff";
    context.textAlign = "right";
    context.fillText(fmtUsd(line.subtotalUsd), right, cursor + 4);
    context.textAlign = "left";
    cursor += height;

    context.strokeStyle = "rgba(255,255,255,0.1)";
    context.beginPath();
    context.moveTo(left, cursor);
    context.lineTo(right, cursor);
    context.stroke();
    cursor += 1;
  }

  cursor += 22;
  context.strokeStyle = "rgba(212,175,55,0.3)";
  context.beginPath();
  context.moveTo(left, cursor);
  context.lineTo(right, cursor);
  context.stroke();
  cursor += 18;

  context.font = "14px Arial, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.6)";
  context.textAlign = "right";
  context.fillText(`Total USD: ${fmtUsd(draft.subtotalUsd)}`, right, cursor);
  cursor += 28;
  context.font = "700 20px Arial, sans-serif";
  context.fillStyle = "#d4af37";
  context.fillText(
    `Total Bs: ${draft.totalBs === null ? "No disponible" : fmtBs(draft.totalBs)}`,
    right,
    cursor,
  );
  cursor += 30;
  context.font = "12px Arial, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.45)";
  context.fillText(
    `Tasa de referencia: ${draft.exchangeRate > 0 ? fmtBs(draft.exchangeRate) : "No disponible"} por 1 $`,
    right,
    cursor,
  );
  context.textAlign = "left";
  cursor += 38;

  context.strokeStyle = "rgba(255,255,255,0.1)";
  context.beginPath();
  context.moveTo(left, cursor);
  context.lineTo(right, cursor);
  context.stroke();
  context.font = "11px Arial, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.45)";
  context.textAlign = "center";
  context.fillText("Cotización informativa. No confirma una venta ni una reserva.", CANVAS_WIDTH / 2, cursor + 18);
  context.textAlign = "left";

  return canvasBlob(canvas);
}

export async function createQuoteImage(
  _element: HTMLElement,
  draft: QuoteDraft,
): Promise<QuoteImageArtifact> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const blob = await renderQuoteCanvas(draft);

  const generatedAt = new Date();
  const file = new File([blob], quoteFilename(generatedAt), {
    type: "image/png",
  });

  return {
    blob,
    file,
    objectUrl: URL.createObjectURL(blob),
    fingerprint: draft.fingerprint,
    generatedAt: generatedAt.toISOString(),
  };
}

export function revokeQuoteImage(artifact: QuoteImageArtifact | null) {
  if (artifact) URL.revokeObjectURL(artifact.objectUrl);
}

export function downloadQuoteImage(artifact: QuoteImageArtifact) {
  const link = document.createElement("a");
  link.href = artifact.objectUrl;
  link.download = artifact.file.name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function shareQuoteImage(
  artifact: QuoteImageArtifact,
  draft: QuoteDraft,
): Promise<QuoteShareResult> {
  const shareText = buildQuoteWhatsAppText({ draft });

  if (typeof navigator !== "undefined" && navigator.share) {
    const shareData = {
      files: [artifact.file],
      title: "Cotización Venuti's Gourmet",
      text: shareText,
    };
    const canShareFiles = navigator.canShare?.({ files: [artifact.file] });

    if (canShareQuoteFile(true, Boolean(canShareFiles))) {
      try {
        await navigator.share(shareData);
        return "native-share-started";
      } catch (error) {
        if (isQuoteShareCancellation(error)) return "user-cancelled";
      }
    }
  }

  try {
    downloadQuoteImage(artifact);
    const whatsappUrl = buildWhatsAppUrl(WHATSAPP_PHONE_NUMBER, shareText);
    const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    return opened === null
      ? "recoverable-error"
      : "fallback-download-and-whatsapp";
  } catch {
    return "recoverable-error";
  }
}
