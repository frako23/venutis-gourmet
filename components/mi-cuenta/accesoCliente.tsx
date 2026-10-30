import Link from "next/link";

const RETORNO = encodeURIComponent("/mi-cuenta");

export function AccesoCliente() {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/40 p-6 text-center backdrop-blur-2xl sm:p-10">
      <p className="text-xs uppercase tracking-[0.3em] text-accent-gold">Mi cuenta</p>
      <h1 className="mt-3 text-2xl font-light tracking-tight sm:text-3xl">Tus puntos y tu saldo, en un solo lugar</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">Crea tu cuenta para ver tus puntos de fidelización, lo que tengas pendiente o a tu favor y tus pedidos anteriores.</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href={`/handler/sign-up?after_auth_return_to=${RETORNO}`} className="rounded-xl bg-gold px-6 py-3 text-sm font-bold text-primary transition hover:scale-[1.02]">Crear cuenta</Link>
        <Link href={`/handler/sign-in?after_auth_return_to=${RETORNO}`} className="rounded-xl border border-white/15 px-6 py-3 text-sm font-bold transition hover:border-gold hover:text-gold">Ya tengo cuenta</Link>
      </div>
    </section>
  );
}
