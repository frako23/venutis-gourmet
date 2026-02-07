"use client";

import { CheckoutForm } from "@/components/finalizar-compra/checkout-form";
import Header from "@/components/productos/header";
import { useDolar } from "@/hooks/useDolar";
import { useAppStore } from "@/store/appStore";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import Loading from "../loading";

export default function CheckoutPage() {
  const selectedProducts = useAppStore((s) => s.selectedProducts);
  const deliveryPrice = useAppStore((s) => s.deliveryPrice);
  const { tasa } = useDolar();
  const [mounted, setMounted] = useState(false);
  const totalUSD = useAppStore((s) => s.totalUSD);
  useEffect(() => {
    // Simulamos un pequeño delay opcional para que la transición no sea un "parpadeo"
    // o simplemente marcamos como montado inmediatamente.
    setMounted(true);
  }, []);

  // Hasta que el cliente no esté listo, mostramos tu componente de carga
  if (!mounted) {
    return <Loading />;
  }
  return (
    <div className="bg-background-dark font-century-gothic text-slate-100 min-h-screen">
      <div className="layout-container flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-10 py-8">
          {/* Breadcrumbs */}
          {/* <nav className="flex items-center gap-2 mb-8 text-sm font-medium opacity-60">
            <a className="hover:text-primary transition-colors" href="#">
              Inicio
            </a>
            <ChevronRight size={14} />
            <a className="hover:text-primary transition-colors" href="#">
              Carrito
            </a>
            <ChevronRight size={14} />
            <span className="text-accent-gold font-bold">Pago Seguro</span>
          </nav> */}

          <div className="grid lg:grid-cols-12 gap-12">
            {/* Left Column: Order Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-bold">Tu Selección</h2>
                <p className="text-sm opacity-60 uppercase tracking-widest">
                  {selectedProducts.length} Artículos en tu curaduría
                </p>
              </div>

              <div className="space-y-4">
                {selectedProducts.map((product: any) => (
                  <CartItem
                    nombre={product.nombre}
                    desc={product.descripcion}
                    precio={product.precio}
                    imgUrl={product.imgUrl}
                    cantidad={product.cantidad}
                    id={product.id}
                    key={product.id}
                  />
                ))}
              </div>

              {/* Summary Totals */}
              <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Subtotal</span>
                  <div className="text-right">
                    <p className="font-medium">${totalUSD.toFixed(2)}</p>
                    {tasa > 0 && (
                      <p className="text-[10px] opacity-40">
                        {(totalUSD * tasa).toLocaleString("es-VE")} Bs.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Envío</span>
                  <div className="text-right">
                    <p className="font-medium">
                      {deliveryPrice !== 0 && deliveryPrice !== undefined
                        ? `$${deliveryPrice.toFixed(2)}`
                        : "$ 0.00"}
                    </p>
                    {tasa > 0 && deliveryPrice !== 0 && (
                      <p className="text-[10px] opacity-40">
                        Bs.{" "}
                        {deliveryPrice !== 0 && deliveryPrice !== undefined
                          ? (deliveryPrice * tasa).toLocaleString("es-VE")
                          : "0.00"}{" "}
                      </p>
                    )}
                  </div>
                </div>

                {/* Total Sección Destacada */}
                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-baseline">
                    <span className=" text-xl">Total</span>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-white tracking-tighter">
                        $
                        {deliveryPrice !== 0 && deliveryPrice !== undefined
                          ? (totalUSD + deliveryPrice).toFixed(2)
                          : totalUSD.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Equivalente en Bs (Visible y con Estilo) */}
                  {tasa > 0 && (
                    <div className="flex justify-between items-center mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-[10px] uppercase tracking-widest opacity-60">
                        Tasa BCV: {tasa.toFixed(2)}
                      </span>
                      <span className="text-lg font-bold text-accent-gold ">
                        Bs.{" "}
                        {deliveryPrice > 0
                          ? ((totalUSD + deliveryPrice) * tasa).toLocaleString(
                              "es-VE",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )
                          : (totalUSD * tasa).toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] uppercase tracking-widest text-center opacity-40 mt-6">
                  Los precios incluyen impuestos gourmet aplicables
                </p>
              </div>
            </div>

            {/* Right Column: Checkout Form */}
            <CheckoutForm metodoDePago={true} />
          </div>
        </main>

        <footer className="border-t border-white/5 py-10 px-6 md:px-20 text-center md:text-left">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
              <ShieldCheck size={18} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Garantía de Calidad Venuti
              </span>
            </div>
            <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest opacity-40">
              <a
                className="hover:text-gold"
                href="https://www.instagram.com/venutis.gourmet"
              >
                Instagram
              </a>
              <a
                className="hover:text-gold"
                href="mailto:info@venutisgourmet.com"
              >
                Correo
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// --- Sub-componentes ---

function CartItem({ nombre, desc, precio, imgUrl, cantidad, id }: any) {
  const updateQuantity = useAppStore((s) => s.updateQuantity);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-dark border border-white/5 group hover:border-accent-gold/30 transition-all duration-300">
      <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-lg bg-input-dark">
        <Image
          alt={nombre || "Producto Venuti's Gourmet"}
          src={imgUrl}
          width={600}
          height={600}
          className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-white group-hover:text-accent-gold transition-colors">
              {nombre}
            </h3>
            <p className="text-xs text-accent-gold/70 mt-1 uppercase tracking-tighter">
              {desc}
            </p>
          </div>
          <span className="font-serif text-lg">${precio.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-2 border border-white/10 rounded-full px-3 py-1">
            <button
              type="button"
              className="opacity-50 hover:opacity-100 cursor-pointer"
              onClick={() => updateQuantity(id, -1)}
            >
              <Minus size={14} />
            </button>
            <span className="text-sm px-1 font-medium">{cantidad}</span>
            <button
              type="button"
              className="opacity-50 hover:opacity-100 cursor-pointer"
              onClick={() => updateQuantity(id, 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
