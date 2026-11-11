import { Search, X } from "lucide-react";
import Link from "next/link";

import type { OrdenPuntos } from "@/lib/admin/points-core";

export function PointsFilters({ q, orden }: { q: string; orden: OrdenPuntos }) {
  return (
    <form action="/admin/points" method="get" className="admin-panel flex flex-col gap-3 p-4 md:flex-row md:items-end md:p-5">
      <label className="admin-label min-w-0 flex-1">
        Buscar cliente
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f988f]" size={17} aria-hidden="true" />
          <input name="q" defaultValue={q} className="admin-field pl-10" placeholder="Nombre o teléfono" autoComplete="off" />
        </span>
      </label>
      <label className="admin-label w-full md:w-56">
        Ordenar por
        <select name="orden" defaultValue={orden} className="admin-field">
          <option value="disponibles">Puntos disponibles</option>
          <option value="ganados">Puntos ganados</option>
          <option value="canjeados">Puntos canjeados</option>
          <option value="reciente">Último movimiento</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="admin-button-primary admin-button-brass"><Search size={16} aria-hidden="true" /> Aplicar</button>
        {(q || orden !== "disponibles") && <Link href="/admin/points" className="admin-button-secondary"><X size={16} aria-hidden="true" /> Limpiar</Link>}
      </div>
    </form>
  );
}
