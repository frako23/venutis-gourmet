"use client";

import { actualizarEstadoPedido } from "@/lib/actions/admin-orders";
import { getOrderStateLabel } from "@/lib/admin/status";
import type { EstadoTransaccion } from "@prisma/client";

export function OrderStatusForm({ transactionId, currentState }: { transactionId: number; currentState: EstadoTransaccion }) {
  if (currentState === "cancelado") return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Esta venta está cancelada y no admite cambios desde el seguimiento operativo.</p>;
  async function submit(formData: FormData) {
    await actualizarEstadoPedido(formData);
  }
  return <form action={submit} className="space-y-3"><input type="hidden" name="transaccionId" value={transactionId} /><label className="block text-xs font-bold uppercase text-slate-500">Cambiar estado<select name="estadoNuevo" defaultValue={currentState === "pendiente" ? "por_cobrar" : currentState} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-slate-900"><option value="por_cobrar">{getOrderStateLabel("por_cobrar")}</option><option value="en_pedido">{getOrderStateLabel("en_pedido")}</option><option value="pagado">{getOrderStateLabel("pagado")}</option></select></label><label className="block text-xs font-bold uppercase text-slate-500">Motivo <textarea name="motivo" rows={2} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-slate-900" placeholder="Opcional" /></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmacionPago" value="true" className="mt-1" /> Confirmo el cobro si selecciono Pagado.</label><button type="submit" className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-black text-charcoal">Guardar estado</button></form>;
}
