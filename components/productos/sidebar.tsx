"use client";
import { CATEGORIAS } from "@/lib/constants/constants";
import { normalizePurchaseContext } from "@/lib/catalog-context";
import { useRouter, useSearchParams } from "next/navigation";

const Sidebar = () => {
  const searchParams = useSearchParams();
  const categoriaActual = searchParams.get("categoria") || "TODOS";
  const contextoActual = normalizePurchaseContext(searchParams.get("contexto"));
  return (
    <aside className="w-full lg:w-64 p-6 lg:p-10 border-r border-primary/5 shrink-0">
      <div className="sticky top-28">
        <div className="mb-10">
          <h3 className="text-2xl font-dk-coal-brush font-bold uppercase tracking-widest text-gold mb-4">
            Nuestros Productos
          </h3>
          <ul className="space-y-1 font-dk-coal-brush text-2xl">
            {CATEGORIAS.map((cat) => (
              <SidebarItem
                key={cat.id}
                icon={cat.icon}
                id={cat.id}
                label={cat.label}
                active={cat.id === categoriaActual}
                contexto={contextoActual}
              />
            ))}

            {/* <SidebarItem icon={Milk} label="Encurtidos" /> */}
          </ul>
        </div>
        {/* <div>
          <h3 className="font-dk-coal-brush text-2xl font-bold uppercase tracking-widest text-gold mb-4">
            Filtrar por
          </h3>
          <div className="space-y-4">
            <FilterCheckbox label="En Promoción" />
            <FilterCheckbox label="Nuevo" />
            <FilterCheckbox label="Más Vendidos" />
          </div>
        </div> */}
      </div>
    </aside>
  );
};

export default Sidebar;

function SidebarItem({
  icon: Icon,
  label,
  id,
  active = false,
  contexto,
}: {
  icon: any;
  id: string;
  label: string;
  active?: boolean;
  contexto: "consumidor" | "mayorista";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilter = (categoria: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoria === "TODOS") {
      params.delete("categoria");
    } else {
      params.set("categoria", categoria);
    }
    params.set("contexto", contexto);
    // Navegamos a la nueva URL conservando otros parámetros si existen
    router.push(`/productos/consumidores?${params.toString()}`);
  };
  return (
    <li
      onClick={() => handleFilter(id)}
      className={`flex items-center cursor-pointer gap-3 px-4 py-3 rounded-lg transition-all group ${
        active
          ? "bg-gold text-primary shadow-lg shadow-gold/20"
          : "hover:bg-gold/5"
      }`}
    >
      <Icon
        className={`shrink-0 ${active ? "text-primary" : "text-gold/60 group-hover:text-gold"}`}
        size={24}
      />
      <span className="font-medium ">{label}</span>
    </li>
  );
}

function FilterCheckbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group font-dk-coal-brush text-2xl">
      <input
        className="rounded text-primary focus:ring-gold bg-background-light border-primary/20"
        type="checkbox"
      />
      <span className=" font-medium group-hover:text-gold transition-colors">
        {label}
      </span>
    </label>
  );
}
