import { getOrderStateLabel } from "@/lib/admin/status";
import type { EstadoTransaccionHistorial } from "@prisma/client";

export function StatusHistory({ events }: { events: EstadoTransaccionHistorial[] }) {
  if (events.length === 0) return <p className="text-sm text-[#707970]">Sin historial.</p>;
  return <div className="space-y-5">{events.map((event) => <div key={event.id} className="relative border-l border-[#c8a45d] pl-4"><span className="absolute -left-[0.28rem] top-1 size-2 rounded-full bg-[#c8a45d]" /><p className="text-sm font-bold text-[#18211d]">{event.estadoAnterior ? `${getOrderStateLabel(event.estadoAnterior)} → ` : "Inicio → "}{getOrderStateLabel(event.estadoNuevo)}</p><p className="mt-1 text-xs text-[#8f988f]">{event.createdAt.toLocaleString("es-VE")}{event.actorEmail ? ` · ${event.actorEmail}` : ""}</p>{event.motivo && <p className="mt-2 text-xs leading-relaxed text-[#707970]">{event.motivo}</p>}</div>)}</div>;
}
