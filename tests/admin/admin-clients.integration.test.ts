import assert from "node:assert/strict";
import { test } from "node:test";

import { calculateRifCheckDigit, normalizeSearchName } from "../../lib/client-rules.js";
import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";

function uniquePhone() {
  return `04${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 20);
}

function uniqueRif(prefix = "J") {
  const body = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-8);
  return `${prefix}${body}${calculateRifCheckDigit(prefix, body)}`;
}

test("clientes administrativos conservan RIF normalizado, dirección e historial", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const consumerPhone = uniquePhone();
  const wholesalerPhone = uniquePhone();
  const rif = uniqueRif();
  const clientIds: number[] = [];
  try {
    const result = await prisma.$transaction(async (tx) => {
      const consumer = await tx.cliente.create({ data: { tipoCliente: "detal", nombre: "María", apellido: "Pérez", nombreBusqueda: normalizeSearchName("María", "Pérez"), celular: consumerPhone } });
      const wholesaler = await tx.cliente.create({
        data: {
          tipoCliente: "mayorista",
          nombre: "Mercado",
          apellido: "Central",
          nombreBusqueda: normalizeSearchName("Mercado", "Central"),
          rif: rif,
          celular: wholesalerPhone,
          direcciones: { create: { tipo: "Oficina", urbanizacion: "Centro", direccion: "Calle principal" } },
        },
      });
      await tx.historialCliente.createMany({ data: [{ clienteId: consumer.id, accion: "creado", camposModificados: ["cliente"], actorId: "integration" }, { clienteId: wholesaler.id, accion: "creado", camposModificados: ["cliente", "direccionInicial"], actorId: "integration" }] });
      return { consumer, wholesaler };
    });
    clientIds.push(result.consumer.id, result.wholesaler.id);

    assert.equal(result.wholesaler.rif, rif);
    assert.equal((await prisma.direccion.count({ where: { clienteId: result.wholesaler.id } })), 1);
    assert.equal(await prisma.historialCliente.count({ where: { clienteId: result.wholesaler.id } }), 1);
    assert.equal(result.consumer.rif, null);
  } finally {
    if (clientIds.length) {
      await prisma.direccion.deleteMany({ where: { clienteId: { in: clientIds } } });
      await prisma.cliente.deleteMany({ where: { id: { in: clientIds } } });
    }
    await prisma.$disconnect();
  }
});
test("la consulta encuentra nombres con acentos y RIF con separadores", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const phone = uniquePhone();
  const rif = uniqueRif("V");
  let clientId: number | undefined;
  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "José", apellido: "Gómez", nombreBusqueda: normalizeSearchName("José", "Gómez"), rif, celular: phone } });
    clientId = client.id;
    const byName = await prisma.cliente.findMany({ where: { nombreBusqueda: { contains: "jose" }, tipoCliente: "detal" }, select: { id: true } });
    const byRif = await prisma.cliente.findMany({ where: { rif: { contains: rif.replace(/-/g, "") }, tipoCliente: "detal" }, select: { id: true } });
    assert.ok(byName.some((row) => row.id === client.id));
    assert.ok(byRif.some((row) => row.id === client.id));
  } finally {
    if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  }
});
test("una tanda fallida revierte cliente e historial y una versión obsoleta no sobrescribe", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const phone = uniquePhone();
  let clientId: number | undefined;
  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Antes", apellido: "Tanda", nombreBusqueda: "antes tanda", celular: phone } });
    clientId = client.id;
    const loaded = await prisma.cliente.findUniqueOrThrow({ where: { id: client.id } });
    await assert.rejects(() => prisma.$transaction(async (tx) => {
      await tx.cliente.update({ where: { id: client.id }, data: { nombre: "Temporal", nombreBusqueda: "temporal tanda" } });
      await tx.historialCliente.create({ data: { clienteId: client.id, accion: "actualizado", camposModificados: ["nombre"], actorId: "integration" } });
      throw new Error("fila inválida");
    }), /fila inválida/);
    assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: client.id } })).nombre, "Antes");
    assert.equal(await prisma.historialCliente.count({ where: { clienteId: client.id } }), 0);

    await prisma.cliente.update({ where: { id: client.id }, data: { apellido: "Concurrente", nombreBusqueda: "antes concurrente" } });
    await assert.rejects(() => prisma.$transaction(async (tx) => {
      const updated = await tx.cliente.updateMany({ where: { id: client.id, updatedAt: loaded.updatedAt }, data: { nombre: "Sobrescrito", nombreBusqueda: "sobrescrito tanda" } });
      if (updated.count !== 1) throw new Error("stale");
    }), /stale/);
  } finally {
    if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  }
});

test("editar el perfil conserva las relaciones históricas", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const phone = uniquePhone();
  let clientId: number | undefined;
  let transactionId: number | undefined;
  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Perfil", apellido: "Original", nombreBusqueda: "perfil original", celular: phone, direcciones: { create: { tipo: "Casa", urbanizacion: "Norte", direccion: "Calle 1" } } } });
    clientId = client.id;
    const transaction = await prisma.transaccion.create({ data: { numeroOrden: uniqueValue("INT-CLIENTE"), clienteId: client.id, montoSubtotal: 4, montoTotal: 4, estado: "pagado" } });
    transactionId = transaction.id;
    await prisma.cliente.update({ where: { id: client.id }, data: { tipoCliente: "mayorista", nombre: "Perfil actualizado", nombreBusqueda: "perfil actualizado" } });
    assert.equal((await prisma.transaccion.findUniqueOrThrow({ where: { id: transaction.id } })).clienteId, client.id);
    assert.equal(await prisma.direccion.count({ where: { clienteId: client.id } }), 1);
  } finally {
    if (transactionId) await prisma.transaccion.delete({ where: { id: transactionId } });
    if (clientId) {
      await prisma.direccion.deleteMany({ where: { clienteId: clientId } });
      await prisma.cliente.delete({ where: { id: clientId } });
    }
    await prisma.$disconnect();
  }
});
