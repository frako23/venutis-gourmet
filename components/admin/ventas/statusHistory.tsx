import { getOrderStateLabel } from "@/lib/admin/status";
import type { EstadoTransaccionHistorial } from "@prisma/client";

export function StatusHistory({ events }: { events: EstadoTransaccionHistorial[] }) {
  if (events.length === 0) return <p className="text-sm text-slate-500">Sin historial.</p>;
  return <div className="space-y-4">{events.map((event) => <div key={event.id} className="border-l-2 border-gold pl-3"><p className="text-sm font-bold">{event.estadoAnterior ? `${getOrderStateLabel(event.estadoAnterior)} → ` : "Inicio → "}{getOrderStateLabel(event.estadoNuevo)}</p><p className="text-xs text-slate-500">{event.createdAt.toLocaleString("es-VE")}{event.actorEmail ? ` · ${event.actorEmail}` : ""}</p>{event.motivo && <p className="mt-1 text-xs text-slate-500">{event.motivo}</p>}</div>)}</div>;
}
