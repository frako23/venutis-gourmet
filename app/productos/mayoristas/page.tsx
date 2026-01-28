import {
  ChevronDown,
  Eye,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Star,
  StarHalf,
} from "lucide-react";
import { PrismaClient } from "@prisma/client";
import Image from "next/image";

export default async function Productos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const pageSize = 12;
  const page = Math.max(1, Number(params.page ?? "1"));

  const where: any = {
    ...(q
      ? {
          OR: [{ nombre: { contains: q, mode: "insensitive" } }],
        }
      : {}),
  };
  const prisma = new PrismaClient();
  const [totalCount, products] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const total = totalCount;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  console.log("Products:", products);
  return (
    <main className="flex-1 p-6 lg:p-12 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl mb-16 group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-transparent z-10"></div>
        <div
          className="relative aspect-[21/9] w-full bg-center bg-cover transition-transform duration-1000 group-hover:scale-105"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD3ptxr431Bb03rx6Bfnn-KP6jUnJBndcQILf74kTCuNQB8yLpPTx5Vtn1a_bxFSiWGuMGbgcM-NFD94AosXBknfdXLnPX9XuXetyDX9RXUEUCFjy5ljIETM8WtZU96QI_BsYVfz7OgK4rJ5VRTVMszwBqDPijvZ2i2SnubtSRv5ZuV6LL9lO0rBhkdIvyh6st2GTUXs5oGSI0w3b6s233q9zP6mbmXFWF0bZ6KSqJj8KciuSO8Qj5UaLFxRjalIgCfZVvfrgCn2bU')`,
          }}
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center px-12 max-w-2xl">
          <span className="text-accent-gold font-bold tracking-[0.3em] uppercase text-xs mb-4">
            Limited Release
          </span>
          <h2 className="text-white text-4xl lg:text-6xl font-serif mb-6 leading-tight">
            The Autumn Harvest Collection
          </h2>
          <p className="text-white/80 text-lg mb-8 font-light">
            Experience the rich, earthy flavors of our seasonal curation.
            Featuring limited edition aged balsamic and reserve Chianti
            Classico.
          </p>
          <div className="flex gap-4">
            <button className="bg-primary text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-primary/85 transition-all">
              Shop Collection
            </button>
            <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-white/20 transition-all">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Product Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-primary/5 pb-6">
        <h2 className="text-2xl font-serif italic">
          Curated Wines{" "}
          <span className="text-primary/30 text-base font-sans ml-2 not-italic">
            (42 items)
          </span>
        </h2>
        <div className="flex gap-3 flex-wrap">
          <ToolbarButton label="Sort: Featured" />
          <ToolbarButton label="Price: Low-High" />
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            image={product.imgUrl}
            title={product.nombre}
            price={product.precio}
            desc={product.descripcion}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-20 flex justify-center items-center gap-4">
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary dark:bg-parchment  transition-colors">
          <ChevronLeft size={20} className="dark:text-primary text-parchment" />
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
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary dark:bg-parchment  transition-colors">
          <ChevronRight
            size={20}
            className="dark:text-primary text-parchment"
          />
        </button>
      </div>
    </main>
  );
}

function ToolbarButton({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-parchment dark:bg-primary/10 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-primary/5 transition-colors">
      <span>{label}</span>
      <ChevronDown size={14} />
    </button>
  );
}

function ProductCard({
  image,
  title,
  price,
  desc,
  badge,
  badgeColor = "bg-accent-gold",
  rating = 5, // Nueva prop para estrellas
  reviews = 3, // Nueva prop para número de reseñas
  stock = 5, // Nueva prop para inventario
}: any) {
  // Lógica para renderizar estrellas (ej. 4.5)
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-accent-gold">
        {[...Array(5)].map((_, i) => {
          const starValue = i + 1;
          if (starValue <= rating)
            return <Star key={i} size={12} fill="currentColor" />;
          if (starValue - 0.5 <= rating)
            return <StarHalf key={i} size={12} fill="currentColor" />;
          return (
            <Star
              key={i}
              size={12}
              className="text-gray-300 dark:text-gray-600"
            />
          );
        })}
        <span className="text-[10px] text-primary/40 dark:text-gold/40 ml-1">
          ({reviews})
        </span>
      </div>
    );
  };

  return (
    <div className="group bg-parchment dark:bg-primary/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border border-transparent hover:border-primary/10 flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden">
        {badge && (
          <div className="absolute top-4 left-4 z-10">
            <span
              className={`${badgeColor} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full`}
            >
              {badge}
            </span>
          </div>
        )}
        <Image
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          src={image}
        />
        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
          <button className="bg-white text-primary p-3 rounded-full hover:bg-gold hover:text-white transition-all shadow-xl">
            <Eye size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        {/* Calificación */}
        <div className="mb-2">{renderStars(rating)}</div>

        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-serif italic group-hover:text-primary dark:group-hover:text-gold transition-colors">
            {title}
          </h3>
          <span className="text-xl font-bold text-primary dark:text-gold">
            ${price}
          </span>
        </div>

        <p className="text-sm text-primary/60 dark:text-gold/70 mb-4 line-clamp-2">
          {desc}
        </p>

        {/* Sección de Inventario / Stock */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <span
              className={`text-[10px] uppercase font-bold tracking-tighter ${stock < 5 ? "text-red-500" : "text-primary/40 dark:text-gold/40"}`}
            >
              {stock === 0
                ? "Out of Stock"
                : stock < 5
                  ? `Only ${stock} left in stock`
                  : "In Stock"}
            </span>
            <span className="text-[10px] font-mono opacity-40">
              {stock} units
            </span>
          </div>
          <div className="h-1 w-full bg-primary/10 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${stock < 5 ? "bg-red-500" : "bg-primary dark:bg-gold"}`}
              style={{ width: `${Math.min((stock / 20) * 100, 100)}%` }} // Asumiendo 20 como stock "lleno"
            />
          </div>
        </div>

        <button
          disabled={stock === 0}
          className={`mt-auto w-full py-3 rounded-lg font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all shadow-lg 
            ${
              stock === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-primary text-white hover:bg-primary/90 shadow-primary/10"
            }`}
        >
          <ShoppingCart size={14} />
          {stock === 0 ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
