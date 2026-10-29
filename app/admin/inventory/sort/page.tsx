import { ProductOrderEditor } from "@/components/admin/inventario/productOrderEditor";
import { ORDEN_CATALOGO } from "@/lib/catalog-order";
import { prisma } from "@/lib/prisma";

export default async function OrdenarProductos() {
  const products = await prisma.producto.findMany({
    orderBy: ORDEN_CATALOGO,
    select: { id: true, nombre: true, categoria: true, inventario: true, imagenes: { select: { url: true }, take: 1 } },
  });
  const productos = products.map(({ imagenes, ...product }) => ({ ...product, imagenUrl: imagenes[0]?.url ?? null }));

  return <ProductOrderEditor key={productos.map((product) => product.id).join(",")} productos={productos} />;
}
