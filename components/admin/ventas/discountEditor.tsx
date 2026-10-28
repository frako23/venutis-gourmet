"use client";

import { actualizarDescuentoVenta } from "@/lib/actions/admin-sales";
import { useState } from "react";
import { toast } from "sonner";

export function DiscountEditor({ transactionId, subtotalUsd, currentType, currentValue }: { transactionId: number; subtotalUsd: number; currentType: "porcentaje" | "usd" | null; currentValue: number | null }) {
  const [type, setType] = useState<"porcentaje" | "usd">(currentType ?? "porcentaje");
  const [value, setValue] = useState(currentValue ?? 0);
  const discount = type === "porcentaje" ? Math.round(subtotalUsd * value / 100 * 100) / 100 : value;
  const total = Math.max(0, subtotalUsd - discount);

  async function submit(formData: FormData) {
    const result = await actualizarDescuentoVenta(formData);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }

  return <form action={submit} className="rounded-[1.1rem] border border-[#c8a45d]/40 bg-[#fffaf0] p-5"><input type="hidden" name="transactionId" value={transactionId} /><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="admin-eyebrow">Ajuste auditable</p><h3 className="mt-1 font-bold text-[#18211d]">Editar descuento</h3></div><span className="admin-mono text-xs text-[#707970]">Subtotal ${subtotalUsd.toFixed(2)}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="admin-label">Tipo<select name="tipo" value={type} onChange={(event) => setType(event.target.value as "porcentaje" | "usd")} className="admin-field"><option value="porcentaje">Porcentaje (%)</option><option value="usd">Monto fijo (USD)</option></select></label><label className="admin-label">Valor<input name="valor" type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(Number(event.target.value))} className="admin-field" /></label></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-[#eadfca] pt-3 text-sm"><span className="text-[#707970]">Descuento: <strong className="admin-mono text-[#b85f49]">-${discount.toFixed(2)}</strong></span><span className="text-[#707970]">Total: <strong className="admin-mono text-[#a57c2f]">${total.toFixed(2)}</strong></span></div><button type="submit" className="admin-button-primary admin-button-brass mt-4">Guardar descuento</button></form>;
}
