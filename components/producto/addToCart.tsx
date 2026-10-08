"use client";

import {
  getProductPrice,
  hasValidPrice,
  PurchaseContext,
} from "@/lib/catalog-context";
import { useAppStore } from "@/store/appStore";
import { Imagen, Producto } from "@prisma/client";
import { Minus, Plus, ShoppingBag } from "lucide-react";

type ProductoConImagenes = Producto & {
  imagenes: Imagen[];
};

const AddToCartBlock = ({
  producto,
  contexto,
}: {
  producto: ProductoConImagenes;
  contexto: PurchaseContext;
}) => {
  const updateQuantity = useAppStore((state) => state.updateQuantity);
  const addToCart = useAppStore((state) => state.addToCart);
  const selectedProducts = useAppStore((state) => state.selectedProducts);
  const product = selectedProducts.find((item) => item.id === producto.id);
  const cantidad = product?.cantidad || 0;
  const activePrice = getProductPrice(producto, contexto);
  const canBuy = producto.inventario > 0 && hasValidPrice(activePrice);

  const mainImage =
    producto.imagenes?.[0]?.url || "/images/placeholder-venutis.png";

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex items-center rounded-lg border border-border-dark bg-surface-dark p-1">
          <button
            type="button"
            onClick={() => updateQuantity(producto.id, -1)}
            disabled={cantidad === 0}
            aria-label="Disminuir cantidad"
            className={`flex size-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 ${
              cantidad === 0
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
          >
            <Minus size={16} />
          </button>
          <span className="w-12 text-center font-bold text-white">
            {cantidad === 0 ? 1 : cantidad}
          </span>
          <button
            type="button"
            onClick={() => updateQuantity(producto.id, 1)}
            disabled={!canBuy || cantidad === 0 || cantidad >= producto.inventario}
            aria-label="Aumentar cantidad"
            className={`flex size-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 ${
              !canBuy || cantidad === 0 || cantidad >= producto.inventario
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          type="button"
          disabled={!canBuy}
          className="flex flex-1 items-center justify-center gap-3 rounded-lg bg-gold px-8 py-3 font-bold text-primary shadow-lg shadow-gold/20 transition-all hover:bg-gold/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
          onClick={() =>
            addToCart({
              id: producto.id,
              nombre: producto.nombre,
              precio: activePrice,
              precioDetal: producto.precioDetal,
              precioMayorista: producto.precioMayorista,
              contexto,
              imagen: mainImage,
              inventario: producto.inventario,
            })
          }
        >
          <ShoppingBag size={18} />
          {producto.inventario === 0
            ? "Agotado"
            : hasValidPrice(activePrice)
              ? "Añadir al Carrito"
              : "No disponible"}
        </button>
      </div>
    </div>
  );
};

export default AddToCartBlock;
