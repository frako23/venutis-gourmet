"use client";

import { Button } from "@/components/venta-rapida/Button";
import { Label } from "@/components/venta-rapida/label";
import {
  agruparPorCosto,
  filtrarZonas,
  type ZonaDeliveryVista,
} from "@/lib/delivery-zone-rules";
import { fmtUsd } from "@/lib/pos";
import { useMemo, useState } from "react";

export type EntregaVentaRapida = {
  activo: boolean;
  zonaId: number | null;
  nombre: string;
  telefono: string;
  direccion: string;
};

export const ENTREGA_INICIAL: EntregaVentaRapida = {
  activo: false,
  zonaId: null,
  nombre: "",
  telefono: "",
  direccion: "",
};

const CAMPO =
  "w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground";

export function DeliverySelector({
  zonas,
  zonasError,
  entrega,
  onChange,
}: {
  zonas: ZonaDeliveryVista[];
  zonasError: boolean;
  entrega: EntregaVentaRapida;
  onChange: (entrega: EntregaVentaRapida) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const disponible = !zonasError && zonas.length > 0;
  const zonaElegida = entrega.activo ? zonas.find((z) => z.id === entrega.zonaId) ?? null : null;
  const grupos = useMemo(
    () => agruparPorCosto(filtrarZonas(zonas, busqueda)),
    [zonas, busqueda],
  );

  const cambiar = (parcial: Partial<EntregaVentaRapida>) => onChange({ ...entrega, ...parcial });

  return (
    <div className="space-y-3 rounded-2xl bg-muted/40 p-3">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          role="switch"
          className="mt-1 size-4 accent-[var(--gold,#d4af37)]"
          checked={entrega.activo && disponible}
          disabled={!disponible}
          onChange={(e) => cambiar({ activo: e.target.checked })}
        />
        <span>
          <span className="block text-sm font-semibold">Agregar delivery</span>
          <span className="block text-xs text-muted-foreground">
            Solo para el pedido por WhatsApp
          </span>
        </span>
      </label>

      {!disponible && (
        <p className="text-xs text-muted-foreground">
          El delivery no está disponible en este momento. Puedes enviar el pedido sin delivery.
        </p>
      )}

      {entrega.activo && disponible && !zonaElegida && (
        <div className="space-y-2">
          <input
            type="search"
            aria-label="Buscar zona de delivery"
            className={`${CAMPO} h-11`}
            placeholder="Busca tu zona, ej. Chacao"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-background">
            {grupos.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                No hay zonas con ese nombre.
              </p>
            ) : (
              grupos.map((grupo) => (
                <div key={grupo.costoUsd}>
                  <p className="sticky top-0 bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Delivery {fmtUsd(grupo.costoUsd)}
                  </p>
                  {grupo.zonas.map((zona) => (
                    <button
                      key={zona.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setBusqueda("");
                        cambiar({ zonaId: zona.id });
                      }}
                    >
                      <span>{zona.nombre}</span>
                      <span className="tabular text-xs text-muted-foreground">
                        {fmtUsd(zona.costoUsd)}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {entrega.activo && disponible && zonaElegida && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
            <span className="text-sm font-semibold">
              {zonaElegida.nombre} · {fmtUsd(zonaElegida.costoUsd)}
            </span>
            <Button
              type="button"
              variant="outline"
              className="px-3 py-1.5 text-xs"
              onClick={() => cambiar({ zonaId: null })}
            >
              Cambiar
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entrega-nombre">Nombre de quien recibe</Label>
            <input
              id="entrega-nombre"
              className={`${CAMPO} h-11`}
              autoComplete="name"
              value={entrega.nombre}
              onChange={(e) => cambiar({ nombre: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entrega-telefono">Teléfono</Label>
            <input
              id="entrega-telefono"
              className={`${CAMPO} h-11`}
              inputMode="tel"
              autoComplete="tel"
              placeholder="0414-1234567"
              value={entrega.telefono}
              onChange={(e) => cambiar({ telefono: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entrega-direccion">Dirección</Label>
            <textarea
              id="entrega-direccion"
              rows={2}
              className={`${CAMPO} py-2`}
              autoComplete="street-address"
              value={entrega.direccion}
              onChange={(e) => cambiar({ direccion: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
