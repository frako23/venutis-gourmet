import assert from "node:assert/strict";
import { test } from "node:test";

import { esCorreoAdministrador, leerCorreosAdministradores } from "../../lib/admin/auth-rules.ts";

test("leerCorreosAdministradores normaliza y descarta vacíos", () => {
  assert.deepEqual(leerCorreosAdministradores(undefined), []);
  assert.deepEqual(leerCorreosAdministradores(""), []);
  assert.deepEqual(leerCorreosAdministradores(" Ana@Mail.com , ,b@mail.com "), ["ana@mail.com", "b@mail.com"]);
});

test("con la lista vacía nadie es administradora", () => {
  assert.equal(esCorreoAdministrador("ana@mail.com", []), false);
  assert.equal(esCorreoAdministrador(null, []), false);
});

test("un correo nulo nunca es administradora", () => {
  assert.equal(esCorreoAdministrador(null, ["ana@mail.com"]), false);
  assert.equal(esCorreoAdministrador(undefined, ["ana@mail.com"]), false);
});

test("compara sin distinguir mayúsculas ni espacios", () => {
  assert.equal(esCorreoAdministrador("  ANA@mail.com ", ["ana@mail.com"]), true);
});

test("un correo fuera de la lista no es administradora", () => {
  assert.equal(esCorreoAdministrador("cliente@mail.com", ["ana@mail.com"]), false);
});
