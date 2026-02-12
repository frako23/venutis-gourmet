"use client";

import {
  BarChart3,
  LucideIcon,
  Settings,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface SidebarProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  link: string;
}

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background-dark selection:bg-primary/20">
      {/* Sidebar Navigation */}
      <aside className=" flex flex-col border-r border-[#3a3e44] bg-[#1a1c20] z-20">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-venutis.avif"
              alt="Logo Venutis"
              width={50}
              height={50}
            />

            <div className="flex flex-col">
              <h1 className="text-white text-base font-bold leading-tight">
                Venuti's
              </h1>
              <p className="text-gold/80 text-[10px] font-black uppercase tracking-widest">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {/* <SidebarLink
            icon={LayoutDashboard}
            label="Dashboard"
            active={pathname === "/admin/dashboard"}
            link="/admin/dashboard"
          /> */}
          <SidebarLink
            icon={ShoppingCart}
            label="Transacciones"
            active={pathname === "/admin/transactions"}
            link="/admin/transactions"
          />
          <SidebarLink
            icon={Warehouse}
            label="Inventario"
            active={pathname === "/admin/inventory"}
            link="/admin/inventory"
          />

          <SidebarLink
            icon={BarChart3}
            label="Analytics"
            active={pathname === "/admin/analytics"}
            link="/admin/analytics"
          />
        </nav>

        <div className="p-4 border-t border-[#3a3e44]">
          <SidebarLink
            icon={Settings}
            label="Settings"
            link="/admin/settings"
          />
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;

// --- Sub-components ---

function SidebarLink({
  icon: Icon,
  label,
  active = false,
  link,
}: SidebarProps) {
  return (
    <a
      href={link}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${active ? "bg-primary/10 text-white" : "text-gray-400 hover:bg-primary/5"}`}
    >
      <Icon size={20} className={active ? "stroke-2" : ""} />
      <span className={`text-sm ${active ? "font-bold" : "font-semibold"}`}>
        {label}
      </span>
    </a>
  );
}
