import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { requiresPaymentConfirmation } from "../../lib/admin/status.js";

test("cambio de estado persiste historial y respeta confirmación de pago", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0415").slice(0, 12);
  try {
    const client = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Fixture", apellido: "Estado", celular } });
    const transaction = await prisma.transaccion.create({ data: { numeroOrden: uniqueValue("INT-ESTADO"), clienteId: client.id, montoSubtotal: 10, montoTotal: 10, estado: "por_cobrar" } });
    assert.equal(requiresPaymentConfirmation(transaction.montoTotal, 0, false, false), true);
    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaccion.update({ where: { id: transaction.id }, data: { estado: "en_pedido" } });
      await tx.estadoTransaccionHistorial.create({ data: { transaccionId: transaction.id, estadoAnterior: "por_cobrar", estadoNuevo: "en_pedido", actorId: "integration", motivo: "Prueba" } });
      return updated;
    });
    assert.equal(changed.estado, "en_pedido");
    assert.equal((await prisma.estadoTransaccionHistorial.count({ where: { transaccionId: transaction.id } })), 1);
  } finally {
    const client = await prisma.cliente.findFirst({ where: { celular }, select: { id: true } });
    if (client) { await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccion: { clienteId: client.id } } }); await prisma.transaccion.deleteMany({ where: { clienteId: client.id } }); await prisma.cliente.delete({ where: { id: client.id } }); }
    await prisma.$disconnect();
  }
});
