"use client";
import { Eye, ShoppingCart, Star, StarHalf } from "lucide-react";

import { useDolar } from "@/hooks/useDolar";
import {
  getCatalogProductHref,
  getPurchaseContextLabel,
  hasValidPrice,
  isWholesaleOffer,
  PurchaseContext,
} from "@/lib/catalog-context";
import { useAppStore } from "@/store/appStore";
import { Imagen } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import {
  type MouseEvent,
  type TouchEvent,
  useRef,
  useState,
} from "react";

export interface ProductCardProps {
  id: number;
  image: Imagen[];
  title: string;
  price: number;
  precioDetal: number;
  precioMayorista: number;
  contexto: PurchaseContext;
  badge?: string;
  categoria?: string;
  badgeColor?: string;
  rating?: number;
  inventario: number;
  desc?: string;
}

export function ProductCard({
  id,
  image,
  title,
  price,
  precioDetal,
  precioMayorista,
  contexto,
  categoria,
  badge,
  inventario,
  badgeColor = "bg-accent-gold",
  rating = 5, // Nueva prop para estrellas
}: ProductCardProps) {
  const { tasa } = useDolar();
  const addToCart = useAppStore((s) => s.addToCart);
  const galleryImages = image?.filter((item) => item.url) ?? [];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const swipedRef = useRef(false);
  const swipeThreshold = 48;

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
  const imageSrc = galleryImages[0]?.url || "/food-avatar.png";
  const carouselImages = galleryImages.length > 0 ? galleryImages : [null];
  const productHref = getCatalogProductHref(id, contexto);
  const wholesaleOffer = isWholesaleOffer({ precioDetal, precioMayorista });
  const canBuy = inventario > 0 && hasValidPrice(price);
  const offerBadge =
    contexto === "mayorista"
      ? getPurchaseContextLabel(contexto)
      : wholesaleOffer
        ? "Disponible para mayoristas"
        : badge;

  const goToPreviousImage = () => {
    setActiveImageIndex(
      (currentIndex) =>
        (currentIndex - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  const goToNextImage = () => {
    setActiveImageIndex(
      (currentIndex) => (currentIndex + 1) % galleryImages.length,
    );
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;

    touchStartX.current = event.touches[0].clientX;
    swipedRef.current = false;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current;
    if (startX === null) return;

    const endTouch = event.changedTouches[0];
    const distance = endTouch.clientX - startX;
    touchStartX.current = null;

    if (galleryImages.length < 2 || Math.abs(distance) < swipeThreshold) {
      return;
    }

    swipedRef.current = true;
    if (distance < 0) {
      goToNextImage();
    } else {
      goToPreviousImage();
    }
  };

  const handleTouchCancel = () => {
    touchStartX.current = null;
  };

  const handleSlideClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!swipedRef.current) return;

    event.preventDefault();
    swipedRef.current = false;
  };

  return (
    <div className="group bg-primary/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border border-transparent hover:border-primary/10 flex flex-col">
      <div
        className="relative aspect-[4/5] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{ touchAction: "pan-y" }}
      >
        {offerBadge && (
          <div className="absolute top-4 left-4 z-10">
            <span
              className={`${badgeColor} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full`}
            >
              {offerBadge}
            </span>
          </div>
        )}
        <div
          className="flex h-full w-full will-change-transform transition-transform duration-500 ease-out"
          style={{
            transform: `translate3d(-${activeImageIndex * 100}%, 0, 0)`,
          }}
          aria-label={`Galería de imágenes de ${title}`}
        >
          {carouselImages.map((galleryImage, index) => (
            <Link
              key={galleryImage?.id ?? "fallback"}
              href={productHref}
              aria-label={`Ver ${title}, imagen ${index + 1}`}
              aria-hidden={index !== activeImageIndex}
              tabIndex={index === activeImageIndex ? 0 : -1}
              onClick={handleSlideClick}
              className="group/image relative block h-full w-full min-w-0 shrink-0 grow-0 basis-full"
              style={{ flex: "0 0 100%" }}
            >
              <Image
                alt={title}
                width={500}
                height={500}
                draggable={false}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-110"
                src={galleryImage?.url || imageSrc}
                sizes="(max-width: 768px) 100vw, 500px"
              />
              <span className="absolute inset-0 bg-primary/20 opacity-0 transition-opacity duration-500 group-hover/image:opacity-100">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-3 text-primary shadow-xl transition-all group-hover/image:bg-gold group-hover/image:text-white">
                  <Eye size={20} aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
        </div>
        {galleryImages.length > 1 && (
          <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={goToPreviousImage}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background-dark/80 text-white shadow-lg transition hover:bg-gold hover:text-primary"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <div className="flex items-center gap-1.5 rounded-full bg-background-dark/70 px-2.5 py-1.5">
              {galleryImages.map((galleryImage, index) => (
                <button
                  key={galleryImage.id}
                  type="button"
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-current={index === activeImageIndex ? "true" : undefined}
                  onClick={() => setActiveImageIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeImageIndex
                      ? "w-5 bg-gold"
                      : "w-1.5 bg-white/60 hover:bg-white"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Siguiente imagen"
              onClick={goToNextImage}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background-dark/80 text-white shadow-lg transition hover:bg-gold hover:text-primary"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        {/* Calificación */}
        <div className="mb-2">{renderStars(rating)}</div>
        {/* Etiqueta de Categoría Distintiva */}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold/60 border-b border-gold/20 pb-0.5">
          {categoria}
        </span>
        <div className="flex justify-between items-start mb-2 font-good-brush">
          <Link
            href={productHref}
            className="text-2xl transition-colors "
          >
            <span className="font-good-brush"></span>{" "}
            <span className="font-century-gothic"></span> {title}
          </Link>
          <div className="flex flex-col items-baseline  leading-tight font-century-gothic">
            {/* Precio en Dólares: Destacado a la izquierda */}
            <div className="flex gap-2">
              <span className="text-xl font-bold text-gold tracking-tighter">
                ${" "}
              </span>
              <span className="text-4xl font-bold text-gold tracking-tighter">
                {price}
              </span>
            </div>

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
              className={`text-[20px] uppercase font-bold tracking-tighter ${inventario <= 5 ? "text-red-500" : "text-gold"}`}
            >
              {inventario === 0
                ? "Agotado"
                : inventario <= 5
                  ? `Solo quedan ${inventario} unidades`
                  : "En inventario"}
            </span>
            {inventario > 5 && (
              <span className="text-[15px] opacity-70">
                {inventario} unidades
              </span>
            )}
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${inventario <= 5 ? "bg-red-500" : "bg-gold"}`}
              style={{ width: `${Math.min((inventario / 20) * 100, 100)}%` }} // Asumiendo 20 como inventario "lleno"
            />
          </div>
        </div>

        <button
          disabled={!canBuy}
          className={`mt-auto w-full py-3 rounded-lg  uppercase tracking-widest text-[18px] 
    flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer font-century-gothic
    ${
      !canBuy
        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
        : "bg-gold text-primary hover:bg-gold/90 hover:shadow-gold/20 shadow-gold/10"
    }`}
          onClick={() => {
            addToCart({
              id,
              nombre: title,
              precio: price,
              precioDetal,
              precioMayorista,
              contexto,
              imagen: imageSrc,
              inventario,
            });
          }}
        >
          <ShoppingCart size={20} />
          {inventario === 0
            ? "Sin Stock"
            : hasValidPrice(price)
              ? "Agregar al Carrito"
              : "No disponible"}
        </button>
      </div>
    </div>
  );
}
