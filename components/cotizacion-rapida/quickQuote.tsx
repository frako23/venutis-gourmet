"use client";

import { toast } from "sonner";
import { getCurrentQuoteCatalog } from "@/lib/actions/cotizacion-rapida";
import {
  addQuoteLine,
  applyQuoteQuantity,
  buildQuoteDraft,
  fmtBs,
  fmtUsd,
  isCurrentQuoteImage,
  removeQuoteLine,
  type QuoteDraft,
  type QuoteLine,
  type QuoteProduct,
} from "@/lib/cotizacion-rapida";
import {
  createQuoteImage,
  downloadQuoteImage,
  revokeQuoteImage,
  shareQuoteImage,
  type QuoteImageArtifact,
} from "@/lib/cotizacion-imagen";
import { InputField } from "@/components/global/input";
import { Button } from "@/components/venta-rapida/Button";
import { Label } from "@/components/venta-rapida/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/venta-rapida/sheet";
import { DELIVERY_ZONES } from "@/lib/constants/constants";
import { useDolar } from "@/hooks/useDolar";
import { Download, Image as ImageIcon, RefreshCw, Share2, Trash2 } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QuoteArtwork } from "./quoteArtwork";

type QuickQuoteProps = {
  products: QuoteProduct[];
  catalogError?: boolean;
};

const formatRate = (value: number) =>
  value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const currentProductForLine = (
  line: QuoteLine,
  currentProducts: Map<number, QuoteProduct>,
) => currentProducts.get(line.product.id);

