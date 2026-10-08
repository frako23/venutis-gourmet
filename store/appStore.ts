"use client";

import { Cliente } from "@prisma/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_PURCHASE_CONTEXT,
  getProductPrice,
  normalizePurchaseContext,
  PurchaseContext,
} from "@/lib/catalog-context";

export interface CartItem {
  id: number;
  nombre: string;
  precio: number;
  precioDetal: number;
  precioMayorista: number;
  contexto: PurchaseContext;
  inventario?: number;
  descripcion?: string;
  imagen: string;
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
  purchaseContext: PurchaseContext;
  progressStep: ProgressStep;
  deliveryMethod: DeliveryMethod;
  clientId: number | null;
  canContinue: boolean;
  deliveryPrice: number;
  client: Cliente | null;

  // Acciones (Quitamos los "?" para evitar errores de "undefined")
  setSelectedProducts: (products: CartItem[]) => void;
  setPurchaseContext: (context: PurchaseContext) => void;
  updateQuantity: (id: number, delta: number) => void;
  addToCart: (
    product: Omit<CartItem, "cantidad" | "precio"> & { precio: number },
  ) => void;
  clearCart: () => void;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  setProgressStep: (step: ProgressStep) => void;
  setClientId: (id: number | null) => void;
  setCanContinue: (val: boolean) => void;
  nextStep: (metodoDePago: boolean) => void;
  setDeliveryPrice: (price: number) => void;
  setClient: (client: Cliente) => void;
}

const calculateTotal = (products: CartItem[]) =>
  products.reduce((total, p) => total + p.precio * p.cantidad, 0);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Valores iniciales
      selectedProducts: [],
      totalUSD: 0,
      purchaseContext: DEFAULT_PURCHASE_CONTEXT,
      progressStep: "client-details",
      deliveryMethod: "envio",
      clientId: null,
      canContinue: false,
      deliveryPrice: 0,
      setClient: (client) => set({ client }),
      client: null,

      setDeliveryPrice: (price) => set({ deliveryPrice: price }),

      // Métodos
      setSelectedProducts: (products) =>
        set({
          selectedProducts: products,
          totalUSD: calculateTotal(products),
        }),

      setPurchaseContext: (context) => {
        const normalizedContext = normalizePurchaseContext(context);
        const { selectedProducts } = get();
        const updatedProducts = selectedProducts.map((product) => ({
          ...product,
          contexto: normalizedContext,
          precio: getProductPrice(product, normalizedContext),
        }));

        set({
          purchaseContext: normalizedContext,
          selectedProducts: updatedProducts,
          totalUSD: calculateTotal(updatedProducts),
        });
      },

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
        const contexto = normalizePurchaseContext(product.contexto);
        const contextualProducts = selectedProducts.map((item) => ({
          ...item,
          contexto,
          precio: getProductPrice(item, contexto),
        }));
        const incomingProduct = {
          ...product,
          contexto,
          precio: getProductPrice(product, contexto),
        };
        const existing = contextualProducts.find((p) => p.id === product.id);

        let newProducts;
        if (existing) {
          newProducts = contextualProducts.map((p) =>
            p.id === product.id
              ? { ...p, cantidad: p.cantidad + 1 }
              : p,
          );
        } else {
          newProducts = [...contextualProducts, { ...incomingProduct, cantidad: 1 }];
        }

        set({
          purchaseContext: contexto,
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
      version: 2,
      migrate: (persistedState, version) => {
        if (version >= 2) return persistedState as AppState;

        const state = persistedState as Partial<AppState> & {
          selectedProducts?: Array<
            Partial<CartItem> & { precio?: number }
          >;
        };
        const context = normalizePurchaseContext(state.purchaseContext);
        const selectedProducts = (state.selectedProducts || []).map(
          (product) => {
            const legacyPrice = product.precio || 0;
            const precioDetal = product.precioDetal ?? legacyPrice;
            const precioMayorista = product.precioMayorista ?? legacyPrice;

            return {
              ...product,
              precioDetal,
              precioMayorista,
              precio: getProductPrice(
                { precioDetal, precioMayorista },
                context,
              ),
              contexto: context,
            } as CartItem;
          },
        );

        return {
          ...state,
          purchaseContext: context,
          selectedProducts,
          totalUSD: calculateTotal(selectedProducts),
        } as AppState;
      },
    },
  ),
);
