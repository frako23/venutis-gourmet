import { EditProductForm } from "@/components/admin/edit-product/editProductForm";
import { prisma } from "@/lib/prisma";

// app/admin/edit-product/[id]/page.tsx

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. IMPORTANTE: En Next 15, params es una PROMESA, hay que usar await
  const { id } = await params;

  const productId = parseInt(id);

  // 2. Validación de seguridad para evitar el error de Prisma
  if (isNaN(productId)) {
    return <div>ID de producto no válido</div>;
  }

  const producto = await prisma.producto.findUnique({
    where: { id: productId }, // Ahora productId sí tiene un número real
    include: { imagenes: true },
  });


  if (!producto) return <div>Producto no encontrado</div>;

  return <EditProductForm producto={producto} />;
}
