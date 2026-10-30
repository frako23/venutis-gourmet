"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { type PremioVista, type ProductoOpcion, RewardForm } from "@/components/admin/clientes/premios/rewardForm";
import { cambiarEstadoPremio } from "@/lib/actions/admin-fidelidad";
import { formatUsd } from "@/lib/format";

export function RewardsTable({ premios, productos }: { premios: PremioVista[]; productos: ProductoOpcion[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<PremioVista | "nuevo" | null>(null);
  const [pendiente, iniciar] = useTransition();

  function alternar(premio: PremioVista) {
    const datos = new FormData();
    datos.set("premioId", String(premio.id));
    datos.set("activo", String(!premio.activo));
    iniciar(async () => {
      const resultado = await cambiarEstadoPremio(datos);
      if (resultado.success) {
        toast.success(resultado.message);
        router.refresh();
      } else {
        toast.error(resultado.message);
      }
    });
  }

  return (
    <section className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe9e0] p-4 md:p-5">
        <div><h2 className="text-lg font-bold text-[#18211d]">Premios canjeables</h2><p className="mt-1 text-xs text-[#707970]">Los clientes los canjean con sus puntos por un descuento o un producto gratis.</p></div>
        <button type="button" className="admin-button-primary admin-button-brass" onClick={() => setEditando("nuevo")}><Plus size={16} /> Nuevo premio</button>
      </div>
      {premios.length === 0 ? (
        <p className="p-6 text-sm text-[#8f988f]">Aún no hay premios. Crea el primero para que los clientes puedan canjear sus puntos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table min-w-[720px] text-left text-sm">
            <thead><tr><th>Premio</th><th>Tipo</th><th className="text-right">Costo</th><th>Recompensa</th><th>Canjes</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {premios.map((premio) => (
                <tr key={premio.id} className={premio.activo ? "" : "opacity-60"}>
                  <td><strong className="text-[#18211d]">{premio.nombre}</strong>{premio.descripcion && <span className="block text-xs text-[#707970]">{premio.descripcion}</span>}</td>
                  <td>{premio.tipo === "descuento" ? "Descuento" : "Producto gratis"}</td>
                  <td className="admin-mono text-right">{premio.costoPuntos.toLocaleString("es-VE")} pts</td>
                  <td>{premio.tipo === "descuento" ? formatUsd(premio.montoDescuentoUsd ?? 0) : `${premio.cantidad} × ${premio.productoNombre ?? "producto"}`}</td>
                  <td className="admin-mono">{premio.canjes}</td>
                  <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${premio.activo ? "bg-[#e8eee5] text-[#55704d]" : "bg-[#eceae0] text-[#707970]"}`}>{premio.activo ? "Activo" : "Inactivo"}</span></td>
                  <td className="whitespace-nowrap text-right"><button type="button" className="admin-button-secondary mr-2 text-xs" onClick={() => setEditando(premio)}>Editar</button><button type="button" disabled={pendiente} className="admin-button-secondary text-xs" onClick={() => alternar(premio)}>{premio.activo ? "Desactivar" : "Activar"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && <RewardForm premio={editando === "nuevo" ? null : editando} productos={productos} onClose={() => setEditando(null)} />}
    </section>
  );
}
