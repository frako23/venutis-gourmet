import Link from "next/link";
import { notFound } from "next/navigation";

import { getDeliveryNote } from "@/lib/actions/delivery-notes";
import { DeliveryNotePreview } from "@/components/admin/notas-entrega/deliveryNotePreview";

export default async function DeliveryNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound();
  const note = await getDeliveryNote(id);
  if (!note) return notFound();
  return <main className="min-h-full bg-slate-50 p-4 dark:bg-background-dark md:p-8"><div className="mx-auto max-w-5xl space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-gold">Nota guardada</p><h1 className="mt-1 text-3xl font-black">{note.numeroNota}</h1><p className="mt-2 text-sm text-slate-500">{note.fechaEntrega.toLocaleString("es-VE")}</p></div><a href={`/admin/delivery-notes/${note.id}/pdf`} className="rounded-xl bg-gold px-4 py-3 text-sm font-black text-charcoal">Descargar PDF</a></div><div className="grid gap-6 md:grid-cols-[380px_1fr]"><DeliveryNotePreview numeroNota={note.numeroNota} cliente={`${note.cliente.nombre} ${note.cliente.apellido}`} fecha={note.fechaEntrega.toLocaleDateString("es-VE")} lines={note.detalles.map((line) => ({ productoNombre: line.productoNombre, cantidad: line.cantidad, precioUnitarioUsd: line.precioUnitarioUsd }))} /><section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5"><h2 className="text-lg font-bold">Datos guardados</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-bold text-slate-500">Dirección</dt><dd>{note.direccionEntrega ?? "No especificada"}</dd></div><div><dt className="font-bold text-slate-500">Persona que recibe</dt><dd>{note.personaRecibe ?? "No especificada"}</dd></div><div><dt className="font-bold text-slate-500">Observaciones</dt><dd>{note.observaciones ?? "Sin observaciones"}</dd></div><div><dt className="font-bold text-slate-500">Venta relacionada</dt><dd>{note.transaccion?.numeroOrden ?? "Carga manual"}</dd></div></dl><Link href="/admin/delivery-notes" className="mt-6 inline-block text-sm font-bold text-gold">← Volver a notas</Link></section></div></div></main>;
}
