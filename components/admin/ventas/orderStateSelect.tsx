"use client";

import type { EstadoTransaccion } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { actualizarEstadoPedido } from "@/lib/actions/admin-orders";
import { getNextOrderStates, getOrderStateLabel, normalizeLegacyState } from "@/lib/admin/status";

const MAX_REASON = 240;

type Props = {
  transactionId: number;
  numeroOrden: string;
  cliente: string;
  totalUsd: number;
  estado: EstadoTransaccion;
  tienePagos: boolean;
};

type Confirmation = "cancelado" | "pagado" | null;

function tone(state: EstadoTransaccion) {
  if (state === "pagado") return "bg-[#e8eee5] text-[#55704d]";
  if (state === "cancelado") return "bg-[#f8e8e3] text-[#a84f3b]";
  return "bg-[#f5eddc] text-[#8c6a2c]";
}

export function OrderStateSelect({ transactionId, numeroOrden, cliente, totalUsd, estado, tienePagos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticState, setOptimisticState] = useOptimistic(estado);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const options = getNextOrderStates(estado);

  if (options.length === 0) {
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone(estado)}`}>{getOrderStateLabel(estado)}</span>;
  }

  function submit(next: EstadoTransaccion, extra?: { motivo?: string; confirmacionPago?: boolean }) {
    const formData = new FormData();
    formData.set("transaccionId", String(transactionId));
    formData.set("estadoNuevo", next);
    if (extra?.motivo) formData.set("motivo", extra.motivo);
    if (extra?.confirmacionPago) formData.set("confirmacionPago", "true");
    startTransition(async () => {
      setOptimisticState(next);
      const result = await actualizarEstadoPedido(formData);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      setConfirmation(null);
      router.refresh();
    });
  }

  function onChange(next: EstadoTransaccion) {
    if (next === normalizeLegacyState(estado)) return;
    if (next === "cancelado") return setConfirmation("cancelado");
    if (next === "pagado" && estado !== "pagado") return setConfirmation("pagado");
    submit(next);
  }

  return (
    <>
      <select
        aria-label={`Estado de la orden ${numeroOrden}`}
        value={normalizeLegacyState(optimisticState)}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value as EstadoTransaccion)}
        className={`admin-field min-h-0 w-auto py-1.5 pr-8 text-xs font-bold ${tone(optimisticState)}`}
      >
        {options.map((state) => <option key={state} value={state}>{getOrderStateLabel(state)}</option>)}
      </select>
      {confirmation === "cancelado" && (
        <ReasonDialog
          title={`Cancelar pedido ${numeroOrden}`}
          label="Razón de la cancelación (opcional)"
          confirmLabel="Confirmar cancelación"
          pendingLabel="Cancelando..."
          danger
          isPending={isPending}
          onClose={() => setConfirmation(null)}
          onConfirm={(reason) => submit("cancelado", { motivo: reason })}
        >
          <p>{cliente}. El pedido dejará de contar como venta y sus productos volverán al inventario. Esta acción no se puede deshacer.</p>
          {tienePagos && <p className="mt-2 rounded-lg bg-[#f5eddc] p-3 text-[#8c6a2c]">Este pedido tiene pagos registrados. Se conservarán; la devolución del dinero se gestiona fuera del sistema.</p>}
        </ReasonDialog>
      )}
      {confirmation === "pagado" && (
        <ReasonDialog
          title="Confirmar cobro"
          label="Nota del cobro (opcional)"
          placeholder="Ej. Cliente confirmó la transferencia"
          confirmLabel="Marcar como pagado"
          pendingLabel="Guardando..."
          isPending={isPending}
          onClose={() => setConfirmation(null)}
          onConfirm={(note) => submit("pagado", { motivo: note, confirmacionPago: true })}
        >
          <p>¿Recibiste el pago de {numeroOrden} por ${totalUsd.toFixed(2)}?</p>
        </ReasonDialog>
      )}
    </>
  );
}

function ReasonDialog({ title, label, placeholder, confirmLabel, pendingLabel, danger = false, isPending, onClose, onConfirm, children }: {
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  pendingLabel: string;
  danger?: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  children: ReactNode;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#18211d]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) onClose(); }}>
      <section className="w-full max-w-md rounded-2xl border border-[#dedfd6] bg-[#fffdf8] shadow-[0_24px_70px_rgba(24,33,29,0.28)]" role="dialog" aria-modal="true" aria-labelledby="order-state-dialog-title">
        <div className="border-b border-[#ebe9e0] bg-[#fffaf0] p-5">
          <h2 id="order-state-dialog-title" className="text-lg font-black tracking-tight text-[#18211d]">{title}</h2>
          <div className="mt-2 text-sm leading-relaxed text-[#707970]">{children}</div>
        </div>
        <div className="space-y-5 p-5">
          <label className="admin-label">
            {label}
            <textarea
              autoFocus
              rows={3}
              maxLength={MAX_REASON}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={placeholder}
              className="admin-field resize-y normal-case"
            />
            <span className="normal-case font-normal tracking-normal text-[#8f988f]">Quedan {MAX_REASON - reason.length} caracteres</span>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} disabled={isPending} className="admin-button-secondary">Volver</button>
            <button
              type="button"
              onClick={() => onConfirm(reason)}
              disabled={isPending}
              className={danger ? "admin-button-primary !bg-[#b85f49] hover:!bg-[#a84f3b]" : "admin-button-primary admin-button-brass"}
            >
              {isPending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
