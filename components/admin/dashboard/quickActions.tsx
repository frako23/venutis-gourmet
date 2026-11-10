import { PackagePlus, ReceiptText } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/admin/add-transaction" className="admin-button-primary inline-flex items-center gap-2">
        <ReceiptText size={16} aria-hidden="true" /> Registrar venta
      </Link>
      <Link href="/admin/add-product" className="admin-button-secondary inline-flex items-center gap-2">
        <PackagePlus size={16} aria-hidden="true" /> Agregar producto
      </Link>
    </div>
  );
}
