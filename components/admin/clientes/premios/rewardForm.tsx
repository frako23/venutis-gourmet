"use client";

import { useRouter } from "next/navigation";
import type { TipoPremio } from "@prisma/client";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { actualizarPremio, crearPremio } from "@/lib/actions/admin-fidelidad";
import { costoSugeridoPremio, PROGRAMA_PUNTOS } from "@/lib/fidelidad";

export type PremioVista = {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: TipoPremio;
  costoPuntos: number;
  montoDescuentoUsd: number | null;
  productoId: number | null;
  productoNombre: string | null;
  cantidad: number | null;
  compraMinimaUsd: number | null;
  activo: boolean;
  canjes: number;
};

export type ProductoOpcion = { id: number; nombre: string; precioDetal: number };

const inicial = { status: "idle" as const, message: "" };

export function RewardForm({ premio, productos, onClose }: { premio: PremioVista | null; productos: ProductoOpcion[]; onClose: () => void }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoPremio>(premio?.tipo ?? "descuento");
  const [productoId, setProductoId] = useState(premio?.productoId ? String(premio.productoId) : "");
  const [cantidad, setCantidad] = useState(String(premio?.cantidad ?? 1));
  const [costoTexto, setCostoTexto] = useState(premio ? String(premio.costoPuntos) : "");
  const [compraTexto, setCompraTexto] = useState(premio?.compraMinimaUsd ? String(premio.compraMinimaUsd) : "");
  const [costoEditado, setCostoEditado] = useState(false);
  const [compraEditada, setCompraEditada] = useState(false);
  const [state, formAction, pendiente] = useActionState(premio ? actualizarPremio : crearPremio, inicial);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
      onClose();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router, onClose]);

  // Sugerencias (nunca se imponen): un premio nuevo las toma mientras no se haya escrito el campo; uno existente no cambia solo.
  const producto = productos.find((opcion) => String(opcion.id) === productoId);
  const costoSugerido = tipo === "producto" && producto ? costoSugeridoPremio({ precioDetalUsd: producto.precioDetal, cantidad: Number(cantidad) }) : tipo === "delivery" ? PROGRAMA_PUNTOS.costoDeliveryGratis : null;
  const compraSugerida = tipo === "delivery" ? PROGRAMA_PUNTOS.compraMinimaDeliveryUsd : null;
  const costoMostrado = !premio && !costoEditado && costoSugerido !== null ? String(costoSugerido) : costoTexto;
  const compraMostrada = !premio && !compraEditada && compraSugerida !== null ? String(compraSugerida) : compraTexto;
  const ayudaCosto =
    tipo === "producto" && costoSugerido !== null
      ? `Sugerido: ${costoSugerido} puntos (${PROGRAMA_PUNTOS.puntosPorUsdDePremio} por cada USD de su precio al detal).`
      : tipo === "delivery"
        ? `Sugerido: ${PROGRAMA_PUNTOS.costoDeliveryGratis} puntos con compra mínima de USD ${PROGRAMA_PUNTOS.compraMinimaDeliveryUsd}.`
        : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onClick={() => !pendiente && onClose()}>
      <form action={formAction} role="dialog" aria-modal="true" aria-labelledby="premio-titulo" className="admin-panel grid w-full max-w-lg gap-3 p-6" onClick={(evento) => evento.stopPropagation()}>
        <h3 id="premio-titulo" className="text-lg font-bold text-[#18211d]">{premio ? "Editar premio" : "Nuevo premio"}</h3>
        {premio && <input type="hidden" name="premioId" value={premio.id} />}
        <label className="admin-label">Nombre
          <input name="nombre" required minLength={3} maxLength={80} defaultValue={premio?.nombre} className="admin-field" />
        </label>
        <label className="admin-label">Descripción <span className="font-normal normal-case tracking-normal">(opcional)</span>
          <input name="descripcion" maxLength={240} defaultValue={premio?.descripcion ?? ""} className="admin-field" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="admin-label">Tipo
            <select name="tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoPremio)} className="admin-field"><option value="descuento">Descuento en USD</option><option value="producto">Producto gratis</option><option value="delivery">Delivery gratis</option></select>
          </label>
          <label className="admin-label">Costo en puntos
            <input name="costoPuntos" type="number" min="1" step="1" required value={costoMostrado} onChange={(evento) => { setCostoTexto(evento.target.value); setCostoEditado(true); }} className="admin-field admin-mono" />
          </label>
        </div>
        {ayudaCosto && <p className="-mt-1 text-xs text-[#707970]">{ayudaCosto}</p>}
        {tipo === "descuento" ? (
          <label className="admin-label">Descuento (USD)
            <input name="montoDescuentoUsd" type="number" min="0.01" step="0.01" required defaultValue={premio?.montoDescuentoUsd ?? ""} className="admin-field admin-mono" />
          </label>
        ) : tipo === "delivery" ? (
          <p className="text-xs text-[#707970]">Cubre el delivery completo del pedido, a cualquier zona activa.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <label className="admin-label">Producto
              <select name="productoId" required value={productoId} onChange={(evento) => setProductoId(evento.target.value)} className="admin-field"><option value="" disabled>Elige un producto</option>{productos.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}</select>
            </label>
            <label className="admin-label">Cantidad
              <input name="cantidad" type="number" min="1" step="1" required value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} className="admin-field admin-mono" />
            </label>
          </div>
        )}
        <label className="admin-label">Compra mínima (USD) <span className="font-normal normal-case tracking-normal">(opcional)</span>
          <input name="compraMinimaUsd" type="number" min="0.01" step="0.01" value={compraMostrada} onChange={(evento) => { setCompraTexto(evento.target.value); setCompraEditada(true); }} className="admin-field admin-mono" />
          <span className="font-normal normal-case tracking-normal text-[#707970]">Monto mínimo en productos para poder canjearlo.</span>
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" disabled={pendiente} onClick={onClose} className="admin-button-secondary">Cancelar</button>
          <button type="submit" disabled={pendiente} className="admin-button-primary admin-button-brass">{pendiente ? "Guardando…" : premio ? "Guardar cambios" : "Crear premio"}</button>
        </div>
      </form>
    </div>
  );
}
