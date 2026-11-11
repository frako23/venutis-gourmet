import Link from "next/link";

import { getOrderStateLabel } from "@/lib/admin/status";
import type { ResumenCuenta } from "@/lib/cuenta-cliente";
import { formatFecha, formatUsd, formatUsdConSigno } from "@/lib/format";

import { CerrarSesion } from "./cerrarSesion";

function Tarjeta({ titulo, valor, nota, tono, href }: { titulo: string; valor: string; nota: string; tono?: string; href?: string }) {
  const contenido = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{titulo}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${tono ?? "text-white"}`}>{valor}</p>
      <p className="mt-1 text-xs text-white/50">{nota}</p>
    </>
  );
  const clases = "block rounded-2xl border border-white/10 bg-surface-dark/40 p-4 backdrop-blur-2xl";
  return href ? <Link href={href} className={`${clases} transition hover:border-accent-gold/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold`}>{contenido}</Link> : <div className={clases}>{contenido}</div>;
}

export function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/40 p-4 backdrop-blur-2xl sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent-gold">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const Vacio = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-white/50">{children}</p>;

export function ResumenCuentaVista({ resumen }: { resumen: ResumenCuenta }) {
  const { puntos, deudaUsd, saldoAFavorUsd } = resumen;
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
        {puntos.mostrar && <Tarjeta titulo="Puntos" valor={puntos.disponibles.toLocaleString("es-VE")} nota="Ver mis puntos y premios →" tono="text-accent-gold" href="/mi-cuenta/puntos" />}
        <Tarjeta titulo="Por pagar" valor={formatUsd(deudaUsd)} nota={deudaUsd > 0 ? "Saldo pendiente de tus pedidos" : "No tienes saldo pendiente"} tono={deudaUsd > 0 ? "text-[#f0b6a6]" : undefined} />
        <Tarjeta titulo="Saldo a favor" valor={formatUsd(saldoAFavorUsd)} nota={saldoAFavorUsd > 0 ? "Lo puedes usar en tu próxima compra" : "Sin saldo a favor"} tono={saldoAFavorUsd > 0 ? "text-[#a8d5a2]" : undefined} />
      </div>

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
