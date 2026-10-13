"use client";

import { actualizarDescuentoVenta } from "@/lib/actions/admin-sales";
import { useState } from "react";

export function DiscountEditor({ transactionId, subtotalUsd, currentType, currentValue }: { transactionId: number; subtotalUsd: number; currentType: "porcentaje" | "usd" | null; currentValue: number | null }) {
  const [type, setType] = useState<"porcentaje" | "usd">(currentType ?? "porcentaje");
  const [value, setValue] = useState(currentValue ?? 0);
  const [message, setMessage] = useState("");
  const discount = type === "porcentaje" ? Math.round(subtotalUsd * value / 100 * 100) / 100 : value;
  const total = Math.max(0, subtotalUsd - discount);

  async function submit(formData: FormData) {
    const result = await actualizarDescuentoVenta(formData);
    setMessage(result.message);
  }

  return <form action={submit} className="space-y-3 rounded-xl border border-gold/20 bg-gold/5 p-4"><input type="hidden" name="transactionId" value={transactionId} /><div className="flex items-center justify-between"><h3 className="font-bold">Editar descuento</h3><span className="text-xs text-slate-500">Subtotal ${subtotalUsd.toFixed(2)}</span></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold uppercase text-slate-500">Tipo<select name="tipo" value={type} onChange={(event) => setType(event.target.value as "porcentaje" | "usd")} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900"><option value="porcentaje">Porcentaje (%)</option><option value="usd">Monto fijo (USD)</option></select></label><label className="text-xs font-bold uppercase text-slate-500">Valor<input name="valor" type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(Number(event.target.value))} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" /></label></div><p className="text-sm">Descuento: <strong className="text-red-600">-${discount.toFixed(2)}</strong> · Total: <strong className="text-gold">${total.toFixed(2)}</strong></p><button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-charcoal">Guardar descuento</button>{message && <p className="text-xs text-slate-600" role="status">{message}</p>}</form>;
}
