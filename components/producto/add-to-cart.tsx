"use client";

import { useAppStore } from "@/store/appStore";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import React from "react";
import { Producto } from "@prisma/client";

const AddToCartBlock = ({ producto }: { producto: Producto }) => {
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const addToCart = useAppStore((s) => s.addToCart);
  console.log("producto in AddToCartBlock:", producto);
  const selectedProducts = useAppStore((s) => s.selectedProducts);
  const product = selectedProducts.find((p) => p.id === producto.id) || {
    id: producto.id,
    quantity: 0,
  };
  console.log("productId in AddToCartBlock:", product);
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex items-center bg-surface-dark border border-border-dark rounded-lg p-1">
          <button
            onClick={() => updateQuantity(producto.id, -1)}
            disabled={product.quantity === 0}
            className={`size-10 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors text-slate-400  ${
              product.quantity === 0
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <Minus size={16} />
          </button>
          <span className="w-12 text-center text-white font-bold">
            {product.quantity === 0 ? 1 : product.quantity}
          </span>
          <button
            onClick={() => updateQuantity(producto.id, +1)}
            disabled={product.quantity === 0}
            className={`size-10 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors text-slate-400  ${
              product.quantity === 0
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
              precio: producto.precio,
              imgUrl: producto.imgUrl || "",
            })
          }
        >
          <ShoppingBag size={18} />
          Añadir al Carrito
        </button>
      </div>
      <button className="w-full py-3 px-8 border border-border-dark text-white font-semibold rounded-lg hover:bg-white/5 transition-colors">
        Subscribe & Save 15%
      </button>
    </div>
  );
};

export default AddToCartBlock;
