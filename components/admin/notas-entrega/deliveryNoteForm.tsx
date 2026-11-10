"use client";

import { crearNotaEntrega } from "@/lib/actions/delivery-notes";
import { fechaHoraLocalCaracas } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DeliveryNotePreview } from "./deliveryNotePreview";

type PedidoNota = { id: number; numeroOrden: string; cliente: string; direccionEntrega: string | null; lineas: { productoNombre: string; cantidad: number; precioUnitarioUsd: number }[] };

export function DeliveryNoteForm({ pedido }: { pedido: PedidoNota }) {
  const router = useRouter();
  const [date, setDate] = useState(() => fechaHoraLocalCaracas(new Date()));
  const [numeroFactura, setNumeroFactura] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function submit(formData: FormData) {
    setGuardando(true);
    const response = await crearNotaEntrega(formData);
    if (!response.success) { setGuardando(false); toast.error(response.message); return; }
    toast.success(response.message);
    router.push(`/admin/delivery-notes/${response.notaEntregaId}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form action={submit} className="space-y-5">
        <input type="hidden" name="transaccionId" value={pedido.id} />
        <section className="admin-panel grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2"><p className="admin-eyebrow">Datos de la nota</p><h2 className="mt-1 text-lg font-bold text-[#18211d]">{pedido.cliente}</h2></div>
          <label className="admin-label">Número de nota<input value={pedido.numeroOrden} readOnly className="admin-field admin-mono" /></label>
          <label className="admin-label">Número de factura <span className="font-normal normal-case tracking-normal">(opcional)</span><input name="numeroFactura" value={numeroFactura} onChange={(event) => setNumeroFactura(event.target.value)} maxLength={60} className="admin-field admin-mono" placeholder="Número de control de la factura" /></label>
          <label className="admin-label">Fecha de entrega<input name="fechaEntrega" type="datetime-local" required value={date} onChange={(event) => setDate(event.target.value)} className="admin-field" /></label>
          <label className="admin-label">Persona que recibe <span className="font-normal normal-case tracking-normal">(opcional)</span><input name="personaRecibe" className="admin-field" placeholder="Nombre y apellido" /></label>
          <label className="admin-label md:col-span-2">Dirección de entrega <span className="font-normal normal-case tracking-normal">(opcional)</span><input name="direccionEntrega" defaultValue={pedido.direccionEntrega ?? ""} className="admin-field" placeholder="Dirección de recepción" /></label>
          <label className="admin-label md:col-span-2">Observaciones<textarea name="observaciones" rows={3} className="admin-field resize-y" placeholder="Indicaciones útiles para la entrega" /></label>
          <p className="text-sm text-[#707970] md:col-span-2">Los productos y precios se copian del pedido y no cambian después. La nota no modifica inventario ni pagos.</p>
        </section>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={guardando} className="admin-button-primary admin-button-brass">{guardando ? "Guardando…" : "Generar nota de entrega"}</button>
          <Link href="/admin/transactions" className="admin-button-secondary">Cancelar</Link>
        </div>
      </form>
      <DeliveryNotePreview numeroNota={pedido.numeroOrden} numeroFactura={numeroFactura.trim() || null} cliente={pedido.cliente} fecha={date.replace("T", " ")} lines={pedido.lineas} />
    </div>
  );
}
