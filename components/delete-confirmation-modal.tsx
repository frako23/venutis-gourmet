// src/components/DeleteConfirmationModal.tsx
"use client"; // 👈 Marcar como Client Component

import { deleteClient } from "@/lib/actions/clients";
import { TrashIcon } from "lucide-react";
import React, { useState } from "react";

interface DeleteConfirmationModalProps {
  clientId: number;
  clientName: string;
}

export function DeleteConfirmationModal({
  clientId,
  clientName,
}: DeleteConfirmationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Esta función se llama cuando se confirma la eliminación en la modal

  const handleConfirm = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("id", clientId.toString());
      console.log("Deleting client with ID:", clientId);
      await deleteClient(formData);
      setIsOpen(false); // <- mover antes por si hay error
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
    } finally {
      setLoading(false);
      setIsOpen(false); // <- mover antes por si hay error
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        aria-label={`Eliminar ${clientName}`}
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-md text-red-600 hover:text-white hover:bg-red-600 transition-colors duration-200 cursor-pointer"
        disabled={loading}
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    );
  }

  // Estructura de la Modal (simple con Tailwind)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()} // Previene el cierre al hacer clic dentro
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          🗑️ Confirmar Eliminación
        </h3>
        <p className="text-sm text-gray-700 mb-6">
          ¿Estás seguro de que quieres eliminar al cliente{" "}
          <span className="font-semibold">{clientName}</span>? Esta acción no se
          puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer bg-gray-100 rounded-md hover:bg-gray-200 transition"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition cursor-pointer ${
              loading
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
            disabled={loading}
          >
            {loading ? "Eliminando..." : "Sí, Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
