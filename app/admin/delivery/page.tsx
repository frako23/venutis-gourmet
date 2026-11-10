import { DeliveryZonesTable } from "@/components/admin/delivery/deliveryZonesTable";
import { ordenarZonas } from "@/lib/delivery-zone-rules";
import { prisma } from "@/lib/prisma";

export default async function Delivery() {
  const zonas = await prisma.zonaDelivery.findMany({
    select: { id: true, nombre: true, costoUsd: true, activa: true },
  });

  return <DeliveryZonesTable zonas={ordenarZonas(zonas)} />;
}
