"use client";

import type { EstadoTransaccion, MetodoPago } from "@prisma/client";
import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useDolar } from "@/hooks/useDolar";
import { anularAbono, registrarAbono } from "@/lib/actions/admin-orders";
import { calcularAbonado, calcularSaldo, puedeAnularAbono, puedeRecibirAbono } from "@/lib/admin/abonos";
import { getPaymentMethodLabel } from "@/lib/admin/status";

export type AbonoVista = {
  id: number;
  fechaPago: string | null;
  montoUsd: number;
  montoBs: number | null;
  tasaCambio: number | null;
  metodoPago: MetodoPago;
  referencia: string | null;
  actorEmail: string | null;
  anuladoEn: string | null;
};

const METODOS: MetodoPago[] = ["Zelle", "EfectivoUsd", "TransferenciaUsd", "PagoMovil", "TransferenciaBs"];
const usd = (valor: number) => `$${valor.toFixed(2)}`;
const hoy = () => new Date().toISOString().slice(0, 10);

type Props = { transaccionId: number; numeroOrden: string; estado: EstadoTransaccion; totalUsd: number; abonos: AbonoVista[] };

export function AbonosPanel({ transaccionId, numeroOrden, estado, totalUsd, abonos }: Props) {
  const router = useRouter();
  const { tasa } = useDolar();
  const [pendiente, iniciar] = useTransition();
  const [moneda, setMoneda] = useState<"usd" | "bs">("usd");
  const [aAnular, setAAnular] = useState<AbonoVista | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const pagos = abonos.map((abono) => ({ esAbono: true, montoUsd: abono.montoUsd, anuladoEn: abono.anuladoEn ? new Date(abono.anuladoEn) : null }));
  const abonado = calcularAbonado(pagos);
  const saldo = calcularSaldo({ estado, montoTotal: totalUsd, pagos });
  const puedeAbonar = puedeRecibirAbono(estado) && saldo > 0;

  function enviar(formData: FormData) {
    formData.set("transaccionId", String(transaccionId));
    iniciar(async () => {
      const resultado = await registrarAbono(formData);
      if (resultado.success) {
        toast.success(resultado.message);
        formulario.current?.reset();
        setMoneda("usd");
        router.refresh();
      } else {
        toast.error(resultado.message);
      }
    });
  }

  function confirmarAnulacion() {
    if (!aAnular) return;
    const datos = new FormData();
    datos.set("pagoId", String(aAnular.id));
    datos.set("transaccionId", String(transaccionId));
    iniciar(async () => {
      const resultado = await anularAbono(datos);
      if (resultado.success) {
        toast.success(resultado.message);
        setAAnular(null);
        router.refresh();
      } else {
        toast.error(resultado.message);
      }
    });
  }

  return (
    <section className="admin-panel p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-[#e8eee5] text-[#66735f]"><Wallet size={17} /></span>
        <div><p className="admin-eyebrow">Cobros</p><h2 className="mt-1 font-bold text-[#18211d]">Abonos</h2></div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-xs text-[#707970]">Total</dt><dd className="admin-mono font-bold">{usd(totalUsd)}</dd></div>
        <div><dt className="text-xs text-[#707970]">Abonado</dt><dd className="admin-mono font-bold">{usd(abonado)}</dd></div>
        <div><dt className="text-xs text-[#707970]">Saldo</dt><dd className={`admin-mono font-bold ${saldo > 0 ? "text-[#8c6a2c]" : "text-[#55704d]"}`}>{usd(saldo)}</dd></div>
      </dl>

      {abonos.length === 0 ? (
        <p className="mt-4 text-sm text-[#707970]">No hay abonos registrados.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#ebe9e0] text-sm">
          {abonos.map((abono) => (
            <li key={abono.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className={abono.anuladoEn ? "text-[#9aa198] line-through" : undefined}>
                <strong className="admin-mono">{usd(abono.montoUsd)}</strong>
                {abono.montoBs ? ` · Bs. ${abono.montoBs.toFixed(2)}${abono.tasaCambio ? ` (tasa ${abono.tasaCambio})` : ""}` : ""} · {getPaymentMethodLabel(abono.metodoPago)}
                <p className="text-xs text-[#707970]">
                  {abono.fechaPago ? new Date(abono.fechaPago).toLocaleDateString("es-VE") : "Sin fecha"}
                  {abono.referencia ? ` · Ref. ${abono.referencia}` : ""}
                  {abono.actorEmail ? ` · ${abono.actorEmail}` : ""}
                </p>
              </div>
              {abono.anuladoEn ? (
                <span className="rounded-full bg-[#f8e8e3] px-2 py-0.5 text-xs font-bold text-[#a84f3b]">Anulado</span>
              ) : (
                puedeAnularAbono(estado) && <button type="button" onClick={() => setAAnular(abono)} className="admin-button-secondary text-xs">Anular</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeAbonar && (
        <form ref={formulario} action={enviar} className="mt-5 grid gap-3 border-t border-[#ebe9e0] pt-4 sm:grid-cols-2">
          <label className="admin-label">Moneda
            <select name="moneda" value={moneda} onChange={(evento) => setMoneda(evento.target.value as "usd" | "bs")} className="admin-field"><option value="usd">USD</option><option value="bs">Bs</option></select>
          </label>
          <label className="admin-label">Monto {moneda === "usd" ? "(USD)" : "(Bs)"}
            <input name="monto" type="number" min="0.01" step="0.01" required max={moneda === "usd" ? saldo : undefined} placeholder={moneda === "usd" ? `Saldo ${saldo.toFixed(2)}` : undefined} className="admin-field admin-mono" />
          </label>
          {moneda === "bs" && (
            <label className="admin-label">Tasa USD/Bs
              <input key={tasa} name="tasaCambio" type="number" min="0.0001" step="0.0001" required defaultValue={tasa || ""} className="admin-field admin-mono" />
            </label>
          )}
          <label className="admin-label">Método
            <select name="metodoPago" required defaultValue="Zelle" className="admin-field">{METODOS.map((metodo) => <option key={metodo} value={metodo}>{getPaymentMethodLabel(metodo)}</option>)}</select>
          </label>
          <label className="admin-label">Referencia <span className="font-normal normal-case tracking-normal">(opcional)</span>
            <input name="referencia" maxLength={120} className="admin-field" />
          </label>
          <label className="admin-label">Fecha
            <input name="fechaPago" type="date" required defaultValue={hoy()} max={hoy()} className="admin-field" />
          </label>
          <div className="sm:col-span-2"><button type="submit" disabled={pendiente} className="admin-button-primary admin-button-brass">{pendiente ? "Guardando..." : "Registrar abono"}</button></div>
        </form>
      )}

      {aAnular && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !pendiente && setAAnular(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="anular-titulo" className="admin-panel w-full max-w-md p-6" onClick={(evento) => evento.stopPropagation()}>
            <h3 id="anular-titulo" className="text-lg font-bold text-[#18211d]">¿Anular este abono?</h3>
            <p className="mt-2 text-sm text-[#707970]">Se anulará el abono de {usd(aAnular.montoUsd)} del pedido {numeroOrden}. Quedará registrado como anulado y el saldo se recalculará.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={pendiente} onClick={() => setAAnular(null)} className="admin-button-secondary">Volver</button>
              <button type="button" disabled={pendiente} onClick={confirmarAnulacion} className="admin-button-primary admin-button-brass">{pendiente ? "Anulando..." : "Anular abono"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
