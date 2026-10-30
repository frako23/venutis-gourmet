"use client";

import { Gift } from "lucide-react";
import { useEffect, useState } from "react";

import { type BeneficiosCheckout, obtenerBeneficiosCheckout } from "@/lib/actions/cuenta-cliente";
import { formatUsd } from "@/lib/format";

export type SeleccionBeneficios = { premioIds: number[]; saldoAFavorUsd: number; descuentoPuntosUsd: number };

export const SIN_BENEFICIOS: SeleccionBeneficios = { premioIds: [], saldoAFavorUsd: 0, descuentoPuntosUsd: 0 };

const redondear = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Puntos y saldo a favor del cliente con sesión vinculada. No muestra nada sin sesión.
 * La selección es solo local; el servidor vuelve a validar todo al confirmar la compra.
 */
export function BeneficiosCliente({ subtotalUsd, totalUsd, onChange }: { subtotalUsd: number; totalUsd: number; onChange: (seleccion: SeleccionBeneficios) => void }) {
  const [datos, setDatos] = useState<BeneficiosCheckout>({ disponible: false });
  const [premioIds, setPremioIds] = useState<number[]>([]);
  const [saldoTexto, setSaldoTexto] = useState("");

  useEffect(() => {
    let activo = true;
    void obtenerBeneficiosCheckout().then((resultado) => {
      if (activo) setDatos(resultado);
    });
    return () => {
      activo = false;
    };
  }, []);

  const premios = datos.disponible ? datos.premios : [];
  const elegidos = premios.filter((premio) => premioIds.includes(premio.id));
  const costoElegido = elegidos.reduce((suma, premio) => suma + premio.costoPuntos, 0);
  const descuentoPuntosUsd = redondear(elegidos.reduce((suma, premio) => suma + (premio.montoDescuentoUsd ?? 0), 0));
  const saldoDisponible = datos.disponible ? datos.saldoAFavorUsd : 0;
  const saldoMaximo = Math.max(0, redondear(Math.min(saldoDisponible, totalUsd - descuentoPuntosUsd)));
  const saldoAFavorUsd = Math.min(Math.max(0, redondear(Number(saldoTexto) || 0)), saldoMaximo);

  useEffect(() => {
    onChange({ premioIds, saldoAFavorUsd, descuentoPuntosUsd });
  }, [premioIds, saldoAFavorUsd, descuentoPuntosUsd, onChange]);

  if (!datos.disponible || (premios.length === 0 && saldoDisponible <= 0)) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-accent-gold/30 bg-accent-gold/5 p-5">
      <div className="flex items-center gap-3">
        <Gift className="text-accent-gold" size={20} />
        <h4 className="text-xs font-bold uppercase tracking-[2px] text-accent-gold">Tus beneficios</h4>
      </div>

      {premios.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/60">Tienes {datos.puntos.toLocaleString("es-VE")} puntos. Elige los premios que quieres canjear:</p>
          {premios.map((premio) => {
            const marcado = premioIds.includes(premio.id);
            const sinExistencia = premio.producto !== null && premio.producto.unidadesDisponibles < (premio.cantidad ?? 1);
            const excedePuntos = !marcado && costoElegido + premio.costoPuntos > datos.puntos;
            const excedeCompra = !marcado && premio.tipo === "descuento" && descuentoPuntosUsd + (premio.montoDescuentoUsd ?? 0) > subtotalUsd;
            const deshabilitado = sinExistencia || excedePuntos || excedeCompra;
            return (
              <label key={premio.id} className={`flex items-start gap-3 rounded-lg border border-white/10 p-3 text-sm ${deshabilitado ? "opacity-40" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={deshabilitado}
                  onChange={(evento) => setPremioIds((actual) => (evento.target.checked ? [...actual, premio.id] : actual.filter((id) => id !== premio.id)))}
                  className="mt-1 size-4 accent-[#d4af37]"
                />
                <span>
                  <strong>{premio.nombre}</strong> · {premio.costoPuntos.toLocaleString("es-VE")} pts
                  <span className="block text-xs text-white/50">
                    {premio.tipo === "descuento" ? `Descuento de ${formatUsd(premio.montoDescuentoUsd ?? 0)}` : `${premio.cantidad} × ${premio.producto?.nombre ?? "producto"} gratis`}
                    {sinExistencia ? " · Sin existencia" : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {saldoDisponible > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/60">Tienes {formatUsd(saldoDisponible)} a favor. Puedes usarlo en este pedido:</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max={saldoMaximo}
              step="0.01"
              value={saldoTexto}
              onChange={(evento) => setSaldoTexto(evento.target.value)}
              aria-label="Saldo a favor a usar (USD)"
              placeholder="0.00"
              className="w-32 rounded-lg border border-white/10 bg-input-dark px-3 py-2 text-white outline-none focus:border-gold"
            />
            <button type="button" onClick={() => setSaldoTexto(saldoMaximo.toFixed(2))} className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-xs font-bold transition hover:border-gold hover:text-gold">Usar todo ({formatUsd(saldoMaximo)})</button>
          </div>
        </div>
      )}
    </section>
  );
}
