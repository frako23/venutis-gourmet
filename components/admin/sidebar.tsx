"use client";

import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LucideIcon,
  Settings,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  icon: LucideIcon;
  label: string;
  link: string;
};

export const adminNavigation: NavigationItem[] = [
  { icon: LayoutDashboard, label: "Resumen", link: "/admin" },
  { icon: ShoppingCart, label: "Ventas y pedidos", link: "/admin/transactions" },
  { icon: Warehouse, label: "Inventario", link: "/admin/inventory" },
  { icon: BarChart3, label: "Analíticas", link: "/admin/analytics" },
  { icon: FileText, label: "Notas de entrega", link: "/admin/delivery-notes" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[#3a3e44] bg-[#1a1c20] md:flex">
      <div className="border-b border-[#3a3e44] p-5">
        <Link href="/admin" className="flex items-center gap-3">
          <Image src="/logo-venutis.avif" alt="Logo Venuti's" width={44} height={44} />
          <div>
            <h1 className="text-base font-bold leading-tight text-white">Venuti&apos;s</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-gold/80">Panel administrativo</p>
          </div>
        </Link>
      </div>

      <nav aria-label="Navegación administrativa" className="flex-1 space-y-1 p-3">
        {adminNavigation.map((item) => (
          <SidebarLink key={item.link} {...item} active={isActive(pathname, item.link)} />
        ))}
      </nav>

      <div className="border-t border-[#3a3e44] p-3">
        <SidebarLink icon={Settings} label="Configuración" link="/admin/settings" active={isActive(pathname, "/admin/settings")} />
      </div>
    </aside>
  );
}

export function isActive(pathname: string, link: string) {
  return link === "/admin" ? pathname === link : pathname === link || pathname.startsWith(`${link}/`);
}

function SidebarLink({ icon: Icon, label, active, link }: NavigationItem & { active: boolean }) {
  return (
    <Link
      href={link}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${active ? "bg-gold/15 font-bold text-white" : "font-semibold text-gray-400 hover:bg-white/5 hover:text-white"}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
