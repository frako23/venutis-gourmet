"use client";

import { Gift } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { type BeneficiosCheckout, obtenerBeneficiosCheckout } from "@/lib/actions/cuenta-cliente";
import { describirRecompensa, filtrarCanjesValidos, validarCanjes } from "@/lib/fidelidad";
import { formatUsd } from "@/lib/format";

export type SeleccionBeneficios = { premioIds: number[]; saldoAFavorUsd: number; descuentoPremiosUsd: number };

export const SIN_BENEFICIOS: SeleccionBeneficios = { premioIds: [], saldoAFavorUsd: 0, descuentoPremiosUsd: 0 };

const redondear = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Puntos y saldo a favor del cliente con sesión vinculada. No muestra nada sin sesión.
 * La selección es solo local; las condiciones salen de `validarCanjes` y el servidor vuelve a validar todo al confirmar.
 */
export function BeneficiosCliente({ subtotalUsd, totalUsd, montoDeliveryUsd, onChange }: { subtotalUsd: number; totalUsd: number; montoDeliveryUsd: number; onChange: (seleccion: SeleccionBeneficios) => void }) {
  const [datos, setDatos] = useState<BeneficiosCheckout>({ disponible: false });
  const [premioIdsElegidos, setPremioIdsElegidos] = useState<number[]>([]);
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

  const premios = useMemo(() => (datos.disponible ? datos.premios : []), [datos]);
  const puntos = datos.disponible ? datos.puntos : 0;
  const contexto = useMemo(() => ({ puntosDisponibles: puntos, subtotalUsd, descuentoUsd: 0, montoDeliveryUsd }), [puntos, subtotalUsd, montoDeliveryUsd]);

  // Un premio elegido que dejó de cumplir (cambió el pedido) sale de la selección efectiva.
  const efectivos = useMemo(
    () => filtrarCanjesValidos(premioIdsElegidos.flatMap((id) => premios.filter((premio) => premio.id === id)), contexto),
    [premioIdsElegidos, premios, contexto],
  );
  const resultado = useMemo(() => validarCanjes({ ...contexto, premios: efectivos }), [contexto, efectivos]);
  const premioIds = efectivos.map((premio) => premio.id);
  const descuentoPremiosUsd = redondear(resultado.descuentoPuntosUsd + resultado.descuentoDeliveryUsd);
  const saldoDisponible = datos.disponible ? datos.saldoAFavorUsd : 0;
  const saldoMaximo = Math.max(0, redondear(Math.min(saldoDisponible, totalUsd - descuentoPremiosUsd)));
  const saldoAFavorUsd = Math.min(Math.max(0, redondear(Number(saldoTexto) || 0)), saldoMaximo);
  const clavePremios = premioIds.join(",");

  useEffect(() => {
    onChange({ premioIds: clavePremios ? clavePremios.split(",").map(Number) : [], saldoAFavorUsd, descuentoPremiosUsd });
  }, [clavePremios, saldoAFavorUsd, descuentoPremiosUsd, onChange]);

  if (!datos.disponible || (premios.length === 0 && saldoDisponible <= 0)) return null;

  function motivoDeshabilitado(premio: (typeof premios)[number]) {
    if (premio.producto !== null && premio.producto.unidadesDisponibles < (premio.cantidad ?? 1)) return "Sin existencia";
    try {
      validarCanjes({ ...contexto, premios: [...efectivos, premio] });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "No disponible";
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-accent-gold/30 bg-accent-gold/5 p-5">
      <div className="flex items-center gap-3">
        <Gift className="text-accent-gold" size={20} />
        <h4 className="text-xs font-bold uppercase tracking-[2px] text-accent-gold">Tus beneficios</h4>
      </div>

      {premios.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/60">Tienes {puntos.toLocaleString("es-VE")} puntos. Elige los premios que quieres canjear:</p>
          {premios.map((premio) => {
            const marcado = premioIds.includes(premio.id);
            const motivo = marcado ? null : motivoDeshabilitado(premio);
            const deshabilitado = motivo !== null;
            return (
              <label key={premio.id} className={`flex items-start gap-3 rounded-lg border border-white/10 p-3 text-sm ${deshabilitado ? "opacity-40" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={deshabilitado}
                  onChange={(evento) => setPremioIdsElegidos((actual) => (evento.target.checked ? [...actual, premio.id] : actual.filter((id) => id !== premio.id)))}
                  className="mt-1 size-4 accent-[#d4af37]"
                />
                <span>
                  <strong>{premio.nombre}</strong> · {premio.costoPuntos.toLocaleString("es-VE")} pts
                  <span className="block text-xs text-white/50">
                    {describirRecompensa({ tipo: premio.tipo, montoDescuentoUsd: premio.montoDescuentoUsd, cantidad: premio.cantidad, productoNombre: premio.producto?.nombre ?? null })}
                    {motivo ? ` · ${motivo}` : ""}
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
