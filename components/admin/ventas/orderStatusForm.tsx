"use client";

import { getOrderStateLabel } from "@/lib/admin/status";
import { actualizarEstadoPedido } from "@/lib/actions/admin-orders";
import type { EstadoTransaccion } from "@prisma/client";

export function OrderStatusForm({ transactionId, currentState }: { transactionId: number; currentState: EstadoTransaccion }) {
  if (currentState === "cancelado") return <p className="rounded-lg border border-[#b85f49]/25 bg-[#f8e8e3] p-3 text-sm text-[#a84f3b]">Esta venta está cancelada y no admite cambios desde el seguimiento operativo.</p>;
  async function submit(formData: FormData) {
    await actualizarEstadoPedido(formData);
  }
  return <form action={submit} className="space-y-3"><input type="hidden" name="transaccionId" value={transactionId} /><label className="admin-label">Cambiar estado<select name="estadoNuevo" defaultValue={currentState === "pendiente" ? "por_cobrar" : currentState} className="admin-field"><option value="por_cobrar">{getOrderStateLabel("por_cobrar")}</option><option value="en_pedido">{getOrderStateLabel("en_pedido")}</option><option value="pagado">{getOrderStateLabel("pagado")}</option></select></label><label className="admin-label">Motivo <span className="font-normal normal-case tracking-normal">(opcional)</span><textarea name="motivo" rows={2} className="admin-field resize-y" placeholder="Ej. Cliente confirmó la transferencia" /></label><label className="flex items-start gap-2 text-xs leading-relaxed text-[#707970]"><input type="checkbox" name="confirmacionPago" value="true" className="mt-0.5 size-4 accent-[#66735f]" /> Confirmo el cobro si selecciono Pagado.</label><button type="submit" className="admin-button-primary admin-button-brass w-full">Guardar estado</button></form>;
}
