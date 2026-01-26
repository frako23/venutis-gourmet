"use client";
import { ClientWithRelations } from "@/prisma/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  selectedClients: ClientWithRelations[];
  setSelectedClients: (clients: ClientWithRelations[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedClients: [],
      setSelectedClients: (clients) => set({ selectedClients: clients }),
    }),
    {
      name: "app-storage", // clave en localStorage
    },
  ),
);
