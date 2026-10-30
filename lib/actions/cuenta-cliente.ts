"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CAMPOS_INTERNOS_CLIENTE, type ClienteTienda, normalizeSearchName } from "@/lib/client-rules";
import { obtenerClienteDeSesion, obtenerSesionCliente } from "@/lib/cuenta-cliente";
import { resolverVinculacion } from "@/lib/cuenta-cliente-rules";
import { saldoAFavorDisponible } from "@/lib/admin/abonos";
import { puntosDisponiblesDelCliente } from "@/lib/fidelidad";
import { unidadesDisponibles } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";

export type RegistroClienteState =
  | { status: "idle"; message: string }
  | { status: "success"; estado: "vinculada" | "pendiente"; message: string }
  | { status: "error"; message: string };

const registroSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(60, "El nombre es demasiado largo."),
  apellido: z.string().trim().min(2, "Escribe tu apellido.").max(60, "El apellido es demasiado largo."),
  celular: z.string().trim().min(10, "Escribe un teléfono válido, con al menos 10 dígitos.").max(30, "El teléfono es demasiado largo."),
});

const CONFLICTO = "Ese registro ya tiene una cuenta. Escríbenos por WhatsApp para ayudarte.";

/** Completa el registro de una cuenta nueva: la vincula, la deja pendiente o crea el cliente. */
export async function completarRegistroCliente(_previous: RegistroClienteState, formData: FormData): Promise<RegistroClienteState> {
  const sesion = await obtenerSesionCliente();
  if (sesion.estado === "anonimo") return { status: "error", message: "Inicia sesión para completar tu registro." };
  if (sesion.estado === "correo_sin_verificar") return { status: "error", message: "Verifica tu correo para continuar." };
  if (sesion.estado !== "sin_vinculo") return { status: "error", message: "Tu cuenta ya está registrada." };

  const parsed = registroSchema.safeParse({ nombre: formData.get("nombre"), apellido: formData.get("apellido"), celular: formData.get("celular") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa tus datos." };

  const usuario = await stackServerApp.getUser();
  if (!usuario) return { status: "error", message: "Inicia sesión para completar tu registro." };
  const { nombre, apellido, celular } = parsed.data;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const porCorreo = await tx.cliente.findFirst({ where: { email: { equals: sesion.email, mode: "insensitive" } }, select: { id: true, cuenta: { select: { id: true } } } });
      const porTelefono = await tx.cliente.findUnique({ where: { celular }, select: { id: true, cuenta: { select: { id: true } } } });
      const resolucion = resolverVinculacion({
        correoVerificado: true,
        clientePorCorreo: porCorreo ? { id: porCorreo.id, tieneCuenta: porCorreo.cuenta !== null } : null,
        clientePorTelefono: porTelefono ? { id: porTelefono.id, tieneCuenta: porTelefono.cuenta !== null } : null,
        telefonoIndicado: true,
      });

      if (resolucion.accion === "vincular" || resolucion.accion === "pendiente") {
        const estado = resolucion.accion === "vincular" ? ("vinculada" as const) : ("pendiente" as const);
        await tx.cuentaCliente.create({ data: { stackUserId: usuario.id, email: sesion.email, clienteId: resolucion.clienteId, estado } });
        return { estado };
      }
      if (resolucion.accion === "crear_cliente") {
        const cliente = await tx.cliente.create({
          data: { tipoCliente: "detal", nombre, apellido, celular, email: sesion.email, nombreBusqueda: normalizeSearchName(nombre, apellido) },
          select: { id: true },
        });
        await tx.cuentaCliente.create({ data: { stackUserId: usuario.id, email: sesion.email, clienteId: cliente.id, estado: "vinculada" } });
        await tx.historialCliente.create({ data: { clienteId: cliente.id, actorId: `cliente:${usuario.id}`, actorEmail: sesion.email, accion: "creado", camposModificados: ["cliente", "cuenta"] } });
        return { estado: "vinculada" as const };
      }
      return null;
    });

    if (!resultado) return { status: "error", message: CONFLICTO };
    revalidatePath("/mi-cuenta");
    return resultado.estado === "vinculada"
      ? { status: "success", estado: "vinculada", message: "¡Listo! Ya puedes ver tus puntos y tu saldo." }
      : { status: "success", estado: "pendiente", message: "Encontramos un registro con ese teléfono. Lo confirmaremos y te avisaremos." };
  } catch (error) {
    // Dos peticiones a la vez o un dato único repetido: no se deja nada a medias.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: "error", message: CONFLICTO };
    return { status: "error", message: "No pudimos completar tu registro. Inténtalo de nuevo." };
  }
}

/** El cliente de la sesión vinculada para rellenar el checkout. Solo sale de la sesión, nunca de un id enviado. */
export async function obtenerClienteCheckout(): Promise<ClienteTienda | null> {
  const clienteId = await obtenerClienteDeSesion();
  if (!clienteId) return null;
  return prisma.cliente.findUnique({ where: { id: clienteId }, omit: CAMPOS_INTERNOS_CLIENTE });
}

export type BeneficiosCheckout =
  | { disponible: false }
  | {
      disponible: true;
      puntos: number;
      saldoAFavorUsd: number;
      premios: Array<{
        id: number;
        nombre: string;
        tipo: "descuento" | "producto";
        costoPuntos: number;
        montoDescuentoUsd: number | null;
        cantidad: number | null;
        producto: { id: number; nombre: string; unidadesDisponibles: number } | null;
      }>;
    };

/** Puntos, saldo a favor y premios que el cliente de la sesión puede usar al comprar. Solo depende de la sesión. */
export async function obtenerBeneficiosCheckout(): Promise<BeneficiosCheckout> {
  const clienteId = await obtenerClienteDeSesion();
  if (!clienteId) return { disponible: false };
  const [puntos, saldoAFavorUsd, premios] = await Promise.all([
    puntosDisponiblesDelCliente(prisma, clienteId),
    saldoAFavorDisponible(prisma, clienteId),
    prisma.premio.findMany({ where: { activo: true }, orderBy: { costoPuntos: "asc" }, include: { producto: { select: { id: true, nombre: true, inventario: true } } } }),
  ]);
  return {
    disponible: true,
    puntos,
    saldoAFavorUsd,
    premios: premios
      .filter((premio) => premio.costoPuntos <= puntos)
      .map((premio) => ({
        id: premio.id,
        nombre: premio.nombre,
        tipo: premio.tipo,
        costoPuntos: premio.costoPuntos,
        montoDescuentoUsd: premio.montoDescuentoUsd,
        cantidad: premio.cantidad,
        producto: premio.producto ? { id: premio.producto.id, nombre: premio.producto.nombre, unidadesDisponibles: unidadesDisponibles(premio.producto.inventario) } : null,
      })),
  };
}
