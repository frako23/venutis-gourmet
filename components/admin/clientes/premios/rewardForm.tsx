"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { actualizarPremio, crearPremio } from "@/lib/actions/admin-fidelidad";

export type PremioVista = {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: "descuento" | "producto";
  costoPuntos: number;
  montoDescuentoUsd: number | null;
  productoId: number | null;
  productoNombre: string | null;
  cantidad: number | null;
  activo: boolean;
  canjes: number;
};

export type ProductoOpcion = { id: number; nombre: string };

const inicial = { status: "idle" as const, message: "" };

export function RewardForm({ premio, productos, onClose }: { premio: PremioVista | null; productos: ProductoOpcion[]; onClose: () => void }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"descuento" | "producto">(premio?.tipo ?? "descuento");
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
            <select name="tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value as "descuento" | "producto")} className="admin-field"><option value="descuento">Descuento en USD</option><option value="producto">Producto gratis</option></select>
          </label>
          <label className="admin-label">Costo en puntos
            <input name="costoPuntos" type="number" min="1" step="1" required defaultValue={premio?.costoPuntos} className="admin-field admin-mono" />
          </label>
        </div>
        {tipo === "descuento" ? (
          <label className="admin-label">Descuento (USD)
            <input name="montoDescuentoUsd" type="number" min="0.01" step="0.01" required defaultValue={premio?.montoDescuentoUsd ?? ""} className="admin-field admin-mono" />
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <label className="admin-label">Producto
              <select name="productoId" required defaultValue={premio?.productoId ?? ""} className="admin-field"><option value="" disabled>Elige un producto</option>{productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}</select>
            </label>
            <label className="admin-label">Cantidad
              <input name="cantidad" type="number" min="1" step="1" required defaultValue={premio?.cantidad ?? 1} className="admin-field admin-mono" />
            </label>
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" disabled={pendiente} onClick={onClose} className="admin-button-secondary">Cancelar</button>
          <button type="submit" disabled={pendiente} className="admin-button-primary admin-button-brass">{pendiente ? "Guardando…" : premio ? "Guardar cambios" : "Crear premio"}</button>
        </div>
      </form>
    </div>
  );
}
