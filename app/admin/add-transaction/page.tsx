"use client";

import React, { useState } from "react";
import {
  Receipt,
  Phone,
  Hash,
  CheckCircle2,
  Clock,
  Save,
  ChevronDown,
} from "lucide-react";

export default function CreateTransactionForm() {
  const [status, setStatus] = useState<"paid" | "pending">("pending");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-charcoal rounded-3xl border border-border-soft shadow-xl overflow-hidden">
        {/* Encabezado del Formulario */}
        <div className="bg-primary p-8 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Receipt className="text-gold" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                Nueva Venta Manual
              </h2>
              <p className="text-white/60 text-xs uppercase tracking-[0.2em] font-bold">
                Registro de Pedido Offline
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Número de Orden */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Hash size={12} className="text-gold" />
                Número de Orden
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Ej: VG-9901"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-gold focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Teléfono del Cliente */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <Phone size={12} className="text-gold" />
                Teléfono del Cliente
              </label>
              <input
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

          {/* Información Adicional Decorativa */}
          <div className="p-4 rounded-2xl bg-parchment border border-gold/20">
            <p className="text-[10px] text-primary/60 font-bold leading-relaxed italic text-center">
              "Al registrar esta venta, el stock se actualizará automáticamente
              y se generará una entrada en el reporte diario."
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-4 pt-4">
            <button className="flex-1 bg-white border-2 border-slate-200 py-4 cursor-pointer rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95">
              Cancelar
            </button>
            <button className="flex-[2] bg-gold text-white py-4 cursor-pointer rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gold/90 shadow-lg shadow-gold/20 transition-all active:scale-95">
              <Save size={18} />
              Registrar Venta
            </button>
          </div>
        </div>
      </div>

      {/* Pie de página del formulario */}
      <p className="text-center mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
        Venuti's Gourmet Internal System v2.0
      </p>
    </div>
  );
}
