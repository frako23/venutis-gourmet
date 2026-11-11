import Link from "next/link";

import type { MisPuntos } from "@/lib/cuenta-cliente";
import { PROGRAMA_PUNTOS } from "@/lib/fidelidad";
import { formatFecha, formatPuntosConSigno } from "@/lib/format";

import { Bloque, Vacio } from "./resumenCuenta";

const numero = (valor: number) => valor.toLocaleString("es-VE");

export function MisPuntosVista({ datos }: { datos: MisPuntos }) {
  const { disponibles, proximo, premios, movimientos, acumula } = datos;
  const hayCanjeable = premios.some((premio) => premio.estado.tipo === "canjeable");
  const progreso = proximo ? Math.round((disponibles / (disponibles + proximo.faltan)) * 100) : 100;

  return (
    <div className="space-y-5">
      <header>
        <Link href="/mi-cuenta" className="inline-flex min-h-11 items-center text-xs text-white/70 hover:text-gold">← Mi cuenta</Link>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-accent-gold">Mis puntos</p>
        <p className="mt-2 text-5xl font-bold tracking-tight text-accent-gold">{numero(disponibles)}</p>
        <p className="mt-1 text-sm text-white/60">puntos disponibles</p>
      </header>

      {premios.length > 0 && (
        <Bloque titulo="Tu próximo premio">
          {proximo ? (
            <>
              <p className="text-sm">Te faltan <strong className="text-accent-gold">{numero(proximo.faltan)} puntos</strong> para {proximo.nombre}.</p>
              <div role="progressbar" aria-label="Avance hacia tu próximo premio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progreso} className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent-gold" style={{ width: `${progreso}%` }} />
              </div>
            </>
          ) : (
            <p className="text-sm">Ya alcanzas todos los premios disponibles.</p>
          )}
        </Bloque>
      )}

      <Bloque titulo="Premios">
        {premios.length === 0 ? (
          <Vacio>Pronto tendremos premios para canjear con tus puntos.</Vacio>
        ) : (
          <ul className="space-y-4">
            {premios.map((premio) => (
              <li key={premio.id} className={`flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-4 last:border-0 last:pb-0 ${premio.estado.tipo === "sin_existencia" ? "opacity-50" : ""}`}>
                <div className="min-w-0">
                  <strong>{premio.nombre}</strong>
                  {premio.descripcion && <p className="text-xs text-white/50">{premio.descripcion}</p>}
                  <p className="mt-1 text-xs text-white/70">{premio.recompensa}</p>
                  {premio.condiciones.map((condicion) => <p key={condicion} className="text-xs text-white/50">{condicion}</p>)}
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold text-accent-gold">{numero(premio.costoPuntos)} pts</span>
                  {premio.estado.tipo === "canjeable" && (
                    <>
                      <p className="mt-1 text-[#a8d5a2]">¡Ya lo puedes canjear!</p>
                      <Link href="/productos/consumidores" className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-accent-gold/60 px-4 font-bold text-accent-gold transition hover:bg-accent-gold/10">Canjear</Link>
                    </>
                  )}
                  {premio.estado.tipo === "faltan" && <p className="mt-1 text-white/50">Te faltan {numero(premio.estado.faltan)} puntos</p>}
                  {premio.estado.tipo === "sin_existencia" && <p className="mt-1 text-white/50">Sin existencia por ahora</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {hayCanjeable && <p className="mt-4 text-xs text-white/50">Para canjear, haz tu pedido: eliges el premio en el paso de pago y ahí se descuentan tus puntos.</p>}
      </Bloque>

      <Bloque titulo="Cómo funciona">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-white/80">
          <li>{acumula ? "Ganas 1 punto por cada dólar en productos, cuando confirmamos el pago de tu pedido. El delivery no suma puntos." : "Tu cuenta es mayorista y ya no suma puntos, pero puedes canjear los que tienes."}</li>
          <li>Canjeas tus puntos al hacer un pedido: el premio viaja con tu compra.</li>
          <li>Tus puntos no vencen.{acumula ? ` Al crear tu cuenta recibes ${PROGRAMA_PUNTOS.puntosBienvenida} puntos de bienvenida.` : ""}</li>
        </ol>
      </Bloque>

      <Bloque titulo="Movimientos de puntos">
        {movimientos.length === 0 ? <Vacio>Todavía no tienes movimientos.</Vacio> : (
          <ul className="space-y-2 text-sm">
            {movimientos.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="min-w-0"><span className="block truncate">{m.concepto}</span><span className="text-xs text-white/50">{formatFecha(m.fecha)}{m.numeroOrden ? ` · Pedido ${m.numeroOrden}` : ""}</span></span>
                <strong className={m.puntos < 0 ? "text-[#f0b6a6]" : "text-[#a8d5a2]"}>{formatPuntosConSigno(m.puntos)}</strong>
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  );
}
