import { getOrderStateLabel } from "@/lib/admin/status";
import type { ResumenCuenta } from "@/lib/cuenta-cliente";
import { formatFecha, formatPuntosConSigno, formatUsd, formatUsdConSigno } from "@/lib/format";

import { CerrarSesion } from "./cerrarSesion";

function Tarjeta({ titulo, valor, nota, tono }: { titulo: string; valor: string; nota: string; tono?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-dark/40 p-4 backdrop-blur-2xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{titulo}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${tono ?? "text-white"}`}>{valor}</p>
      <p className="mt-1 text-xs text-white/50">{nota}</p>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/40 p-4 backdrop-blur-2xl sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent-gold">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const Vacio = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-white/50">{children}</p>;

export function ResumenCuentaVista({ resumen }: { resumen: ResumenCuenta }) {
  const { puntos, premios, deudaUsd, saldoAFavorUsd } = resumen;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-gold">Mi cuenta</p>
          <h1 className="mt-2 text-2xl font-light tracking-tight sm:text-3xl">Hola, {resumen.nombre}</h1>
        </div>
        <CerrarSesion />
      </header>

      <div className={`grid gap-3 ${puntos.mostrar ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {puntos.mostrar && <Tarjeta titulo="Puntos" valor={puntos.disponibles.toLocaleString("es-VE")} nota="Disponibles para canjear" tono="text-accent-gold" />}
        <Tarjeta titulo="Por pagar" valor={formatUsd(deudaUsd)} nota={deudaUsd > 0 ? "Saldo pendiente de tus pedidos" : "No tienes saldo pendiente"} tono={deudaUsd > 0 ? "text-[#f0b6a6]" : undefined} />
        <Tarjeta titulo="Saldo a favor" valor={formatUsd(saldoAFavorUsd)} nota={saldoAFavorUsd > 0 ? "Lo puedes usar en tu próxima compra" : "Sin saldo a favor"} tono={saldoAFavorUsd > 0 ? "text-[#a8d5a2]" : undefined} />
      </div>

      {puntos.mostrar && (
        <Bloque titulo="Premios">
          {premios.length === 0 ? (
            <Vacio>Pronto tendremos premios para canjear con tus puntos.</Vacio>
          ) : (
            <ul className="space-y-3">
              {premios.map((premio) => (
                <li key={premio.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div><strong>{premio.nombre}</strong>{premio.descripcion && <p className="text-xs text-white/50">{premio.descripcion}</p>}</div>
                  <div className="text-right text-xs"><span className="font-bold text-accent-gold">{premio.costoPuntos.toLocaleString("es-VE")} pts</span><p className="text-white/50">{premio.faltan === 0 ? "¡Ya lo puedes canjear!" : `Te faltan ${premio.faltan.toLocaleString("es-VE")} puntos`}</p></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-white/50">Para canjear un premio, úsalo al finalizar tu compra o pídelo por WhatsApp.</p>
        </Bloque>
      )}

      {puntos.mostrar && (
        <Bloque titulo="Movimientos de puntos">
          {puntos.movimientos.length === 0 ? <Vacio>Todavía no tienes movimientos.</Vacio> : (
            <ul className="space-y-2 text-sm">
              {puntos.movimientos.map((m, i) => (
                <li key={i} className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="block truncate">{m.descripcion}</span><span className="text-xs text-white/50">{formatFecha(m.fecha)}{m.numeroOrden ? ` · Pedido ${m.numeroOrden}` : ""}</span></span><strong className={m.puntos < 0 ? "text-[#f0b6a6]" : "text-[#a8d5a2]"}>{formatPuntosConSigno(m.puntos)}</strong></li>
              ))}
            </ul>
          )}
        </Bloque>
      )}

      <Bloque titulo="Pedidos por pagar">
        {resumen.pedidosPendientes.length === 0 ? <Vacio>No tienes pedidos por pagar.</Vacio> : (
          <ul className="space-y-2 text-sm">
            {resumen.pedidosPendientes.map((p) => (
              <li key={p.numeroOrden} className="flex items-center justify-between gap-3"><span><strong>{p.numeroOrden}</strong><span className="block text-xs text-white/50">{formatFecha(p.fecha)} · {getOrderStateLabel(p.estado as never)}</span></span><span className="text-right"><strong className="text-[#f0b6a6]">{formatUsd(p.saldoUsd)}</strong><span className="block text-xs text-white/50">de {formatUsd(p.totalUsd)}</span></span></li>
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque titulo="Saldo a favor">
        {resumen.movimientosSaldo.length === 0 ? <Vacio>Todavía no tienes movimientos de saldo.</Vacio> : (
          <ul className="space-y-2 text-sm">
            {resumen.movimientosSaldo.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3"><span><span className="block">{m.concepto}</span><span className="text-xs text-white/50">{formatFecha(m.fecha)}{m.numeroOrden ? ` · Pedido ${m.numeroOrden}` : ""}</span></span><strong className={m.montoUsd < 0 ? "text-[#f0b6a6]" : "text-[#a8d5a2]"}>{formatUsdConSigno(m.montoUsd)}</strong></li>
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque titulo="Mis pedidos">
        {resumen.pedidos.length === 0 ? <Vacio>Aún no tienes pedidos.</Vacio> : (
          <ul className="space-y-2 text-sm">
            {resumen.pedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3"><span><strong>{p.numeroOrden}</strong><span className="block text-xs text-white/50">{formatFecha(p.fecha)} · {getOrderStateLabel(p.estado as never)}</span></span><strong>{formatUsd(p.totalUsd)}</strong></li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  );
}
