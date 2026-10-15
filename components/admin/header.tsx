"use client";

import { Menu, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { adminNavigation, isActive } from "./sidebar";

const titles: Record<string, string> = {
  "/admin": "Resumen operativo",
  "/admin/transactions": "Ventas y pedidos",
  "/admin/clients": "Clientes",
  "/admin/inventory": "Inventario",
  "/admin/analytics/sales": "Analíticas de ventas",
  "/admin/analytics/visits": "Analíticas de visitas",
  "/admin/analytics": "Analíticas",
  "/admin/delivery-notes": "Notas de entrega",
  "/admin/add-transaction": "Registrar venta",
};

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = Object.entries(titles).find(([route]) => isActive(pathname, route))?.[1] ?? "Panel administrativo";

  return (
    <header className="sticky top-0 z-20 border-b border-[#dedfd6] bg-[#f4f1e8]/90 px-4 py-3 backdrop-blur-md md:px-8 md:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 md:gap-6">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-[#18211d] hover:bg-[#e8e4d9] md:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="min-w-0">
            <p className="hidden text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#66735f] md:block">Venuti&apos;s Gourmet / administración</p>
            <h2 className="truncate text-lg font-extrabold tracking-tight text-[#18211d] md:text-xl">{title}</h2>
          </div>
          <div className="hidden h-8 w-px bg-[#dedfd6] md:block" />
          <label className="relative hidden md:block">
            <span className="sr-only">Buscar en el panel</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f988f]" size={17} aria-hidden="true" />
            <input className="w-72 rounded-lg border border-[#dedfd6] bg-white/65 py-2.5 pl-10 pr-4 text-sm text-[#18211d] outline-none placeholder:text-[#8f988f] focus:border-[#c8a45d] focus:ring-2 focus:ring-[#c8a45d]/20" placeholder="Buscar en el panel..." type="search" />
          </label>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/admin/add-transaction" className="admin-button-primary admin-button-brass px-3 md:px-5">
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Registrar venta</span>
          </Link>
          <Link href="/" className="hidden border-l border-[#dedfd6] pl-4 text-[0.68rem] font-bold text-[#66735f] hover:text-[#18211d] sm:block">Volver a la tienda</Link>
        </div>
      </div>

      {menuOpen && (
        <nav className="mt-3 space-y-1 border-t border-[#dedfd6] pt-3 md:hidden" aria-label="Navegación móvil">
          {adminNavigation.map(({ icon: Icon, label, link, children }) => <div key={link}>
            <Link href={link} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive(pathname, link) ? "bg-[#c8a45d] font-bold text-[#18211d]" : "text-[#66735f]"}`}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
            {children && <div className="ml-5 border-l border-[#dedfd6] pl-2">
              {children.map(({ icon: ChildIcon, label: childLabel, link: childLink }) => <Link key={childLink} href={childLink} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive(pathname, childLink) ? "bg-[#f5eddc] font-bold text-[#8c6a2c]" : "text-[#66735f]"}`}>
                <ChildIcon size={16} aria-hidden="true" />
                {childLabel}
              </Link>)}
            </div>}
          </div>)}
        </nav>
      )}
    </header>
  );
}
