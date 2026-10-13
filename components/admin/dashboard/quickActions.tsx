import { ArrowRight, FilePlus2, PackagePlus, ReceiptText } from "lucide-react";
import Link from "next/link";

const actions = [
  { href: "/admin/add-transaction", label: "Registrar venta", description: "Carga una venta manual", icon: ReceiptText },
  { href: "/admin/delivery-notes/new", label: "Nueva nota de entrega", description: "Documento para mayoristas", icon: FilePlus2 },
  { href: "/admin/add-product", label: "Agregar producto", description: "Actualiza el catálogo", icon: PackagePlus },
];

export function QuickActions() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Accesos rápidos</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {actions.map(({ href, label, description, icon: Icon }) => (
          <Link href={href} key={href} className="group rounded-xl border border-slate-200 p-4 transition hover:border-gold hover:bg-gold/5 dark:border-white/10">
            <Icon className="text-gold" size={20} />
            <p className="mt-3 font-bold text-slate-900 dark:text-white">{label}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            <ArrowRight className="mt-3 text-slate-400 transition group-hover:translate-x-1" size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}
