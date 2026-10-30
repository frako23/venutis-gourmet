import type { ClientProfile } from "@/lib/admin/client-profile";
import { formatFecha, formatUsd } from "@/lib/format";

export function FichaIndicadores({ perfil }: { perfil: ClientProfile }) {
  const { totalCompradoUsd, pedidos, ticketPromedioUsd, ultimaCompra, topProductos } = perfil.indicadores;
  const dato = (etiqueta: string, valor: string) => (
    <div><dt className="admin-eyebrow">{etiqueta}</dt><dd className="admin-mono mt-1 text-lg font-bold text-[#18211d]">{valor}</dd></div>
  );
  return (
    <section className="admin-panel p-4 md:p-5">
      <h2 className="text-lg font-bold text-[#18211d]">Compras</h2>
      <p className="mt-1 text-xs text-[#707970]">No incluye pedidos cancelados.</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dato("Total comprado", formatUsd(totalCompradoUsd))}
        {dato("Pedidos", String(pedidos))}
        {dato("Ticket promedio", formatUsd(ticketPromedioUsd))}
        {dato("Última compra", formatFecha(ultimaCompra))}
      </dl>
      <h3 className="admin-eyebrow mt-6">Productos más comprados</h3>
      {topProductos.length === 0 ? (
        <p className="mt-2 text-sm text-[#8f988f]">Aún no hay compras.</p>
      ) : (
        <ol className="mt-2 space-y-1 text-sm text-[#18211d]">{topProductos.map((p) => <li key={p.productoId} className="flex justify-between gap-3"><span>{p.nombre}</span><span className="admin-mono text-[#707970]">{p.cantidad}</span></li>)}</ol>
      )}
    </section>
  );
}
