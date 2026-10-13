import type { LucideIcon } from "lucide-react";

export function DashboardCard({ icon: Icon, label, value, hint, accent = "gold" }: { icon: LucideIcon; label: string; value: string | number; hint: string; accent?: "gold" | "red" | "blue" | "green" }) {
  const accents = {
    gold: "border-gold/30 text-gold",
    red: "border-red-300 text-red-600",
    blue: "border-blue-300 text-blue-600",
    green: "border-emerald-300 text-emerald-600",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        </div>
        <span className={`rounded-xl border bg-slate-50 p-3 dark:bg-white/5 ${accents[accent]}`}><Icon size={20} aria-hidden="true" /></span>
      </div>
    </article>
  );
}
