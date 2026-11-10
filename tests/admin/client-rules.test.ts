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

  assert.equal(checkDigit, 4);
  assert.equal(validateRif("J-12345678-4"), null);
  assert.equal(validateRif(`j-${body}-${checkDigit}`), null);
  assert.equal(normalizeRif(` j-${body}-${checkDigit} `), compact);
  assert.equal(formatRif(compact), `J-${body}-${checkDigit}`);
});

test("rechaza prefijos, longitud y dígito verificador inválidos", () => {
  assert.match(validateRif("X123456789") ?? "", /prefijo/);
  assert.match(validateRif("J123") ?? "", /prefijo/);
  assert.match(validateRif("J123456789") ?? "", /dígito.*4/);
  assert.throws(() => normalizeRif("J123456789"), /dígito.*4/);
  assert.equal(normalizeRif(""), null);
});

import { filtrarClientes } from "../../lib/client-rules.js";

const cliente = (nombre: string, apellido: string) => ({ nombre, apellido, nombreBusqueda: normalizeSearchName(nombre, apellido) });
const lista = [cliente("Marcos", "Díaz"), cliente("María", "Pérez"), cliente("Ana", "Marín")];

test("filtrarClientes ignora acentos, mayúsculas y espacios de más", () => {
  assert.deepEqual(filtrarClientes(lista, "maria").map((c) => c.nombre), ["María"]);
  assert.deepEqual(filtrarClientes(lista, "  MARÍA   ").map((c) => c.nombre), ["María"]);
});
test("filtrarClientes exige todas las palabras", () => {
  assert.deepEqual(filtrarClientes(lista, "mar pe").map((c) => c.nombre), ["María"]);
});
test("filtrarClientes sin texto devuelve los primeros por nombre y respeta el límite", () => {
  assert.deepEqual(filtrarClientes(lista, "", 2).map((c) => c.nombre), ["Ana", "Marcos"]);
});
test("filtrarClientes pone primero a quien empieza por la primera palabra", () => {
  assert.deepEqual(filtrarClientes(lista, "mar").map((c) => c.nombre), ["Marcos", "María", "Ana"]);
});
