"use client";

import { Edit3, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface ActionButtonProps {
  productId: number;
  onDelete?: (id: number) => void;
}

export const ActionButton = ({ productId, onDelete }: ActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Botón Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gold transition-colors p-1 cursor-pointer rounded-full hover:bg-white/5"
      >
        <MoreHorizontal size={20} />
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-48 bg-charcoal border border-border-soft rounded-xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Opción: Ver Detalle */}
            <Link
              href={`/productos/consumidores/${productId}`}
              className="flex items-center gap-3 px-4 py-2 text-sm text-cream hover:bg-gold/10 hover:text-gold transition-colors"
            >
              <Eye size={16} /> Ver detalles
            </Link>

            {/* Opción: Editar */}
            <Link
              href={`/admin/edit-product/${productId}`}
              className="flex items-center gap-3 px-4 py-2 text-sm text-cream hover:bg-gold/10 hover:text-gold transition-colors"
            >
              <Edit3 size={16} /> Editar producto
            </Link>

            {/* Opción: Duplicar (Útil para productos similares) */}
            {/* <button
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-cream hover:bg-gold/10 hover:text-gold transition-colors cursor-pointer"
              onClick={() => {
              }}
            >
              <Copy size={16} /> Duplicar
            </button> */}

            <hr className="my-1 border-border-soft" />

            {/* Opción: Eliminar */}
            <button
              onClick={() => {
                if (confirm("¿Estás seguro de eliminar este producto?")) {
                  //   onDelete(productId);
                  setIsOpen(false);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
};
