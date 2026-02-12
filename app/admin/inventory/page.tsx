import { InventoryTable } from "@/components/admin/inventario/inventoryTable";
import { ActionButton } from "@/components/admin/UI/action-button";
import { InventoryHeader } from "@/components/admin/UI/inventory-header";
import { PrismaClient } from "@prisma/client";
import { Download, Filter } from "lucide-react";
import Image from "next/image";

export default async function InventoryManager() {
  const prisma = new PrismaClient();
  const [products] = await Promise.all([
    prisma.producto.findMany({
      orderBy: { createdAt: "desc" },

      // AGREGAR ESTO:
      include: {
        imagenes: true, // Esto hace el "JOIN" con la tabla de imágenes
      },
    }),
  ]);

  return (
    <InventoryTable products={products} />
  );
}


