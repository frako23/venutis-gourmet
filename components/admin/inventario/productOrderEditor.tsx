"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, Save } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { guardarOrdenProductos } from "@/lib/actions/products";
import { unidadesDisponibles } from "@/lib/inventory";

type OrderProduct = {
  id: number;
  nombre: string;
  categoria: string;
  inventario: number;
  imagenUrl: string | null;
};

function OrderRow({ product, index, total, onMove }: { product: OrderProduct; index: number; total: number; onMove: (position: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 0 };

  return <li ref={setNodeRef} style={style} className={`flex items-center gap-3 border-b border-[#ebe9e0] bg-white p-3 ${isDragging ? "opacity-60 shadow-lg" : ""}`}>
    <button type="button" className="touch-none cursor-grab rounded-lg p-2 text-[#8f988f] hover:bg-[#f4f1e8] active:cursor-grabbing" aria-label={`Arrastrar ${product.nombre}`} {...attributes} {...listeners}><GripVertical size={18} /></button>
    <span className="admin-mono w-7 text-right text-xs font-bold text-[#8f988f]">{index + 1}</span>
    <Image className="size-11 shrink-0 rounded-lg border border-[#dedfd6] object-cover" src={product.imagenUrl || "/food-avatar.png"} alt={product.nombre} width={44} height={44} />
    <div className="min-w-0 flex-1">
      <p className="truncate font-bold text-[#18211d]">{product.nombre}</p>
      <p className="text-xs text-[#707970]">{product.categoria}{unidadesDisponibles(product.inventario) === 0 && <span className="ml-2 rounded-full bg-[#f8e8e3] px-2 py-0.5 font-bold text-[#a84f3b]">Agotado</span>}</p>
    </div>
    <select className="admin-field w-20" aria-label={`Posición de ${product.nombre}`} value={index + 1} onChange={(event) => onMove(Number(event.target.value))}>
      {Array.from({ length: total }, (_, position) => <option key={position + 1} value={position + 1}>{position + 1}</option>)}
    </select>
  </li>;
}

export function ProductOrderEditor({ productos }: { productos: OrderProduct[] }) {
  const router = useRouter();
  const [items, setItems] = useState(productos);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const unchanged = items.map((item) => item.id).join(",") === productos.map((item) => item.id).join(",");

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (overId === undefined || event.active.id === overId) return;
    setItems((current) => arrayMove(current, current.findIndex((item) => item.id === event.active.id), current.findIndex((item) => item.id === overId)));
  }

  function save() {
    startTransition(async () => {
      const result = await guardarOrdenProductos(items.map((item) => item.id));
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return <main className="admin-page"><div className="admin-content space-y-6">
    <div>
      <Link href="/admin/inventory" className="inline-flex items-center gap-1 text-sm font-bold text-[#66735f]"><ArrowLeft size={15} /> Volver al inventario</Link>
      <p className="admin-eyebrow mt-4">Catálogo</p>
      <h1 className="admin-title mt-2">Ordenar productos</h1>
      <p className="admin-subtitle mt-3">El orden se aplica a la tienda, la venta rápida, la cotización y las listas del panel.</p>
    </div>
    {items.length < 2 ? <p className="admin-panel p-6 text-sm text-[#707970]">No hay productos que ordenar todavía.</p> : <>
      <DndContext id="orden-productos" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="admin-panel overflow-hidden">
            {items.map((item, index) => <OrderRow key={item.id} product={item} index={index} total={items.length} onMove={(position) => setItems((current) => arrayMove(current, index, position - 1))} />)}
          </ul>
        </SortableContext>
      </DndContext>
      <div className="sticky bottom-0 flex gap-2 border-t border-[#dedfd6] bg-[#f4f1e8]/95 py-3 backdrop-blur-md">
        <button type="button" className="admin-button-secondary flex-1" disabled={unchanged || isPending} onClick={() => setItems(productos)}>Descartar</button>
        <button type="button" className="admin-button-primary admin-button-brass flex-1" disabled={unchanged || isPending} onClick={save}><Save size={16} /> {isPending ? "Guardando…" : "Guardar orden"}</button>
      </div>
    </>}
  </div></main>;
}
