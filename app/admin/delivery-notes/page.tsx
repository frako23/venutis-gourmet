import { FileText, Plus } from "lucide-react";
import Link from "next/link";

import { getDeliveryNotes } from "@/lib/actions/delivery-notes";

export default async function DeliveryNotesPage() {
  const notes = await getDeliveryNotes();
  return (
    <main className="admin-page flex flex-col">
      <div className="admin-content flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Documentos mayoristas</p>
            <h1 className="admin-title mt-2">Notas de entrega</h1>
            <p className="admin-subtitle mt-3">
              Consulta y descarga documentos emitidos sin afectar inventario ni pagos.
            </p>
          </div>
          <Link href="/admin/delivery-notes/new" className="admin-button-primary admin-button-brass">
            <Plus size={16} /> Nueva nota
          </Link>
        </div>

        {notes.length === 0 ? (
          <div className="admin-panel-flat flex min-h-0 flex-1 flex-col items-center justify-center p-12 text-center">
            <FileText className="text-[#c8a45d]" size={28} />
            <p className="mt-3 font-bold text-[#18211d]">Todavía no hay notas de entrega.</p>
            <p className="mt-1 text-sm text-[#707970]">Crea la primera para acompañar una entrega mayorista.</p>
          </div>
        ) : (
          <div className="admin-panel min-h-0 flex-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Cliente mayorista</th>
                    <th>Origen</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {notes.map((note) => (
                    <tr key={note.id}>
                      <td className="admin-mono font-bold">{note.numeroNota}</td>
                      <td className="text-[#707970]">{note.fechaEntrega.toLocaleDateString("es-VE")}</td>
                      <td>{note.cliente.nombre} {note.cliente.apellido}</td>
                      <td className="text-[#707970]">{note.transaccion?.numeroOrden ?? "Manual"}</td>
                      <td className="text-right">
                        <Link href={`/admin/delivery-notes/${note.id}`} className="text-xs font-bold text-[#66735f] hover:text-[#18211d]">
                          Ver / PDF
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
