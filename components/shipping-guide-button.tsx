"use client";
import { useAppStore } from "@/store/appStore";
import { Client } from "@prisma/client";
import { TruckIcon } from "lucide-react";

export const ShippingGuideButton = ({ client }: { client: Client }) => {
  const setSelectedClients = useAppStore((s) => s.setSelectedClients);
  const selectedClients = useAppStore((s) => s.selectedClients);
  return (
    <button
      type="button"
      aria-label="Despachar cliente"
      onClick={() => setSelectedClients([...selectedClients, client])}
      className={`p-2 rounded-md text-green-600 hover:text-white hover:bg-green-600 transition-colors duration-200 cursor-pointer ${
        selectedClients.some((c) => c.id === client.id)
          ? "pointer-events-none opacity-50"
          : ""
      }`}
    >
      <TruckIcon className="w-5 h-5" />
    </button>
  );
};
