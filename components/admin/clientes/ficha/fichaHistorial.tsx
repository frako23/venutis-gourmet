import type { ClientProfile } from "@/lib/admin/client-profile";
import { formatFechaHora } from "@/lib/format";

export function FichaHistorial({ perfil }: { perfil: ClientProfile }) {
  return (
    <section className="admin-panel p-4 md:p-5">
      <h2 className="text-lg font-bold text-[#18211d]">Historial de cambios</h2>
      {perfil.historial.length === 0 ? (
        <p className="mt-3 text-sm text-[#8f988f]">Sin cambios registrados.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {perfil.historial.map((h, indice) => (
            <li key={indice} className="rounded-lg border border-[#ebe9e0] bg-[#fffdf8] px-3 py-2 text-xs text-[#707970]">
              <span className="admin-mono">{formatFechaHora(h.createdAt)}</span> · {h.actorEmail ?? "Sistema"} · {h.accion === "creado" ? "Creó el cliente" : `Actualizó ${h.camposModificados.join(", ") || "datos"}`}
              {h.detalle && <p className="mt-1 text-[#18211d]">{h.detalle}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
