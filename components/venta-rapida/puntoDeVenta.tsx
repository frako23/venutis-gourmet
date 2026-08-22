"use client";

import { InputField } from "@/components/global/input";
import { Button } from "@/components/venta-rapida/Button";
import { Label } from "@/components/venta-rapida/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/venta-rapida/sheet";
import { useDolar } from "@/hooks/useDolar";
import {
  fmtBs,
  fmtRef,
  fmtUsd,
  mensajeWhatsapp,
  type LineaCarrito,
} from "@/lib/pos";
import { Search, Trash2 } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

export interface ProductoVentaRapida {
  id: string;
  nombre: string;
  precioUsd: number;
  categoria: string;
  imagenes?: { url: string }[];
}

export default function PuntoDeVenta({
  products,
}: {
  products: ProductoVentaRapida[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [tasaManual, setTasaManual] = useState<number | null>(null);
  const [monedaTasa, setMonedaTasa] = useState<"usd" | "eur">("usd");
  const [negocio, setNegocio] = useState("Venuti's Gourmet");
  const [abrirCobro, setAbrirCobro] = useState(false);
  const [abrirAjustes, setAbrirAjustes] = useState(false);

  const { tasa, refetch } = useDolar();

  const tasaActiva = tasaManual ?? tasa;

  const lineas: LineaCarrito[] = useMemo(
    () =>
      Object.entries(carrito)
        .map(([id, cantidad]) => {
          const producto = products.find((p) => p.id === id);
          return producto ? { producto, cantidad } : null;
        })
        .filter((l): l is LineaCarrito => l !== null),
    [carrito, products],
  );

  const totalUsd = lineas.reduce(
    (s, l) => s + l.producto.precioUsd * l.cantidad,
    0,
  );
  const items = lineas.reduce((s, l) => s + l.cantidad, 0);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.nombre} ${p.categoria}`.toLowerCase().includes(q),
    );
  }, [busqueda, products]);

  const agregar = (id: string) =>
    setCarrito((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));

  const quitar = (id: string) =>
    setCarrito((c) => {
      const n = (c[id] ?? 0) - 1;
      const copia = { ...c };
      if (n <= 0) delete copia[id];
      else copia[id] = n;
      return copia;
    });

  const enviarWhatsapp = () => {
    const texto = mensajeWhatsapp({
      negocio,
      lineas,
      tasa: tasaActiva,
      totalUsd,
    });
    const url = `https://wa.me/+584242526757?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.08),_transparent_30%),linear-gradient(to_bottom,_#14110f,_var(--background-dark))] pb-36">
      <header className="sticky top-0 z-20 px-4 pt-4">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-[#0f0d0b] px-4 py-4 text-white shadow-card ring-1 ring-white/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.15),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.08),_transparent_28%)]" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white p-1 shadow-lg">
                <Image
                  src="/logo-venutis.avif"
                  alt="Venuti's Gourmet"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              <div className="min-w-0 pt-1">
                <h1 className="mt-2 text-4xl font-reklame leading-none text-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] sm:text-5xl">
                  Venutis Gourmet
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Vaciar selección"
                className="text-white hover:bg-white/10"
                onClick={() => setCarrito({})}
              >
                <Trash2 />
              </Button>
              {/* <Button
                size="icon"
                variant="ghost"
                aria-label="Actualizar tasa"
                className="text-white hover:bg-white/10"
                onClick={() => {
                  setTasaManual(null);
                  void refetch();
                }}
              >
                <RefreshCw className={tasa === 0 ? "animate-spin" : ""} />
              </Button> */}
              {/* <Button
                size="icon"
                variant="ghost"
                aria-label="Ajustes"
                className="text-white hover:bg-white/10"
                onClick={() => setAbrirAjustes(true)}
              >
                <Settings />
              </Button> */}
            </div>
          </div>

          <div className="relative z-10 mt-5 space-y-2 pl-[4.5rem] sm:pl-[5rem]">
            <p className="max-w-[22rem] font-century-gothic text-[0.95rem] uppercase tracking-[0.22em] text-gold/95">
              Arte en tu mesa
            </p>
          </div>

          <div className="relative z-10 mt-4 rounded-[1.75rem] border border-white/10 bg-white/8 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setMonedaTasa((m) => (m === "usd" ? "eur" : "usd"));
                  setTasaManual(null);
                }}
                className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-black"
              >
                Tasa Bs{" "}
                {tasaActiva.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </button>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                Venta rápida
              </p>
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" />
              <InputField
                inputMode="search"
                value={busqueda}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setBusqueda(e.target.value)
                }
                placeholder="Buscar producto o categoría..."
                className="h-12 rounded-2xl border-0 bg-white pl-9 text-base text-foreground"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {filtrados.map((p) => {
            const cant = carrito[p.id] ?? 0;
            const imageUrl = p.imagenes?.[0]?.url ?? "/placeholder-image.jpg";

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => agregar(p.id)}
                className="group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card p-3 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5" />

                {cant > 0 && (
                  <span className="absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground shadow-sm">
                    {cant}
                  </span>
                )}

                <div className="relative z-10 flex flex-1 flex-col gap-3">
                  <div className="overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={imageUrl}
                      alt={p.nombre}
                      width={600}
                      height={600}
                      className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-brand">
                      {p.categoria}
                    </p>
                    <span className="mt-1 block text-sm font-semibold leading-snug text-foreground">
                      {p.nombre}
                    </span>
                  </div>
                </div>

                <div className="relative z-10 mt-3 flex items-baseline gap-1 justify-around font-century-gothic">
                  {/* Precio en USD */}
                  <span className="font-century-gothic text-lg font-semibold tabular text-foreground">
                    {fmtUsd(p.precioUsd)}
                  </span>

                  {/* Precio en Bs */}
                  <span className="text-xs tabular text-muted-foreground">
                    {fmtBs(p.precioUsd * tasaActiva)} Bs
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {items > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3 pb-3 ">
          <button
            type="button"
            onClick={() => setAbrirCobro(true)}
            className="bg-gold flex min-h-[76px] w-full items-center justify-between rounded-[28px] px-5 py-3 text-success-foreground shadow-[0_10px_25px_rgba(22,163,74,0.28)] transition-transform duration-150 active:scale-[0.98]"
          >
            <span className="text-sm font-semibold tracking-tight">
              {items} {items === 1 ? "pieza" : "piezas"} · Cobrar
            </span>

            <span className="ml-4 shrink-0 text-right">
              <span className="block font-century-gothic text-xl font-bold leading-none tabular-nums">
                {fmtUsd(totalUsd)}
              </span>

              <span className="mt-1 block text-xs font-medium leading-none tabular-nums text-success-foreground/80">
                {fmtBs(totalUsd * tasaActiva)}
              </span>
            </span>
          </button>
        </div>
      )}

      <Sheet open={abrirCobro} onOpenChange={setAbrirCobro}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-md rounded-t-3xl p-0"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="font-good-brush text-2xl">
              Resúmen del pedido
            </SheetTitle>
          </SheetHeader>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto px-4 py-3">
            {lineas.map((l) => (
              <div key={l.producto.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {l.producto.nombre}
                  </p>
                  <p className="text-xs tabular text-muted-foreground">
                    {fmtUsd(l.producto.precioUsd * l.cantidad)} ·{" "}
                    {fmtRef(l.producto.precioUsd * l.cantidad * tasaActiva)} ·{" "}
                    {fmtBs(l.producto.precioUsd * l.cantidad * tasaActiva)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() => quitar(l.producto.id)}
                  >
                    -
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold tabular">
                    {l.cantidad}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() => agregar(l.producto.id)}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t bg-muted/40 px-4 py-4">
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted-foreground">
                Total a pagar
              </span>
              <span className="text-right ">
                <span className="block font-century-gothic text-2xl font-bold tabular">
                  {fmtUsd(totalUsd)}
                </span>
                <span className="block text-sm tabular text-muted-foreground">
                  {fmtBs(totalUsd * tasaActiva)}
                </span>
              </span>
            </div>

            <Button
              className="whatsapp-gradient w-full py-4 font-semibold  hover:opacity-95"
              onClick={enviarWhatsapp}
            >
              Enviar Orden por WhatsApp
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCarrito({});
                  setAbrirCobro(false);
                }}
              >
                Vaciar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAbrirCobro(false)}
              >
                Seguir
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={abrirAjustes} onOpenChange={setAbrirAjustes}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader className="px-0">
            <SheetTitle className="font-display">Ajustes de marca</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="negocio">Nombre del negocio</Label>
              <InputField
                id="negocio"
                value={negocio}
                className="h-12 text-base"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setNegocio(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tasa">Tasa de referencia (Bs por 1 $)</Label>
              <InputField
                id="tasa"
                inputMode="decimal"
                value={(tasaManual ?? tasa) ? String(tasaManual ?? tasa) : ""}
                className="h-12 text-base tabular"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const n = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(n) && n > 0) {
                    setTasaManual(n);
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setNegocio("Venuti's Gourmet");
              }}
            >
              Restaurar marca base
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
