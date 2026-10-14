"use client";

import { Edit3, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface ActionButtonProps { productId?: number; onDelete?: (id: number) => void; operacion?: string; transaccionId?: number; }

export const ActionButton = ({ productId, onDelete, operacion, transaccionId }: ActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isTransaction = operacion === "transaccion";
  const id = isTransaction ? transaccionId : productId;
  return <div className="relative"><button type="button" onClick={() => setIsOpen(!isOpen)} className="rounded-lg p-2 text-[#8f988f] transition hover:bg-[#e8eee5] hover:text-[#18211d]" aria-label="Más acciones" aria-expanded={isOpen}><MoreHorizontal size={18} /></button>{isOpen && <><div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} /><div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-[#dedfd6] bg-[#fffdf8] py-1 text-sm shadow-[0_14px_30px_rgba(24,33,29,0.14)]">{isTransaction ? <><Link href={`/admin/transactions/${id}`} className="flex items-center gap-3 px-4 py-2.5 text-[#18211d] hover:bg-[#fffaf0]"><Eye size={16} /> Ver transacción</Link><Link href={`/admin/edit-product/${id}`} className="flex items-center gap-3 px-4 py-2.5 text-[#18211d] hover:bg-[#fffaf0]"><Edit3 size={16} /> Editar transacción</Link></> : <><Link href={`/productos/consumidores/${id}`} className="flex items-center gap-3 px-4 py-2.5 text-[#18211d] hover:bg-[#fffaf0]"><Eye size={16} /> Ver detalles</Link><Link href={`/admin/edit-product/${id}`} className="flex items-center gap-3 px-4 py-2.5 text-[#18211d] hover:bg-[#fffaf0]"><Edit3 size={16} /> Editar producto</Link></>}<div className="my-1 border-t border-[#ebe9e0]" /><button type="button" onClick={() => { if (confirm(isTransaction ? "¿Estás seguro de eliminar esta transacción?" : "¿Estás seguro de eliminar este producto?")) { if (id && onDelete) onDelete(id); setIsOpen(false); } }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[#b85f49] hover:bg-[#f8e8e3]"><Trash2 size={16} /> Eliminar</button></div></>}</div>;
};
