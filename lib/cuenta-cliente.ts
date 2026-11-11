import "server-only";

import { Prisma, type TipoCliente } from "@prisma/client";

import { consultarDeudaCliente, calcularSaldo, ESTADOS_CON_DEUDA, saldoAFavorDisponible } from "@/lib/admin/abonos";
import { resolverVinculacion } from "@/lib/cuenta-cliente-rules";
import { acreditarBonoBienvenida, describirRecompensa, estadoPremio, type EstadoPremio, premioMasCercano } from "@/lib/fidelidad";
import { unidadesDisponibles } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";

export type SesionCliente =
  | { estado: "anonimo" }
  | { estado: "correo_sin_verificar"; email: string }
  | { estado: "sin_vinculo"; email: string; nombreSugerido: string | null }
  | { estado: "pendiente"; email: string }
  | { estado: "vinculada"; email: string; clienteId: number; tipoCliente: TipoCliente; nombre: string };

const MOVIMIENTOS_VISIBLES = 50;

/** Lee la sesión de Stack y la vincula con un cliente cuando el correo verificado coincide con uno sin cuenta. */
export async function obtenerSesionCliente(): Promise<SesionCliente> {
  const usuario = await stackServerApp.getUser();
  if (!usuario) return { estado: "anonimo" };
  const email = usuario.primaryEmail?.trim().toLowerCase() ?? "";
  if (!email || !usuario.primaryEmailVerified) return { estado: "correo_sin_verificar", email };

  const cuentaDe = () => prisma.cuentaCliente.findUnique({ where: { stackUserId: usuario.id }, include: { cliente: { select: { id: true, nombre: true, apellido: true, tipoCliente: true } } } });
  let cuenta = await cuentaDe();

  if (!cuenta) {
    const porCorreo = await prisma.cliente.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, cuenta: { select: { id: true } } } });
    const resolucion = resolverVinculacion({
      correoVerificado: true,
      clientePorCorreo: porCorreo ? { id: porCorreo.id, tieneCuenta: porCorreo.cuenta !== null } : null,
      clientePorTelefono: null,
      telefonoIndicado: false,
    });
    if (resolucion.accion === "vincular") {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.cuentaCliente.create({ data: { stackUserId: usuario.id, email, clienteId: resolucion.clienteId, estado: "vinculada" } });
          await acreditarBonoBienvenida(tx, resolucion.clienteId);
        });
      } catch (error) {
        // Otra petición ya la creó (única por usuario y por cliente): se relee abajo.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      }
      cuenta = await cuentaDe();
    }
  }

  if (!cuenta) return { estado: "sin_vinculo", email, nombreSugerido: usuario.displayName ?? null };
  if (cuenta.estado === "pendiente") return { estado: "pendiente", email };
  return { estado: "vinculada", email, clienteId: cuenta.cliente.id, tipoCliente: cuenta.cliente.tipoCliente, nombre: `${cuenta.cliente.nombre} ${cuenta.cliente.apellido}`.trim() };
}

/** El `clienteId` de la sesión, solo si la cuenta está vinculada. Es la única fuente del cliente en la tienda. */
export async function obtenerClienteDeSesion() {
  const sesion = await obtenerSesionCliente();
  return sesion.estado === "vinculada" ? sesion.clienteId : null;
}

export type ResumenCuenta = {
  nombre: string;
  tipoCliente: TipoCliente;
  puntos: {
    disponibles: number;
    mostrar: boolean;
  };
  deudaUsd: number;
  pedidosPendientes: Array<{ numeroOrden: string; fecha: Date; totalUsd: number; saldoUsd: number; estado: string }>;
  saldoAFavorUsd: number;
  movimientosSaldo: Array<{ fecha: Date; montoUsd: number; concepto: string; numeroOrden: string | null }>;
  pedidos: Array<{ id: number; numeroOrden: string; fecha: Date; totalUsd: number; estado: string; saldoUsd: number }>;
};

const conceptoSaldo: Record<string, string> = {
  sobrepago: "Pago de más",
  pago_cuenta: "Pago a cuenta",
  pedido_cancelado: "Pedido cancelado",
  aplicacion_pedido: "Usado en un pedido",
  anulacion: "Anulación",
  ajuste: "Ajuste",
};

const conceptoPuntos: Record<string, string> = {
  acumulacion: "Puntos ganados",
  redencion: "Canje",
  devolucion: "Devolución de puntos",
  reversion: "Puntos revertidos",
  ajuste: "Ajuste",
  bono: "Bono de bienvenida",
};

