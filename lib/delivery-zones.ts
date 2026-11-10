import "server-only";

import { ordenarZonas, type ZonaDeliveryVista } from "@/lib/delivery-zone-rules";
import { prisma } from "@/lib/prisma";

// Única regla de qué zonas se ofrecen fuera del panel (solo activas, en orden).
export async function listarZonasActivas(): Promise<ZonaDeliveryVista[]> {
  const zonas = await prisma.zonaDelivery.findMany({
    where: { activa: true },
    select: { id: true, nombre: true, costoUsd: true },
  });
  return ordenarZonas(zonas);
}
