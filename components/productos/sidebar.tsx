import {
  CakeSlice,
  CookingPot,
  LayoutGrid,
  Soup,
  SquareStack,
  Wheat,
} from "lucide-react";

const Sidebar = () => {
  return (
    <aside className="w-full lg:w-64 p-6 lg:p-10 border-r border-primary/5 shrink-0">
      <div className="sticky top-28">
        <div className="mb-10">
          <h3 className="text-2xl font-dk-coal-brush font-bold uppercase tracking-widest text-gold mb-4">
            Nuestros Productos
          </h3>
          <ul className="space-y-1 font-dk-coal-brush text-2xl">
            <SidebarItem icon={LayoutGrid} label="Todos los Productos" active />
            <SidebarItem icon={CookingPot} label="Pastas" />
            <SidebarItem icon={Soup} label="Salsas" />
            <SidebarItem icon={SquareStack} label="Pastichos" />
            <SidebarItem icon={CakeSlice} label="Postres" />
            <SidebarItem icon={Wheat} label="Bakery" />
            {/* <SidebarItem icon={Milk} label="Encurtidos" /> */}
          </ul>
        </div>
        <div>
          <h3 className="font-dk-coal-brush text-2xl font-bold uppercase tracking-widest text-gold mb-4">
            Filtrar por
          </h3>
          <div className="space-y-4">
            <FilterCheckbox label="En Promoción" />
            <FilterCheckbox label="Nuevo" />
            <FilterCheckbox label="Más Vendidos" />
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
            ? "bg-gold text-primary shadow-lg shadow-gold/20"
            : "hover:bg-gold/5"
        }`}
        href="#"
      >
        <Icon
          className={`${active ? "text-primary" : "text-gold/60 group-hover:text-gold"}`}
          size={24}
        />
        <span className="font-medium ">{label}</span>
      </a>
    </li>
  );
}

function FilterCheckbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group font-dk-coal-brush text-2xl">
      <input
        className="rounded text-primary focus:ring-primary bg-background-light border-primary/20"
        type="checkbox"
      />
      <span className=" font-medium group-hover:text-primary transition-colors">
        {label}
      </span>
    </label>
  );
}
