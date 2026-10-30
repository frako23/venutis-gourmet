import type { ClientProfile } from "@/lib/admin/client-profile";
import { formatUsd } from "@/lib/format";

export function FichaResumenFinanciero({ perfil }: { perfil: ClientProfile }) {
  const { deudaUsd, saldoAFavorUsd, puntos, credito } = perfil.financiero;
  const tarjeta = (titulo: string, valor: string, nota?: string, tono = "text-[#18211d]") => (
    <div className="admin-panel-flat p-4"><p className="admin-eyebrow">{titulo}</p><p className={`admin-mono mt-2 text-2xl font-black ${tono}`}>{valor}</p>{nota && <p className="mt-1 text-xs text-[#707970]">{nota}</p>}</div>
  );
  return (
    <section aria-label="Resumen financiero" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tarjeta("Deuda", formatUsd(deudaUsd), "Saldo pendiente de pedidos por cobrar", deudaUsd > 0 ? "text-[#a5452f]" : undefined)}
      {tarjeta("Saldo a favor", formatUsd(saldoAFavorUsd), "Disponible para su próxima compra", saldoAFavorUsd > 0 ? "text-[#55704d]" : undefined)}
      {tarjeta("Puntos", puntos.toLocaleString("es-VE"), "Puntos de fidelización disponibles")}
      {tarjeta(
        "Crédito",
        credito.habilitado ? formatUsd(credito.disponibleUsd ?? 0) : "Sin crédito",
        credito.habilitado ? `Disponible de ${formatUsd(credito.limiteUsd ?? 0)}` : "El cliente no tiene crédito habilitado",
      )}
    </section>
  );
}
