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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside className="hidden w-[17rem] shrink-0 flex-col bg-[#18211d] text-[#f4f1e8] md:flex">
      <div className="border-b border-white/10 px-6 py-7">
        <Link href="/admin" className="group flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#c8a45d] shadow-[0_8px_20px_rgba(200,164,93,0.2)]">
            <Image src="/logo-venutis.avif" alt="Logo Venuti's" width={34} height={34} className="rounded-lg object-contain" />
          </span>
          <div>
            <h1 className="text-[1.05rem] font-black leading-tight tracking-[-0.04em]">Venuti&apos;s</h1>
            <p className="mt-1 text-[0.61rem] font-bold uppercase tracking-[0.16em] text-[#c8a45d]">Cuaderno de operación</p>
          </div>
        </Link>
      </div>

      <div className="px-6 pb-2 pt-7 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/35">Trabajar hoy</div>
      <nav aria-label="Navegación administrativa" className="flex-1 space-y-1 px-3">
        {adminNavigation.map((item) => <NavigationGroup key={item.link} item={item} pathname={pathname} />)}
      </nav>

      <div className="m-3 mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <p className="px-2 text-[0.65rem] leading-relaxed text-white/45">Las ventas se coordinan por los canales reales de Venuti&apos;s.</p>
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
      className={`relative flex items-center gap-3 rounded-lg px-3 py-3 text-[0.82rem] transition-colors ${active ? "bg-[#c8a45d] font-bold text-[#18211d]" : "font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white"}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

function NavigationGroup({ item, pathname }: { item: NavigationItem; pathname: string }) {
  return <div>
    <SidebarLink icon={item.icon} label={item.label} link={item.link} active={isActive(pathname, item.link)} />
    {item.children && <div className="ml-5 border-l border-white/10 pl-2">
      {item.children.map((child) => <SidebarLink key={child.link} icon={child.icon} label={child.label} link={child.link} active={isActive(pathname, child.link)} />)}
    </div>}
  </div>;
}
