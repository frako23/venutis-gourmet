import { getDeliveryNote } from "@/lib/actions/delivery-notes";
import { buildDeliveryNotePdf } from "@/lib/admin/delivery-note-pdf";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Nota no encontrada", { status: 404 });
  const note = await getDeliveryNote(id);
  if (!note) return new Response("Nota no encontrada", { status: 404 });
  const pdf = await buildDeliveryNotePdf(note);
  const body = new Uint8Array(pdf).buffer as ArrayBuffer;
  return new Response(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${note.numeroNota}.pdf"`, "Cache-Control": "private, no-store" } });
}