/** Resumen para "Mi cuenta". Solo se llama con el `clienteId` de la sesión y nunca incluye datos internos. */
export async function obtenerResumenCuenta(clienteId: number): Promise<ResumenCuenta> {
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: clienteId }, select: { nombre: true, apellido: true, tipoCliente: true } });
  const [puntosAgg, deudaUsd, saldoAFavorUsd, movimientosSaldo, pedidos] = await Promise.all([
    prisma.fidelidad.aggregate({ where: { clienteId }, _sum: { puntos: true } }),
    consultarDeudaCliente(prisma, clienteId),
    saldoAFavorDisponible(prisma, clienteId),
    prisma.movimientoSaldo.findMany({ where: { clienteId }, orderBy: { createdAt: "desc" }, take: MOVIMIENTOS_VISIBLES, select: { createdAt: true, montoUsd: true, origen: true, transaccion: { select: { numeroOrden: true } } } }),
    prisma.transaccion.findMany({
      where: { clienteId },
      orderBy: { fechaCompra: "desc" },
      take: MOVIMIENTOS_VISIBLES,
      select: { id: true, numeroOrden: true, fechaCompra: true, montoTotal: true, estado: true, pagos: { select: { esAbono: true, montoUsd: true, anuladoEn: true } } },
    }),
  ]);
  const disponibles = puntosAgg._sum.puntos ?? 0;
  const conSaldo = pedidos.map((pedido) => ({ ...pedido, saldoUsd: calcularSaldo(pedido) }));

  return {
    nombre: `${cliente.nombre} ${cliente.apellido}`.trim(),
    tipoCliente: cliente.tipoCliente,
    puntos: {
      disponibles,
      mostrar: cliente.tipoCliente === "detal" || disponibles > 0,
    },
    deudaUsd,
    pedidosPendientes: conSaldo
      .filter((pedido) => (ESTADOS_CON_DEUDA as readonly string[]).includes(pedido.estado) && pedido.saldoUsd > 0)
      .map((pedido) => ({ numeroOrden: pedido.numeroOrden, fecha: pedido.fechaCompra, totalUsd: pedido.montoTotal, saldoUsd: pedido.saldoUsd, estado: pedido.estado })),
    saldoAFavorUsd,
    movimientosSaldo: movimientosSaldo.map((m) => ({ fecha: m.createdAt, montoUsd: m.montoUsd, concepto: conceptoSaldo[m.origen] ?? m.origen, numeroOrden: m.transaccion?.numeroOrden ?? null })),
    pedidos: conSaldo.map((pedido) => ({ id: pedido.id, numeroOrden: pedido.numeroOrden, fecha: pedido.fechaCompra, totalUsd: pedido.montoTotal, estado: pedido.estado, saldoUsd: pedido.saldoUsd })),
  };
}

const usdTexto = (valor: number) => `USD ${valor.toFixed(2).replace(".", ",")}`;

export type MisPuntos = {
  nombre: string;
  mostrar: boolean;
  acumula: boolean;
  disponibles: number;
  proximo: { nombre: string; faltan: number } | null;
  premios: Array<{ id: number; nombre: string; descripcion: string | null; costoPuntos: number; recompensa: string; condiciones: string[]; estado: EstadoPremio }>;
  movimientos: Array<{ fecha: Date; puntos: number; concepto: string; numeroOrden: string | null }>;
};

/** Datos de "Mis puntos". Solo se llama con el `clienteId` de la sesión; nunca incluye autor ni motivo de los movimientos. */
export async function obtenerMisPuntos(clienteId: number): Promise<MisPuntos> {
  const [cliente, puntosAgg, movimientos, premios] = await Promise.all([
    prisma.cliente.findUniqueOrThrow({ where: { id: clienteId }, select: { nombre: true, apellido: true, tipoCliente: true } }),
    prisma.fidelidad.aggregate({ where: { clienteId }, _sum: { puntos: true } }),
    prisma.fidelidad.findMany({ where: { clienteId }, orderBy: { fecha: "desc" }, take: MOVIMIENTOS_VISIBLES, select: { fecha: true, puntos: true, tipoMovimiento: true, descripcion: true, transaccion: { select: { numeroOrden: true } } } }),
    prisma.premio.findMany({ where: { activo: true }, orderBy: { costoPuntos: "asc" }, include: { producto: { select: { nombre: true, inventario: true } } } }),
  ]);
  const disponibles = puntosAgg._sum.puntos ?? 0;
  const vista = premios.map((premio) => {
    const sinExistencia = premio.tipo === "producto" && unidadesDisponibles(premio.producto?.inventario ?? 0) < (premio.cantidad ?? 1);
    const condiciones: string[] = [];
    if (premio.compraMinimaUsd) condiciones.push(`Compra mínima de ${usdTexto(premio.compraMinimaUsd)} en productos`);
    if (premio.tipo === "delivery") condiciones.push("Solo en pedidos con delivery");
    return {
      id: premio.id,
      nombre: premio.nombre,
      descripcion: premio.descripcion,
      costoPuntos: premio.costoPuntos,
      recompensa: describirRecompensa({ tipo: premio.tipo, montoDescuentoUsd: premio.montoDescuentoUsd, cantidad: premio.cantidad, productoNombre: premio.producto?.nombre ?? null }),
      condiciones,
      estado: estadoPremio({ costoPuntos: premio.costoPuntos, puntosDisponibles: disponibles, sinExistencia }),
    };
  });
  return {
    nombre: `${cliente.nombre} ${cliente.apellido}`.trim(),
    mostrar: cliente.tipoCliente === "detal" || disponibles > 0,
    acumula: cliente.tipoCliente === "detal",
    disponibles,
    proximo: premioMasCercano(vista.filter((premio) => premio.estado.tipo !== "sin_existencia"), disponibles),
    premios: vista,
    movimientos: movimientos.map((m) => ({ fecha: m.fecha, puntos: m.puntos, concepto: m.descripcion ?? conceptoPuntos[m.tipoMovimiento] ?? m.tipoMovimiento, numeroOrden: m.transaccion?.numeroOrden ?? null })),
  };
}
