import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { CreditoRequiereAutorizacion, registrarVentaManualEnTx, type VentaManualInput } from "../../lib/admin/manual-sale.ts";

const actor = { id: "integration", email: "integration@local" };

test("venta manual sin cobrar sobre el crédito exige y registra la autorización", { skip: !integrationEnabled }, async () => {
  const prisma = createIntegrationClient();
  const celular = uniqueValue("0414");
  let clienteId: number | undefined;
  let productoId: number | undefined;
  try {
    const cliente = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Fixture", apellido: "Credito", nombreBusqueda: "fixture credito", celular } });
    clienteId = cliente.id;
    const producto = await prisma.producto.create({ data: { nombre: uniqueValue("Producto crédito"), precioDetal: 5, precioMayorista: 4, categoria: "Fixture", inventario: 10 } });
    productoId = producto.id;

    const venta = (extra: Partial<VentaManualInput>): VentaManualInput => ({
      clienteId: cliente.id,
      fechaCompra: new Date(),
      tipodeRetiro: "recogida",
      tasaCambio: null,
      estadoInicial: "por_cobrar",
      lineas: [{ productoId: producto.id, cantidad: 1, precioUnitarioUsd: 5, tipoPrecio: "detal" }],
      descuento: null,
      autorizarCredito: false,
      ...extra,
    });
    const registrar = (extra: Partial<VentaManualInput>) => prisma.$transaction((tx) => registrarVentaManualEnTx(tx, venta(extra), actor));

    // Sin crédito y sin autorización: no se crea nada y se informa el exceso.
    await assert.rejects(
      () => registrar({}),
      (error) => error instanceof CreditoRequiereAutorizacion && error.info.excesoUsd === 5 && error.info.disponibleUsd === 0,
    );
    assert.equal(await prisma.transaccion.count({ where: { clienteId: cliente.id } }), 0);
    assert.equal((await prisma.producto.findUnique({ where: { id: producto.id } }))?.inventario, 10);

    // Con autorización se registra y queda constancia en el historial inicial.
    const autorizada = await registrar({ autorizarCredito: true });
    const historial = await prisma.estadoTransaccionHistorial.findFirst({ where: { transaccionId: autorizada.id } });
    assert.match(historial?.motivo ?? "", /Autorizada sobre el crédito: excede USD 5,00/);
    assert.equal(historial?.actorEmail, actor.email);

    // Con crédito suficiente no pide autorización (deuda 5, límite 12, disponible 7).
    await prisma.cliente.update({ where: { id: cliente.id }, data: { creditoHabilitado: true, limiteCreditoUsd: 12 } });
    const dentro = await registrar({});
    const historialDentro = await prisma.estadoTransaccionHistorial.findFirst({ where: { transaccionId: dentro.id } });
    assert.doesNotMatch(historialDentro?.motivo ?? "", /Autorizada/);
    // Ahora la deuda es 10 y quedan 2: otra venta de 5 vuelve a pedir autorización.
    await assert.rejects(() => registrar({}), CreditoRequiereAutorizacion);

    // Una venta con pago declarado no es crédito y no pide autorización.
    const conPago = await registrar({ pago: { metodoPago: "Zelle", montoUsd: 5, referencia: "REF-1" } });
    assert.ok(conPago.id);
  } finally {
    const pedidos = await prisma.transaccion.findMany({ where: { clienteId }, select: { id: true } });
    const ids = pedidos.map((pedido) => pedido.id);
    await prisma.pago.deleteMany({ where: { transaccionId: { in: ids } } });
    await prisma.detalleCompra.deleteMany({ where: { transaccionId: { in: ids } } });
    await prisma.transaccion.deleteMany({ where: { id: { in: ids } } });
    if (productoId) await prisma.producto.delete({ where: { id: productoId } });
    if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } });
    await prisma.$disconnect();
  }
});
