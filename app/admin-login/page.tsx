import { AdminSignIn } from "@/components/auth/adminSignIn";
import { esCorreoAdministrador, leerCorreosAdministradores } from "@/lib/admin/auth-rules";
import { stackServerApp } from "@/stack/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLogin() {
  if (process.env.NODE_ENV === "development") redirect("/admin/inventory");
  const user = await stackServerApp.getUser();
  if (user) {
    const esAdministradora = esCorreoAdministrador(user.primaryEmail, leerCorreosAdministradores(process.env.ALLOWED_EMAILS));
    redirect(esAdministradora ? "/admin/inventory" : "/unauthorized");
  }

  return <div data-admin-shell className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#18211d] px-4 py-8 text-[#f4f1e8]"><div className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full border border-[#c8a45d]/20" /><div className="pointer-events-none absolute -bottom-48 -right-32 size-[32rem] rounded-full border border-[#c8a45d]/15" /><div className="relative grid w-full max-w-4xl overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#23302a] shadow-[0_24px_70px_rgba(0,0,0,0.25)] md:grid-cols-[0.9fr_1.1fr]"><div className="hidden flex-col justify-between border-r border-white/10 bg-[#1d2823] p-10 md:flex"><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#c8a45d]">Venuti&apos;s Gourmet</p><h1 className="mt-8 max-w-xs text-4xl font-black leading-[0.95] tracking-[-0.07em]">El trabajo fino empieza detrás del mostrador.</h1><p className="mt-5 max-w-xs text-sm leading-relaxed text-white/55">Una vista protegida para cuidar catálogo, pedidos, existencias y entregas.</p></div><div className="flex items-center gap-2 text-xs text-white/45"><span className="size-2 rounded-full bg-[#66735f]" /> Acceso solo para el equipo autorizado</div></div><main className="p-6 sm:p-10"><div className="mb-8 flex items-center gap-3 md:hidden"><span className="grid size-10 place-items-center rounded-lg bg-[#c8a45d] text-[#18211d]"><ShieldCheck size={21} /></span><div><p className="font-black">Venuti&apos;s</p><p className="text-[0.62rem] uppercase tracking-[0.15em] text-[#c8a45d]">Panel interno</p></div></div><div className="mb-8"><span className="grid size-11 place-items-center rounded-xl border border-[#c8a45d]/35 bg-[#c8a45d]/10 text-[#c8a45d]"><ShieldCheck size={24} strokeWidth={1.5} /></span><p className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#c8a45d]">Acceso protegido</p><h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">Portal administrativo</h2><p className="mt-3 text-sm leading-relaxed text-white/55">Inicia sesión para entrar al cuaderno de operación.</p></div><AdminSignIn /><Link className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-white/45 transition hover:text-[#c8a45d]" href="/"><ArrowLeft size={15} /> Regresar a la tienda</Link></main></div></div>;
}
