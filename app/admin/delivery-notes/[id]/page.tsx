import { DeliveryNotePdfPreview } from "@/components/admin/notas-entrega/deliveryNotePdfPreview";
import { DeliveryNotePreview } from "@/components/admin/notas-entrega/deliveryNotePreview";
import { getDeliveryNote } from "@/lib/actions/delivery-notes";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function DeliveryNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound();
  const note = await getDeliveryNote(id);
  if (!note) return notFound();
  return <main className="admin-page"><div className="admin-content space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin/delivery-notes" className="inline-flex items-center gap-1 text-xs font-bold text-[#66735f] hover:text-[#18211d]"><ArrowLeft size={14} /> Volver a notas</Link><p className="admin-eyebrow mt-5">Nota guardada</p><h1 className="admin-title admin-mono mt-2">{note.numeroNota}</h1><p className="admin-subtitle mt-3">{note.fechaEntrega.toLocaleString("es-VE")}</p></div><div className="flex flex-wrap gap-2"><DeliveryNotePdfPreview noteId={note.id} numeroNota={note.numeroNota} /><a href={`/admin/delivery-notes/${note.id}/pdf`} className="admin-button-primary admin-button-brass"><Download size={16} /> Descargar PDF</a></div></div><div className="grid gap-6 md:grid-cols-[minmax(0,380px)_1fr]"><DeliveryNotePreview numeroNota={note.numeroNota} cliente={`${note.cliente.nombre} ${note.cliente.apellido}`} fecha={note.fechaEntrega.toLocaleDateString("es-VE")} lines={note.detalles.map((line) => ({ productoNombre: line.productoNombre, cantidad: line.cantidad, precioUnitarioUsd: line.precioUnitarioUsd }))} /><section className="admin-panel p-5"><p className="admin-eyebrow">Registro interno</p><h2 className="mt-1 text-lg font-bold text-[#18211d]">Datos guardados</h2><dl className="mt-5 space-y-4 border-t border-[#ebe9e0] pt-4 text-sm"><div><dt className="font-bold text-[#707970]">Dirección</dt><dd className="mt-1">{note.direccionEntrega ?? "No especificada"}</dd></div><div><dt className="font-bold text-[#707970]">Persona que recibe</dt><dd className="mt-1">{note.personaRecibe ?? "No especificada"}</dd></div><div><dt className="font-bold text-[#707970]">Observaciones</dt><dd className="mt-1 whitespace-pre-wrap">{note.observaciones ?? "Sin observaciones"}</dd></div><div><dt className="font-bold text-[#707970]">Venta relacionada</dt><dd className="mt-1">{note.transaccion?.numeroOrden ?? "Carga manual"}</dd></div></dl></section></div></div></main>;
}
