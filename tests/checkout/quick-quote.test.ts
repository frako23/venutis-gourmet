import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addQuoteLine,
  applyQuoteQuantity,
  buildQuoteDraft,
  buildQuoteWhatsAppText,
  buildWhatsAppUrl,
  canShareQuoteFile,
  calculateQuoteTotals,
  isCurrentQuoteImage,
  isQuoteShareCancellation,
  quoteFingerprint,
  type QuoteLine,
  type QuoteProduct,
} from "../../lib/cotizacion-rapida.js";

const product: QuoteProduct = {
  id: 7,
  nombre: "Ravioli de carne",
  precioUsd: 6.5,
  categoria: "Pastas",
  inventario: 3,
  imagenUrl: "/ravioli.jpg",
};

function line(cantidad = 1): QuoteLine {
  return {
    product,
    cantidad,
    subtotalUsd: product.precioUsd * cantidad,
  };
}

describe("reglas de cotización rápida", () => {
  it("agrega líneas y limita la cantidad al inventario disponible", () => {
    const added = addQuoteLine([], product, 5);

    assert.equal(added.length, 1);
    assert.equal(added[0].cantidad, 3);
    assert.equal(added[0].subtotalUsd, 19.5);

    const increased = addQuoteLine(added, product, 1);
    assert.equal(increased[0].cantidad, 3);
  });

  it("conserva la línea válida cuando se solicita una cantidad inválida", () => {
    const unchanged = applyQuoteQuantity([line(2)], product.id, 0);
    assert.equal(unchanged[0].cantidad, 2);

    const removed = applyQuoteQuantity([line(1)], product.id, -1);
    assert.deepEqual(removed, []);
  });

  it("calcula USD y bloquea el equivalente Bs con tasa inválida", () => {
    assert.deepEqual(calculateQuoteTotals([line(2)], 35), {
      subtotalUsd: 13,
      totalBs: 455,
      rateValid: true,
    });
    assert.deepEqual(calculateQuoteTotals([line(2)], 0), {
      subtotalUsd: 13,
      totalBs: null,
      rateValid: false,
    });
  });

  it("cambia el fingerprint cuando cambia un dato representado", () => {
    const base = buildQuoteDraft([line(1)], 35, { nombre: "Ana" });
    const changed = buildQuoteDraft([line(2)], 35, { nombre: "Ana" });

    assert.equal(base.fingerprint, quoteFingerprint(base));
    assert.notEqual(base.fingerprint, changed.fingerprint);
  });

  it("marca obsoleta una imagen cuando cambia la cotización", () => {
    const lines = addQuoteLine([], product, 1);
    const first = buildQuoteDraft(lines, 40, { nombre: "Ana" });
    const changed = buildQuoteDraft(lines, 40, { nombre: "Luis" });
    const artifact = { fingerprint: first.fingerprint };

    assert.equal(isCurrentQuoteImage(artifact, first), true);
    assert.equal(isCurrentQuoteImage(artifact, changed), false);
    assert.equal(isCurrentQuoteImage(null, first), false);
  });

  it("elige compartir nativo solo cuando el archivo es compatible", () => {
    assert.equal(canShareQuoteFile(true, true), true);
    assert.equal(canShareQuoteFile(true, false), false);
    assert.equal(canShareQuoteFile(false, true), false);
    assert.equal(isQuoteShareCancellation({ name: "AbortError" }), true);
    assert.equal(isQuoteShareCancellation(new Error("falló")), false);
  });

  it("genera texto de cotización y un enlace WhatsApp sin signo más", () => {
    const text = buildQuoteWhatsAppText({
      draft: buildQuoteDraft([line(2)], 35, { nombre: "Ana", telefono: "0414-123-4567" }),
      issuedAt: new Date("2026-10-15T12:00:00.000Z"),
    });
    const url = buildWhatsAppUrl("+584141713932", text);

    assert.match(text, /cotización/i);
    assert.match(text, /2 x Ravioli de carne/);
    assert.match(text, /Total USD: \*\$13\.00\*/);
    assert.match(url, /^https:\/\/wa\.me\/584141713932\?text=/);
  });
});
