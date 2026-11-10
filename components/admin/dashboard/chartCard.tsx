import Link from "next/link";
import { useId } from "react";

export function ChartCard({ eyebrow, titulo, periodo, enlace, children, cifras }: {
  eyebrow: string;
  titulo: string;
  periodo: string;
  enlace?: { href: string; texto: string };
  children: React.ReactNode;
  cifras?: React.ReactNode;
}) {
  const id = useId();
  return (
    <section className="admin-panel min-w-0 p-5" aria-labelledby={id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="admin-eyebrow">{eyebrow}</p>
          <h2 id={id} className="mt-1 text-lg font-bold text-[#18211d]">{titulo}</h2>
          <p className="mt-1 text-xs text-[#707970]">{periodo}</p>
        </div>
        {enlace && (
          <Link href={enlace.href} className="text-sm font-bold text-[#66735f] hover:text-[#18211d]">
            {enlace.texto} <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
      {cifras && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-bold text-[#707970]">Ver cifras</summary>
          <div className="mt-3 overflow-x-auto">{cifras}</div>
        </details>
      )}
    </section>
  );
}

export function SinDatos({ mensaje }: { mensaje: string }) {
  return <p className="rounded-lg border border-dashed border-[#dedfd6] p-8 text-center text-sm text-[#707970]">{mensaje}</p>;
}
