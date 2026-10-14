"use client";

import { useState } from "react";

export const InventoryHeader = () => {
  const [activeTab, setActiveTab] = useState("Todos los productos");
  const tabs = ["Todos los productos", "Pastas", "Salsas", "Postres", "Encurtidos", "Pan de Jamón"];
  return <div className="flex gap-5 overflow-x-auto pb-1" role="tablist" aria-label="Categorías de inventario">{tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} type="button" role="tab" aria-selected={activeTab === tab} className={`whitespace-nowrap border-b-2 px-0.5 pb-2 text-xs font-bold transition ${activeTab === tab ? "border-[#c8a45d] text-[#18211d]" : "border-transparent text-[#8f988f] hover:text-[#66735f]"}`}>{tab}</button>)}</div>;
};
