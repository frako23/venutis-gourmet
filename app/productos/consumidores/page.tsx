import { ProductCard } from "@/components/productos/productCard";
import { PRODUCT_ORDER } from "@/lib/constants/constants";
import { PrismaClient } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function Productos({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>; // En Next 15, searchParams es una Promise
}) {
  // await new Promise((resolve) => setTimeout(resolve, 5000));
  const prisma = new PrismaClient();
  const params = await searchParams;
  const categoriaSeleccionada = params.categoria || "TODOS";
  const [products] = await Promise.all([
    prisma.producto.findMany({
      orderBy: { createdAt: "desc" },

      // AGREGAR ESTO:
      include: {
        imagenes: true, // Esto hace el "JOIN" con la tabla de imágenes
      },
    }),
  ]);

  // Ordenamos los productos usando nuestro mapa de prioridades
  const sortedProducts = [...products].sort((a, b) => {
    const orderA = PRODUCT_ORDER[a.nombre.toUpperCase()] || 999;
    const orderB = PRODUCT_ORDER[b.nombre.toUpperCase()] || 999;
    return orderA - orderB;
  });
  // 2. Luego filtramos por la categoría si existe en la URL
  const filteredProducts =
    categoriaSeleccionada !== "TODOS"
      ? sortedProducts.filter((p) => p.categoria === categoriaSeleccionada)
      : sortedProducts;
  return (
    <main className="flex-1 p-6 lg:p-12 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl mb-16 group">
        <div className="absolute inset-0   to-transparent z-10"></div>
        <div
          className="relative aspect-[2.06/1] w-full bg-center bg-cover transition-transform duration-1000 group-hover:scale-105"
          style={{
            backgroundImage: `url(${categoriaSeleccionada === "BAKERY" ? "/pan1.avif" : categoriaSeleccionada === "PASTAS" ? "/pasta1.avif" : categoriaSeleccionada === "SALSAS" ? "/Salsa1.avif" : categoriaSeleccionada === "POSTRES" ? "/trufas1.avif" : categoriaSeleccionada === "PASTICHOS" ? "/pasticho1.avif" : "https://lh3.googleusercontent.com/aida-public/AB6AXuD3ptxr431Bb03rx6Bfnn-KP6jUnJBndcQILf74kTCuNQB8yLpPTx5Vtn1a_bxFSiWGuMGbgcM-NFD94AosXBknfdXLnPX9XuXetyDX9RXUEUCFjy5ljIETM8WtZU96QI_BsYVfz7OgK4rJ5VRTVMszwBqDPijvZ2i2SnubtSRv5ZuV6LL9lO0rBhkdIvyh6st2GTUXs5oGSI0w3b6s233q9zP6mbmXFWF0bZ6KSqJj8KciuSO8Qj5UaLFxRjalIgCfZVvfrgCn2bU"})`,
          }}
        />
      </section>

      {/* Product Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-primary/5 pb-6 font-century-gothic">
        <h2 className="text-2xl">
          Nuestro Menú{" "}
          <span className="text-gold text-base ml-2 not-italic">
            ({filteredProducts.length} productos)
          </span>
        </h2>
        {/* <div className="flex gap-3 flex-wrap">
          <ToolbarButton label="Sort: Featured" />
          <ToolbarButton label="Price: Low-High" />
        </div> */}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            image={product.imagenes}
            id={product.id}
            title={product.nombre}
            categoria={product.categoria}
            price={product.precioDetal}
            desc={product.descripcion || ""}
            inventario={product.inventario}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-20 flex justify-center items-center gap-4">
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-parchment  transition-colors">
          <ChevronLeft size={20} className="text-primary" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white font-bold">
          1
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full  transition-colors text-primary/60">
          2
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full  transition-colors text-primary/60">
          3
        </button>
        <span className="px-2 text-primary/40">...</span>
        <button className="w-10 h-10 flex items-center justify-center rounded-full  transition-colors text-primary/60">
          8
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-parchment  transition-colors">
          <ChevronRight size={20} className="text-primary" />
        </button>
      </div>
    </main>
  );
}
