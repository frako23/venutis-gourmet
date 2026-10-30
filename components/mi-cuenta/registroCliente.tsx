"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { completarRegistroCliente, type RegistroClienteState } from "@/lib/actions/cuenta-cliente";

const inicial: RegistroClienteState = { status: "idle", message: "" };
const campo = "mt-1 w-full rounded-lg border border-white/10 bg-input-dark px-4 py-3 text-white outline-none transition focus:border-gold focus:ring-1 focus:ring-gold";

export function RegistroCliente({ email, nombreSugerido }: { email: string; nombreSugerido: string | null }) {
  const router = useRouter();
  const [state, formAction, pendiente] = useActionState(completarRegistroCliente, inicial);
  const [nombre = "", ...resto] = (nombreSugerido ?? "").split(" ");

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/40 p-6 backdrop-blur-2xl sm:p-10">
      <p className="text-xs uppercase tracking-[0.3em] text-accent-gold">Casi listo</p>
      <h1 className="mt-3 text-2xl font-light tracking-tight">Completa tu registro</h1>
      <p className="mt-2 text-sm text-white/60">Tu cuenta es <strong className="text-white">{email}</strong>. Necesitamos unos datos para conectarla con tus compras.</p>
      <form action={formAction} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-[11px] uppercase tracking-widest text-white/50">Nombre
          <input name="nombre" required minLength={2} maxLength={60} defaultValue={nombre} autoComplete="given-name" className={campo} />
        </label>
        <label className="text-[11px] uppercase tracking-widest text-white/50">Apellido
          <input name="apellido" required minLength={2} maxLength={60} defaultValue={resto.join(" ")} autoComplete="family-name" className={campo} />
        </label>
        <label className="text-[11px] uppercase tracking-widest text-white/50 sm:col-span-2">Teléfono
          <input name="celular" type="tel" required minLength={10} maxLength={30} inputMode="tel" autoComplete="tel" placeholder="Ej: 04121234567" className={campo} />
        </label>
        <button type="submit" disabled={pendiente} className="cursor-pointer rounded-xl bg-gold px-6 py-3 text-sm font-bold text-primary transition hover:scale-[1.02] disabled:opacity-50 sm:col-span-2">{pendiente ? "Guardando…" : "Completar registro"}</button>
      </form>
    </section>
  );
}
