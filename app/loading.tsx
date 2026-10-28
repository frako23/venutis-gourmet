import { Utensils } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background-dark px-6 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_60%)]"
      />

      {/* Cuadro de cubiertos: halo y caja comparten tamaño y radio, sin rotación */}
      <div className="relative mb-8 size-24">
        <div className="absolute inset-0 rounded-2xl bg-gold/20 animate-ping [animation-duration:2000ms] motion-reduce:animate-none" />
        <div className="relative flex size-full items-center justify-center rounded-2xl border-2 border-gold/30 bg-primary shadow-2xl">
          <Utensils className="size-12 text-gold animate-bounce motion-reduce:animate-none" />
        </div>
      </div>

      <div className="relative space-y-3">
        <h1 className="font-reklame text-6xl leading-tight text-gold sm:text-8xl">
          Venuti´s Gourmet
        </h1>
        <p className="font-century-gothic text-xs font-medium uppercase tracking-[0.4em] text-cream sm:text-sm">
          Preparando la mesa
        </p>
      </div>

      <div className="relative mt-10 h-1 w-48 overflow-hidden rounded-full bg-gold/10">
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-gold shadow-[0_0_8px_rgba(212,175,55,0.5)] animate-[loading-slide_1.8s_ease-in-out_infinite] motion-reduce:animate-none" />
      </div>

      <p className="relative mt-6 max-w-md font-century-gothic text-sm italic text-cream/70 sm:text-base">
        &ldquo;La verdadera pasta se amasa con tiempo y pasión...&rdquo;
      </p>
    </div>
  );
}