export default function QuickQuote({ products, catalogError = false }: QuickQuoteProps) {
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [artifact, setArtifact] = useState<QuoteImageArtifact | null>(null);
  const artworkRef = useRef<HTMLDivElement>(null);
  const { tasa, isLoading: isRateLoading, refetch } = useDolar();

  const exchangeRate = typeof tasa === "number" ? tasa : 0;
  const selectedZone = useMemo(
    () => DELIVERY_ZONES.find((zone) => zone.name === deliveryZone) ?? null,
    [deliveryZone],
  );
  const draft = useMemo<QuoteDraft>(
    () =>
      buildQuoteDraft(lines, exchangeRate, {
        nombre: recipientName,
        telefono: recipientPhone,
      }, new Date(), selectedZone ? { zona: selectedZone.name, precioUsd: selectedZone.price } : null),
    [exchangeRate, lines, recipientName, recipientPhone, selectedZone],
  );

  const selectedQuantity = useMemo(
    () => lines.reduce((total, line) => total + line.cantidad, 0),
    [lines],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      `${product.nombre} ${product.categoria}`.toLowerCase().includes(query),
    );
  }, [products, search]);

  const currentArtifact = isCurrentQuoteImage(artifact, draft);

  useEffect(() => {
    return () => revokeQuoteImage(artifact);
  }, [artifact]);

  const showNotice = (message: string, kind: "info" | "success" | "error" = "info") => {
    toast[kind](message);
  };

  const addProduct = (product: QuoteProduct) => {
    const next = addQuoteLine(lines, product);
    const existing = lines.find((line) => line.product.id === product.id);
    if (next.length === lines.length && existing && existing.cantidad >= product.inventario) {
      showNotice(`No hay más unidades disponibles de ${product.nombre}.`, "error");
    }
    setLines(next);
  };

  const changeQuantity = (product: QuoteProduct, delta: number) => {
    setLines((current) => applyQuoteQuantity(current, product.id, delta, product));
  };

  const removeProduct = (productId: number) => {
    setLines((current) => removeQuoteLine(current, productId));
  };

  const clearQuote = () => {
    setLines([]);
    setDeliveryZone("");
    setArtifact(null);
  };

  const revalidateSelection = async () => {
    const result = await getCurrentQuoteCatalog(lines.map((line) => line.product));
    if (!result.changes.length) return false;

    const currentById = new Map(result.products.map((product) => [product.id, product]));
    const correctedLines = lines.reduce<QuoteLine[]>((next, line) => {
      const currentProduct = currentProductForLine(line, currentById);
      if (!currentProduct) return next;
      return addQuoteLine(next, currentProduct, line.cantidad);
    }, []);

    setLines(correctedLines);
    setArtifact(null);
    showNotice(
      "El catálogo cambió: se actualizó la selección. Revisa la cotización antes de generar la imagen.",
    );
    return true;
  };

  const generateImage = async () => {
    if (!lines.length) {
      showNotice("Agrega al menos un producto para generar la cotización.");
      setIsSummaryOpen(true);
      return;
    }
    if (!draft.totalBs || draft.exchangeRate <= 0) {
      showNotice("La tasa de referencia aún no está disponible. Actualízala e intenta de nuevo.", "error");
      return;
    }
    if (!artworkRef.current) {
      showNotice("No se pudo preparar el diseño de la cotización. Intenta de nuevo.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const catalogChanged = await revalidateSelection();
      if (catalogChanged) return;

      const nextArtifact = await createQuoteImage(artworkRef.current, draft);
      setArtifact(nextArtifact);
      setIsSummaryOpen(true);
      showNotice("Imagen generada. Puedes descargarla o compartirla por WhatsApp.", "success");
    } catch (error) {
      console.error("No se pudo generar la cotización", error);
      showNotice("No se pudo generar la imagen. Revisa tu conexión e intenta de nuevo.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!artifact || !currentArtifact) {
      showNotice("Genera una imagen nueva antes de descargarla.");
      return;
    }
    downloadQuoteImage(artifact);
    showNotice("La imagen se descargó. Puedes adjuntarla manualmente en WhatsApp.", "success");
  };

  const shareImage = async () => {
    if (!artifact || !currentArtifact) {
      showNotice("Genera una imagen nueva antes de compartirla.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await shareQuoteImage(artifact, draft);
      if (result === "native-share-started") {
        showNotice("Se abrió el menú nativo para compartir la imagen.", "success");
      } else if (result === "fallback-download-and-whatsapp") {
        showNotice("La imagen se descargó y WhatsApp se abrió con el texto listo. Adjunta el PNG manualmente.");
      } else if (result === "user-cancelled") {
        showNotice("Compartir cancelado. La imagen sigue disponible.");
      } else {
        showNotice("No se pudo abrir WhatsApp automáticamente. Descarga la imagen y adjúntala manualmente.", "error");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecipientSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    showNotice("Datos del destinatario guardados solo en esta cotización.", "success");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.08),_transparent_30%),linear-gradient(to_bottom,_#14110f,_var(--background-dark))] pb-36">
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

            <Button
              size="icon"
              variant="ghost"
              aria-label="Vaciar cotización"
              className="text-white hover:bg-white/10"
              onClick={clearQuote}
              disabled={!lines.length}
            >
              <Trash2 />
            </Button>
          </div>

          <div className="relative z-10 mt-6 flex items-start justify-between pl-[4.5rem] sm:pl-[5rem]">
            <p className="max-w-[16rem] font-century-gothic text-[0.95rem] uppercase tracking-[0.18em] text-gold/95">
              Cotización rápida
            </p>
            <div className="shrink-0">
              <div className="rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-black">
                {isRateLoading
                  ? "Tasa..."
                  : exchangeRate > 0
                    ? `Bs ${formatRate(exchangeRate)}`
                    : "Tasa no disponible"}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-4 flex gap-2 rounded-2xl bg-white/5 p-2 backdrop-blur">
            <InputField
              label="Buscar producto o categoría"
              inputMode="search"
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Buscar..."
              className="h-11 w-full rounded-xl border border-white/10 bg-white/40 pl-3 text-sm text-foreground placeholder:text-white/50 outline-none transition focus:border-white/20 focus:bg-white/60"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Actualizar tasa"
              className="mt-5 shrink-0 text-white hover:bg-white/10"
              onClick={() => void refetch()}
            >
              <RefreshCw className={isRateLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>
      </header>

      <section className="px-4 pt-4" aria-label="Productos disponibles">
        {catalogError ? (
          <div className="rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-card">
            <p className="font-semibold text-foreground">No se pudo cargar el catálogo.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Revisa la conexión de datos y vuelve a intentar más tarde.
            </p>
          </div>
        ) : !products.length ? (
          <div className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-card">
            <p className="font-semibold text-foreground">No hay productos disponibles.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Revisa el inventario antes de preparar una cotización.
            </p>
          </div>
        ) : !filteredProducts.length ? (
          <div className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-card">
            <p className="font-semibold text-foreground">No encontramos productos.</p>
            <p className="mt-2 text-sm text-muted-foreground">Prueba con otro nombre o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const line = lines.find((item) => item.product.id === product.id);
              const quantity = line?.cantidad ?? 0;
              const imageUrl = product.imagenUrl ?? "/placeholder-image.jpg";

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  className="group relative flex min-h-44 flex-col justify-between overflow-visible rounded-3xl border border-border/70 bg-card p-3 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                  aria-label={`Agregar ${product.nombre}`}
                >
                  {quantity > 0 && (
                    <span className="absolute right-2 top-2 z-30 grid size-7 place-items-center rounded-full border border-white/20 bg-gold text-xs font-bold text-primary shadow-lg">
                      {quantity}
                    </span>
                  )}
                  <div className="relative z-10 flex flex-1 flex-col gap-3">
                    <div className="overflow-hidden rounded-2xl bg-muted">
                      <Image
                        src={imageUrl}
                        alt={product.nombre}
                        width={600}
                        height={600}
                        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-brand">
                        {product.categoria}
                      </p>
                      <span className="mt-1 block text-sm font-semibold leading-snug text-foreground">
                        {product.nombre}
                      </span>
                    </div>
                  </div>
                  <div className="relative z-10 mt-3 flex items-baseline justify-around gap-1 font-century-gothic">
                    <span className="text-lg font-semibold tabular text-foreground">
                      {fmtUsd(product.precioUsd)}
                    </span>
                    <span className="text-xs tabular text-muted-foreground">
                      {exchangeRate > 0 ? fmtBs(product.precioUsd * exchangeRate) : "Bs —"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>


      {selectedQuantity > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3 pb-3">
          <button
            type="button"
            onClick={() => setIsSummaryOpen(true)}
            className="flex min-h-[76px] w-full items-center justify-between rounded-[28px] bg-gold px-5 py-3 text-success-foreground shadow-[0_10px_25px_rgba(22,163,74,0.28)] transition-transform duration-150 active:scale-[0.98]"
          >
            <span className="text-left text-sm font-semibold tracking-tight">
              {selectedQuantity} {selectedQuantity === 1 ? "pieza" : "piezas"} · Revisar cotización
            </span>
            <span className="ml-4 shrink-0 text-right">
              <span className="block font-century-gothic text-xl font-bold leading-none tabular-nums">
                {fmtUsd(draft.totalUsd)}
              </span>
              <span className="mt-1 block text-xs font-medium leading-none tabular-nums text-success-foreground/80">
                {draft.totalBs === null ? "Bs no disponible" : fmtBs(draft.totalBs)}
              </span>
            </span>
          </button>
        </div>
      )}

      <Sheet open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[92vh] max-w-md overflow-y-auto rounded-t-3xl p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="font-good-brush text-2xl">Revisión de cotización</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 px-4 py-3">
            {!lines.length ? (
              <p className="rounded-2xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">
                La cotización está vacía. Agrega productos para continuar.
              </p>
            ) : (
              lines.map((line) => (
                <div key={line.product.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.product.nombre}</p>
                    <p className="text-xs tabular text-muted-foreground">
                      {line.cantidad} x {fmtUsd(line.product.precioUsd)} = {fmtUsd(line.subtotalUsd)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Reducir ${line.product.nombre}`}
                      onClick={() => changeQuantity(line.product, -1)}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold tabular">{line.cantidad}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Aumentar ${line.product.nombre}`}
                      onClick={() => changeQuantity(line.product, 1)}
                    >
                      +
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Eliminar ${line.product.nombre}`}
                      onClick={() => removeProduct(line.product.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            <div className="space-y-1.5 rounded-2xl bg-muted/40 p-3">
              <Label htmlFor="quote-delivery-zone">Delivery (opcional)</Label>
              <select
                id="quote-delivery-zone"
                value={deliveryZone}
                onChange={(event) => setDeliveryZone(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="" className="bg-white text-black">
                  Sin delivery
                </option>
                {[...new Set(DELIVERY_ZONES.map((zone) => zone.price))]
                  .sort((a, b) => a - b)
                  .map((price) => (
                    <optgroup
                      key={price}
                      label={`Zona delivery $${price}`}
                      className="bg-white font-semibold text-black"
                    >
                      {DELIVERY_ZONES.filter((zone) => zone.price === price).map((zone) => (
                        <option key={zone.name} value={zone.name} className="bg-white font-normal text-black">
                          {zone.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </div>

            <div className="space-y-1 border-t pt-3">
              {draft.delivery && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground tabular">
                    <span>Subtotal</span>
                    <span>{fmtUsd(draft.subtotalUsd)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground tabular">
                    <span>Delivery ({draft.delivery.zona})</span>
                    <span>{fmtUsd(draft.deliveryUsd)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted-foreground">Total estimado</span>
              <span className="text-right">
                <span className="block font-century-gothic text-2xl font-bold tabular">{fmtUsd(draft.totalUsd)}</span>
                <span className="block text-sm tabular text-muted-foreground">
                  {draft.totalBs === null ? "Tasa no disponible" : fmtBs(draft.totalBs)}
                </span>
              </span>
            </div>

            <form className="space-y-3 rounded-2xl bg-muted/40 p-3" onSubmit={handleRecipientSubmit}>
              <div>
                <p className="text-sm font-semibold text-foreground">Destinatario (opcional)</p>
                <p className="mt-1 text-xs text-muted-foreground">Estos datos se quedan solo en esta cotización.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quote-recipient-name">Nombre</Label>
                  <InputField
                    label=""
                    name="quote-recipient-name"
                    value={recipientName}
                    placeholder="Nombre del cliente"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setRecipientName(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote-recipient-phone">Teléfono</Label>
                  <InputField
                    label=""
                    name="quote-recipient-phone"
                    type="tel"
                    value={recipientPhone}
                    placeholder="0412..."
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setRecipientPhone(event.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" variant="outline" className="w-full">
                Guardar destinatario en la cotización
              </Button>
            </form>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="w-full bg-gold py-4 font-semibold text-black hover:opacity-95"
                onClick={() => void generateImage()}
                disabled={isGenerating || !lines.length || draft.exchangeRate <= 0}
              >
                <ImageIcon className="size-4" />
                {isGenerating ? "Preparando..." : artifact && currentArtifact ? "Regenerar imagen" : "Generar imagen"}
              </Button>
              <Button
                className="whatsapp-gradient w-full py-4 font-semibold hover:opacity-95"
                onClick={() => void shareImage()}
                disabled={isGenerating || !artifact || !currentArtifact}
              >
                <Share2 className="size-4" />
                Compartir por WhatsApp
              </Button>
            </div>

            {artifact && currentArtifact && (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
                <p className="text-sm font-semibold">Vista previa de la imagen</p>
                <div className="overflow-hidden rounded-xl bg-[#14110f]">
                  <Image
                    src={artifact.objectUrl}
                    alt="Vista previa de la cotización"
                    width={720}
                    height={920}
                    unoptimized
                    className="h-auto w-full"
                  />
                </div>
                <Button variant="outline" className="w-full" onClick={downloadImage}>
                  <Download className="size-4" />
                  Descargar imagen
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={clearQuote}
                disabled={!lines.length}
              >
                Vaciar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setIsSummaryOpen(false)}>
                Seguir agregando
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <QuoteArtwork ref={artworkRef} draft={draft} />
    </div>
  );
}
