"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import type { VentasMes } from "@/lib/admin/dashboard-core";
import { formatUsd } from "@/lib/format";

function DetalleMes({ active, payload }: TooltipContentProps<number, string>) {
  const mes = payload?.[0]?.payload as VentasMes | undefined;
  if (!active || !mes) return null;
  return (
    <div className="admin-panel px-3 py-2 text-sm">
      <p className="text-xs text-[#707970]">{mes.etiqueta}{mes.enCurso ? " · en curso" : ""}</p>
      <p className="admin-mono font-black text-[#18211d]">{formatUsd(mes.totalUsd)}</p>
      <p className="text-xs text-[#707970]">
        {mes.cantidadVentas === 0 ? "Sin ventas" : `${mes.cantidadVentas} ventas · ticket promedio ${formatUsd(mes.ticketPromedioUsd)}`}
      </p>
    </div>
  );
}

export function MonthlySalesChart({ meses }: { meses: VentasMes[] }) {
  const mayor = meses.reduce((max, m) => (m.totalUsd > max.totalUsd ? m : max), meses[0]);
  const etiquetaEje = (clave: string) => {
    const mes = meses.find((m) => m.mes === clave);
    if (!mes) return clave;
    return clave === meses[0].mes || clave.endsWith("-01") ? `${mes.etiquetaCorta} ${clave.slice(2, 4)}` : mes.etiquetaCorta;
  };
  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={meses} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#dedfd6" />
            <XAxis dataKey="mes" tickLine={false} stroke="#dedfd6" tick={{ fill: "#707970", fontSize: 12 }} tickFormatter={etiquetaEje} />
            <YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: "#707970", fontSize: 12 }} tickFormatter={(v: number) => v.toLocaleString("es-VE", { maximumFractionDigits: 0 })} />
            <Tooltip cursor={{ fill: "#f4f1e8" }} content={DetalleMes} />
            <Bar dataKey="totalUsd" fill="#a57c2f" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {meses.map((m) => <Cell key={m.mes} fillOpacity={m.enCurso ? 0.45 : 1} />)}
              <LabelList
                dataKey="totalUsd"
                content={(props) => {
                  const { x, y, width, index, value } = props as unknown as { x: number; y: number; width: number; index: number; value: number };
                  if (meses[index] !== mayor || !value) return null;
                  return <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="#18211d">{formatUsd(value)}</text>;
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-[#707970]">La barra más clara es el mes en curso, con ventas hasta hoy.</p>
    </div>
  );
}
