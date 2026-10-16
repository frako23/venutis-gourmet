"use client";

import {
  BarChart3,
  FileText,
  Globe2,
  LayoutDashboard,
  LucideIcon,
  Users,
  Settings,
  ShoppingCart,
  Warehouse,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavigationItem = {
  icon: LucideIcon;
  label: string;
  link: string;
  children?: NavigationItem[];
};

export const adminNavigation: NavigationItem[] = [
  { icon: LayoutDashboard, label: "Resumen", link: "/admin" },
  { icon: ShoppingCart, label: "Ventas y pedidos", link: "/admin/transactions" },
  { icon: Users, label: "Clientes", link: "/admin/clients" },
  { icon: Warehouse, label: "Inventario", link: "/admin/inventory" },
  {
    icon: BarChart3,
    label: "Analíticas",
    link: "/admin/analytics",
    children: [
      { icon: ShoppingCart, label: "Ventas", link: "/admin/analytics/sales" },
      { icon: Globe2, label: "Visitas", link: "/admin/analytics/visits" },
    ],
  },
  { icon: FileText, label: "Notas de entrega", link: "/admin/delivery-notes" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`hidden shrink-0 flex-col bg-[#18211d] text-[#f4f1e8] transition-[width] duration-300 md:flex ${isCollapsed ? "w-[5.25rem]" : "w-[17rem]"}`}>
      <div className={`border-b border-white/10 py-7 ${isCollapsed ? "px-3" : "px-6"}`}>
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-3" : "justify-between gap-3"}`}>
          <Link href="/admin" className="group flex min-w-0 items-center gap-3" title={isCollapsed ? "Ir al resumen" : undefined}>
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#c8a45d] shadow-[0_8px_20px_rgba(200,164,93,0.2)]">
            <Image src="/logo-venutis.avif" alt="Logo Venuti's" width={34} height={34} className="rounded-lg object-contain" />
          </span>
          <div className={isCollapsed ? "sr-only" : "min-w-0"}>
            <h1 className="text-[1.05rem] font-black leading-tight tracking-[-0.04em]">Venuti&apos;s</h1>
            <p className="mt-1 text-[0.61rem] font-bold uppercase tracking-[0.16em] text-[#c8a45d]">Cuaderno de operación</p>
          </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label={isCollapsed ? "Expandir menú" : "Reducir menú"}
            aria-pressed={isCollapsed}
            title={isCollapsed ? "Expandir menú" : "Reducir menú"}
          >
            {isCollapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className={`pb-2 pt-7 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/35 ${isCollapsed ? "sr-only" : "px-6"}`}>Trabajar hoy</div>
      <nav aria-label="Navegación administrativa" className={`flex-1 space-y-1 ${isCollapsed ? "px-2" : "px-3"}`}>
        {adminNavigation.map((item) => <NavigationGroup key={item.link} item={item} pathname={pathname} isCollapsed={isCollapsed} />)}
      </nav>

      <div className={`m-3 mt-6 rounded-xl border border-white/10 bg-white/[0.04] ${isCollapsed ? "p-2" : "p-3"}`}>
        <p className={isCollapsed ? "sr-only" : "px-2 text-[0.65rem] leading-relaxed text-white/45"}>Las ventas se coordinan por los canales reales de Venuti&apos;s.</p>
        <SidebarLink icon={Settings} label="Configuración" link="/admin/settings" active={isActive(pathname, "/admin/settings")} isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}

export function isActive(pathname: string, link: string) {
  return link === "/admin" ? pathname === link : pathname === link || pathname.startsWith(`${link}/`);
}

function SidebarLink({ icon: Icon, label, active, link, isCollapsed = false }: NavigationItem & { active: boolean; isCollapsed?: boolean }) {
  return (
    <Link
      href={link}
      className={`relative flex items-center rounded-lg py-3 text-[0.82rem] transition-colors ${isCollapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-[#c8a45d] font-bold text-[#18211d]" : "font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white"}`}
      aria-current={active ? "page" : undefined}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={19} aria-hidden="true" />
      <span className={isCollapsed ? "sr-only" : undefined}>{label}</span>
    </Link>
  );
}

function NavigationGroup({ item, pathname, isCollapsed }: { item: NavigationItem; pathname: string; isCollapsed: boolean }) {
  return <div>
    <SidebarLink icon={item.icon} label={item.label} link={item.link} active={isActive(pathname, item.link)} isCollapsed={isCollapsed} />
    {item.children && <div className={isCollapsed ? "mt-1 space-y-1" : "ml-5 border-l border-white/10 pl-2"}>
      {item.children.map((child) => <SidebarLink key={child.link} icon={child.icon} label={child.label} link={child.link} active={isActive(pathname, child.link)} isCollapsed={isCollapsed} />)}
    </div>}
  </div>;
}
