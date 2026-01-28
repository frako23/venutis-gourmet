"use client";

import React, { useEffect, useState } from "react";
import {
  UserCircle,
  Minus,
  Plus,
  Truck,
  Store,
  CreditCard,
  Smartphone,
  Banknote,
  ArrowRight,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import Header from "@/components/productos/header";
import { useAppStore } from "@/store/appStore";
import { useDolar } from "@/hooks/useDolar";
import { AddressManager } from "@/components/finalizar-compra/address-manager";
import { PAYMENT_DETAILS } from "@/lib/constants/constants";
import { CopyButton } from "@/components/productos/copy-to-clipboard";
import Loading from "../loading";
import Image from "next/image";

export default function CheckoutPage() {
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("zelle");
  const selectedProducts = useAppStore((s) => s.selectedProducts);
  const { tasa } = useDolar();
  const [mounted, setMounted] = useState(false);
  const totalUSD = useAppStore((s) => s.getTotalUSD());

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
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
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
                <h2 className="font-serif text-4xl font-bold">Tu Selección</h2>
                <p className="text-sm opacity-60 uppercase tracking-widest">
                  {selectedProducts.length} Artículos en tu curaduría
                </p>
              </div>

              <div className="space-y-4">
                {selectedProducts.map((product: any) => (
                  <CartItem
                    name={product.title}
                    desc={product.description}
                    price={product.price}
                    img={product.image}
                    quantity={product.quantity}
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
                      <p className="text-[10px] opacity-40 italic">
                        {(totalUSD * tasa).toLocaleString("es-VE")} Bs.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="opacity-60">Envío</span>
                  <span className="text-accent-gold text-xs uppercase tracking-tighter">
                    Calculado en el siguiente paso
                  </span>
                </div>

                {/* Total Sección Destacada */}
                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-serif text-xl">Total</span>
                    <div className="text-right">
                      <span className="font-serif text-4xl font-bold text-white tracking-tighter">
                        ${totalUSD.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Equivalente en Bs (Visible y con Estilo) */}
                  {tasa > 0 && (
                    <div className="flex justify-between items-center mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-[10px] uppercase tracking-widest opacity-60">
                        Tasa BCV: {tasa.toFixed(2)}
                      </span>
                      <span className="text-lg font-bold text-accent-gold italic">
                        Bs.{" "}
                        {(totalUSD * tasa).toLocaleString("es-VE", {
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
            <div className="lg:col-span-7">
              <form className="bg-surface-dark rounded-2xl p-8 border border-white/5 shadow-2xl space-y-10">
                {/* Progress Stepper */}
                <div className="flex justify-between items-center px-4 relative">
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -z-0"></div>
                  <Step number={1} label="Detalles" active />
                  <Step number={2} label="Pago" />
                  <Step number={3} label="Confirmar" />
                </div>

                {/* Section: Personal Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <UserCircle className="text-accent-gold" size={24} />
                    <h3 className="text-lg font-bold tracking-tight">
                      Información Personal
                    </h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Nombre" placeholder="Gianluca" />
                    <InputField label="Apellido" placeholder="Venuti" />
                    <InputField
                      label="Teléfono"
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                    />
                    <InputField
                      label="Email"
                      placeholder="g.venuti@excellence.com"
                      type="email"
                    />
                  </div>
                </div>

                {/* Section: Delivery Type */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Truck className="text-accent-gold" size={24} />
                    <h3 className="text-lg font-bold tracking-tight">
                      Método de Entrega
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-1 bg-input-dark rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("delivery")}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${deliveryMethod === "delivery" ? "bg-gold text-primary shadow-lg" : "opacity-60 hover:bg-white/5"}`}
                    >
                      <Truck size={16} /> Domicilio
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("pickup")}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${deliveryMethod === "pickup" ? "bg-gold text-primary shadow-lg" : "opacity-60 hover:bg-white/5"}`}
                    >
                      <Store size={16} /> Retiro en Tienda
                    </button>
                  </div>
                  <AddressManager />
                </div>

                {/* Section: Payment Methods */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-accent-gold" size={24} />
                    <h3 className="text-lg font-bold tracking-tight">
                      Método de Pago
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <PaymentOption
                      id="pago-movil"
                      label="Pago Móvil"
                      icon={Smartphone}
                      selected={paymentMethod === "pago-movil"}
                      onClick={() => setPaymentMethod("pago-movil")}
                    />
                    <PaymentOption
                      id="zelle"
                      label="Zelle"
                      icon={Smartphone}
                      selected={paymentMethod === "zelle"}
                      onClick={() => setPaymentMethod("zelle")}
                    />
                    <PaymentOption
                      id="transfer"
                      label="Transferencia"
                      icon={Landmark}
                      selected={paymentMethod === "transfer"}
                      onClick={() => setPaymentMethod("transfer")}
                    />
                    <PaymentOption
                      id="cash"
                      label="Efectivo"
                      icon={Banknote}
                      selected={paymentMethod === "cash"}
                      onClick={() => setPaymentMethod("cash")}
                    />
                  </div>

                  {/* Detalles del Pago Dinámicos */}
                  <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-500">
                    {paymentMethod ? (
                      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-xs uppercase tracking-[2px] font-bold text-accent-gold">
                            Instrucciones de Pago
                          </h4>
                          <span className="text-[10px] bg-white/10 px-2 py-1 rounded-md opacity-60">
                            Moneda: {PAYMENT_DETAILS[paymentMethod].currency}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {/* Renderizado condicional según el método */}
                          {paymentMethod === "pago-movil" && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="opacity-40 text-[10px] uppercase">
                                  Banco
                                </p>
                                <p className="font-medium">
                                  {PAYMENT_DETAILS["pago-movil"].bank}
                                </p>
                                <CopyButton
                                  text={`0412123456
1234567
0134
Bs ${(totalUSD * tasa).toLocaleString("es-VE")}`}
                                />
                              </div>
                              <div>
                                <p className="opacity-40 text-[10px] uppercase">
                                  Teléfono
                                </p>
                                <p className="font-medium">
                                  {PAYMENT_DETAILS["pago-movil"].phone}
                                </p>
                              </div>
                              <div>
                                <p className="opacity-40 text-[10px] uppercase">
                                  Cédula/RIF
                                </p>
                                <p className="font-medium">
                                  {PAYMENT_DETAILS["pago-movil"].id}
                                </p>
                              </div>
                            </div>
                          )}

                          {paymentMethod === "zelle" && (
                            <div className="space-y-2 text-sm">
                              <div>
                                <p className="opacity-40 text-[10px] uppercase">
                                  Correo Zelle
                                </p>
                                <p className="text-lg font-serif italic text-white">
                                  {PAYMENT_DETAILS["zelle"].email}
                                </p>
                                <CopyButton
                                  text={`${PAYMENT_DETAILS["zelle"].email}
Monto: $ ${totalUSD.toFixed(2)} `}
                                />
                              </div>
                              <div>
                                <p className="opacity-40 text-[10px] uppercase">
                                  A nombre de
                                </p>
                                <p className="font-medium">
                                  {PAYMENT_DETAILS["zelle"].name}
                                </p>
                              </div>
                            </div>
                          )}

                          {paymentMethod === "transfer" && (
                            <div className="grid grid-cols-1 gap-3 text-sm">
                              <div>
                                <p className="opacity-40 text-[10px] uppercase">
                                  Cuenta Corriente
                                </p>
                                <p className="font-mono text-xs tracking-wider">
                                  {PAYMENT_DETAILS["transfer"].account}
                                </p>
                                <CopyButton
                                  text={PAYMENT_DETAILS["transfer"].account}
                                />
                              </div>
                              <div className="flex justify-between">
                                <div>
                                  <p className="opacity-40 text-[10px] uppercase">
                                    Banco
                                  </p>
                                  <p className="font-medium">
                                    {PAYMENT_DETAILS["transfer"].bank}
                                  </p>
                                </div>
                                <div>
                                  <p className="opacity-40 text-[10px] uppercase">
                                    RIF
                                  </p>
                                  <p className="font-medium">
                                    {PAYMENT_DETAILS["transfer"].id}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {paymentMethod === "cash" && (
                            <div className="flex items-center gap-3 p-3 bg-accent-gold/5 border border-accent-gold/20 rounded-lg">
                              <div className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
                              <p className="text-xs italic opacity-80">
                                {PAYMENT_DETAILS["cash"].instructions}
                              </p>
                            </div>
                          )}

                          {/* Nota común para todos los métodos excepto efectivo */}
                          {paymentMethod !== "cash" && (
                            <p className="mt-4 text-[11px] leading-relaxed opacity-50 border-t border-white/5 pt-4 italic">
                              {PAYMENT_DETAILS[paymentMethod].instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 border-2 border-dashed border-white/5 rounded-2xl text-center opacity-30">
                        <p className="text-xs uppercase tracking-widest font-medium italic">
                          Selecciona un método para ver los detalles de pago
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    className="w-full py-5 rounded-xl bg-gold hover:bg-gold/90 text-primary font-bold text-lg shadow-[0_10px_30px_rgba(128,0,32,0.3)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                    type="submit"
                  >
                    Realizar Pedido
                    <ArrowRight size={20} />
                  </button>
                  <p className="text-center text-[10px] opacity-40 mt-4 uppercase tracking-[0.2em]">
                    Pago encriptado y seguro garantizado
                  </p>
                </div>
              </form>
            </div>
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
              <a className="hover:text-accent-gold" href="#">
                Envíos
              </a>
              <a className="hover:text-accent-gold" href="#">
                Privacidad
              </a>
              <a className="hover:text-accent-gold" href="#">
                Contacto
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// --- Sub-componentes ---

function CartItem({ name, desc, price, img, quantity, id }: any) {
  const updateQuantity = useAppStore((s) => s.updateQuantity);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-dark border border-white/5 group hover:border-accent-gold/30 transition-all duration-300">
      <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-lg bg-input-dark">
        <Image
          alt={name}
          src={img}
          width={600}
          height={600}
          className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-white group-hover:text-accent-gold transition-colors">
              {name}
            </h3>
            <p className="text-xs text-accent-gold/70 mt-1 uppercase tracking-tighter">
              {desc}
            </p>
          </div>
          <span className="font-serif text-lg">${price.toFixed(2)}</span>
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
            <span className="text-sm px-1 font-medium">{quantity}</span>
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

function InputField({ label, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-widest opacity-50 px-1">
        {label}
      </label>
      <input
        className="w-full bg-input-dark border border-white/10 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-white py-3 px-4 outline-none transition-all"
        placeholder={placeholder}
        type={type}
      />
    </div>
  );
}

function Step({ number, label, active = false }: any) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-surface-dark ${active ? "bg-primary text-white" : "bg-input-dark border border-white/10 opacity-60"}`}
      >
        {number}
      </div>
      <span
        className={`text-[10px] uppercase font-bold tracking-tighter ${!active && "opacity-40"}`}
      >
        {label}
      </span>
    </div>
  );
}

function PaymentOption({ label, icon: Icon, selected, onClick }: any) {
  return (
    <label className="cursor-pointer group block" onClick={onClick}>
      <div
        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selected ? "border-accent-gold bg-accent-gold/5" : "border-white/10 bg-input-dark"}`}
      >
        <Icon
          className={selected ? "text-accent-gold" : "text-white/40"}
          size={24}
        />
        <span className="text-xs font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
    </label>
  );
}
