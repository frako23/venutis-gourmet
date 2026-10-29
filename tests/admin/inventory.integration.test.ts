import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { ajustarInventario, StockInsuficienteError } from "../../lib/inventory.ts";

async function withProduct(inventario: number, run: (ctx: { prisma: ReturnType<typeof createIntegrationClient>; id: number }) => Promise<void>) {
  const prisma = createIntegrationClient();
  let id: number | undefined;
  try {
    id = (await prisma.producto.create({ data: { nombre: uniqueValue("Producto inventario"), precioDetal: 1, precioMayorista: 1, categoria: "Fixture", inventario } })).id;
    await run({ prisma, id });
  } finally {
    if (id !== undefined) await prisma.producto.delete({ where: { id } });
    await prisma.$disconnect();
  }
}

test("ajustarInventario no deja restos binarios", { skip: !integrationEnabled }, async () => {
  await withProduct(3.3, async ({ prisma, id }) => {
    await prisma.$transaction((tx) => ajustarInventario(tx, id, -3, { exigirStock: true }));
    assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id } })).inventario, 0.3);
  });
});

test("ajustarInventario rechaza un resultado negativo sin cambiar el valor", { skip: !integrationEnabled }, async () => {
  await withProduct(2, async ({ prisma, id }) => {
    await assert.rejects(() => prisma.$transaction((tx) => ajustarInventario(tx, id, -2.5, { exigirStock: true })), StockInsuficienteError);
    assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id } })).inventario, 2);
  });
});
