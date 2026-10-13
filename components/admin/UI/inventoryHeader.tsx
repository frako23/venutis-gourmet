"use client";

import { useState } from "react";

export const InventoryHeader = () => {
  const [activeTab, setActiveTab] = useState("Todos los productos");

  return (
    <div className="flex gap-4 overflow-x-auto pb-1 md:gap-8" role="tablist" aria-label="Categorías de inventario">
      {[
        "Todos los productos",
        "Pastas",
        "Salsas",
        "Postres",
        "Encurtidos",
        "Pan de Jamón",
      ].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          className={` px-1 text-sm font-bold transition-all ${activeTab === tab ? "border-b-2 border-slate-200 text-white" : "text-gray-400 hover:text-gold cursor-pointer"}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
