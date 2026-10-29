import { ORDEN_CATALOGO } from "@/lib/catalog-order";
import { unidadesDisponibles } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import type { QuoteProduct } from "@/lib/cotizacion-rapida";
import QuickQuote from "@/components/cotizacion-rapida/quickQuote";

export default async function CotizacionRapida() {
  let quoteProducts: QuoteProduct[] = [];
  let catalogError = false;

  try {
    const products = await prisma.producto.findMany({
      where: { inventario: { gte: 1 } },
      orderBy: ORDEN_CATALOGO,
      select: {
        id: true,
        nombre: true,
        categoria: true,
        precioDetal: true,
        inventario: true,
        imagenes: { select: { url: true }, take: 1 },
      },
    });

    quoteProducts = products
      .map((product) => ({
        id: product.id,
        nombre: product.nombre,
        categoria: product.categoria,
        precioUsd: product.precioDetal,
        inventario: unidadesDisponibles(product.inventario),
        ...(product.imagenes[0]?.url
          ? { imagenUrl: product.imagenes[0].url }
          : {}),
      }));
  } catch (error) {
    console.error("No se pudo cargar el catálogo para la cotización rápida", error);
    catalogError = true;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.08),_transparent_30%),linear-gradient(to_bottom,_var(--background),_var(--background))] px-0 pb-6 pt-0">
      <div className="mx-auto w-full max-w-md">
        <QuickQuote products={quoteProducts} catalogError={catalogError} />
      </div>
    </main>
  );
}
