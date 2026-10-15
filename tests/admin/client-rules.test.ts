import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateRifCheckDigit,
  formatRif,
  normalizeRif,
  normalizeSearchName,
  validateRif,
} from "../../lib/client-rules.js";

test("normaliza nombres para buscar sin acentos ni espacios extra", () => {
  assert.equal(normalizeSearchName("  María", "José   Pérez "), "maria jose perez");
  assert.equal(normalizeSearchName("MERCADO", "CENTRAL"), "mercado central");
});
test("normaliza, valida y formatea RIF con separadores", () => {
  const body = "12345678";
  const checkDigit = calculateRifCheckDigit("J", body);
  const compact = `J${body}${checkDigit}`;

  assert.equal(validateRif(`j-${body}-${checkDigit}`), null);
  assert.equal(normalizeRif(` j-${body}-${checkDigit} `), compact);
  assert.equal(formatRif(compact), `J-${body}-${checkDigit}`);
});

test("rechaza prefijos, longitud y dígito verificador inválidos", () => {
  assert.match(validateRif("X123456789") ?? "", /prefijo/);
  assert.match(validateRif("J123") ?? "", /prefijo/);
  assert.match(validateRif("J123456780") ?? "", /dígito/);
  assert.throws(() => normalizeRif("J123456780"), /dígito/);
  assert.equal(normalizeRif(""), null);
});
