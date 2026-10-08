export const PURCHASE_CONTEXTS = ["consumidor", "mayorista"] as const;

export type PurchaseContext = (typeof PURCHASE_CONTEXTS)[number];

export type ProductPrices = {
  precioDetal: number;
  precioMayorista: number;
};

export const DEFAULT_PURCHASE_CONTEXT: PurchaseContext = "consumidor";

export function normalizePurchaseContext(value: unknown): PurchaseContext {
  return value === "mayorista" ? "mayorista" : DEFAULT_PURCHASE_CONTEXT;
}

export function getPurchaseContextLabel(context: PurchaseContext) {
  return context === "mayorista" ? "Mayorista" : "Consumidor";
}

export function getProductPrice(
  product: ProductPrices,
  context: PurchaseContext,
) {
  return context === "mayorista"
    ? product.precioMayorista
    : product.precioDetal;
}

export function hasValidPrice(price: number) {
  return Number.isFinite(price) && price > 0;
}

export function isWholesaleOffer(product: ProductPrices) {
  return hasValidPrice(product.precioMayorista);
}

export function getCatalogProductHref(
  productId: number,
  context: PurchaseContext,
) {
  return `/productos/consumidores/${productId}?contexto=${context}`;
}

export function getCatalogHref(
  context: PurchaseContext,
  categoria?: string | null,
) {
  const params = new URLSearchParams({ contexto: context });
  if (categoria && categoria !== "TODOS") params.set("categoria", categoria);
  return `/productos/consumidores?${params.toString()}`;
}
