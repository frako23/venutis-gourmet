"use client";

import { Menu, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { adminNavigation, isActive } from "./sidebar";

const titles: Record<string, string> = {
  "/admin": "Resumen operativo",
  "/admin/transactions": "Ventas y pedidos",
  "/admin/inventory": "Inventario",
  "/admin/analytics": "Analíticas",
  "/admin/delivery-notes": "Notas de entrega",
  "/admin/add-transaction": "Registrar venta",
};

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = Object.entries(titles).find(([route]) => isActive(pathname, route))?.[1] ?? "Panel administrativo";

  return (
    <header className="sticky top-0 z-10 border-b border-[#dbe0d7] bg-white/90 px-4 py-3 backdrop-blur-md dark:border-[#3a3e44] dark:bg-[#1a1c20]/90 md:px-8 md:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 md:gap-6">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10 md:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h2 className="truncate text-lg font-extrabold tracking-tight text-[#141712] dark:text-white md:text-xl">{title}</h2>
          <div className="hidden h-6 w-px bg-[#3a3e44] md:block" />
          <label className="relative hidden md:block">
            <span className="sr-only">Buscar en el panel</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
            <input className="w-72 rounded-lg border-none bg-[#2c3036] py-2 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/75 focus:ring-2 focus:ring-gold/40" placeholder="Buscar productos, clientes..." type="search" />
          </label>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/admin/add-transaction" className="flex items-center gap-2 rounded-lg bg-gold px-3 py-2.5 text-sm font-bold text-charcoal shadow-md transition-all hover:bg-gold/90 md:px-5">
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Registrar venta</span>
          </Link>
          <Link href="/" className="hidden border-l border-[#3a3e44] pl-4 text-[10px] font-black uppercase tracking-tighter text-slate-500 hover:underline dark:text-slate-200 sm:block">Salir</Link>
        </div>
      </div>

      {menuOpen && (
        <nav className="mt-3 space-y-1 border-t border-slate-200 pt-3 dark:border-white/10 md:hidden" aria-label="Navegación móvil">
          {adminNavigation.map(({ icon: Icon, label, link }) => (
            <Link key={link} href={link} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive(pathname, link) ? "bg-gold/15 font-bold" : "text-slate-600 dark:text-slate-300"}`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
