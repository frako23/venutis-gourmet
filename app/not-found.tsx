import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background-dark px-6 py-16 font-century-gothic text-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_60%)]"
      />

      <div className="relative w-full max-w-xl rounded-[1.2rem] border border-gold/30 bg-charcoal/60 p-10 text-center backdrop-blur-sm sm:p-14">
        <Link href="/" className="mx-auto mb-6 inline-block">
          <Image
            src="/logo-venutis.avif"
            alt="Logo Venuti's Gourmet"
            width={80}
            height={80}
          />
        </Link>

        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold">
          Error 404
        </p>
        <h1 className="mt-3 font-reklame text-6xl leading-none text-gold sm:text-7xl">
          Plato no encontrado
        </h1>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-cream/70">
          La página que buscas no existe o fue movida. Pero en nuestra cocina
          siempre hay algo delicioso esperándote.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/productos/consumidores"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-medium uppercase tracking-widest text-background-dark transition-colors hover:bg-gold/90"
          >
            Ver productos
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold/50 px-6 py-3 text-sm font-medium uppercase tracking-widest text-cream transition-colors hover:text-gold"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
