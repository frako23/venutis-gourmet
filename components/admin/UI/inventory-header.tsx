"use client";

import { useState } from "react";

export const InventoryHeader = () => {
  const [activeTab, setActiveTab] = useState("All Products");

  return (
    <div className="flex gap-8">
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
          className={` px-1 text-sm font-bold transition-all ${activeTab === tab ? "border-b-2 border-slate-200 text-gold dark:text-white" : "text-[#738165] dark:text-gray-400 hover:text-gold cursor-pointer"}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
