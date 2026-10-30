import { Hourglass } from "lucide-react";

export function VinculoPendiente({ email }: { email: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/40 p-6 text-center backdrop-blur-2xl sm:p-10">
      <Hourglass className="mx-auto text-accent-gold" size={36} />
      <h1 className="mt-4 text-2xl font-light tracking-tight">Estamos confirmando tu registro</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">Encontramos un registro con el teléfono que indicaste. Lo confirmaremos y, cuando esté listo, verás aquí tus puntos y tu saldo{email ? ` (${email})` : ""}. Mientras tanto puedes seguir comprando con normalidad.</p>
    </section>
  );
}
