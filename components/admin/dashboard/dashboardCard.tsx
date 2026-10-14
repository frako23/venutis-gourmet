import type { LucideIcon } from "lucide-react";

export function DashboardCard({ icon: Icon, label, value, hint, accent = "gold" }: { icon: LucideIcon; label: string; value: string | number; hint: string; accent?: "gold" | "red" | "blue" | "green" }) {
  const accents = {
    gold: "border-[#c8a45d]/40 bg-[#f5eddc] text-[#a57c2f]",
    red: "border-[#b85f49]/30 bg-[#f8e8e3] text-[#b85f49]",
    blue: "border-[#738b9d]/30 bg-[#e7eef2] text-[#587487]",
    green: "border-[#66735f]/30 bg-[#e8eee5] text-[#66735f]",
  };

  return (
    <article className="admin-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-[#707970]">{label}</p>
          <p className="admin-mono mt-3 text-[1.8rem] font-black tracking-[-0.07em] text-[#18211d]">{value}</p>
          <p className="mt-1 text-xs text-[#707970]">{hint}</p>
        </div>
        <span className={`rounded-lg border p-3 ${accents[accent]}`}><Icon size={19} aria-hidden="true" /></span>
      </div>
    </article>
  );
}
