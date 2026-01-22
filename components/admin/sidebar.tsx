import {
  BarChart3,
  LayoutDashboard,
  LucideIcon,
  Settings,
  ShoppingCart,
  Users,
  Utensils,
  Warehouse,
} from "lucide-react";
import React from "react";

interface SidebarProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  link: string;
}

const Sidebar = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark selection:bg-primary/20">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex flex-col border-r border-[#dbe0d7] dark:border-[#3a3e44] bg-white dark:bg-[#1a1c20] z-20">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex items-center justify-center rounded-lg size-10 text-white shadow-lg shadow-primary/20">
              <Utensils size={20} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[#141712] dark:text-white text-base font-bold leading-tight">
                Venuti's
              </h1>
              <p className="text-primary dark:text-primary/80 text-[10px] font-black uppercase tracking-widest">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <SidebarLink
            icon={LayoutDashboard}
            label="Dashboard"
            link="/admin/dashboard"
          />
          <SidebarLink
            icon={Warehouse}
            label="Inventario"
            active
            link="/admin/inventory"
          />
          <SidebarLink
            icon={ShoppingCart}
            label="Transacciones"
            link="/admin/transactions"
          />

          <SidebarLink
            icon={BarChart3}
            label="Analytics"
            link="/admin/analytics"
          />
        </nav>

        <div className="p-4 border-t border-[#dbe0d7] dark:border-[#3a3e44]">
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${active ? "bg-primary/10 text-primary dark:text-white" : "text-[#738165] dark:text-gray-400 hover:bg-primary/5"}`}
    >
      <Icon size={20} className={active ? "fill-current" : ""} />
      <span className={`text-sm ${active ? "font-bold" : "font-semibold"}`}>
        {label}
      </span>
    </a>
  );
}
