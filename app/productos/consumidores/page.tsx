import React from "react";
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
import Link from "next/link";
import { useDolar } from "@/hooks/useDolar";
import { ProductCard } from "@/components/productos/productCard";

export default async function Productos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  // await new Promise((resolve) => setTimeout(resolve, 5000));
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
  // console.log("Products:", products);
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
          Nuestro Menú{" "}
          <span className="text-gold/70 text-base font-sans ml-2 not-italic">
            ({total} productos)
          </span>
        </h2>
        {/* <div className="flex gap-3 flex-wrap">
          <ToolbarButton label="Sort: Featured" />
          <ToolbarButton label="Price: Low-High" />
        </div> */}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            image={product.imgUrl}
            id={product.id}
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
