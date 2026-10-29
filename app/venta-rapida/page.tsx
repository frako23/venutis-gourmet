import type { ProductoVentaRapida } from "@/components/venta-rapida/puntoDeVenta";
import PuntoDeVenta from "@/components/venta-rapida/puntoDeVenta";
import { ORDEN_CATALOGO } from "@/lib/catalog-order";
import { unidadesDisponibles } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function VentaRapida({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>; // En Next 15, searchParams es una Promise
}) {
  // await new Promise((resolve) => setTimeout(resolve, 5000));
  const products = await prisma.producto.findMany({
    orderBy: ORDEN_CATALOGO,
    include: { imagenes: true },
  });

  const availableProducts = products.filter((p) => unidadesDisponibles(p.inventario) > 0);

  const productos: ProductoVentaRapida[] = availableProducts.map((p) => ({
    id: String(p.id),
    nombre: p.nombre,
    precioUsd: p.precioDetal,
    categoria: p.categoria,
    imagenes: p.imagenes,
    inventario: unidadesDisponibles(p.inventario),
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.08),_transparent_30%),linear-gradient(to_bottom,_var(--background),_var(--background))] px-0 pb-6 pt-0">
      <div className="mx-auto w-full max-w-md">
        <PuntoDeVenta products={productos} />
      </div>
    </main>
  );
}
