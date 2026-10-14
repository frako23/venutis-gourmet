"use client";

import { guardarEdicionMasivaVentas } from "@/lib/actions/admin-sales";
import { calculateSaleTotals } from "@/lib/admin/sales-calculations";
import type { BulkSalesState, SalesRow } from "@/lib/admin/types";
import type { Cliente, EstadoTransaccion, Producto, TipoDescuento, TipoRetiro } from "@prisma/client";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type EditorClient = Pick<Cliente, "id" | "nombre" | "apellido" | "tipoCliente">;
type EditorProduct = Pick<Producto, "id" | "nombre" | "precioDetal" | "precioMayorista" | "inventario">;

type SharedRow = {
  key: string;
  id: number | null;
  numeroOrden: string;
  fechaCompra: string;
  clienteId: number | "";
  estado: EstadoTransaccion;
  tipodeRetiro: TipoRetiro;
  tipoDescuento: TipoDescuento | "";
  valorDescuento: number | "";
  subtotalUsd: number;
  descuentoUsd: number;
  totalUsd: number;
};

type ExistingRow = SharedRow & {
  id: number;
  esNueva: false;
};

type NewRow = SharedRow & {
  id: null;
  esNueva: true;
  productoId: number | "";
  cantidad: number;
  precioUnitarioUsd: number | "";
};

type EditorRow = ExistingRow | NewRow;
type RowPatch = Partial<SharedRow> & Partial<Pick<NewRow, "productoId" | "cantidad" | "precioUnitarioUsd">>;

const initialState: BulkSalesState = { success: false, message: "" };

