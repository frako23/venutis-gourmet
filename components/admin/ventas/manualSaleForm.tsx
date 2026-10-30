"use client";

import { calculateSaleTotals } from "@/lib/admin/sales-calculations";
import type { ManualSaleState } from "@/lib/admin/types";
import { registrarVentaManual } from "@/lib/actions/admin-sales";
import { formatQuantity } from "@/lib/inventory";
import { formatUsd } from "@/lib/format";
import type { Cliente, Producto } from "@prisma/client";
import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type TipoPrecio = "detal" | "mayor" | "promo";
type SaleLine = { productoId: number; cantidad: number; precioUnitarioUsd: number | null; tipoPrecio: TipoPrecio };
const initialState: ManualSaleState = { success: false, message: "" };

export type PremioVenta = { id: number; nombre: string; tipo: "descuento" | "producto"; costoPuntos: number; montoDescuentoUsd: number | null; detalle: string | null };

export function ManualSaleForm({ clients, products, saldos, puntos, premios }: { saldos: Record<number, number>; puntos: Record<number, number>; premios: PremioVenta[]; clients: Pick<Cliente, "id" | "nombre" | "apellido" | "tipoCliente">[]; products: Pick<Producto, "id" | "nombre" | "precioDetal" | "precioMayorista" | "inventario">[] }) {
  const firstProduct = products[0];
  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState<SaleLine[]>(firstProduct ? [{ productoId: firstProduct.id, cantidad: 1, precioUnitarioUsd: firstProduct.precioDetal, tipoPrecio: "detal" }] : []);
  const [discountType, setDiscountType] = useState<"porcentaje" | "usd">("porcentaje");
  const [discountValue, setDiscountValue] = useState(0);
  const [exchangeRate, setExchangeRate] = useState("");
  const [saldoUsar, setSaldoUsar] = useState("");
  const [canjesSel, setCanjesSel] = useState<number[]>([]);
  const [state, formAction, isPending] = useActionState(registrarVentaManual, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [descartado, setDescartado] = useState<typeof state | null>(null);
  const credito = state.success ? undefined : state.requiereAutorizacion;
  useEffect(() => {
    if (!state.message || (!state.success && state.requiereAutorizacion)) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
  const puntosCliente = puntos[Number(clientId)] ?? 0;
  const costoCanjes = premios.filter((premio) => canjesSel.includes(premio.id)).reduce((suma, premio) => suma + premio.costoPuntos, 0);
  const descuentoPuntosUsd = premios.filter((premio) => canjesSel.includes(premio.id)).reduce((suma, premio) => suma + (premio.montoDescuentoUsd ?? 0), 0);
  const hasEmptyPrice = lines.some((line) => !line.precioUnitarioUsd || line.precioUnitarioUsd <= 0);
  const totals = useMemo(() => { try { if (hasEmptyPrice) return null; return calculateSaleTotals(lines.map((line) => ({ ...line, precioUnitarioUsd: line.precioUnitarioUsd ?? 0 })), discountValue > 0 ? { tipo: discountType, valor: discountValue } : null, exchangeRate ? Number(exchangeRate) : null, descuentoPuntosUsd); } catch { return null; } }, [descuentoPuntosUsd, discountType, discountValue, exchangeRate, hasEmptyPrice, lines]);
  function updateLine(index: number, patch: Partial<SaleLine>) { setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line)); }
  function priceFor(productId: number, tipo: TipoPrecio) { const product = products.find((item) => item.id === productId); if (!product || tipo === "promo") return null; return tipo === "mayor" ? product.precioMayorista : product.precioDetal; }
  const proposedType = (): TipoPrecio => clients.find((client) => String(client.id) === clientId)?.tipoCliente === "mayorista" ? "mayor" : "detal";
  function selectProduct(index: number, productId: number) { updateLine(index, { productoId: productId, precioUnitarioUsd: priceFor(productId, lines[index].tipoPrecio) }); }
  function changeType(index: number, tipo: TipoPrecio) { updateLine(index, { tipoPrecio: tipo, precioUnitarioUsd: priceFor(lines[index].productoId, tipo) }); }
  function selectClient(value: string) { setSaldoUsar(""); setCanjesSel([]); setClientId(value); const tipo: TipoPrecio = clients.find((client) => String(client.id) === value)?.tipoCliente === "mayorista" ? "mayor" : "detal"; setLines((current) => current.map((line) => line.tipoPrecio === "promo" ? line : { ...line, tipoPrecio: tipo, precioUnitarioUsd: priceFor(line.productoId, tipo) })); }
  const saldoDisponible = saldos[Number(clientId)] ?? 0;
  const maxSaldoUsar = Math.min(saldoDisponible, totals?.totalUsd ?? 0);
  function addLine() { if (firstProduct) { const tipo = proposedType(); setLines((current) => [...current, { productoId: firstProduct.id, cantidad: 1, precioUnitarioUsd: priceFor(firstProduct.id, tipo), tipoPrecio: tipo }]); } }

  function autorizarYRegistrar() {
    const campo = formRef.current?.elements.namedItem("autorizarCredito");
    if (campo instanceof HTMLInputElement) campo.value = "true";
    formRef.current?.requestSubmit();
  }

  return <form ref={formRef} action={formAction} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="space-y-5"><section className="admin-panel p-5"><div className="flex items-center gap-3 border-b border-[#ebe9e0] pb-4"><span className="grid size-9 place-items-center rounded-lg bg-[#e8eee5] text-[#66735f]"><ReceiptText size={18} /></span><div><p className="admin-eyebrow">Cabecera de operación</p><h2 className="mt-1 font-bold text-[#18211d]">Datos de la venta</h2></div></div><div className="mt-5 grid gap-4 md:grid-cols-3"><label className="admin-label">Cliente<select name="clienteId" required value={clientId} onChange={(event) => selectClient(event.target.value)} className="admin-field"><option value="">Selecciona un cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre} {client.apellido} · {client.tipoCliente}</option>)}</select></label><label className="admin-label">Fecha<input name="fechaCompra" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required className="admin-field" /></label><label className="admin-label">Número de orden <span className="font-normal normal-case tracking-normal">(opcional)</span><input name="numeroOrden" placeholder="Se genera automáticamente" className="admin-field" /></label></div></section>
    <section className="admin-panel p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="admin-eyebrow">Detalle de la operación</p><h2 className="mt-1 font-bold text-[#18211d]">Productos</h2><p className="mt-1 text-sm text-[#707970]">La existencia se descuenta al confirmar la venta.</p></div><button type="button" onClick={addLine} className="admin-button-secondary"><Plus size={16} /> Agregar línea</button></div><div className="mt-5 space-y-3">{lines.map((line, index) => <div key={`${index}-${line.productoId}`} className="grid gap-3 rounded-lg border border-[#ebe9e0] bg-[#fffefa] p-3 md:grid-cols-[minmax(0,2fr)_7rem_6rem_8rem_6rem_2rem] md:items-end"><label className="admin-label">Producto<select value={line.productoId} onChange={(event) => selectProduct(index, Number(event.target.value))} className="admin-field normal-case tracking-normal"><option value="">Seleccionar</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nombre} · stock {formatQuantity(product.inventario)}</option>)}</select></label><label className="admin-label">Tipo<select value={line.tipoPrecio} onChange={(event) => changeType(index, event.target.value as TipoPrecio)} className="admin-field normal-case tracking-normal"><option value="detal">Detal</option><option value="mayor">Mayor</option><option value="promo">Promo</option></select></label><label className="admin-label">Cantidad<input type="number" min="0.01" step="0.01" value={line.cantidad} onChange={(event) => updateLine(index, { cantidad: Number(event.target.value) })} className="admin-field admin-mono" /></label><label className="admin-label">Precio USD<input type="number" min="0.01" step="0.01" required placeholder={line.tipoPrecio === "promo" ? "Precio de promoción" : undefined} value={line.precioUnitarioUsd ?? ""} onChange={(event) => updateLine(index, { precioUnitarioUsd: event.target.value === "" ? null : Number(event.target.value) })} className="admin-field admin-mono" /></label><div className="text-xs font-bold text-[#707970]">Subtotal<strong className="admin-mono mt-1 block text-sm text-[#a57c2f]">${(line.cantidad * (line.precioUnitarioUsd ?? 0) || 0).toFixed(2)}</strong></div><button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="rounded-lg p-2 text-[#b85f49] disabled:opacity-30" aria-label="Eliminar línea"><Trash2 size={17} /></button></div>)}</div><input type="hidden" name="lineas" value={JSON.stringify(lines)} /></section>
    <section className="admin-panel grid gap-4 p-5 md:grid-cols-3"><label className="admin-label">Tipo de descuento<select value={discountType} onChange={(event) => setDiscountType(event.target.value as "porcentaje" | "usd")} className="admin-field"><option value="porcentaje">Porcentaje (%)</option><option value="usd">Monto fijo (USD)</option></select></label><label className="admin-label">Descuento<input type="number" min="0" step="0.01" value={discountValue} onChange={(event) => setDiscountValue(Number(event.target.value))} className="admin-field admin-mono" /></label><label className="admin-label">Tasa USD/Bs <span className="font-normal normal-case tracking-normal">(opcional)</span><input name="tasaCambio" type="number" min="0.01" step="0.0001" value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} className="admin-field admin-mono" /></label><input type="hidden" name="descuento" value={discountValue > 0 ? JSON.stringify({ tipo: discountType, valor: discountValue }) : ""} /></section>
    <section className="admin-panel grid gap-4 p-5 md:grid-cols-3"><label className="admin-label">Estado inicial<select name="estadoInicial" defaultValue="por_cobrar" className="admin-field"><option value="por_cobrar">Por cobrar</option><option value="en_pedido">En pedido</option><option value="pagado">Pagado</option></select></label><label className="admin-label">Entrega<select name="tipodeRetiro" defaultValue="envio" className="admin-field"><option value="envio">Envío</option><option value="recogida">Recogida</option></select></label><label className="flex items-start gap-3 rounded-lg border border-[#dedfd6] p-3 text-xs leading-relaxed text-[#707970]"><input type="checkbox" name="confirmacionPago" value="true" className="mt-0.5 size-4 accent-[#66735f]" /> Confirmo el cobro si el estado es pagado</label></section>
    {puntosCliente > 0 && premios.length > 0 && <section className="admin-panel p-5"><p className="admin-eyebrow">Puntos de fidelización</p><p className="mt-1 text-sm text-[#707970]">El cliente tiene {puntosCliente.toLocaleString("es-VE")} puntos. Marca los premios que canjea en esta venta.</p><ul className="mt-3 space-y-2">{premios.map((premio) => { const marcado = canjesSel.includes(premio.id); const alcanza = marcado || costoCanjes + premio.costoPuntos <= puntosCliente; return <li key={premio.id}><label className={`flex items-start gap-3 rounded-lg border border-[#dedfd6] p-3 text-sm ${alcanza ? "" : "opacity-50"}`}><input type="checkbox" checked={marcado} disabled={!alcanza} onChange={(event) => setCanjesSel((actual) => event.target.checked ? [...actual, premio.id] : actual.filter((id) => id !== premio.id))} className="mt-0.5 size-4 accent-[#66735f]" /><span><strong>{premio.nombre}</strong> · {premio.costoPuntos} puntos<span className="block text-xs text-[#707970]">{premio.tipo === "descuento" ? `Descuento de ${formatUsd(premio.montoDescuentoUsd ?? 0)}` : premio.detalle}</span></span></label></li>; })}</ul></section>}
    {saldoDisponible > 0 && <section className="admin-panel p-5"><p className="admin-eyebrow">Saldo a favor</p><p className="mt-1 text-sm text-[#707970]">El cliente tiene {formatUsd(saldoDisponible)} a favor. Se aplica como un abono a esta venta (no aplica si el estado inicial es Pagado).</p><div className="mt-3 flex flex-wrap items-end gap-2"><label className="admin-label">Usar saldo (USD)<input name="saldoAFavorUsd" type="number" min="0" max={maxSaldoUsar} step="0.01" value={saldoUsar} onChange={(event) => setSaldoUsar(event.target.value)} className="admin-field admin-mono" /></label><button type="button" className="admin-button-secondary" onClick={() => setSaldoUsar(maxSaldoUsar.toFixed(2))}>Usar todo</button></div></section>}
  </div>
    <aside className="lg:sticky lg:top-24 lg:self-start"><section className="rounded-[1.1rem] bg-[#18211d] p-5 text-[#f4f1e8] shadow-[0_14px_34px_rgba(24,33,29,0.14)]"><p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#c8a45d]">Resumen antes de guardar</p><p className="admin-mono mt-4 text-4xl font-black tracking-[-0.08em] text-[#c8a45d]">${totals?.totalUsd.toFixed(2) ?? "0.00"}</p>{totals?.totalBs !== null && totals?.totalBs !== undefined && <p className="admin-mono mt-1 text-sm text-white/65">Bs. {totals.totalBs.toFixed(2)}</p>}<div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm"><div className="flex justify-between"><span className="text-white/55">Subtotal</span><span>${totals?.subtotalUsd.toFixed(2) ?? "0.00"}</span></div><div className="flex justify-between"><span className="text-white/55">Descuento</span><span className="text-[#f0b6a6]">-${totals?.descuentoUsd.toFixed(2) ?? "0.00"}</span></div>{descuentoPuntosUsd > 0 && <div className="flex justify-between"><span className="text-white/55">Descuento por puntos</span><span className="text-[#f0b6a6]">-${descuentoPuntosUsd.toFixed(2)}</span></div>}{Number(saldoUsar) > 0 && <div className="flex justify-between"><span className="text-white/55">Saldo a favor</span><span className="text-[#f0b6a6]">-${Number(saldoUsar).toFixed(2)}</span></div>}</div><button type="submit" disabled={isPending || lines.length === 0 || hasEmptyPrice} className="admin-button-primary admin-button-brass mt-6 w-full">{isPending ? "Guardando..." : "Confirmar venta"}</button></section></aside>
    <input type="hidden" name="autorizarCredito" defaultValue="false" />
    <input type="hidden" name="canjes" value={JSON.stringify(canjesSel)} />
    {credito && descartado !== state && (
      <div role="dialog" aria-modal="true" aria-labelledby="credito-titulo" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="admin-panel w-full max-w-md p-6">
          <h2 id="credito-titulo" className="text-lg font-bold text-[#18211d]">La venta excede el crédito</h2>
          <dl className="mt-4 space-y-2 text-sm text-[#18211d]">
            <div className="flex justify-between gap-3"><dt>Deuda actual</dt><dd className="admin-mono">{formatUsd(credito.deudaUsd)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Límite de crédito</dt><dd className="admin-mono">{credito.limiteUsd === null ? "Sin crédito" : formatUsd(credito.limiteUsd)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Disponible</dt><dd className="admin-mono">{formatUsd(credito.disponibleUsd)}</dd></div>
            <div className="flex justify-between gap-3 font-bold text-[#a5452f]"><dt>Excede en</dt><dd className="admin-mono">{formatUsd(credito.excesoUsd)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-[#707970]">Si la autorizas, la venta se registra y queda anotado que la autorizaste tú.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="admin-button-secondary" onClick={() => setDescartado(state)}>Cancelar</button>
            <button type="button" className="admin-button-primary admin-button-brass" onClick={autorizarYRegistrar}>Autorizar y registrar</button>
          </div>
        </div>
      </div>
    )}
  </form>;
}
