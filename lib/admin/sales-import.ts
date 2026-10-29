import type { Prisma, PrismaClient } from "@prisma/client";

import { normalizeSearchName } from "../client-rules.ts";
import {
  clavesDeClientes,
  clavesDeProductos,
  diaCaracas,
  evaluarCarga,
  fechaAlMediodiaCaracas,
  resolverClientes,
  resolverProductos,
  type CargaConstruida,
  type NotaEvaluada,
  type PedidoExistente,
} from "./sales-import-core.ts";
import type { ProblemaCarga, ResolucionesCarga, VistaPreviaCarga } from "./types.ts";

type Db = PrismaClient | Prisma.TransactionClient;
type Actor = { id: string; email: string | null };

export class CargaError extends Error {
  constructor(message: string, public readonly problemas?: ProblemaCarga[]) {
    super(message);
  }
}

async function cargarContexto(db: Db, carga: CargaConstruida) {
  const [catalogo, clientes, equivalenciasProducto, equivalenciasCliente, pedidos] = await Promise.all([
    db.producto.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, categoria: true, precioDetal: true, precioMayorista: true } }),
    db.cliente.findMany({ select: { id: true, nombre: true, apellido: true, nombreBusqueda: true } }),
    db.equivalenciaProducto.findMany({ select: { clave: true, productoId: true } }),
    db.equivalenciaCliente.findMany({ select: { clave: true, clienteId: true } }),
    db.transaccion.findMany({
      where: { numeroOrden: { in: carga.notas.map((nota) => nota.numero) } },
      select: { id: true, numeroOrden: true, clienteId: true, fechaCompra: true, montoSubtotal: true, montoTotal: true, cliente: { select: { nombre: true, apellido: true, nombreBusqueda: true } } },
    }),
  ]);
  const existentes = new Map<string, PedidoExistente>(
    pedidos.map((pedido) => [
      pedido.numeroOrden,
      {
        id: pedido.id,
        numeroOrden: pedido.numeroOrden,
        clienteId: pedido.clienteId,
        clienteNombre: `${pedido.cliente.nombre} ${pedido.cliente.apellido}`.trim(),
        clienteClave: pedido.cliente.nombreBusqueda,
        dia: diaCaracas(pedido.fechaCompra),
        importeUsd: pedido.montoSubtotal || pedido.montoTotal,
        totalUsd: pedido.montoTotal,
      },
    ]),
  );
  return {
    catalogo,
    clientes,
    existentes,
    equivalenciasProducto: new Map(equivalenciasProducto.map((e) => [e.clave, e.productoId])),
    equivalenciasCliente: new Map(equivalenciasCliente.map((e) => [e.clave, e.clienteId])),
  };
}

function clientesPorClave(resueltos: ReturnType<typeof resolverClientes>, resoluciones: ResolucionesCarga["clientes"] = {}) {
  const mapa = new Map<string, number | null>();
  for (const cliente of resueltos) {
    const elegido = resoluciones[cliente.clave];
    if (elegido?.accion === "vincular") mapa.set(cliente.clave, elegido.clienteId);
    else mapa.set(cliente.clave, cliente.resolucion.tipo === "pendiente" ? null : cliente.resolucion.clienteId);
  }
  return mapa;
}

