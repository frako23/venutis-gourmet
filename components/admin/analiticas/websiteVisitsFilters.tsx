import { CalendarDays, ChevronDown } from "lucide-react";

import { getVisitPresetOptions } from "@/lib/admin/visit-periods";
import type { VisitPeriod } from "@/lib/admin/types";

export function WebsiteVisitsFilters({ period }: { period: VisitPeriod }) {
  return <form method="get" action="/admin/analytics/visits" className="admin-panel overflow-hidden p-5 sm:p-6">
    <div className="flex flex-col gap-4 border-b border-[#ebe9e0] pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="admin-eyebrow">Filtros de visitas</p>
        <h2 className="mt-1 text-lg font-black tracking-[-0.025em] text-[#18211d]">Periodo de Web Analytics</h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#707970]">Consulta el tráfico agregado de producción sin mezclarlo con las cifras de ventas.</p>
      </div>
      <span className="inline-flex min-h-9 items-center rounded-full bg-[#e8eee5] px-3 text-xs font-bold text-[#52614d]">Solo producción</span>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
      <label className="block min-w-0 text-xs font-bold text-[#66735f]">Periodo
        <span className="relative mt-2 block">
          <select name="visitasPeriodo" defaultValue={period.preset} className="admin-field appearance-none pr-10">
            {getVisitPresetOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66735f]" />
        </span>
      </label>

      <fieldset className="grid gap-3 border-0 p-0 sm:grid-cols-2">
        <legend className="sr-only">Fechas personalizadas</legend>
        <DateField label="Desde" name="visitasDesde" value={period.preset === "custom" ? period.since : ""} />
        <DateField label="Hasta" name="visitasHasta" value={period.preset === "custom" ? period.until : ""} />
      </fieldset>

      <button type="submit" className="admin-button-primary admin-button-brass min-h-11 w-full whitespace-nowrap lg:w-auto">Actualizar visitas</button>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-[#8f988f]">{period.isValid ? period.label : period.validationMessage}</p>

  </form>;
}

function DateField({ label, name, value }: { label: string; name: "visitasDesde" | "visitasHasta"; value: string }) {
  return <label className="block min-w-0 text-xs font-bold text-[#66735f]">{label}
    <span className="relative mt-2 block">
      <input aria-label={label} name={name} type="date" defaultValue={value} className="admin-field pr-11" />
      <CalendarDays size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66735f]" />
    </span>
  </label>;
}
