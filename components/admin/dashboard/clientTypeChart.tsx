import type { VentasTipoCliente } from "@/lib/admin/dashboard-core";
import { formatUsd } from "@/lib/format";
import { SinDatos } from "./chartCard";

const COLOR = { detal: "#a57c2f", mayorista: "#587487" } as const;
const pct = (v: number) => `${v.toLocaleString("es-VE", { maximumFractionDigits: 1 })} %`;

function Barra({ titulo, grupos, campo }: { titulo: string; grupos: VentasTipoCliente[]; campo: "porcentajeDeVentas" | "porcentajeDelMonto" }) {
  const resumen = grupos.map((g) => `${g.etiqueta.toLowerCase()} ${pct(g[campo])}`).join(", ");
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#707970]">{titulo}</span>
        <span className="admin-mono text-[#707970]">{grupos.map((g) => pct(g[campo])).join(" · ")}</span>
      </div>
      <div role="img" aria-label={`${titulo}: ${resumen}`} className="mt-1.5 flex h-2 gap-[2px]">
        {grupos.map((g) => g[campo] > 0 && <div key={g.tipoCliente} className="h-full rounded-full" style={{ width: `${g[campo]}%`, backgroundColor: COLOR[g.tipoCliente] }} />)}
      </div>
    </div>
  );
}

export function ClientTypeChart({ grupos }: { grupos: VentasTipoCliente[] }) {
  if (grupos.every((g) => g.cantidadVentas === 0)) return <SinDatos mensaje="No hubo ventas en este período." />;
  return (
    <div className="space-y-5">
      <Barra titulo="Cantidad de ventas" grupos={grupos} campo="porcentajeDeVentas" />
      <Barra titulo="Monto vendido" grupos={grupos} campo="porcentajeDelMonto" />
      <ul className="space-y-2">
        {grupos.map((g) => (
          <li key={g.tipoCliente} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: COLOR[g.tipoCliente] }} />
            <span className="font-bold text-[#18211d]">{g.etiqueta}</span>
            <span className="admin-mono text-[#707970]">{g.cantidadVentas} ventas</span>
            <span className="admin-mono text-[#18211d]">{formatUsd(g.totalUsd)}</span>
            <span className="admin-mono text-xs text-[#707970]">{pct(g.porcentajeDelMonto)} del monto</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
