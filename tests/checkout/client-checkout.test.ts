import assert from "node:assert/strict";
import { describe, it, test } from "node:test";

import { validateCheckoutClientData } from "../../lib/client-rules.js";
import { createIntegrationClient, integrationEnabled, uniqueValue } from "./test-helpers.js";

if (integrationEnabled) {
  process.env.DATABASE_URL = process.env.CHECKOUT_TEST_DATABASE_URL || process.env.ADMIN_TEST_DATABASE_URL;
}
const clientActions = integrationEnabled ? await import("../../lib/actions/clients.js") : null;

describe("datos de cliente del checkout", () => {
  it("acepta un cliente detal válido y normaliza espacios", () => {
    const result = validateCheckoutClientData({
      nombre: "  Ana ",
      apellido: " Pérez ",
      celular: "04141234567",
      email: " ana@example.com ",
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, {
      nombre: "Ana",
      apellido: "Pérez",
      celular: "04141234567",
      email: "ana@example.com",
    });
  });

  it("exige nombre, apellido y teléfono, y valida correo opcional", () => {
    const result = validateCheckoutClientData({
      nombre: "",
      apellido: " ",
      celular: "0412",
      email: "no-es-correo",
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.nombre);
    assert.ok(result.issues.apellido);
    assert.ok(result.issues.celular);
    assert.ok(result.issues.email);
  });
});

test("reutiliza el cliente por teléfono y no borra datos ante conflicto de correo", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0414");
  const otroCelular = uniqueValue("0412");
  const email = `${uniqueValue("cliente")}@example.com`;
  let existingId: number | undefined;
  let emailOwnerId: number | undefined;
  try {
    const existing = await prisma.cliente.create({
      data: { tipoCliente: "detal", nombre: "Cliente", apellido: "Existente", nombreBusqueda: "cliente existente", celular },
    });
    existingId = existing.id;
    const found = await clientActions!.getClientByPhone(celular);
    assert.equal(found?.id, existing.id);

    const duplicateForm = new FormData();
    duplicateForm.set("nombre", "Otro");
    duplicateForm.set("apellido", "Nombre");
    duplicateForm.set("celular", celular);
    duplicateForm.set("email", "otro@example.com");
    duplicateForm.set("tipoCliente", "detal");
    const duplicate = await clientActions!.addClient({ message: "", status: "", client: null }, duplicateForm);
    assert.equal(duplicate.status, "error");
    assert.equal(duplicate.client?.id, existing.id);

    const owner = await prisma.cliente.create({
      data: { tipoCliente: "detal", nombre: "Dueño", apellido: "Correo", nombreBusqueda: "dueno correo", celular: otroCelular, email },
    });
    emailOwnerId = owner.id;
    const conflictForm = new FormData();
    conflictForm.set("nombre", "Nuevo");
    conflictForm.set("apellido", "Cliente");
    conflictForm.set("celular", uniqueValue("0424"));
    conflictForm.set("email", email);
    conflictForm.set("tipoCliente", "detal");
    const conflict = await clientActions!.addClient({ message: "", status: "", client: null }, conflictForm);
    assert.equal(conflict.status, "error");
    assert.equal(conflict.client, null);
  } finally {
    if (emailOwnerId) await prisma.cliente.delete({ where: { id: emailOwnerId } });
    if (existingId) await prisma.cliente.delete({ where: { id: existingId } });
    await prisma.$disconnect();
  }
});
