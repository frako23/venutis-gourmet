import type { Prisma } from "@prisma/client";

import { clientTypeLabel, normalizeRifInput, normalizeSearchName } from "../client-rules";
import type { ClientRow, PaginatedRows } from "./types";
import { prisma } from "../prisma";

export const CLIENT_PAGE_SIZE = 50;

type SearchParamValue = string | string[] | undefined;
export type ClientSearchParams = {
  q?: string;
  tipo?: "todos" | "consumidor" | "mayorista";
  page: number;
};

export const clientListSelect = {
  id: true,
  tipoCliente: true,
  nombre: true,
  apellido: true,
  rif: true,
  celular: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  direcciones: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      tipo: true,
      urbanizacion: true,
      direccion: true,
    },
  },
  _count: {
    select: { transacciones: true },
  },
  transacciones: {
    orderBy: { fechaCompra: "desc" },
    take: 1,
    select: { fechaCompra: true },
  },
} satisfies Prisma.ClienteSelect;

type ClientListRecord = Prisma.ClienteGetPayload<{ select: typeof clientListSelect }>;

function first(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}
export function parseClientSearchParams(params: Record<string, SearchParamValue>): ClientSearchParams {
  const rawPage = Number(first(params.page) || 1);
  const rawType = first(params.tipo);
  const tipo = rawType === "consumidor" || rawType === "mayorista" ? rawType : "todos";
  const q = first(params.q)?.trim() || undefined;

  return {
    q,
    tipo,
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
  };
}

export function buildClientWhere({ q, tipo }: Pick<ClientSearchParams, "q" | "tipo">): Prisma.ClienteWhereInput {
  const where: Prisma.ClienteWhereInput = {};
  if (tipo === "consumidor") where.tipoCliente = "detal";
  if (tipo === "mayorista") where.tipoCliente = "mayorista";

  const normalizedName = normalizeSearchName(q ?? "");
  const nameTokens = normalizedName ? normalizedName.split(" ").filter(Boolean) : [];
  const normalizedRif = normalizeRifInput(q);
  const canSearchRif = /^[VEJGP0-9]+$/.test(normalizedRif);
  const searchConditions: Prisma.ClienteWhereInput[] = [];

  if (nameTokens.length > 0) {
    searchConditions.push({ AND: nameTokens.map((token) => ({ nombreBusqueda: { contains: token } })) });
  }
  if (canSearchRif && normalizedRif) {
    searchConditions.push({ rif: { contains: normalizedRif } });
  }

  if (searchConditions.length > 0) where.OR = searchConditions;
  return where;
}

export function toClientRow(client: ClientListRecord): ClientRow {
  return {
    id: client.id,
    tipoCliente: client.tipoCliente,
    tipoLabel: clientTypeLabel(client.tipoCliente),
    nombre: client.nombre,
    apellido: client.apellido,
    rif: client.rif,
    celular: client.celular,
    email: client.email,
    direcciones: client.direcciones,
    cantidadTransacciones: client._count.transacciones,
    ultimaCompra: client.transacciones[0]?.fechaCompra.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

export async function getClientsPage(params: ClientSearchParams): Promise<PaginatedRows<ClientRow>> {
  const where = buildClientWhere(params);
  const [total, clients] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }, { id: "asc" }],
      skip: (params.page - 1) * CLIENT_PAGE_SIZE,
      take: CLIENT_PAGE_SIZE,
      select: clientListSelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / CLIENT_PAGE_SIZE));
  const page = Math.min(params.page, totalPages);

  if (page !== params.page) {
    const corrected = await prisma.cliente.findMany({
      where,
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }, { id: "asc" }],
      skip: (page - 1) * CLIENT_PAGE_SIZE,
      take: CLIENT_PAGE_SIZE,
      select: clientListSelect,
    });
    return { rows: corrected.map(toClientRow), page, pageSize: CLIENT_PAGE_SIZE, total, totalPages };
  }

  return { rows: clients.map(toClientRow), page, pageSize: CLIENT_PAGE_SIZE, total, totalPages };
}
