"use client";

import {
  getCatalogHref,
  getPurchaseContextLabel,
  normalizePurchaseContext,
  PurchaseContext,
} from "@/lib/catalog-context";
import { useAppStore } from "@/store/appStore";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const contexts: PurchaseContext[] = ["consumidor", "mayorista"];

export function PurchaseContextSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseContext = useAppStore((state) => state.purchaseContext);
  const setPurchaseContext = useAppStore((state) => state.setPurchaseContext);
  const urlContext = normalizePurchaseContext(searchParams.get("contexto"));
  const activeContext = pathname.startsWith("/productos/")
    ? urlContext
    : purchaseContext;

  useEffect(() => {
    if (pathname.startsWith("/productos/")) {
      setPurchaseContext(urlContext);
    }
  }, [pathname, setPurchaseContext, urlContext]);

  const handleContextChange = (context: PurchaseContext) => {
    setPurchaseContext(context);

    if (pathname.startsWith("/productos/")) {
      router.push(getCatalogHref(context, searchParams.get("categoria")));
      return;
    }

    router.push(getCatalogHref(context));
  };

  return (
    <nav
      aria-label="Contexto de compra"
      className="flex items-center gap-1 rounded-full border border-gold/30 bg-primary/30 p-1 text-[10px] uppercase tracking-widest"
    >
      {contexts.map((context) => {
        const isActive = activeContext === context;

        return (
          <button
            key={context}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleContextChange(context)}
            className={`rounded-full px-3 py-2 transition-colors ${
              isActive
                ? "bg-gold text-primary"
                : "text-white/70 hover:bg-gold/10 hover:text-white"
            }`}
          >
            {getPurchaseContextLabel(context)}
          </button>
        );
      })}
    </nav>
  );
}
