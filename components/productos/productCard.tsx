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
  reviews = 3, // Nueva prop para número de reseñas
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
        <span className="text-[10px] text-gold ml-1">({reviews})</span>
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

        <div className="flex justify-between items-start mb-2">
          <a
            href={`/productos/consumidores/${id}`}
            className="text-2xl transition-colors "
          >
            <span className="font-good-brush"></span>{" "}
            <span className="font-century-gothic"></span> {title}
          </a>
          <div className="flex flex-row items-baseline justify-end gap-3 leading-tight">
            {/* Precio en Dólares: Destacado a la izquierda */}
            <span className="text-2xl font-black text-gold tracking-tighter">
              ${price}
            </span>

            {/* Precio en Bs: Elegante y a la derecha */}
            {tasa > 0 ? (
              <span className="text-[15px] font-medium text-gold/60 italic whitespace-nowrap">
                <span className="text-[10px] not-italic mr-1">BS.</span>
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
          <div className="flex justify-between items-center mb-1.5">
            <span
              className={`text-[10px] uppercase font-bold tracking-tighter ${stock < 5 ? "text-red-500" : "text-gold/80"}`}
            >
              {stock === 0
                ? "Agotado"
                : stock < 5
                  ? `Solo quedan ${stock} unidades`
                  : "Disponible"}
            </span>
            <span className="text-[10px] font-mono ">{stock} unidades</span>
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
          className={`mt-auto w-full py-3 rounded-lg font-bold uppercase tracking-widest text-[11px] 
    flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer
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
              imgUrl: image,
            });
          }}
        >
          <ShoppingCart size={14} />
          {stock === 0 ? "Sin Stock" : "Añadir al Carrito"}
        </button>
      </div>
    </div>
  );
}
