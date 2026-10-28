"use client";

import { guardarEdicionMasivaClientes } from "@/lib/actions/admin-clients";
import type { BulkClientsState, ClientRow } from "@/lib/admin/types";
import { formatRif } from "@/lib/client-rules";
import { Save, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type EditableRow = Pick<ClientRow, "id" | "tipoCliente" | "nombre" | "apellido" | "rif" | "celular" | "email" | "updatedAt">;
type EditableField = Exclude<keyof EditableRow, "id" | "updatedAt">;

const initialState: BulkClientsState = { success: false, message: "" };

function editableRow(row: ClientRow): EditableRow {
  return { id: row.id, tipoCliente: row.tipoCliente, nombre: row.nombre, apellido: row.apellido, rif: row.rif, celular: row.celular, email: row.email, updatedAt: row.updatedAt };
}
export function BulkClientsEditor({ rows: initialRows, onClose }: { rows: ClientRow[]; onClose: () => void }) {
  const router = useRouter();
  const original = useMemo(() => initialRows.map(editableRow), [initialRows]);
  const [rows, setRows] = useState<EditableRow[]>(original);
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [state, formAction, isPending] = useActionState(guardarEdicionMasivaClientes, initialState);

  useEffect(() => {
    const dirty = dirtyIds.size > 0;
    window.dispatchEvent(new CustomEvent("venoutis:clients-dirty", { detail: { dirty } }));
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.dispatchEvent(new CustomEvent("venoutis:clients-dirty", { detail: { dirty: false } }));
    };
  }, [dirtyIds]);

  useEffect(() => {
    if (state.message && !state.success) {
      toast.error(state.message);
      return;
    }
    if (!state.success) return;
    toast.success(state.message);
    router.refresh();
    onClose();
  }, [onClose, router, state]);

  const dirtyRows = rows.filter((row) => dirtyIds.has(row.id));
  const payload = dirtyRows.map((row) => {
    const before = original.find((item) => item.id === row.id)!;
    const changes = Object.fromEntries((Object.keys(row) as Array<keyof EditableRow>)
      .filter((field): field is EditableField => field !== "id" && field !== "updatedAt" && row[field] !== before[field])
      .map((field) => [field, row[field]]));
    return { id: row.id, updatedAt: row.updatedAt, changes };
  });

  function updateRow(id: number, field: EditableField, value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: field === "rif" || field === "email" ? (value || null) : value } : row));
    setDirtyIds((current) => new Set(current).add(id));
  }

  function discard() {
    if (dirtyIds.size > 0 && !window.confirm("¿Descartar los cambios pendientes?")) return;
    setRows(original);
    setDirtyIds(new Set());
  }

  function closeEditor() {
    if (dirtyIds.size > 0 && !window.confirm("Hay cambios pendientes. ¿Quieres cerrar y descartarlos?")) return;
    onClose();
  }

  const issuesByRow = new Map<number, string[]>();
  for (const issue of state.success ? [] : state.issues ?? []) {
    if (issue.rowId) issuesByRow.set(issue.rowId, [...(issuesByRow.get(issue.rowId) ?? []), `${issue.field ? `${issue.field}: ` : ""}${issue.message}`]);
  }

  return <section className="admin-panel overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebe9e0] bg-[#fffaf0] p-4 md:p-5">
      <div><p className="admin-eyebrow">Modo de captura</p><h2 className="mt-1 text-lg font-bold text-[#18211d]">Edición masiva de clientes</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#707970]">Edita las filas visibles como una hoja de cálculo. La tanda se valida y guarda completa o no se guarda.</p></div>
      <button type="button" onClick={closeEditor} className="admin-button-secondary"><X size={16} /> Cerrar</button>
    </div>
    {!state.success && (state.issues ?? []).some((issue) => !issue.rowId) && <div className="border-b border-[#ebe9e0] bg-[#f8e8e3] px-4 py-3 text-sm text-[#a84f3b]" role="alert">{(state.issues ?? []).filter((issue) => !issue.rowId).map((issue, index) => <p key={`${issue.field}-${index}`} className="text-xs">{issue.field}: {issue.message}</p>)}</div>}
    <form id="bulk-clients-form" action={formAction}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe9e0] px-4 py-3 text-xs text-[#707970] md:px-5"><div><span>{dirtyRows.length} fila(s) pendiente(s) · máximo 100 por tanda</span><span className="ml-3 text-[#8f988f] sm:hidden">Desliza la tabla lateralmente para ver todas las columnas.</span></div><div className="flex gap-2"><button type="button" onClick={discard} disabled={dirtyRows.length === 0} className="admin-button-secondary min-h-9 px-3 py-2 text-xs">Descartar</button><button type="submit" disabled={isPending || dirtyRows.length === 0} className="admin-button-primary admin-button-brass min-h-9 px-3 py-2 text-xs"><Save size={15} /> {isPending ? "Guardando..." : "Guardar cambios"}</button></div></div>
      <div
        aria-label="Tabla de edición masiva de clientes"
        className="admin-horizontal-scroll w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
        role="region"
        tabIndex={0}
      >
        <table className="admin-table admin-sheet w-max min-w-[1400px] text-left text-sm">
          <thead><tr><th>Cliente</th><th>Tipo</th><th>RIF</th><th>Teléfono</th><th>Correo</th><th>Estado</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className={dirtyIds.has(row.id) ? "bg-[#fffaf0]" : undefined}>
            <td><div className="min-w-56 space-y-1 px-2"><input aria-label={`Nombre del cliente ${row.id}`} value={row.nombre} onChange={(event) => updateRow(row.id, "nombre", event.target.value)} className="admin-sheet-input block w-full font-semibold" /><input aria-label={`Apellido del cliente ${row.id}`} value={row.apellido} onChange={(event) => updateRow(row.id, "apellido", event.target.value)} className="admin-sheet-input block w-full" /><span className="admin-mono block text-xs text-[#8f988f]">#{row.id}</span></div></td>
            <td><select aria-label={`Tipo del cliente ${row.id}`} value={row.tipoCliente} onChange={(event) => updateRow(row.id, "tipoCliente", event.target.value)} className="admin-sheet-input w-32"><option value="detal">Consumidor</option><option value="mayorista">Mayorista</option></select></td>
            <td><input aria-label={`RIF del cliente ${row.id}`} value={row.rif ?? ""} onChange={(event) => updateRow(row.id, "rif", event.target.value)} className="admin-sheet-input admin-mono w-40" placeholder="Sin RIF" /></td>
            <td><input aria-label={`Teléfono del cliente ${row.id}`} value={row.celular} onChange={(event) => updateRow(row.id, "celular", event.target.value)} className="admin-sheet-input w-36" /></td>
            <td><input aria-label={`Correo del cliente ${row.id}`} value={row.email ?? ""} onChange={(event) => updateRow(row.id, "email", event.target.value)} className="admin-sheet-input w-56" /></td>
            <td>{issuesByRow.has(row.id) ? <span className="block max-w-56 whitespace-normal text-xs font-semibold text-[#b85f49]" role="alert">{issuesByRow.get(row.id)!.join(" ")}</span> : <span className={dirtyIds.has(row.id) ? "rounded-full bg-[#f5eddc] px-2 py-1 text-xs font-bold text-[#8c6a2c]" : "text-xs text-[#8f988f]"}>{dirtyIds.has(row.id) ? "Pendiente" : "Sin cambios"}</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <input type="hidden" name="clientes" value={JSON.stringify({ clientes: payload })} />
    </form>
    <p className="border-t border-[#ebe9e0] px-4 py-3 text-xs text-[#707970] md:px-5">RIF visible de ejemplo: {rows[0] ? formatRif(rows[0].rif) : "Sin filas"}. Los cambios no modifican ventas, pagos ni documentos históricos.</p>
  </section>;
}
