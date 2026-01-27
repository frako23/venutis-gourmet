"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
  id: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

interface AppState {
  selectedProducts: CartItem[];
  setSelectedProducts: (products: CartItem[]) => void;
  getTotalUSD: () => number;
  updateQuantity: (id: number, delta: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedProducts: [],
      setSelectedProducts: (products) => set({ selectedProducts: products }),
      // Esta función calcula el total accediendo al estado interno 'get()'
      getTotalUSD: () => {
        return get().selectedProducts.reduce(
          (total, p) => total + p.price * p.quantity,
          0,
        );
      },
      updateQuantity: (id: number, delta: number) =>
        set((state: any) => ({
          selectedProducts: state.selectedProducts
            .map((p: any) =>
              p.id === id
                ? { ...p, quantity: Math.max(0, p.quantity + delta) }
                : p,
            )
            .filter((p: any) => p.quantity > 0),
        })),
    }),
    {
      name: "app-storage", // clave en localStorage
    },
  ),
);
