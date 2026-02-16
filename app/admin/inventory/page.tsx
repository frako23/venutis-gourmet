import { InventoryTable } from "@/components/admin/inventario/inventoryTable";
import { PrismaClient } from "@prisma/client";

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

  return <InventoryTable products={products} />;
}
