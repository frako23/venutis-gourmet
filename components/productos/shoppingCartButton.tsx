"use client";

import { useDolar } from "@/hooks/useDolar";
import { useAppStore } from "@/store/appStore";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export const ShoppingCartButton = () => {
  const selectedProducts = useAppStore((s) => s.selectedProducts);
  const { tasa } = useDolar();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const totalUSD = useAppStore((s) => s.totalUSD);

  return (
    <div className="relative">
      <button
        onClick={() => setIsCartOpen(!isCartOpen)}
        className=" bg-white relative p-2 rounded-full bg-accent-gold/10 text-accent-gold hover:bg-accent-gold hover:text-white transition-all duration-300 cursor-pointer"
      >
        <ShoppingCart size={20} color="#5d4037" />
        {selectedProducts.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-background-light">
            {selectedProducts.reduce((acc, p) => acc + p.cantidad, 0)}
          </span>
        )}
      </button>

      {isCartOpen && (
        <>
          {/* Overlay para cerrar al tocar fuera */}
          <div
            className="fixed inset-0 z-50"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="absolute right-0 mt-4 w-80 bg-zinc-900 shadow-2xl rounded-xl overflow-hidden border border-primary/10 z-[60]">
            <div className="p-4 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
              <span className="font-century-gothic text-xl ">Tu Carrito</span>
              <button
                onClick={() => setIsCartOpen(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                X
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-4 space-y-4">
              {selectedProducts.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs opacity-60">Tu carrito está vacío.</p>
                </div>
              ) : (
                selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 pb-3 border-b border-white/5 last:border-0"
                  >
                    <Image
                      width={48}
                      height={48}
                      src={product.imagenes[0]}
                      alt={product.nombre}
                      className="w-12 h-12 object-cover rounded-lg bg-gray-50"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">
                        {product.nombre}
                      </p>
                      <p className="text-[11px] text-gold">
                        ${product.precio.toFixed(2)}
                      </p>
                    </div>

                    {/* Contador de Cantidad */}
                    <div className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-1">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className="hover:text-gold transition-colors cursor-pointer"
                      >
                        {product.cantidad === 1 ? (
                          <Trash2 size={12} className="text-red-400" />
                        ) : (
                          <Minus size={12} />
                        )}
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {product.cantidad}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="hover:text-gold transition-colors cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totales con Doble Moneda */}
            <div className="p-4 border-t border-primary/10 bg-zinc-800/50">
              <div className="space-y-1 mb-4">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-sm">Total:</span>
                  <span className="text-lg text-gold">
                    ${totalUSD.toFixed(2)}
                  </span>
                </div>
                {tasa > 0 && totalUSD > 0 && (
                  <div className="flex justify-between items-center text-[13px] opacity-70 ">
                    <span>Equivalente:</span>
                    <span>
                      Bs.{" "}
                      {(totalUSD * tasa).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
              </div>

              <a
                href="/finalizar-compra"
                className="block w-full bg-primary text-white py-3 rounded-lg text-[10px] font-bold uppercase tracking-[2px] text-center hover:bg-gold transition-all shadow-lg"
              >
                Realizar Pedido
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
