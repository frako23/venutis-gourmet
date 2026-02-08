"use client";
import { Eye, ShoppingCart, Star, StarHalf } from "lucide-react";

import { useDolar } from "@/hooks/useDolar";
import { useAppStore } from "@/store/appStore";
import Image from "next/image";

export function ProductCard({
  id,
  image,
  title,
  price,
  badge,
  badgeColor = "bg-accent-gold",
  rating = 5, // Nueva prop para estrellas
  stock = 20, // Nueva prop para inventario
}: any) {
  const { tasa } = useDolar();
  // Lógica para renderizar estrellas (ej. 4.5)

  const addToCart = useAppStore((s) => s.addToCart);
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-accent-gold">
        {[...Array(5)].map((_, i) => {
          const starValue = i + 1;
          if (starValue <= rating)
            return <Star key={i} size={12} fill="currentColor" />;
          if (starValue - 0.5 <= rating)
            return <StarHalf key={i} size={12} fill="currentColor" />;
          return <Star key={i} size={12} className="text-gray-600" />;
        })}
      </div>
    );
  };

  return (
    <div className="group bg-primary/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border border-transparent hover:border-primary/10 flex flex-col">
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
          width={500}
          height={500}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          src={image}
        />
        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
          <a
            href={`/productos/consumidores/${id}`}
            className="bg-white text-primary p-3 rounded-full hover:bg-gold hover:text-white transition-all shadow-xl"
          >
            <Eye size={20} />
          </a>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        {/* Calificación */}
        <div className="mb-2">{renderStars(rating)}</div>

        <div className="flex justify-between items-start mb-2 font-good-brush">
          <a
            href={`/productos/consumidores/${id}`}
            className="text-2xl transition-colors "
          >
            <span className="font-good-brush"></span>{" "}
            <span className="font-century-gothic"></span> {title}
          </a>
          <div className="flex flex-col items-baseline  leading-tight font-century-gothic">
            {/* Precio en Dólares: Destacado a la izquierda */}
            <span className="text-4xl font-bold text-gold tracking-tighter">
              ${price}
            </span>

            {/* Precio en Bs: Elegante y a la derecha */}
            {tasa > 0 ? (
              <span className="text-[15px] font-medium opacity-70 whitespace-nowrap">
                <span className="text-[15px] mr-1">BS.</span>
                {(price * tasa).toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            ) : (
              <div className="h-5 w-20 bg-primary/5 animate-pulse rounded-md" />
            )}
          </div>
        </div>

        {/* <p className="text-sm text-gold/70 mb-4 line-clamp-2">
          {desc}
        </p> */}

        {/* Sección de Inventario / Stock */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5 font-century-gothic">
            <span
              className={`text-[20px] uppercase font-bold tracking-tighter ${stock < 5 ? "text-red-500" : "text-gold"}`}
            >
              {stock === 0
                ? "Agotado"
                : stock < 5
                  ? `Solo quedan ${stock} unidades`
                  : "Disponible"}
            </span>
            <span className="text-[20px] opacity-70">{stock} unidades</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${stock < 5 ? "bg-red-500" : "bg-gold"}`}
              style={{ width: `${Math.min((stock / 20) * 100, 100)}%` }} // Asumiendo 20 como stock "lleno"
            />
          </div>
        </div>

        <button
          disabled={stock === 0}
          className={`mt-auto w-full py-3 rounded-lg  uppercase tracking-widest text-[18px] 
    flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer font-century-gothic
    ${
      stock === 0
        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
        : "bg-gold text-primary hover:bg-gold/90 hover:shadow-gold/20 shadow-gold/10"
    }`}
          onClick={() => {
            addToCart({
              id,
              nombre: title,
              precio: price,
              imagenes[0]: image,
            });
          }}
        >
          <ShoppingCart size={20} />
          {stock === 0 ? "Sin Stock" : "Agregar al Carrito"}
        </button>
      </div>
    </div>
  );
}