/** Vista previa de una carga: no escribe nada. */
export async function prepararVistaPrevia(db: Db, carga: CargaConstruida, nombreArchivo: string): Promise<VistaPreviaCarga> {
  const contexto = await cargarContexto(db, carga);
  const todosLosClientes = resolverClientes(clavesDeClientes(carga.notas), contexto.clientes, contexto.equivalenciasCliente);
  const evaluacion = evaluarCarga(carga, contexto.existentes, clientesPorClave(todosLosClientes));
  const nuevas = evaluacion.notas.filter((nota) => nota.situacion === "nueva");

  const productos = resolverProductos(clavesDeProductos(nuevas), contexto.catalogo, contexto.equivalenciasProducto).map((producto) => {
    const resolucion = producto.resolucion;
    const elegido = resolucion.tipo === "pendiente" ? null : contexto.catalogo.find((p) => p.id === resolucion.productoId);
    return { ...producto, preciosCatalogo: elegido ? { detal: elegido.precioDetal, mayor: elegido.precioMayorista } : null };
  });
  const clientes = resolverClientes(clavesDeClientes(nuevas), contexto.clientes, contexto.equivalenciasCliente);

  return {
    archivo: { nombre: nombreArchivo, hoja: carga.hoja, filaEncabezados: carga.filaEncabezados },
    resumen: {
      notasNuevas: nuevas.length,
      notasYaRegistradas: evaluacion.notas.filter((nota) => nota.situacion === "ya_registrada").length,
      notasConError: evaluacion.notas.filter((nota) => nota.situacion === "con_error" || nota.situacion === "conflicto").length,
      lineas: carga.totalLineas,
      totalUsd: Math.round(nuevas.reduce((suma, nota) => suma + nota.totalUsd, 0) * 100) / 100,
      porCobrarUsd: Math.round(nuevas.reduce((suma, nota) => suma + nota.saldoUsd, 0) * 100) / 100,
    },
    notas: evaluacion.notas.map((nota) => ({
      numero: nota.numero,
      fecha: nota.fecha,
      claveCliente: nota.claveCliente,
      textoCliente: nota.textoCliente,
      totalUsd: nota.totalUsd,
      abonadoUsd: nota.abonadoUsd,
      saldoUsd: nota.saldoUsd,
      estadoResultante: nota.estadoResultante,
      situacion: nota.situacion,
      pedidoExistente: nota.pedidoExistente
        ? { id: nota.pedidoExistente.id, cliente: nota.pedidoExistente.clienteNombre, fecha: nota.pedidoExistente.dia, totalUsd: nota.pedidoExistente.totalUsd }
        : null,
      lineas: nota.lineas.map((linea) => ({
        fila: linea.fila,
        claveProducto: linea.claveProducto,
        descripcion: linea.descripcion,
        cantidad: linea.cantidad,
        tipoPrecio: linea.tipoPrecio,
        precioUnitarioUsd: linea.precioUnitarioUsd,
        importeUsd: linea.importeUsd,
        abonadoUsd: linea.abonadoUsd,
      })),
    })),
    productos,
    clientes,
    catalogo: contexto.catalogo,
    problemas: evaluacion.problemas,
    puedeConfirmar: evaluacion.puedeConfirmar,
  };
}

