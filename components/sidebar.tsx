import { UserButton } from "@stackframe/stack";
import { Edit, Package, Plus, Settings, Shirt } from "lucide-react";
import Link from "next/link";
import { ShippingGuidePrinter } from "./shipping-guide-printer";

export default function Sidebar({
  currentPath = "/dashboard",
}: {
  currentPath?: string;
}) {
  const navigation = [
    // { name: "Panel", href: "/dashboard", icon: BarChart3 },
    { name: "Clientes", href: "/clients", icon: Package },
    { name: "Añadir cliente", href: "/add-client", icon: Plus },
    { name: "Editar cliente", href: "/edit-client", icon: Edit },
    // { name: "Settings", href: "/settings", icon: Settings },
  ];
  return (
    <div className="fixed left-0 top-0 bg-gray-900 text-white w-64 min-h-screen p-6 z-10">
      <div className="print:hidden mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Shirt className="w-7 h-7" />
          <span className=" text-lg font-semibold">Tienda DAGO</span>
        </div>
      </div>
      <nav className="space-y-1">
        <div className="print:hidden text-sm font-semibold text-gray-400 uppercase">
          Inventory
        </div>
        {navigation.map((item, key) => {
          const IconComponent = item.icon;
          const isActive = currentPath === item.href;
          return (
            <Link
              href={item.href}
              key={key}
              className={`print:hidden flex items-center space-x-3 py-2 px-3 rounded-lg ${
                isActive
                  ? "bg-purple-100 text-gray-800"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {<IconComponent className="w-5 h-5" />}
              <span className="text-sm"> {item.name}</span>
            </Link>
          );
        })}
      </nav>
      <button className="flex items-center space-x-3 py-2 px-3 rounded-lg">
        <ShippingGuidePrinter />
      </button>

      <div className="print:hidden absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <UserButton showUserInfo />
        </div>
      </div>
    </div>
  );
}
