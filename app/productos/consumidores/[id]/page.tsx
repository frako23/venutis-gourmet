import AddToCartBlock from "@/components/producto/addToCart";
import { ImageGalery } from "@/components/producto/imageGalery";
import { ReviewButton } from "@/components/producto/reviewButton";
import { SinglePagePricetag } from "@/components/producto/singlePagePricetag";
import {
  getProductPrice,
  getPurchaseContextLabel,
  isWholesaleOffer,
  normalizePurchaseContext,
} from "@/lib/catalog-context";
import { prisma } from "@/lib/prisma";
import { BadgeCheck, MessageSquare, Star, ThumbsUp } from "lucide-react";
import { notFound } from "next/navigation";

export interface Props {
  params: Promise<{ id: number }>;
  searchParams: Promise<{ contexto?: string }>;
}

export default async function ProductDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const { contexto: contextoParam } = await searchParams;
  const contexto = normalizePurchaseContext(contextoParam);
  // Convertimos el string a número entero
  const productId = Number(id);

  // Verificamos si es un número válido para evitar errores si alguien escribe letras en la URL
  if (isNaN(productId)) {
    notFound();
  }

  const producto = await prisma.producto.findUnique({
    where: {
      id: productId,
    },
    // DEBES AÑADIR ESTO:
    include: {
      imagenes: true,
    },
  });

  if (!producto) {
    notFound();
  }

  return (
    <div className="bg-background-dark text-slate-100 min-h-screen font-century-gothic">
      {/* Top Navigation Bar */}

      <main className="max-w-[1280px] mx-auto px-6 py-8">
        {/* Breadcrumbs */}
        {/* <nav className="flex items-center gap-2 mb-8 text-sm text-slate-500 font-medium">
          <a className="hover:text-primary" href="#">
            Home
          </a>
          <ChevronRight size={14} />
          <a className="hover:text-primary" href="#">
            Vinegars
          </a>
          <ChevronRight size={14} />
          <span className="text-white">Gold Reserve Balsamic</span>
        </nav> */}

        {/* Product Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
          {/* Left: Image Gallery */}
          <ImageGalery images={producto.imagenes} />

          {/* Right: Product Info */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="sticky top-24">
              <h1 className="text-4xl lg:text-5xl text-white leading-tight mb-4 font-good-brush">
                {producto.nombre}
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex gap-0.5 text-accent">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <span className="text-slate-400 text-sm font-medium">
                  4.9 (128 Reviews)
                </span>
                <span className="h-4 w-[1px] bg-border-dark"></span>
                {/* <span className="text-primary text-sm font-semibold uppercase tracking-tighter">
                  In Stock
                </span> */}
              </div>

              <div className="mb-6 flex flex-wrap items-center gap-3">
                <SinglePagePricetag
                  precio={getProductPrice(producto, contexto)}
                />
                {isWholesaleOffer(producto) && (
                  <span className="rounded-full border border-gold/40 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold">
                    {contexto === "mayorista"
                      ? getPurchaseContextLabel(contexto)
                      : "Disponible para mayoristas"}
                  </span>
                )}
              </div>

              {producto.inventario === 0 && (
                <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Producto agotado
                </p>
              )}

              <div
                className="text-slate-200 text-xl leading-relaxed mb-4 space-y-2 
             [&>p]:min-h-[1rem] 
             [&>strong]:text-gold [&>strong]:font-bold"
                dangerouslySetInnerHTML={{ __html: producto.descripcion || "" }}
              />

              {/* Add to Cart Block */}
              <AddToCartBlock producto={producto} contexto={contexto} />
            </div>
          </div>
        </section>

        {/* Customer Reviews Section */}
        {false && (
          <section className="py-24 border-t border-border-dark">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
              <div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">
                  Reseñas de nuestros clientes
                </h2>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-5xl font-black text-white">4.9</p>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      Average
                    </p>
                  </div>
                  <div className="h-12 w-[1px] bg-border-dark"></div>
                  <div className="flex-1 min-w-[240px] space-y-2">
                    <RatingProgress bar="5" percent={92} />
                    <RatingProgress bar="4" percent={6} />
                    <RatingProgress bar="3" percent={2} />
                  </div>
                </div>
              </div>
              <ReviewButton />
            </div>

            {/* Bento Reviews Grid */}
            <div className="">
              {/* Highlighted Review */}
              <div className="lg:col-span-2 p-8 rounded-2xl bg-surface-dark border border-border-dark flex flex-col justify-between hover:border-primary/40 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        MD
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">
                          Marco Donatelli
                        </p>
                        <div className="flex items-center gap-2">
                          <BadgeCheck size={12} className="text-primary" />
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">
                            Verified Gourmet Member
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      3 days ago
                    </span>
                  </div>
                  <div className="flex gap-0.5 mb-4 text-accent">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    "Liquid Gold. The complexity is unmatched."
                  </h3>
                  <p className="text-slate-400 leading-relaxed mb-6">
                    I've tried many traditional balsamics, but the Venuti Gold
                    Reserve is in a class of its own. I used it on a 36-month
                    aged Parmigiano Reggiano and it was a spiritual experience.
                  </p>
                </div>
                <div className="flex items-center gap-4 border-t border-border-dark pt-6">
                  <ReviewAction icon={ThumbsUp} label="Helpful (24)" />
                  <ReviewAction icon={MessageSquare} label="Reply" />
                </div>
              </div>

              {/* Photo Review */}
              {/* <div className="p-6 rounded-2xl bg-surface-dark/40 border border-border-dark flex flex-col hover:border-primary/40 transition-colors">
              <div className="aspect-video w-full rounded-lg overflow-hidden mb-4">
                <Image
                  width={600}
                  height={338}
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgm3JONSj6Fo4l7V6mHRSeJ9lkCWvInF-Zm_dHJ6-1tnw-s8vJJRThz6TiQoCkeNMFQDWEQ6LVBwykhf-61R8WvwGx-u7tIG40C0-PgF2g2qIvlVkbYLmMcT9wi8aMWxcob_hXq9EErA6hGTRV_8Cs5zOePHIyUa_Qn-dqCWjsmgYp0sOC-6Q0o8euuRGeh-DmAd-eLm9k-HoZW1CRzQrqkxv-u_8UcjnhN6te3gbhiCK4L26bqsFqHqelV4dMKCWG84o-l5fqwCg"
                  alt="Review photo"
                />
              </div>
              <p className="text-white text-sm font-bold mb-1">Eliza Beth</p>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                Photo Review
              </span>
              <p className="text-slate-400 text-sm leading-relaxed">
                Look at that shine! Perfection on seasonal fruit.
              </p>
            </div> */}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// --- Helper Components ---

function RatingProgress({ bar, percent }: { bar: string; percent: number }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
      <span className="w-2">{bar}</span>
      <div className="flex-1 h-1.5 bg-background-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-1000"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <span className="w-8 text-right">{percent}%</span>
    </div>
  );
}

function ReviewAction({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
      <Icon size={14} />
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
}
