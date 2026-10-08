import {
  getCatalogHref,
  getProductPrice,
  isWholesaleOffer,
  normalizePurchaseContext,
  PurchaseContext,
} from "@/lib/catalog-context";
import { ProductCard } from "@/components/productos/productCard";
import { PRODUCT_ORDER } from "@/lib/constants/constants";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type SearchParams = {
  categoria?: string;
  contexto?: string;
};

export default async function Productos({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const categoriaSeleccionada = params.categoria || "TODOS";
  const contexto = normalizePurchaseContext(params.contexto);
  const products = await prisma.producto.findMany({
    orderBy: { createdAt: "desc" },
    include: { imagenes: true },
  });

  const sortedProducts = [...products].sort((a, b) => {
    const orderA = PRODUCT_ORDER[a.nombre.toUpperCase()] || 999;
    const orderB = PRODUCT_ORDER[b.nombre.toUpperCase()] || 999;
    return orderA - orderB;
  });

  const wholesaleProducts = sortedProducts.filter(isWholesaleOffer);
  const contextProducts =
    contexto === "mayorista" ? wholesaleProducts : sortedProducts;
  const filteredProducts =
    categoriaSeleccionada !== "TODOS"
      ? contextProducts.filter((product) => product.categoria === categoriaSeleccionada)
      : contextProducts;
  const heroImage = getHeroImage(categoriaSeleccionada);

  return (
    <main className="flex-1 overflow-x-hidden p-6 lg:p-12">
      <section className="relative mb-8 overflow-hidden rounded-2xl group">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-background-dark/30 to-transparent" />
        <div
          className="relative aspect-[2.06/1] w-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
      </section>

      <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-gold/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            {contexto === "mayorista" ? "Oferta mayorista" : "Catálogo unificado"}
          </p>
          <h1 className="mt-2 text-2xl text-white">
            {contexto === "mayorista"
              ? "Productos para negocios y compras al mayor"
              : "Productos para disfrutar en casa"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            {contexto === "mayorista"
              ? "Consulta la oferta mayorista disponible usando el mismo catálogo y flujo de compra."
              : "Explora el catálogo y cambia a la oferta mayorista cuando quieras, sin salir de esta experiencia."}
          </p>
        </div>
        {contexto === "consumidor" && wholesaleProducts.length > 0 && (
          <Link
            href={getCatalogHref("mayorista", categoriaSeleccionada)}
            className="shrink-0 rounded-lg bg-gold px-5 py-3 text-center text-sm font-bold uppercase tracking-widest text-primary transition hover:bg-gold/90"
          >
            Ver oferta mayorista
          </Link>
        )}
        {contexto === "mayorista" && (
          <Link
            href={getCatalogHref("consumidor", categoriaSeleccionada)}
            className="shrink-0 rounded-lg border border-gold/50 px-5 py-3 text-center text-sm font-bold uppercase tracking-widest text-gold transition hover:bg-gold/10"
          >
            Ver catálogo consumidor
          </Link>
        )}
      </section>

      <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-primary/5 pb-6 font-century-gothic sm:flex-row sm:items-center">
        <h2 className="text-2xl">
          {contexto === "mayorista" ? "Oferta mayorista" : "Nuestro Menú"}{" "}
          <span className="ml-2 text-base text-gold not-italic">
            ({filteredProducts.length} productos)
          </span>
        </h2>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              image={product.imagenes}
              id={product.id}
              title={product.nombre}
              categoria={product.categoria}
              price={getProductPrice(product, contexto)}
              precioDetal={product.precioDetal}
              precioMayorista={product.precioMayorista}
              contexto={contexto}
              desc={product.descripcion || ""}
              inventario={product.inventario}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          categoria={categoriaSeleccionada}
          contexto={contexto}
        />
      )}
    </main>
  );
}

function EmptyState({
  categoria,
  contexto,
}: {
  categoria: string;
  contexto: PurchaseContext;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gold/30 px-6 py-16 text-center">
      <h2 className="text-2xl text-white">
        {contexto === "mayorista"
          ? "No hay ofertas mayoristas disponibles"
          : "No hay productos disponibles en esta categoría"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
        {contexto === "mayorista"
          ? "Prueba otra categoría o continúa con el catálogo de productos para consumidores."
          : "Prueba otra categoría o revisa nuevamente el catálogo más tarde."}
      </p>
      <Link
        href={getCatalogHref("consumidor", categoria)}
        className="mt-6 inline-flex rounded-lg bg-gold px-5 py-3 text-sm font-bold uppercase tracking-widest text-primary"
      >
        Volver al catálogo consumidor
      </Link>
    </div>
  );
}

function getHeroImage(category: string) {
  switch (category) {
    case "BAKERY":
      return "/pan1.avif";
    case "PASTAS":
      return "/pasta1.avif";
    case "SALSAS":
      return "/Salsa1.avif";
    case "POSTRES":
      return "/trufas1.avif";
    case "PASTICHOS":
      return "/pasticho1.avif";
    default:
      return "/todos1.avif";
  }
}
