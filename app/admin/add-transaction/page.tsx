"use client";

import { Header } from "@/components/admin/UI/header";
import { Input } from "@/components/admin/UI/input";
import { Label } from "@/components/admin/UI/label";
import { CheckoutForm } from "@/components/finalizar-compra/checkout-form";
import { addProduct } from "@/lib/actions/products";
import { CheckCircle2, Clock, Hash, Phone } from "lucide-react";
import { useActionState, useState } from "react";

const initialState = { message: "", status: "" };

export default function CreateTransactionForm() {
  const [status, setStatus] = useState<"paid" | "pending">("pending");
  const [state, formAction, isPending] = useActionState(
    addProduct,
    initialState,
  );
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-white transition-colors duration-300">
      <main className="max-w-[1100px] mx-auto px-6 py-8">
        {/* Header con Breadcrumbs */}
        <Header headerText="Registrar nueva venta" />
        <CheckoutForm metodoDePago={false} />
        {/* Cuerpo del Formulario */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Número de Orden */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Hash size={12} className="text-gold" />
                Número de Orden
              </Label>
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="Ej: VG-9901"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-gold focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Teléfono del Cliente */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Phone size={12} className="text-gold" />
                Teléfono del Cliente
              </Label>
              <Input
                type="tel"
                placeholder="+1 234 567 890"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-gold focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Selector de Estado */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block">
              Estado de la Transacción
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Opción: Pendiente */}
              <button
                type="button"
                onClick={() => setStatus("pending")}
                className={`flex items-center justify-center gap-3 p-5 rounded-2xl cursor-pointer border-2 transition-all ${
                  status === "pending"
                    ? "bg-amber-50 border-amber-500 text-amber-700 shadow-md shadow-amber-200"
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                }`}
              >
                <Clock
                  size={20}
                  className={status === "pending" ? "animate-pulse" : ""}
                />
                <span className="font-black text-sm uppercase tracking-tighter">
                  Pendiente
                </span>
              </button>

              {/* Opción: Pagado */}
              <button
                type="button"
                onClick={() => setStatus("paid")}
                className={`flex items-center justify-center gap-3 p-5 rounded-2xl cursor-pointer border-2 transition-all ${
                  status === "paid"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md shadow-emerald-200"
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                }`}
              >
                <CheckCircle2 size={20} />
                <span className="font-black text-sm uppercase tracking-tighter">
                  Pagado
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
