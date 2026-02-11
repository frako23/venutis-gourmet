"use client";

import { useAppStore } from "@/store/appStore";
import { Imagen, Producto } from "@prisma/client";
import { Minus, Plus, ShoppingBag } from "lucide-react";

type ProductoConImagenes = Producto & {
  imagenes: Imagen[];
};

const AddToCartBlock = ({ producto }: { producto: ProductoConImagenes }) => {
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const addToCart = useAppStore((s) => s.addToCart);
  console.log("producto in AddToCartBlock:", producto);
  const selectedProducts = useAppStore((s) => s.selectedProducts);
  const product = selectedProducts.find((p) => p.id === producto.id) || {
    id: producto.id,
    cantidad: 0,
  };
  console.log("productId in AddToCartBlock:", product);

  const mainImage =
    producto.imagenes?.[0]?.url || "/images/placeholder-venutis.png";
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex items-center bg-surface-dark border border-border-dark rounded-lg p-1">
          <button
            onClick={() => updateQuantity(producto.id, -1)}
            disabled={product.cantidad === 0}
            className={`size-10 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors text-slate-400  ${
              product.cantidad === 0
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <Minus size={16} />
          </button>
          <span className="w-12 text-center text-white font-bold">
            {product.cantidad === 0 ? 1 : product.cantidad}
          </span>
          <button
            onClick={() => updateQuantity(producto.id, +1)}
            disabled={product.cantidad === 0}
            className={`size-10 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors text-slate-400  ${
              product.cantidad === 0
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          className="flex-1 bg-gold hover:bg-gold/90 text-primary font-bold py-3 px-8 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-gold/20 flex items-center justify-center gap-3"
          onClick={() =>
            addToCart({
              id: producto.id,
              nombre: producto.nombre,
              precio: producto.precioDetal,
              imagen: mainImage,
            })
          }
        >
          <ShoppingBag size={18} />
          Añadir al Carrito
        </button>
      </div>
    </div>
  );
};

export default AddToCartBlock;
