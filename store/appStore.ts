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
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedProducts: [],
      setSelectedProducts: (products) => set({ selectedProducts: products }),
    }),
    {
      name: "app-storage", // clave en localStorage
    },
  ),
);