function localDateInput(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function priceFor(clientId: number | "", productId: number | "", clients: EditorClient[], products: EditorProduct[]) {
  const client = clients.find((item) => item.id === clientId);
  const product = products.find((item) => item.id === productId);
  if (!product) return 0;
  return client?.tipoCliente === "mayorista" ? product.precioMayorista : product.precioDetal;
}

function clientLabel(client: EditorClient) {
  return `${client.nombre} ${client.apellido} · ${client.tipoCliente}`;
}

function rowFromSale(row: SalesRow): ExistingRow {
  return {
    key: `existing-${row.id}`,
    id: row.id,
    esNueva: false,
    numeroOrden: row.numeroOrden,
    fechaCompra: localDateInput(row.fechaCompra),
    clienteId: row.clienteId,
    estado: row.estado,
    tipodeRetiro: row.tipodeRetiro,
    tipoDescuento: row.tipoDescuento ?? "",
    valorDescuento: row.valorDescuento ?? "",
    subtotalUsd: row.subtotalUsd,
    descuentoUsd: row.descuentoUsd,
    totalUsd: row.totalUsd,
  };
}

function newRow(key: string, clients: EditorClient[], products: EditorProduct[]): NewRow {
  const clientId = clients[0]?.id ?? "";
  const productoId = products[0]?.id ?? "";
  const price = priceFor(clientId, productoId, clients, products);
  return {
    key,
    id: null,
    esNueva: true,
    numeroOrden: "",
    fechaCompra: localDateInput(),
    clienteId: clientId,
    estado: "por_cobrar",
    tipodeRetiro: "envio",
    tipoDescuento: "",
    valorDescuento: "",
    subtotalUsd: price,
    descuentoUsd: 0,
    totalUsd: price,
    productoId,
    cantidad: 1,
    precioUnitarioUsd: price,
  };
}

function previewTotals(row: EditorRow) {
  const subtotal = row.esNueva ? (Number(row.precioUnitarioUsd) || 0) * row.cantidad : row.subtotalUsd;
  if (!row.tipoDescuento || row.valorDescuento === "") return { subtotal, total: subtotal };
  try {
    const totals = calculateSaleTotals([{ productoId: 1, cantidad: 1, precioUnitarioUsd: subtotal }], { tipo: row.tipoDescuento, valor: Number(row.valorDescuento) });
    return { subtotal: totals.subtotalUsd, total: totals.totalUsd };
  } catch {
    return { subtotal, total: Number.NaN };
  }
}

export function BulkSalesEditor({ rows: initialRows, clients, products, onClose }: { rows: SalesRow[]; clients: EditorClient[]; products: EditorProduct[]; onClose: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<EditorRow[]>(() => initialRows.map(rowFromSale));
  const [confirmarPagos, setConfirmarPagos] = useState(false);
  const [state, formAction, isPending] = useActionState(guardarEdicionMasivaVentas, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [onClose, router, state.success]);

  const newCount = useMemo(() => rows.filter((row) => row.esNueva).length, [rows]);
  const updateRow = (key: string, patch: RowPatch) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } as EditorRow : row));
  };

  function updateClient(row: EditorRow, clientId: number | "") {
    const patch: RowPatch = { clienteId: clientId };
    if (row.esNueva) {
      const price = priceFor(clientId, row.productoId, clients, products);
      patch.precioUnitarioUsd = price;
      patch.subtotalUsd = price * row.cantidad;
      patch.totalUsd = price * row.cantidad;
    }
    updateRow(row.key, patch);
  }

  function updateProduct(row: NewRow, productoId: number | "") {
    const price = priceFor(row.clienteId, productoId, clients, products);
    updateRow(row.key, { productoId, precioUnitarioUsd: price, subtotalUsd: price * row.cantidad, totalUsd: price * row.cantidad });
  }

  return <section className="admin-panel overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebe9e0] bg-[#fffaf0] p-4 md:p-5">
      <div>
        <p className="admin-eyebrow">Modo de captura</p>
        <h2 className="mt-1 text-lg font-bold text-[#18211d]">Editor masivo</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#707970]">Toca una celda para modificarla. Los importes de ventas existentes se recalculan desde sus productos.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setRows((current) => [...current, newRow(`new-${Date.now()}`, clients, products)])} disabled={clients.length === 0 || products.length === 0} className="admin-button-primary admin-button-brass"><Plus size={16} /> Agregar fila siguiente</button>
        <button type="button" onClick={onClose} className="admin-button-secondary"><X size={16} /> Cerrar</button>
      </div>
    </div>
    <div className="border-b border-[#ebe9e0] px-4 py-3 text-xs text-[#707970] md:px-5">
      Las filas nuevas descuentan inventario al guardar. Las órdenes canceladas conservan su estado y no se pueden reabrir desde esta vista.
    </div>
    <form action={formAction}>
      <div className="overflow-x-auto">
        <table className="admin-table admin-sheet min-w-[1420px] text-left text-sm">
          <thead><tr><th>Orden</th><th>Fecha</th><th>Cliente</th><th>Producto / línea</th><th>Cantidad</th><th>Precio USD</th><th>Descuento</th><th>Estado</th><th>Entrega</th><th>Subtotal</th><th>Total</th><th aria-label="Acciones" /></tr></thead>
          <tbody>
            {rows.map((row) => <tr key={row.key} className={row.esNueva ? "bg-[#fffaf0]" : undefined}>
              <td><input aria-label={`Orden ${row.key}`} value={row.numeroOrden} onChange={(event) => updateRow(row.key, { numeroOrden: event.target.value })} placeholder="Se genera" className="admin-sheet-input w-32 admin-mono" /></td>
              <td><input aria-label={`Fecha ${row.key}`} type="datetime-local" value={row.fechaCompra} onChange={(event) => updateRow(row.key, { fechaCompra: event.target.value })} className="admin-sheet-input w-44 admin-mono" /></td>
              <td><select aria-label={`Cliente ${row.key}`} value={row.clienteId} onChange={(event) => updateClient(row, event.target.value ? Number(event.target.value) : "")} className="admin-sheet-input w-56"><option value="">Selecciona</option>{clients.map((client) => <option key={client.id} value={client.id}>{clientLabel(client)}</option>)}</select></td>
              <td>{row.esNueva ? <select aria-label={`Producto ${row.key}`} value={row.productoId} onChange={(event) => updateProduct(row, event.target.value ? Number(event.target.value) : "")} className="admin-sheet-input w-60"><option value="">Selecciona</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nombre} · stock {product.inventario}</option>)}</select> : <span className="inline-flex min-h-10 items-center px-2 text-xs text-[#707970]">Líneas conservadas</span>}</td>
              <td>{row.esNueva ? <input aria-label={`Cantidad ${row.key}`} type="number" min="1" step="1" value={row.cantidad} onChange={(event) => { const cantidad = Number(event.target.value); const price = Number(row.precioUnitarioUsd) || 0; updateRow(row.key, { cantidad, subtotalUsd: cantidad * price, totalUsd: cantidad * price }); }} className="admin-sheet-input w-20 admin-mono" /> : <span className="admin-mono px-2 text-[#707970]">—</span>}</td>
              <td>{row.esNueva ? <input aria-label={`Precio ${row.key}`} type="number" min="0.01" step="0.01" value={row.precioUnitarioUsd} onChange={(event) => { const price = Number(event.target.value); updateRow(row.key, { precioUnitarioUsd: price, subtotalUsd: price * row.cantidad, totalUsd: price * row.cantidad }); }} className="admin-sheet-input w-28 admin-mono" /> : <span className="admin-mono px-2 text-[#707970]">—</span>}</td>
              <td><div className="flex min-w-[190px] gap-1"><select aria-label={`Tipo de descuento ${row.key}`} value={row.tipoDescuento} onChange={(event) => updateRow(row.key, { tipoDescuento: event.target.value as TipoDescuento | "", valorDescuento: event.target.value ? row.valorDescuento : "" })} className="admin-sheet-input w-28"><option value="">Sin descuento</option><option value="porcentaje">%</option><option value="usd">USD</option></select><input aria-label={`Valor de descuento ${row.key}`} type="number" min="0" step="0.01" value={row.valorDescuento} disabled={!row.tipoDescuento} onChange={(event) => updateRow(row.key, { valorDescuento: event.target.value === "" ? "" : Number(event.target.value) })} className="admin-sheet-input w-20 admin-mono disabled:cursor-not-allowed disabled:bg-[#f0eee5]" /></div></td>
              <td><select aria-label={`Estado ${row.key}`} value={row.estado} disabled={row.estado === "cancelado"} onChange={(event) => updateRow(row.key, { estado: event.target.value as EstadoTransaccion })} className="admin-sheet-input w-32"><option value="por_cobrar">Por cobrar</option><option value="en_pedido">En pedido</option><option value="pagado">Pagado</option>{row.estado === "pendiente" && <option value="pendiente">Histórico: pendiente</option>}{row.estado === "cancelado" && <option value="cancelado">Cancelado</option>}</select></td>
              <td><select aria-label={`Entrega ${row.key}`} value={row.tipodeRetiro} onChange={(event) => updateRow(row.key, { tipodeRetiro: event.target.value as TipoRetiro })} className="admin-sheet-input w-28"><option value="envio">Envío</option><option value="recogida">Recogida</option></select></td>
              <td className="admin-mono whitespace-nowrap text-[#707970]">${previewTotals(row).subtotal.toFixed(2)}</td>
              <td className={`admin-mono whitespace-nowrap font-bold ${Number.isFinite(previewTotals(row).total) ? "text-[#a57c2f]" : "text-[#b85f49]"}`}>{Number.isFinite(previewTotals(row).total) ? `$${previewTotals(row).total.toFixed(2)}` : "Revisar"}</td>
              <td>{row.esNueva && <button type="button" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} className="rounded-lg p-2 text-[#b85f49] hover:bg-[#f8e8e3]" aria-label="Quitar fila nueva"><Trash2 size={16} /></button>}</td>
            </tr>)}
            {rows.length === 0 && <tr><td colSpan={12} className="p-10 text-center text-sm text-[#707970]">No hay filas cargadas. Agrega la siguiente para comenzar un pedido.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ebe9e0] bg-[#f8f6ef] p-4 md:p-5">
        <label className="flex max-w-xl items-start gap-2 text-xs leading-relaxed text-[#707970]"><input type="checkbox" checked={confirmarPagos} onChange={(event) => setConfirmarPagos(event.target.checked)} className="mt-0.5 size-4 accent-[#66735f]" /> Confirmo los cobros de las filas que queden en estado Pagado.</label>
        <div className="flex items-center gap-3"><span className="text-xs text-[#707970]">{rows.length} fila(s) · {newCount} nueva(s)</span><button type="submit" disabled={isPending || rows.length === 0} className="admin-button-primary admin-button-brass"><Save size={16} /> {isPending ? "Guardando..." : "Guardar cambios"}</button></div>
      </div>
      <input type="hidden" name="confirmarPagos" value={confirmarPagos ? "true" : "false"} />
      <input type="hidden" name="ventasMasivas" value={JSON.stringify({ existentes: rows.filter((row): row is ExistingRow => !row.esNueva).map((row) => ({ id: row.id, numeroOrden: row.numeroOrden, clienteId: row.clienteId, fechaCompra: row.fechaCompra, estado: row.estado, tipodeRetiro: row.tipodeRetiro, tipoDescuento: row.tipoDescuento || null, valorDescuento: row.tipoDescuento && row.valorDescuento !== "" ? row.valorDescuento : null })), nuevas: rows.filter((row): row is NewRow => row.esNueva).map((row) => ({ numeroOrden: row.numeroOrden, clienteId: row.clienteId, fechaCompra: row.fechaCompra, estado: row.estado, tipodeRetiro: row.tipodeRetiro, productoId: row.productoId, cantidad: row.cantidad, precioUnitarioUsd: row.precioUnitarioUsd, tipoDescuento: row.tipoDescuento || null, valorDescuento: row.tipoDescuento && row.valorDescuento !== "" ? row.valorDescuento : null })), confirmarPagos })} />
    </form>
    {state.message && <p className={`border-t p-3 text-sm ${state.success ? "bg-[#e8eee5] text-[#55704d]" : "bg-[#f8e8e3] text-[#a84f3b]"}`} role="status">{state.message}</p>}
  </section>;
}
