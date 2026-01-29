"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Header = () => {
  const pathname = usePathname();

  console.log("Current pathname:", pathname);
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 dark:bg-[#1a1c20]/80 backdrop-blur-md border-b border-[#dbe0d7] dark:border-[#3a3e44] px-8 py-4">
      <div className="flex items-center gap-6">
        <h2
          translate="no"
          className="text-xl font-extrabold text-[#141712] dark:text-white tracking-tight"
        >
          {pathname === "/admin/dashboard"
            ? "Dashboard"
            : pathname === "/admin/inventory"
              ? "Inventario"
              : pathname === "/admin/transactions"
                ? "Transacciones"
                : pathname === "/admin/analytics"
                  ? "Analytics"
                  : "Admin Panel"}
        </h2>
        <div className="h-6 w-px bg-[#dbe0d7] dark:bg-[#3a3e44]"></div>
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gold transition-colors"
            size={18}
          />
          <input
            className="w-72 pl-10 pr-4 py-2 bg-[#edefeb] dark:bg-[#2c3036] border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-white/75 dark:text-white outline-none"
            placeholder="Search products, SKUs..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="/admin/add-transaction"
          className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-primary/10 transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>Agregar venta</span>
        </a>
        <a
          href="/admin/add-product"
          className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-charcoal px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-primary/10 transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>Agregar producto</span>
        </a>
        <div className="flex items-center gap-3 border-l border-[#dbe0d7] dark:border-[#3a3e44] ">
          <div className="text-right">
            <Link
              href="/"
              className="text-[10px] text-slate-200 font-black uppercase tracking-tighter hover:underline"
            >
              Salir
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
