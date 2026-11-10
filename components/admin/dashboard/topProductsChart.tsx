import type { ProductoTop } from "@/lib/admin/dashboard-core";
import { formatUsd } from "@/lib/format";
import { SinDatos } from "./chartCard";

export function TopProductsChart({ productos }: { productos: ProductoTop[] }) {
  if (productos.length === 0) return <SinDatos mensaje="No hubo ventas de productos en este período." />;
  const mayor = Math.max(...productos.map((p) => p.cantidadVendida), 1);
  return (
    <ol className="space-y-4">
      {productos.map((p, i) => (
        <li key={p.productoId} className="flex items-start gap-3">
          <span className="admin-mono w-4 pt-0.5 text-sm text-[#707970]">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold text-[#18211d]" title={p.nombre}>{p.nombre}</p>
            <div className="mt-2 h-2.5 rounded-full bg-[#e8e4d9]">
              <div className="h-full rounded-full bg-[#a57c2f]" style={{ width: `${Math.max(3, (p.cantidadVendida / mayor) * 100)}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="admin-mono text-sm font-black text-[#18211d]">{p.cantidadVendida.toLocaleString("es-VE", { maximumFractionDigits: 2 })} uds</p>
            <p className="admin-mono text-xs text-[#707970]">{formatUsd(p.totalUsd)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
