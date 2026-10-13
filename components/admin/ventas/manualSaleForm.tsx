"use client";

import { calculateSaleTotals } from "@/lib/admin/sales-calculations";
import type { ManualSaleState } from "@/lib/admin/types";
import { registrarVentaManual } from "@/lib/actions/admin-sales";
import type { Cliente, Producto } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

type SaleLine = { productoId: number; cantidad: number; precioUnitarioUsd: number };
const initialState: ManualSaleState = { success: false, message: "" };

export function ManualSaleForm({ clients, products }: { clients: Pick<Cliente, "id" | "nombre" | "apellido" | "tipoCliente">[]; products: Pick<Producto, "id" | "nombre" | "precioDetal" | "precioMayorista" | "inventario">[] }) {
  const firstProduct = products[0];
  const [lines, setLines] = useState<SaleLine[]>(firstProduct ? [{ productoId: firstProduct.id, cantidad: 1, precioUnitarioUsd: firstProduct.precioDetal }] : []);
  const [discountType, setDiscountType] = useState<"porcentaje" | "usd">("porcentaje");
  const [discountValue, setDiscountValue] = useState(0);
  const [exchangeRate, setExchangeRate] = useState("");
  const [state, formAction, isPending] = useActionState(registrarVentaManual, initialState);

  const totals = useMemo(() => {
    try { return calculateSaleTotals(lines, discountValue > 0 ? { tipo: discountType, valor: discountValue } : null, exchangeRate ? Number(exchangeRate) : null); } catch { return null; }
  }, [discountType, discountValue, exchangeRate, lines]);

  function updateLine(index: number, patch: Partial<SaleLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  function selectProduct(index: number, productId: number) {
    const product = products.find((item) => item.id === productId);
    updateLine(index, { productoId: productId, precioUnitarioUsd: product?.precioDetal ?? 0 });
  }

  return (
    <form action={formAction} className="space-y-6">
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 md:grid-cols-3">
        <label className="space-y-2 text-sm font-semibold">Cliente
          <select name="clienteId" required className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
            <option value="">Selecciona un cliente</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.nombre} {client.apellido} · {client.tipoCliente}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-semibold">Fecha
          <input name="fechaCompra" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900" />
        </label>
        <label className="space-y-2 text-sm font-semibold">Número de orden <span className="font-normal text-slate-400">(opcional)</span>
          <input name="numeroOrden" placeholder="Se genera automáticamente" className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900" />
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Productos</h2><p className="text-sm text-slate-500">La existencia se descuenta al confirmar la venta.</p></div><button type="button" onClick={() => firstProduct && setLines((current) => [...current, { productoId: firstProduct.id, cantidad: 1, precioUnitarioUsd: firstProduct.precioDetal }])} className="flex items-center gap-2 rounded-lg border border-gold px-3 py-2 text-sm font-bold text-gold"><Plus size={16} /> Agregar línea</button></div>
        <div className="mt-4 space-y-3">
          {lines.map((line, index) => <div key={`${index}-${line.productoId}`} className="grid gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/10 md:grid-cols-[minmax(0,2fr)_100px_140px_100px_40px] md:items-end">
            <label className="text-xs font-bold uppercase text-slate-500">Producto<select value={line.productoId} onChange={(event) => selectProduct(index, Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm normal-case dark:border-white/10 dark:bg-slate-900">{products.map((product) => <option key={product.id} value={product.id}>{product.nombre} · stock {product.inventario}</option>)}</select></label>
            <label className="text-xs font-bold uppercase text-slate-500">Cantidad<input type="number" min="1" value={line.cantidad} onChange={(event) => updateLine(index, { cantidad: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm dark:border-white/10 dark:bg-slate-900" /></label>
            <label className="text-xs font-bold uppercase text-slate-500">Precio USD<input type="number" min="0.01" step="0.01" value={line.precioUnitarioUsd} onChange={(event) => updateLine(index, { precioUnitarioUsd: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm dark:border-white/10 dark:bg-slate-900" /></label>
            <div className="text-sm font-bold">Subtotal<br /><span className="text-gold">${(line.cantidad * line.precioUnitarioUsd || 0).toFixed(2)}</span></div>
            <button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="rounded-lg p-2 text-red-500 disabled:opacity-30" aria-label="Eliminar línea"><Trash2 size={18} /></button>
          </div>)}
          <input type="hidden" name="lineas" value={JSON.stringify(lines)} />
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 md:grid-cols-3">
        <label className="space-y-2 text-sm font-semibold">Tipo de descuento<select value={discountType} onChange={(event) => setDiscountType(event.target.value as "porcentaje" | "usd")} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><option value="porcentaje">Porcentaje (%)</option><option value="usd">Monto fijo (USD)</option></select></label>
        <label className="space-y-2 text-sm font-semibold">Descuento<input type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 p-3 dark:border-white/10 dark:bg-slate-900" /></label>
        <label className="space-y-2 text-sm font-semibold">Tasa USD/Bs <span className="font-normal text-slate-400">(opcional)</span><input name="tasaCambio" type="number" min="0.01" step="0.0001" value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 dark:border-white/10 dark:bg-slate-900" /></label>
        <input type="hidden" name="descuento" value={discountValue > 0 ? JSON.stringify({ tipo: discountType, valor: discountValue }) : ""} />
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 md:grid-cols-3">
        <label className="space-y-2 text-sm font-semibold">Estado inicial<select name="estadoInicial" defaultValue="por_cobrar" className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><option value="por_cobrar">Por cobrar</option><option value="en_pedido">En pedido</option><option value="pagado">Pagado</option></select></label>
        <label className="space-y-2 text-sm font-semibold">Entrega<select name="tipodeRetiro" defaultValue="envio" className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><option value="envio">Envío</option><option value="recogida">Recogida</option></select></label>
        <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10"><input type="checkbox" name="confirmacionPago" value="true" /> Confirmo el cobro si el estado es pagado</label>
      </section>

      <div className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-wider text-slate-400">Total estimado</p><p className="text-3xl font-black text-gold">${totals?.totalUsd.toFixed(2) ?? "0.00"}</p>{totals?.totalBs !== null && totals?.totalBs !== undefined && <p className="text-sm text-slate-300">Bs. {totals.totalBs.toFixed(2)}</p>}</div><button type="submit" disabled={isPending || lines.length === 0} className="rounded-xl bg-gold px-6 py-3 font-black text-charcoal disabled:cursor-not-allowed disabled:opacity-50">{isPending ? "Guardando..." : "Confirmar venta"}</button></div>
      {state.message && <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`} role="status">{state.message}</p>}
    </form>
  );
}
