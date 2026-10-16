export type ProductProjection = {
  id: number;
  nombre: string;
  categoria: string;
  precioUsd: number;
  inventario: number;
  imagenUrl?: string;
};

export type QuoteProduct = ProductProjection;

export type QuoteLine = {
  product: QuoteProduct;
  cantidad: number;
  subtotalUsd: number;
};

export type QuoteRecipient = {
  nombre?: string;
  telefono?: string;
};

export type QuoteDraftStatus =
  | "empty"
  | "draft"
  | "generated"
  | "stale"
  | "error";

export type QuoteDraft = {
  lines: QuoteLine[];
  recipient: QuoteRecipient;
  exchangeRate: number;
  subtotalUsd: number;
  totalBs: number | null;
  issuedAt: string;
  fingerprint: string;
  status: QuoteDraftStatus;
};

export type QuoteTotals = {
  subtotalUsd: number;
  totalBs: number | null;
  rateValid: boolean;
};

export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const isValidExchangeRate = (rate: number) =>
  Number.isFinite(rate) && rate > 0;

const normalizeText = (value: string | undefined) => value?.trim() ?? "";

export function normalizeRecipient(
  recipient: QuoteRecipient = {},
): QuoteRecipient {
  const nombre = normalizeText(recipient.nombre);
  const telefono = normalizeText(recipient.telefono);

  return {
    ...(nombre ? { nombre } : {}),
    ...(telefono ? { telefono } : {}),
  };
}

const clampQuantity = (quantity: number, inventory: number) =>
  Math.min(Math.max(Math.trunc(quantity), 0), Math.max(0, Math.trunc(inventory)));

function toQuoteLine(product: QuoteProduct, cantidad: number): QuoteLine | null {
  const safeQuantity = clampQuantity(cantidad, product.inventario);
  if (safeQuantity <= 0) return null;

  return {
    product,
    cantidad: safeQuantity,
    subtotalUsd: roundMoney(product.precioUsd * safeQuantity),
  };
}

export function addQuoteLine(
  lines: QuoteLine[],
  product: QuoteProduct,
  quantity = 1,
): QuoteLine[] {
  const existing = lines.find((line) => line.product.id === product.id);
  if (!existing) {
    const line = toQuoteLine(product, quantity);
    return line ? [...lines, line] : lines;
  }

  return applyQuoteQuantity(lines, product.id, quantity, product);
}

export function applyQuoteQuantity(
  lines: QuoteLine[],
  productId: number,
  delta: number,
  currentProduct?: QuoteProduct,
): QuoteLine[] {
  return lines.flatMap((line) => {
    if (line.product.id !== productId) return [line];

    const product = currentProduct ?? line.product;
    const next = toQuoteLine(product, line.cantidad + Math.trunc(delta));
    return next ? [next] : [];
  });
}

export function removeQuoteLine(lines: QuoteLine[], productId: number) {
  return lines.filter((line) => line.product.id !== productId);
}

export function calculateQuoteTotals(
  lines: QuoteLine[],
  exchangeRate: number,
): QuoteTotals {
  const subtotalUsd = roundMoney(
    lines.reduce(
      (total, line) => total + line.product.precioUsd * line.cantidad,
      0,
    ),
  );
  const rateValid = isValidExchangeRate(exchangeRate);

  return {
    subtotalUsd,
    totalBs: rateValid ? roundMoney(subtotalUsd * exchangeRate) : null,
    rateValid,
  };
}

type QuoteFingerprintInput = Pick<QuoteDraft, "lines" | "recipient" | "exchangeRate">;

export function quoteFingerprint(input: QuoteFingerprintInput): string {
  return JSON.stringify({
    lines: input.lines.map((line) => ({
      id: line.product.id,
      nombre: line.product.nombre,
      precioUsd: roundMoney(line.product.precioUsd),
      cantidad: line.cantidad,
    })),
    recipient: normalizeRecipient(input.recipient),
    exchangeRate: roundMoney(input.exchangeRate),
  });
}

export function isCurrentQuoteImage(
  artifact: { fingerprint: string } | null,
  draft: Pick<QuoteDraft, "fingerprint">,
) {
  return Boolean(artifact && artifact.fingerprint === draft.fingerprint);
}

export function canShareQuoteFile(hasShareApi: boolean, canShareFiles: boolean) {
  return hasShareApi && canShareFiles;
}

export function isQuoteShareCancellation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export function buildQuoteDraft(
  lines: QuoteLine[],
  exchangeRate: number,
  recipient: QuoteRecipient = {},
  issuedAt = new Date(),
): QuoteDraft {
  const normalizedLines = lines
    .map((line) => toQuoteLine(line.product, line.cantidad))
    .filter((line): line is QuoteLine => line !== null);
  const normalizedRecipient = normalizeRecipient(recipient);
  const totals = calculateQuoteTotals(normalizedLines, exchangeRate);
  const draftBase = {
    lines: normalizedLines,
    recipient: normalizedRecipient,
    exchangeRate,
  };

  return {
    ...draftBase,
    ...totals,
    issuedAt: issuedAt.toISOString(),
    fingerprint: quoteFingerprint(draftBase as QuoteFingerprintInput),
    status: normalizedLines.length ? "draft" : "empty",
  };
}

export function buildQuoteWhatsAppText({
  draft,
  issuedAt = new Date(draft.issuedAt),
}: {
  draft: QuoteDraft;
  issuedAt?: Date;
}) {
  const lines = draft.lines
    .map((line) => {
      const subtotal = fmtUsd(line.subtotalUsd);
      const subtotalBs = draft.totalBs === null
        ? "Bs no disponible"
        : fmtBs(line.subtotalUsd * draft.exchangeRate);
      return `• ${line.cantidad} x ${line.product.nombre} — ${subtotal} / ${subtotalBs}`;
    })
    .join("\n");
  const recipient = draft.recipient.nombre
    ? `Para: ${draft.recipient.nombre}\n`
    : "";
  const totalBs = draft.totalBs === null ? "No disponible" : fmtBs(draft.totalBs);

  return [
    "Hola, te comparto la siguiente cotización:",
    "",
    "*Venuti's Gourmet*",
    `Fecha: ${issuedAt.toLocaleString("es-VE")}`,
    recipient ? recipient.trimEnd() : "",
    "",
    "*Detalle de la cotización*",
    lines,
    "",
    `Total USD: *${fmtUsd(draft.subtotalUsd)}*`,
    `Total Bs: *${totalBs}*`,
    isValidExchangeRate(draft.exchangeRate)
      ? `Tasa de referencia: *${fmtBs(draft.exchangeRate)} por 1 $*`
      : "Tasa de referencia: no disponible",
    "",
    "Esta cotización no confirma una venta ni una reserva.",
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

export function buildWhatsAppUrl(phone: string, text: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

export const fmtUsd = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const fmtBs = (value: number) =>
  `Bs ${value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
