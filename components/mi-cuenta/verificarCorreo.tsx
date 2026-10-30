"use client";

import { useUser } from "@stackframe/stack";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function VerificarCorreo({ email }: { email: string }) {
  const usuario = useUser();
  const [enviando, setEnviando] = useState(false);

  async function reenviar() {
    if (!usuario) return;
    setEnviando(true);
    try {
      const canales = await usuario.listContactChannels();
      const canal = canales.find((c) => c.type === "email" && c.isPrimary) ?? canales.find((c) => c.type === "email");
      if (!canal) throw new Error("sin correo");
      await canal.sendVerificationEmail();
      toast.success("Te enviamos un correo para verificar tu cuenta.");
    } catch {
      toast.error("No pudimos enviar el correo. Inténtalo de nuevo en un momento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/40 p-6 text-center backdrop-blur-2xl sm:p-10">
      <MailCheck className="mx-auto text-accent-gold" size={36} />
      <h1 className="mt-4 text-2xl font-light tracking-tight">Verifica tu correo</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">Para ver tus puntos y tu saldo necesitamos confirmar que {email ? <strong className="text-white">{email}</strong> : "tu correo"} es tuyo. Abre el mensaje que te enviamos y vuelve aquí.</p>
      <button type="button" disabled={enviando} onClick={() => void reenviar()} className="mt-6 cursor-pointer rounded-xl border border-white/15 px-6 py-3 text-sm font-bold transition hover:border-gold hover:text-gold disabled:opacity-50">{enviando ? "Enviando…" : "Reenviar correo de verificación"}</button>
    </section>
  );
}
