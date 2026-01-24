import { CakeSlice, CookingPot, Milk, Soup, Wheat } from "lucide-react";
import React from "react";

const Sidebar = () => {
  return (
    <aside className="w-full lg:w-64 p-6 lg:p-10 border-r border-primary/5 shrink-0">
      <div className="sticky top-28">
        <div className="mb-10">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-gold mb-4">
            Nuestros Productos
          </h3>
          <ul className="space-y-1">
            <SidebarItem icon={CookingPot} label="Pastas" active />
            <SidebarItem icon={Soup} label="Salsas" />
            <SidebarItem icon={CakeSlice} label="Postres" />
            <SidebarItem icon={Milk} label="Encurtidos" />
            <SidebarItem icon={Wheat} label="Pan de Jamón" />
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-gold mb-4">
            Filter By
          </h3>
          <div className="space-y-4">
            <FilterCheckbox label="Imported Only" />
            <FilterCheckbox label="Organic" />
            <FilterCheckbox label="On Sale" />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

function SidebarItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <li>
      <a
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
          active
            ? "bg-gold text-white shadow-lg shadow-gold/20"
            : "hover:bg-gold/5"
        }`}
        href="#"
      >
        <Icon
          className={`${active ? "text-white" : "text-gold/60 group-hover:text-gold"}`}
          size={18}
        />
        <span className="font-medium text-sm">{label}</span>
      </a>
    </li>
  );
}

function FilterCheckbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        className="rounded text-primary focus:ring-primary bg-background-light border-primary/20"
        type="checkbox"
      />
      <span className="text-sm font-medium group-hover:text-primary transition-colors">
        {label}
      </span>
    </label>
  );
}
