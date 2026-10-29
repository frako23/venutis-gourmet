"use server";

import { PRODUCT_ORDER } from "@/lib/constants/constants";
import { unidadesDisponibles } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import type { QuoteProduct } from "@/lib/cotizacion-rapida";

export type QuoteCatalogChange = {
  id: number;
  reason: "missing" | "price" | "inventory";
  previous?: number;
  current?: number;
};

const orderForProduct = (name: string) =>
  PRODUCT_ORDER[name.trim().toUpperCase()] ?? 999;

function toQuoteProduct(product: {
  id: number;
  nombre: string;
  categoria: string;
  precioDetal: number;
  inventario: number;
  imagenes: Array<{ url: string }>;
}): QuoteProduct {
  return {
    id: product.id,
    nombre: product.nombre,
    categoria: product.categoria,
    precioUsd: product.precioDetal,
    inventario: unidadesDisponibles(product.inventario),
    ...(product.imagenes[0]?.url
      ? { imagenUrl: product.imagenes[0].url }
      : {}),
  };
}

export async function getCurrentQuoteCatalog(
  snapshots: QuoteProduct[],
): Promise<{ products: QuoteProduct[]; changes: QuoteCatalogChange[] }> {
  const ids = [...new Set(snapshots.map((product) => product.id))];
  if (!ids.length) return { products: [], changes: [] };

  const currentRows = await prisma.producto.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      nombre: true,
      categoria: true,
      precioDetal: true,
      inventario: true,
      imagenes: { select: { url: true }, take: 1 },
    },
  });
  const products = currentRows
    .map(toQuoteProduct)
    .sort((a, b) => orderForProduct(a.nombre) - orderForProduct(b.nombre));
  const currentById = new Map(products.map((product) => [product.id, product]));
  const changes: QuoteCatalogChange[] = [];

  for (const snapshot of snapshots) {
    const current = currentById.get(snapshot.id);
    if (!current) {
      changes.push({ id: snapshot.id, reason: "missing" });
      continue;
    }
    if (current.precioUsd !== snapshot.precioUsd) {
      changes.push({
        id: snapshot.id,
        reason: "price",
        previous: snapshot.precioUsd,
        current: current.precioUsd,
      });
    }
    if (current.inventario !== snapshot.inventario) {
      changes.push({
        id: snapshot.id,
        reason: "inventory",
        previous: snapshot.inventario,
        current: current.inventario,
      });
    }
  }

  return { products, changes };
}
