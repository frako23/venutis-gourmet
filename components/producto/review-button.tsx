"use client";

import { useAppStore } from "@/store/appStore";
import { PenSquare } from "lucide-react";

export const ReviewButton = () => {
  const client = useAppStore((s) => s.client);

  return (
    <>
      {client ? (
        <button className="bg-surface-dark cursor-pointer border border-border-dark text-white font-bold py-3 px-8 rounded-lg hover:border-gold transition-all flex items-center gap-2">
          <PenSquare size={18} />
          Escríbe una reseña
        </button>
      ) : (
        ""
      )}
    </>
  );
};
