"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import type { VisitDay } from "@/lib/admin/types";

const fmt = (fecha: string, opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-VE", { ...opciones, timeZone: "UTC" }).format(new Date(`${fecha}T00:00:00Z`)).replace(/\.$/, "");

function DetalleDia({ active, payload }: TooltipContentProps<number, string>) {
  const dia = payload?.[0]?.payload as VisitDay | undefined;
  if (!active || !dia) return null;
  return (
    <div className="admin-panel px-3 py-2 text-sm">
      <p className="text-xs text-[#707970]">{fmt(dia.fecha, { weekday: "short", day: "numeric", month: "short" })}</p>
      <p className="admin-mono font-black text-[#18211d]">{dia.visitors.toLocaleString("es-VE")} visitantes</p>
      <p className="text-xs text-[#707970]">{dia.pageviews.toLocaleString("es-VE")} páginas vistas</p>
    </div>
  );
}

export function VisitsChart({ serie }: { serie: VisitDay[] }) {
  return (
    <div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#dedfd6" />
            <XAxis dataKey="fecha" tickLine={false} stroke="#dedfd6" minTickGap={24} tick={{ fill: "#707970", fontSize: 12 }} tickFormatter={(f: string) => fmt(f, { day: "numeric", month: "short" })} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={40} tick={{ fill: "#707970", fontSize: 12 }} />
            <Tooltip cursor={{ stroke: "#dedfd6" }} content={DetalleDia} />
            <Area type="monotone" dataKey="visitors" stroke="#66735f" strokeWidth={2} fill="#66735f" fillOpacity={0.1} isAnimationActive={false} activeDot={{ r: 4, stroke: "#fffdf8", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-[#707970]">Visitantes agregados por día según Vercel. Cada día se corta en hora universal (UTC).</p>
    </div>
  );
}
