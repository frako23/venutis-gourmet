"use client";

import {
  CloudUpload,
  Utensils,
  Save,
  Warehouse,
  X,
  ArrowLeft,
} from "lucide-react";
import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CldUploadButton } from "next-cloudinary";
import { addProduct } from "@/lib/actions/products";
import { toast } from "sonner";

const initialState = { message: "", status: "" };

export default function AddProductPage() {
  const [status, setStatus] = useState("draft");
  const [imageUrl, setImageUrl] = useState("");
  const [state, formAction, isPending] = useActionState(
    addProduct,
    initialState,
  );

  useEffect(() => {
    console.log("Estado de la acción del formulario:", state);
    if (state.message) {
      if (state.status === "error") toast.error(state.message);
      else toast.success(state.message);
    }
  }, [state.message]);

  return (
    <form
      action={formAction}
      className="min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-white transition-colors duration-300"
    >
      <main className="max-w-[1100px] mx-auto px-6 py-8">
        {/* Header con Breadcrumbs */}
        <div className="mb-4">
          <nav className="flex items-center gap-2 text-[10px] font-black text-gold uppercase tracking-[0.3em] mb-4">
            <Link
              href="/admin/inventory"
              className="hover:opacity-70 transition-opacity flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Inventario
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400">Nuevo Producto</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-gold tracking-tight mb-2">
                Agregar Producto
              </h1>
              <p className="text-white font-medium italic">
                "La calidad artesanal comienza con un buen registro."
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href="/admin/inventory"
                className="px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-400 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all text-sm active:scale-95"
              >
                Descartar
              </a>
              <button
                type="submit"
                disabled={isPending}
                className="cursor-pointer flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-xs active:scale-95"
              >
                <Save size={16} />
                Guardar Producto
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white dark:bg-charcoal p-8 rounded-[2rem] border border-border-soft shadow-sm relative overflow-hidden">
              {/* Decoración sutil */}
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Utensils size={120} />
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gold/10 rounded-2xl">
                  <Utensils className="text-gold" size={20} />
                </div>
                <h3 className="text-xl font-black text-cream uppercase tracking-tight">
                  Detalles de la Pasta
                </h3>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <Label>Nombre del Producto</Label>
                  <Input placeholder="Ej. Pappardelle al Huevo" name="nombre" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label>Precio Sugerido (USD)</Label>
                    <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gold font-black transition-colors group-focus-within:text-primary">
                        $
                      </span>
                      <Input
                        placeholder="0.00"
                        className="pl-12"
                        type="number"
                        step="any"
                        name="precio"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Categoría Gourmet</Label>
                    <select
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-4 focus:ring-gold/10 focus:border-gold h-14 px-5 font-bold text-slate-700 outline-none transition-all cursor-pointer appearance-none"
                      name="categoria"
                    >
                      <option>Pastas</option>
                      <option>Salsas</option>
                      <option>Pan de Jamón</option>
                      <option>Encurtidos</option>
                      <option>Postres</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Nota de Cata / Descripción</Label>
                  <textarea
                    rows={4}
                    placeholder="Cuéntanos sobre el origen del trigo, el tiempo de secado o sugerencias de maridaje..."
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-4 focus:ring-gold/10 focus:border-gold p-5 font-medium text-slate-700 outline-none transition-all resize-none placeholder:italic"
                    name="descripcion"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-charcoal p-8 rounded-[2rem] border border-border-soft shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gold/10 rounded-2xl">
                  <Warehouse className="text-gold" size={20} />
                </div>
                <h3 className="text-xl font-black text-cream uppercase tracking-tight">
                  Control de Almacén
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label>SKU Único</Label>
                  <Input placeholder="VEN-PASTA-001" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Unidades Disponibles</Label>
                  <Input placeholder="0" type="number" />
                </div>
              </div>
            </section>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-charcoal p-6 rounded-[2rem] border border-border-soft shadow-sm">
              <h3 className="text-sm font-black text-cream mb-6 uppercase tracking-widest text-center">
                Imagen de Portada
              </h3>

              {/* USAMOS CldUploadButton como el contenedor principal. 
      Le pasamos la clase de Tailwind para que HEREDE el estilo punteado.
  */}
              <CldUploadButton
                uploadPreset="upload-unsigned-images"
                onSuccess={(result: any) => {
                  setImageUrl(result?.info?.secure_url);
                }}
                // El padre tiene la clase 'group'
                className="w-full border-2 border-dashed border-slate-200 rounded-[1.5rem] p-10 flex flex-col items-center justify-center text-center hover:border-gold hover:bg-gold/5 transition-all group bg-slate-50/50 cursor-pointer"
              >
                <div className="size-14 bg-white rounded-2xl flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
                  <CloudUpload className="text-gold" size={28} />
                </div>

                {/* Usamos group-hover: para que el texto cambie cuando pases el mouse por el recuadro punteado */}
                <p className="text-xs font-black text-slate-700 group-hover:text-gold uppercase tracking-tighter mb-1 transition-colors">
                  {imageUrl ? "Cambiar foto" : "Subir foto artesanal"}
                </p>

                <p className="text-[9px] text-primary group-hover:text-cream font-bold uppercase tracking-widest transition-colors">
                  PNG, JPG hasta 10MB
                </p>
              </CldUploadButton>

              {/* Vista Previa Condicional */}
              <div className="mt-14">
                <Label className="mb-4 block text-center italic text-cream">
                  Vista Previa
                </Label>
                <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl bg-parchment">
                  {imageUrl ? (
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform hover:scale-110 duration-700"
                      style={{ backgroundImage: `url('${imageUrl}')` }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary italic text-xs font-bold">
                      Sin imagen seleccionada
                    </div>
                  )}
                  <input type="hidden" name="imgUrl" value={imageUrl} />
                  {imageUrl && (
                    <button
                      onClick={() => setImageUrl("")}
                      className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg text-red-500 hover:bg-red-50 transition-colors active:scale-90 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </form>
  );
}

// --- Componentes Atómicos ---

function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1 ${className}`}
    >
      {children}
    </label>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-4 focus:ring-gold/10 focus:border-gold h-14 px-5 font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300 placeholder:font-medium ${props.className}`}
    />
  );
}

function StatusButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
        active
          ? "bg-gold border-gold text-white shadow-lg shadow-gold/20 translate-y-[-2px]"
          : "bg-transparent border-slate-100 text-slate-400 hover:border-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
