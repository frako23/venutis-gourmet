import { InventoryTable } from "@/components/admin/inventario/inventoryTable";
import { prisma } from "@/lib/prisma";

export default async function InventoryManager() {
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
