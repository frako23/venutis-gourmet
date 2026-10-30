import assert from "node:assert/strict";
import { test } from "node:test";

import { createIntegrationClient, integrationEnabled, uniqueValue } from "./integration-helpers.js";
import { aplicarCargaVentas, CargaError, prepararVistaPrevia } from "../../lib/admin/sales-import.ts";
import { construirCarga } from "../../lib/admin/sales-import-core.ts";
import { leerLibroXlsx } from "../../lib/admin/xlsx-reader.ts";
import { crearLibroControlVentas, LINEAS } from "./xlsx-fixture.js";

const actor = { id: "integration", email: "integration@local" };
const HOY = "2026-10-29";

/** Cada ejecución usa números de nota únicos para no chocar con datos existentes. */
function lineasConBase(base: number, cliente: string) {
  const mapa = new Map<number, number>();
  return LINEAS.map((linea) => {
    if (!mapa.has(linea[1])) mapa.set(linea[1], base + mapa.size);
    return [linea[0], mapa.get(linea[1])!, linea[2], linea[1] === 5002 ? linea[3] : cliente, ...linea.slice(4)] as typeof linea;
  });
}

async function withFixture(run: (ctx: { prisma: ReturnType<typeof createIntegrationClient>; base: number; cliente: string; carga: () => ReturnType<typeof construirCarga>; productoIds: Record<string, number> }) => Promise<void>) {
  const prisma = createIntegrationClient();
  const base = 9_000_000 + Math.floor(Math.random() * 900_000);
  const cliente = uniqueValue("IMPORTACION PRUEBA").toUpperCase();
  const creados: { productos: number[] } = { productos: [] };
  try {
    const nombres = { ravioli: "RAVIOLI DE RICOTTA Y ESPINACA", gnocchi: "GNOCCHI DE PAPAS", champi: "RAVIOLI DE RICOTTA Y CHAMPIÑONES", pasticho: "PASTICHO TRADICIONAL" };
    const productoIds: Record<string, number> = {};
    for (const [clave, nombre] of Object.entries(nombres)) {
      const producto = await prisma.producto.create({ data: { nombre: `${nombre} ${base}`, precioDetal: 10, precioMayorista: 8, categoria: "Fixture", inventario: 50 } });
      productoIds[clave] = producto.id;
      creados.productos.push(producto.id);
    }
    const carga = () => construirCarga(leerLibroXlsx(crearLibroControlVentas({ lineas: lineasConBase(base, cliente) })), HOY);
    await run({ prisma, base, cliente, carga, productoIds });
  } finally {
    await limpiar(prisma, base, creados.productos);
    await prisma.$disconnect();
  }
}

async function limpiar(prisma: ReturnType<typeof createIntegrationClient>, base: number, productos: number[]) {
  const numeros = [0, 1, 2].map((n) => String(base + n));
  const pedidos = await prisma.transaccion.findMany({ where: { numeroOrden: { in: numeros } }, select: { id: true, clienteId: true } });
  const ids = pedidos.map((p) => p.id);
  if (ids.length > 0) {
    await prisma.estadoTransaccionHistorial.deleteMany({ where: { transaccionId: { in: ids } } });
    await prisma.pago.deleteMany({ where: { transaccionId: { in: ids } } });
    await prisma.detalleCompra.deleteMany({ where: { transaccionId: { in: ids } } });
    await prisma.transaccion.deleteMany({ where: { id: { in: ids } } });
  }
  const clientes = [...new Set(pedidos.map((p) => p.clienteId))];
  if (clientes.length > 0) {
    await prisma.equivalenciaCliente.deleteMany({ where: { clienteId: { in: clientes } } });
    await prisma.historialCliente.deleteMany({ where: { clienteId: { in: clientes } } });
    await prisma.cliente.deleteMany({ where: { id: { in: clientes }, celular: null } });
  }
  if (productos.length > 0) {
    await prisma.equivalenciaProducto.deleteMany({ where: { productoId: { in: productos } } });
    await prisma.producto.deleteMany({ where: { id: { in: productos } } });
  }
}

function resolucionesPara(productoIds: Record<string, number>, carga: ReturnType<typeof construirCarga>) {
  const productos: Record<string, number> = {};
  for (const nota of carga.notas) {
    for (const linea of nota.lineas) {
      const id = linea.producto.startsWith("GNOCCHI") ? productoIds.gnocchi : linea.sabor === "CHAMPIÑON" ? productoIds.champi : linea.producto.startsWith("PASTICHO") ? productoIds.pasticho : productoIds.ravioli;
      productos[linea.claveProducto] = id;
    }
  }
  const clientes: Record<string, { accion: "crear"; tipoCliente: "mayorista" | "detal" }> = {};
  for (const nota of carga.notas) clientes[nota.claveCliente] = { accion: "crear", tipoCliente: "mayorista" };
  return { productos, clientes };
}