/** Crea los pedidos de la carga. Debe ejecutarse dentro de una transacción; no toca inventario ni fidelidad. */
export async function aplicarCargaVentas(
  tx: Prisma.TransactionClient,
  carga: CargaConstruida,
  resoluciones: ResolucionesCarga,
  actor: Actor,
  nombreArchivo: string,
) {
  const contexto = await cargarContexto(tx, carga);
  const todosLosClientes = resolverClientes(clavesDeClientes(carga.notas), contexto.clientes, contexto.equivalenciasCliente);
  const evaluacion = evaluarCarga(carga, contexto.existentes, clientesPorClave(todosLosClientes, resoluciones.clientes));
  if (!evaluacion.puedeConfirmar) {
    throw new CargaError("La carga tiene problemas sin resolver. Revisa la vista previa.", evaluacion.problemas.filter((p) => p.nivel === "error"));
  }

  const nuevas = evaluacion.notas.filter((nota): nota is NotaEvaluada => nota.situacion === "nueva");
  const omitidos = evaluacion.notas.length - nuevas.length;
  if (nuevas.length === 0) return { creados: 0, omitidos, totalUsd: 0 };

  const productosAuto = resolverProductos(clavesDeProductos(nuevas), contexto.catalogo, contexto.equivalenciasProducto);
  const clientesAuto = resolverClientes(clavesDeClientes(nuevas), contexto.clientes, contexto.equivalenciasCliente);

  const productoPorClave = new Map<string, number>();
  for (const producto of productosAuto) {
    const elegido = resoluciones.productos[producto.clave] ?? (producto.resolucion.tipo === "equivalencia" || producto.resolucion.tipo === "exacta" ? producto.resolucion.productoId : undefined);
    if (elegido === undefined) throw new CargaError("La carga tiene problemas sin resolver. Revisa la vista previa.");
    productoPorClave.set(producto.clave, elegido);
  }
  const idsProducto = new Set(contexto.catalogo.map((p) => p.id));
  if ([...productoPorClave.values()].some((id) => !idsProducto.has(id))) {
    throw new CargaError("Un producto o cliente elegido ya no existe. Vuelve a previsualizar el archivo.");
  }

  const idsCliente = new Set(contexto.clientes.map((c) => c.id));
  const clientePorClave = new Map<string, number>();
  for (const cliente of clientesAuto) {
    const elegido = resoluciones.clientes[cliente.clave];
    if (elegido?.accion === "crear") {
      const creado = await tx.cliente.create({
        data: { tipoCliente: elegido.tipoCliente, nombre: cliente.texto, apellido: "", nombreBusqueda: normalizeSearchName(cliente.texto), celular: null },
        select: { id: true },
      });
      await tx.historialCliente.create({ data: { clienteId: creado.id, actorId: actor.id, actorEmail: actor.email, accion: "creado", camposModificados: [] } });
      clientePorClave.set(cliente.clave, creado.id);
      continue;
    }
    const id = elegido?.accion === "vincular" ? elegido.clienteId : cliente.resolucion.tipo === "pendiente" ? undefined : cliente.resolucion.clienteId;
    if (id === undefined) throw new CargaError("La carga tiene problemas sin resolver. Revisa la vista previa.");
    if (!idsCliente.has(id)) throw new CargaError("Un producto o cliente elegido ya no existe. Vuelve a previsualizar el archivo.");
    clientePorClave.set(cliente.clave, id);
  }

  let totalUsd = 0;
  for (const nota of [...nuevas].sort((a, b) => Number(a.numero) - Number(b.numero))) {
    const fecha = fechaAlMediodiaCaracas(nota.fecha);
    const pedido = await tx.transaccion.create({
      data: {
        numeroOrden: nota.numero,
        clienteId: clientePorClave.get(nota.claveCliente)!,
        fechaCompra: fecha,
        montoSubtotal: nota.totalUsd,
        montoTotal: nota.totalUsd,
        montoDescuento: 0,
        montoDelivery: 0,
        estado: nota.estadoResultante,
        importada: true,
      },
      select: { id: true },
    });
    await tx.detalleCompra.createMany({
      data: nota.lineas.map((linea) => ({
        transaccionId: pedido.id,
        productoId: productoPorClave.get(linea.claveProducto)!,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitarioUsd,
        tipoPrecio: linea.tipoPrecio!,
      })),
    });
    if (nota.abonadoUsd > 0) {
      await tx.pago.create({
        data: { transaccionId: pedido.id, montoUsd: nota.abonadoUsd, metodoPago: "NoEspecificado", fechaPago: fecha, esAbono: true, actorId: actor.id, actorEmail: actor.email },
      });
    }
    await tx.estadoTransaccionHistorial.create({
      data: { transaccionId: pedido.id, estadoAnterior: null, estadoNuevo: nota.estadoResultante, actorId: actor.id, actorEmail: actor.email, motivo: `Importado desde Excel: ${nombreArchivo.slice(0, 120)}` },
    });
    totalUsd += nota.totalUsd;
  }

  for (const producto of productosAuto) {
    const elegido = resoluciones.productos[producto.clave];
    const resolucion = producto.resolucion;
    const automatica = resolucion.tipo === "equivalencia" || resolucion.tipo === "exacta";
    if (elegido === undefined || (resolucion.tipo !== "pendiente" && automatica && resolucion.productoId === elegido)) continue;
    const datos = { productoId: elegido, grupo: producto.grupo, producto: producto.producto, sabor: producto.sabor, gramos: producto.gramos, actorEmail: actor.email };
    await tx.equivalenciaProducto.upsert({ where: { clave: producto.clave }, create: { clave: producto.clave, ...datos }, update: datos });
  }
  for (const cliente of clientesAuto) {
    const elegido = resoluciones.clientes[cliente.clave];
    if (elegido?.accion !== "vincular") continue;
    const resolucion = cliente.resolucion;
    if (resolucion.tipo !== "pendiente" && resolucion.clienteId === elegido.clienteId) continue;
    await tx.equivalenciaCliente.upsert({
      where: { clave: cliente.clave },
      create: { clave: cliente.clave, clienteId: elegido.clienteId, actorEmail: actor.email },
      update: { clienteId: elegido.clienteId, actorEmail: actor.email },
    });
  }

  const mayor = Math.max(...nuevas.map((nota) => Number(nota.numero)));
  if (mayor >= 1300) {
    await tx.$queryRaw`SELECT setval('orden_correlativo_seq', GREATEST(${mayor}::bigint, (SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END FROM orden_correlativo_seq)))`;
  }

  return { creados: nuevas.length, omitidos, totalUsd: Math.round(totalUsd * 100) / 100 };
}
