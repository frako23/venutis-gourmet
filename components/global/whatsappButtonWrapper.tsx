"use client";

import { WhatsAppButton } from "@/components/global/whatssappButton";
import { usePathname } from "next/navigation";

export function WhatsAppButtonWrapper() {
  const pathname = usePathname();

  if (pathname === "/venta-rapida") {
    return null;
  }

  return <WhatsAppButton />;
}