test("la carga crea pedidos importados sin tocar el inventario y es idempotente", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ prisma, base, carga, productoIds }) => {
    const ejecutar = (resoluciones: ReturnType<typeof resolucionesPara>) => prisma.$transaction((tx) => aplicarCargaVentas(tx, carga(), resoluciones, actor, "prueba.xlsx"));
    const resoluciones = resolucionesPara(productoIds, carga());
    const resultado = await ejecutar(resoluciones);
    assert.equal(resultado.creados, 3);
    assert.equal(resultado.totalUsd, 166.5);

    const pedido = await prisma.transaccion.findUniqueOrThrow({ where: { numeroOrden: String(base) }, include: { detalles: true, pagos: true, historialEstados: true, cliente: true } });
    assert.equal(pedido.importada, true);
    assert.equal(pedido.estado, "pagado");
    assert.equal(pedido.fechaCompra.toISOString(), "2026-08-01T16:00:00.000Z");
    assert.equal(pedido.detalles.length, 2);
    assert.ok(pedido.detalles.some((d) => d.cantidad === 16.5 && d.tipoPrecio === "mayor"));
    assert.equal(pedido.pagos.length, 1);
    assert.equal(pedido.pagos[0].esAbono, true);
    assert.equal(pedido.pagos[0].metodoPago, "NoEspecificado");
    assert.equal(pedido.pagos[0].montoUsd, 114.5);
    assert.equal(pedido.historialEstados[0].motivo, "Importado desde Excel: prueba.xlsx");
    assert.equal(pedido.cliente.celular, null);
    assert.equal(pedido.cliente.apellido, "");
    assert.equal(await prisma.historialCliente.count({ where: { clienteId: pedido.clienteId, accion: "creado" } }), 1);

    const porCobrar = await prisma.transaccion.findUniqueOrThrow({ where: { numeroOrden: String(base + 2) }, include: { pagos: true } });
    assert.equal(porCobrar.estado, "por_cobrar");
    assert.equal(porCobrar.pagos.length, 0);

    for (const id of Object.values(productoIds)) assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id } })).inventario, 50);
    assert.equal(await prisma.fidelidad.count({ where: { transaccionId: pedido.id } }), 0);

    const vista = await prepararVistaPrevia(prisma, carga(), "prueba.xlsx");
    assert.deepEqual(vista.notas.map((n) => n.situacion), ["ya_registrada", "ya_registrada", "ya_registrada"]);
    const segunda = await ejecutar(resoluciones);
    assert.equal(segunda.creados, 0);
    assert.equal(segunda.omitidos, 3);
  });
});

test("un conflicto revierte toda la carga y no guarda equivalencias", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ prisma, base, carga, productoIds }) => {
    const otroCliente = await prisma.cliente.create({ data: { tipoCliente: "detal", nombre: "Otro", apellido: uniqueValue("Conflicto"), nombreBusqueda: uniqueValue("otro conflicto"), celular: uniqueValue("0414") } });
    const existente = await prisma.transaccion.create({ data: { numeroOrden: String(base + 1), clienteId: otroCliente.id, montoSubtotal: 5, montoTotal: 5, estado: "pagado" } });
    try {
      const resoluciones = resolucionesPara(productoIds, carga());
      await assert.rejects(() => prisma.$transaction((tx) => aplicarCargaVentas(tx, carga(), resoluciones, actor, "prueba.xlsx")), CargaError);
      assert.equal(await prisma.transaccion.count({ where: { numeroOrden: { in: [String(base), String(base + 2)] } } }), 0);
      assert.equal(await prisma.equivalenciaProducto.count({ where: { productoId: { in: Object.values(productoIds) } } }), 0);
    } finally {
      await prisma.transaccion.delete({ where: { id: existente.id } });
      await prisma.cliente.delete({ where: { id: otroCliente.id } });
    }
  });
});

test("las resoluciones manuales guardan equivalencias y la siguiente carga las aplica sola", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ prisma, carga, productoIds }) => {
    const resoluciones = resolucionesPara(productoIds, carga());
    await prisma.$transaction((tx) => aplicarCargaVentas(tx, carga(), resoluciones, actor, "prueba.xlsx"));
    const equivalencia = await prisma.equivalenciaProducto.findFirstOrThrow({ where: { productoId: productoIds.pasticho } });
    assert.equal(equivalencia.producto, "PASTICHO");
    assert.equal(equivalencia.sabor, "CARNE");
    assert.equal(equivalencia.gramos, 450);
    const vista = await prepararVistaPrevia(prisma, carga(), "prueba.xlsx");
    assert.equal(vista.resumen.notasNuevas, 0);
  });
});

test("una nota mayor o igual a 1300 avanza el correlativo", { skip: !integrationEnabled }, async () => {
  await withFixture(async ({ prisma, base, carga, productoIds }) => {
    await prisma.$transaction((tx) => aplicarCargaVentas(tx, carga(), resolucionesPara(productoIds, carga()), actor, "prueba.xlsx"));
    const [{ last_value, is_called }] = await prisma.$queryRaw<Array<{ last_value: bigint; is_called: boolean }>>`SELECT last_value, is_called FROM orden_correlativo_seq`;
    assert.ok(is_called);
    assert.ok(Number(last_value) >= base + 2);
  });
});
