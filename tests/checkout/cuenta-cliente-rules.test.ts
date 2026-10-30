import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolverVinculacion } from "../../lib/cuenta-cliente-rules.js";

const base = { correoVerificado: true, clientePorCorreo: null, clientePorTelefono: null, telefonoIndicado: false };

describe("resolverVinculacion", () => {
  it("pide verificar el correo antes de vincular nada", () => {
    assert.deepEqual(resolverVinculacion({ ...base, correoVerificado: false, clientePorCorreo: { id: 1, tieneCuenta: false } }), { accion: "verificar_correo" });
  });

  it("vincula solo cuando el correo verificado coincide con un cliente sin cuenta", () => {
    assert.deepEqual(resolverVinculacion({ ...base, clientePorCorreo: { id: 7, tieneCuenta: false } }), { accion: "vincular", clienteId: 7 });
  });

  it("es un conflicto si el cliente del correo ya tiene otra cuenta", () => {
    assert.deepEqual(resolverVinculacion({ ...base, clientePorCorreo: { id: 7, tieneCuenta: true } }), { accion: "conflicto" });
  });

  it("pide los datos si el correo no coincide y aún no hay teléfono", () => {
    assert.deepEqual(resolverVinculacion(base), { accion: "pedir_datos" });
  });

  it("deja la vinculación pendiente si solo coincide el teléfono", () => {
    assert.deepEqual(resolverVinculacion({ ...base, telefonoIndicado: true, clientePorTelefono: { id: 3, tieneCuenta: false } }), { accion: "pendiente", clienteId: 3 });
  });

  it("es un conflicto si el cliente del teléfono ya tiene cuenta", () => {
    assert.deepEqual(resolverVinculacion({ ...base, telefonoIndicado: true, clientePorTelefono: { id: 3, tieneCuenta: true } }), { accion: "conflicto" });
  });

  it("crea un cliente nuevo si no coincide nada", () => {
    assert.deepEqual(resolverVinculacion({ ...base, telefonoIndicado: true }), { accion: "crear_cliente" });
  });
});
