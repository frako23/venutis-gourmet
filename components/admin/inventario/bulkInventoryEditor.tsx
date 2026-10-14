"use client";

import { editInventoryMasiva } from "@/lib/actions/products";
import type { ProductoConImagenes } from "@/prisma/types";
import { Save, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type InventoryRow = Pick<ProductoConImagenes, "id" | "nombre" | "categoria" | "inventario" | "precioDetal" | "precioMayorista">;
type BulkInventoryState = { success: boolean; message: string; updated?: number };

const initialState: BulkInventoryState = { success: false, message: "" };

export function BulkInventoryEditor({
  products: initialProducts,
  onClose,
}: {
  products: InventoryRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<InventoryRow[]>(initialProducts);
  const [state, formAction, isPending] = useActionState(editInventoryMasiva, initialState);

  useEffect(() => {
    if (!state.success) return;
    toast.success(state.message);
    router.refresh();
    onClose();
  }, [onClose, router, state]);

  function updateProduct(id: number, patch: Partial<InventoryRow>) {
    setProducts((current) => current.map((product) => product.id === id ? { ...product, ...patch } : product));
  }

  return <section className="admin-panel overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebe9e0] bg-[#fffaf0] p-4 md:p-5">
      <div>
        <p className="admin-eyebrow">Modo de captura</p>
        <h2 className="mt-1 text-lg font-bold text-[#18211d]">Editor masivo de inventario</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#707970]">Edita existencias y precios de varios productos y guarda todo el lote en una sola operación.</p>
      </div>
      <button type="button" onClick={onClose} className="admin-button-secondary"><X size={16} /> Cerrar</button>
    </div>
    <div className="border-b border-[#ebe9e0] px-4 py-3 text-xs text-[#707970] md:px-5">
      Se muestran los productos del filtro actual. Los cambios se validan nuevamente en el servidor antes de guardarse.
    </div>
    <form action={formAction}>
      <div className="overflow-x-auto">
        <table className="admin-table admin-sheet min-w-[920px] text-left text-sm">
          <thead><tr><th>Producto</th><th>Tipo</th><th>Existencias</th><th>Precio detal</th><th>Precio mayorista</th></tr></thead>
          <tbody>
            {products.map((product) => <tr key={product.id}>
              <td><div className="px-2"><strong className="text-[#18211d]">{product.nombre}</strong><span className="admin-mono mt-1 block text-xs text-[#8f988f]">#{product.id}</span></div></td>
              <td className="px-2 text-[#707970]">{product.categoria}</td>
              <td><input aria-label={`Existencias de ${product.nombre}`} type="number" min="0" step="1" value={product.inventario} onChange={(event) => updateProduct(product.id, { inventario: Number(event.target.value) })} className="admin-sheet-input w-24 admin-mono" /></td>
              <td><input aria-label={`Precio detal de ${product.nombre}`} type="number" min="0" step="0.01" value={product.precioDetal} onChange={(event) => updateProduct(product.id, { precioDetal: Number(event.target.value) })} className="admin-sheet-input w-28 admin-mono" /></td>
              <td><input aria-label={`Precio mayorista de ${product.nombre}`} type="number" min="0" step="0.01" value={product.precioMayorista} onChange={(event) => updateProduct(product.id, { precioMayorista: Number(event.target.value) })} className="admin-sheet-input w-28 admin-mono" /></td>
            </tr>)}
            {products.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-sm text-[#707970]">No hay productos para editar con este tipo.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ebe9e0] bg-[#f8f6ef] p-4 md:p-5">
        <span className="text-xs text-[#707970]">{products.length} producto(s) en el lote</span>
        <button type="submit" disabled={isPending || products.length === 0} className="admin-button-primary admin-button-brass"><Save size={16} /> {isPending ? "Guardando..." : "Guardar cambios"}</button>
      </div>
      <input type="hidden" name="inventarioMasivo" value={JSON.stringify(products.map(({ id, inventario, precioDetal, precioMayorista }) => ({ id, inventario, precioDetal, precioMayorista })))} />
    </form>
    {state.message && <p className={`border-t p-3 text-sm ${state.success ? "bg-[#e8eee5] text-[#55704d]" : "bg-[#f8e8e3] text-[#a84f3b]"}`} role="status">{state.message}</p>}
  </section>;
}
