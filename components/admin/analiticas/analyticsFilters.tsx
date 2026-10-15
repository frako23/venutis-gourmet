"use client";

import { CalendarDays, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

import { formatMonthSelection, formatWeekSelection } from "@/lib/admin/periods";

type ProductOption = { id: number; nombre: string };

export function AnalyticsFilters({ products, semanaInicial, mesInicial, productoId, incluirPredictor }: { products: ProductOption[]; semanaInicial: string; mesInicial: string; productoId?: number; incluirPredictor: boolean }) {
  const [semana, setSemana] = useState(semanaInicial);
  const [mes, setMes] = useState(mesInicial);

  function handleWeekChange(value: string) {
    setSemana(value);
    if (value) setMes("");
  }

  function handleMonthChange(value: string) {
    setMes(value);
    if (value) setSemana("");
  }

  return <form method="get" className="admin-panel overflow-hidden p-5 sm:p-6">
    <div className="flex flex-col gap-4 border-b border-[#ebe9e0] pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-bold tracking-[0.08em] text-[#66735f]">Filtros de analítica</p>
        <h2 className="mt-1 text-lg font-black tracking-[-0.025em] text-[#18211d]">Ventas por periodo</h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#707970]">Consulta el rendimiento de un producto en una semana o en un mes calendario.</p>
      </div>
      <label className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-lg border border-[#dedfd6] bg-[#fffefa] px-3 text-sm font-bold text-[#18211d] transition-colors hover:border-[#c8a45d]">
        <span className="grid size-7 place-items-center rounded-md bg-[#f5eddc] text-[#a57c2f]"><Sparkles size={15} aria-hidden="true" /></span>
        <input name="predictor" value="1" type="checkbox" defaultChecked={incluirPredictor} className="size-4 accent-[#66735f]" />
        <span>Incluir predictor</span>
      </label>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(14rem,0.9fr)_auto] lg:items-end">
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="text-xs font-bold text-[#66735f]">Periodo de consulta</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <PeriodField label="Semana" name="semana" type="week" value={semana} displayValue={semana ? formatWeekSelection(semana) : "Selecciona una semana"} onChange={handleWeekChange} />
          <PeriodField label="Mes calendario" name="mes" type="month" value={mes} displayValue={mes ? formatMonthSelection(mes) : "Selecciona un mes"} onChange={handleMonthChange} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#8f988f]">Elige una opción. La otra se limpia automáticamente.</p>
      </fieldset>

      <label className="block min-w-0 text-xs font-bold text-[#66735f]">Producto
        <span className="relative mt-2 block">
          <select name="productoId" defaultValue={productoId ?? ""} className="admin-field appearance-none pr-10">
            <option value="">Todos los productos</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}
          </select>
          <ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66735f]" />
        </span>
      </label>

      <button type="submit" className="admin-button-primary admin-button-brass min-h-11 w-full whitespace-nowrap lg:w-auto">Actualizar analíticas</button>
    </div>
    {!incluirPredictor && <input type="hidden" name="predictor" defaultValue="0" />}
  </form>;
}

function PeriodField({ label, name, type, value, displayValue, onChange }: { label: string; name: "semana" | "mes"; type: "week" | "month"; value: string; displayValue: string; onChange: (value: string) => void }) {
  return <label className="block min-w-0 text-xs font-bold text-[#66735f]">{label}
    <span className="relative mt-2 block">
      <input aria-label={label} lang="es-VE" name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="admin-field pr-11" />
      <CalendarDays size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66735f]" />
    </span>
    <span className={value ? "mt-1 block truncate text-[0.68rem] font-medium text-[#66735f]" : "mt-1 block text-[0.68rem] font-medium text-[#8f988f]"}>{value ? displayValue : `Selecciona ${label.toLowerCase()}`}</span>
  </label>;
}
