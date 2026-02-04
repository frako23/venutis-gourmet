"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  imgUrl: string;
  cantidad: number;
}

// Definimos el estado del flujo de compra
type ProgressStep =
  | "client-details"
  | "delivery-method"
  | "payment"
  | "confirmation";
type DeliveryMethod = "envio" | "recogida";

interface AppState {
  // Estado
  selectedProducts: CartItem[];
  totalUSD: number;
  progressStep: ProgressStep;
  deliveryMethod: DeliveryMethod;
  clientId: number | null;
  canContinue: boolean;
  deliveryPrice: number;

  // Acciones (Quitamos los "?" para evitar errores de "undefined")
  setSelectedProducts: (products: CartItem[]) => void;
  updateQuantity: (id: number, delta: number) => void;
  addToCart: (product: Omit<CartItem, "cantidad">) => void;
  clearCart: () => void;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  setProgressStep: (step: ProgressStep) => void;
  setClientId: (id: number | null) => void;
  setCanContinue: (val: boolean) => void;
  nextStep: (metodoDePago: boolean) => void;
  setDeliveryPrice: (price: number) => void;
}

const calculateTotal = (products: CartItem[]) =>
  products.reduce((total, p) => total + p.precio * p.cantidad, 0);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Valores iniciales
      selectedProducts: [],
      totalUSD: 0,
      progressStep: "client-details",
      deliveryMethod: "recogida",
      clientId: null,
      canContinue: false,
      deliveryPrice: 0,

      setDeliveryPrice: (price) => set({ deliveryPrice: price }),

      // Métodos
      setSelectedProducts: (products) =>
        set({
          selectedProducts: products,
          totalUSD: calculateTotal(products),
        }),

      updateQuantity: (id, delta) => {
        const { selectedProducts } = get();
        const updatedProducts = selectedProducts
          .map((p) =>
            p.id === id
              ? { ...p, cantidad: Math.max(0, p.cantidad + delta) }
              : p,
          )
          .filter((p) => p.cantidad > 0);

        set({
          selectedProducts: updatedProducts,
          totalUSD: calculateTotal(updatedProducts),
        });
      },

      addToCart: (product) => {
        const { selectedProducts } = get();
        const existing = selectedProducts.find((p) => p.id === product.id);

        let newProducts;
        if (existing) {
          newProducts = selectedProducts.map((p) =>
            p.id === product.id ? { ...p, cantidad: p.cantidad + 1 } : p,
          );
        } else {
          newProducts = [...selectedProducts, { ...product, cantidad: 1 }];
        }

        set({
          selectedProducts: newProducts,
          totalUSD: calculateTotal(newProducts),
        });
      },

      clearCart: () => set({ selectedProducts: [], totalUSD: 0 }),

      setDeliveryMethod: (method) => set({ deliveryMethod: method }),

      setProgressStep: (step) => set({ progressStep: step }),

      setClientId: (id) => set({ clientId: id }),

      setCanContinue: (val) => set({ canContinue: val }),

      nextStep: (metodoDePago) => {
        const { progressStep } = get();
        if (progressStep === "client-details")
          set({ progressStep: "delivery-method" });
        else if (progressStep === "delivery-method")
          set({ progressStep: metodoDePago ? "payment" : "confirmation" });
        else if (progressStep === "payment")
          set({ progressStep: "confirmation" });
      },
    }),
    {
      name: "venuti-app-storage",
    },
  ),
);
