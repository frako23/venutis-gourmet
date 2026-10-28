"use client";

import {
  fmtBs,
  fmtUsd,
  type QuoteDraft,
} from "@/lib/cotizacion-rapida";
import Image from "next/image";
import { forwardRef } from "react";

export const QuoteArtwork = forwardRef<
  HTMLDivElement,
  { draft: QuoteDraft }
>(function QuoteArtwork({ draft }, ref) {
  const issuedAt = new Date(draft.issuedAt);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-[-10000px] top-0 w-[720px] overflow-hidden rounded-[28px] bg-[#14110f] p-10 text-white"
      data-quote-artwork
    >
      <div className="rounded-[22px] border border-[#d4af37]/45 bg-[#1d1814] p-8 shadow-2xl">
        <div className="flex items-center gap-5 border-b border-white/10 pb-6">
          <Image
            src="/logo-venutis.avif"
            alt=""
            width={80}
            height={80}
            className="h-20 w-20 rounded-full border border-white/20 bg-white object-cover p-1"
          />
          <div>
            <p className="font-century-gothic text-xs uppercase tracking-[0.3em] text-[#d4af37]">
              Venuti&apos;s Gourmet
            </p>
            <h1 className="mt-2 font-reklame text-5xl leading-none text-[#d4af37]">
              Cotización
            </h1>
            <p className="mt-3 text-sm text-white/65">
              {issuedAt.toLocaleDateString("es-VE")}
            </p>
          </div>
        </div>

        {(draft.recipient.nombre || draft.recipient.telefono) && (
          <div className="mt-6 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/80">
            {draft.recipient.nombre && (
              <p>
                <strong className="text-white">Para:</strong>{" "}
                {draft.recipient.nombre}
              </p>
            )}
            {draft.recipient.telefono && (
              <p>
                <strong className="text-white">Teléfono:</strong>{" "}
                {draft.recipient.telefono}
              </p>
            )}
          </div>
        )}

        <div className="mt-7">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d4af37]">
            Detalle de la cotización
          </p>
          <div className="mt-3 divide-y divide-white/10">
            {draft.lines.map((line) => (
              <div
                key={line.product.id}
                className="grid grid-cols-[56px_1fr_auto] items-center gap-3 py-4"
              >
                <span className="text-center text-lg font-bold text-[#d4af37]">
                  {line.cantidad}x
                </span>
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-white">
                    {line.product.nombre}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
                    {line.product.categoria} · {fmtUsd(line.product.precioUsd)} c/u
                  </p>
                </div>
                <p className="text-right text-base font-bold text-white">
                  {fmtUsd(line.subtotalUsd)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2 border-t border-[#d4af37]/30 pt-5 text-right">
          {draft.delivery && (
            <>
              <p className="text-sm text-white/60">
                Subtotal: <strong className="text-base text-white">{fmtUsd(draft.subtotalUsd)}</strong>
              </p>
              <p className="text-sm text-white/60">
                Delivery ({draft.delivery.zona}): <strong className="text-base text-white">{fmtUsd(draft.deliveryUsd)}</strong>
              </p>
            </>
          )}
          <p className="text-sm text-white/60">
            Total USD: <strong className="text-xl text-white">{fmtUsd(draft.totalUsd)}</strong>
          </p>
          <p className="text-sm text-white/60">
            Total Bs: <strong className="text-xl text-[#d4af37]">{draft.totalBs === null ? "No disponible" : fmtBs(draft.totalBs)}</strong>
          </p>
          <p className="text-xs text-white/45">
            Tasa de referencia: {draft.exchangeRate > 0 ? fmtBs(draft.exchangeRate) : "No disponible"} por 1 $
          </p>
        </div>

        <p className="mt-7 border-t border-white/10 pt-5 text-center text-xs text-white/45">
          Cotización informativa. No confirma una venta ni una reserva.
        </p>
      </div>
    </div>
  );
});
