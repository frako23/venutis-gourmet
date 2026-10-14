import { ArrowRight, FilePlus2, PackagePlus, ReceiptText } from "lucide-react";
import Link from "next/link";

const actions = [
  { href: "/admin/add-transaction", label: "Registrar venta", description: "Carga una venta manual", icon: ReceiptText },
  { href: "/admin/delivery-notes/new", label: "Nueva nota de entrega", description: "Documento para mayoristas", icon: FilePlus2 },
  { href: "/admin/add-product", label: "Agregar producto", description: "Actualiza el catálogo", icon: PackagePlus },
];

export function QuickActions() {
  return (
    <section className="admin-panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="admin-eyebrow">Siguiente movimiento</p><h2 className="mt-1 text-lg font-bold text-[#18211d]">Accesos rápidos</h2></div>
        <span className="text-xs text-[#707970]">Operaciones frecuentes</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {actions.map(({ href, label, description, icon: Icon }) => (
          <Link href={href} key={href} className="group rounded-lg border border-[#dedfd6] p-4 transition hover:border-[#c8a45d] hover:bg-[#fffaf0]">
            <Icon className="text-[#66735f]" size={20} />
            <p className="mt-3 font-bold text-[#18211d]">{label}</p>
            <p className="mt-1 text-xs text-[#707970]">{description}</p>
            <ArrowRight className="mt-3 text-[#a57c2f] transition group-hover:translate-x-1" size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}
