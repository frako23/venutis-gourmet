"use client";

import { Header } from "@/components/admin/UI/header";
import { Input } from "@/components/admin/UI/input";
import { Label } from "@/components/admin/UI/label";
import { addProduct } from "@/lib/actions/products";
import { CloudUpload, Utensils, X } from "lucide-react";
import { CldUploadButton } from "next-cloudinary";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

const initialState = { message: "", status: "" };

export default function AddProductPage() {
  // const [status, setStatus] = useState("draft");
  const [images, setImages] = useState<any[]>([]);
  const [state, formAction, isPending] = useActionState(
    addProduct,
    initialState,
  );

  useEffect(() => {
    if (state.status === "error") {
      toast.error(state.message || "Ocurrió un error inesperado");
    }

    if (state.status === "success") {
      toast.success(state.message || "¡Producto guardado!");
      // Limpiamos la imagen y los estados locales tras el éxito
      setImages([]);
      // Opcional: podrías resetear el formulario completo aquí si fuera necesario
    }
  }, [state]); // Escuchamos el objeto de estado completo

  return (
    <form
      action={formAction}
      className="min-h-screen bg-background-dark text-white transition-colors duration-300"
    >
      <main className="max-w-[1100px] mx-auto px-6 py-8">
        {/* Header con Breadcrumbs */}
        <Header disabledState={false} headerText="Agregar producto" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-charcoal p-8 rounded-[2rem] border border-border-soft shadow-sm relative overflow-hidden">
              {/* Decoración sutil */}
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Utensils size={120} />
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gold/10 rounded-2xl">
                  <Utensils className="text-gold" size={20} />
                </div>
                <h3 className="text-xl font-black text-cream uppercase tracking-tight">
                  Detalles del producto
                </h3>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                {/* Nombre del Producto - Full Width */}
                <div className="flex flex-col gap-3">
                  <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                    Nombre del Producto
                  </Label>
                  <Input
                    placeholder="Ej. Pappardelle al Huevo"
                    name="nombre"
                    className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-gold focus:ring-4 focus:ring-gold/10 font-bold transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Grid Principal: Inventario y Precios */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Inventario */}
                  <div className="flex flex-col gap-3">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Inventario
                    </Label>
                    <Input
                      type="number"
                      placeholder="20"
                      name="inventario"
                      className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-gold font-bold"
                    />
                  </div>

                  {/* Precio Detal */}
                  <div className="flex flex-col gap-3">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Precio Detal
                    </Label>
                    <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gold font-black z-10">
                        $
                      </span>
                      <Input
                        placeholder="0.00"
                        className="h-14 pl-10 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-gold font-bold"
                        type="number"
                        step="0.01"
                        name="precioDetal"
                      />
                    </div>
                  </div>

                  {/* Precio Mayorista */}
                  <div className="flex flex-col gap-3">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Precio Mayorista
                    </Label>
                    <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gold font-black z-10">
                        $
                      </span>
                      <Input
                        placeholder="0.00"
                        className="h-14 pl-10 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-gold font-bold"
                        type="number"
                        step="0.01"
                        name="precioMayorista"
                      />
                    </div>
                  </div>
                </div>

                {/* Categoría y Ubicación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Categoría Gourmet
                    </Label>
                    <select
                      className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-gold focus:ring-4 focus:ring-gold/10 px-5 font-bold text-slate-700 outline-none transition-all cursor-pointer appearance-none"
                      name="categoria"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecciona una categoría
                      </option>
                      <option value="PASTAS">Pastas</option>
                      <option value="SALSAS">Salsas</option>
                      <option value="PAN_DE_JAMON">Pan de Jamón</option>
                      <option value="ENCURTIDOS">Encurtidos</option>
                      <option value="POSTRES">Postres</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Ubicación en Almacén
                    </Label>
                    <select
                      className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-gold focus:ring-4 focus:ring-gold/10 px-5 font-bold text-slate-700 outline-none transition-all cursor-pointer appearance-none"
                      name="ubicacion"
                    >
                      <option value="NEVERA 1">Nevera 1</option>
                      <option value="NEVERA 2">Nevera 2</option>
                      <option value="NEVERA 3">Nevera 3</option>
                    </select>
                  </div>
                </div>

                {/* Descripción */}
                <div className="flex flex-col gap-3">
                  <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                    Nota de Cata / Descripción
                  </Label>
                  <textarea
                    rows={4}
                    placeholder="Cuéntanos sobre el origen del trigo, el tiempo de secado o sugerencias de maridaje..."
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-gold focus:ring-4 focus:ring-gold/10 p-5 font-medium text-slate-700 outline-none transition-all resize-none placeholder:italic placeholder:text-slate-400"
                    name="descripcion"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Columna Derecha */}
          <section className="bg-charcoal p-6 rounded-[2rem] border border-border-soft shadow-sm">
            <h3 className="text-sm font-black text-cream mb-6 uppercase tracking-widest text-center">
              Galería de Productos
            </h3>

            <CldUploadButton
              uploadPreset="upload-unsigned-images"
              onSuccess={(result: any) => {
                const newImage = {
                  url: result?.info?.secure_url,
                  publicId: result?.info?.public_id,
                };
                setImages((prev) => [...prev, newImage]);
              }}
              className="w-full border-2 border-dashed border-slate-200 rounded-[1.5rem] p-8 flex flex-col items-center justify-center text-center hover:border-gold hover:bg-gold/5 transition-all group bg-slate-50/50 cursor-pointer"
            >
              <div className="size-12 bg-white rounded-2xl flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform">
                <CloudUpload className="text-gold" size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                Añadir Foto Artesanal
              </p>
            </CldUploadButton>

            {/* Vista Previa en Grid */}
            {images.length > 0 && (
              <div className="mt-6">
                <Label className="mb-3 block text-center text-cream text-xs">
                  Fotos seleccionadas ({images.length})
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  {images.map((img, index) => (
                    <div
                      key={img.publicId}
                      className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-800 shadow-lg group"
                    >
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform group-hover:scale-110 duration-500"
                        style={{ backgroundImage: `url('${img.url}')` }}
                      />

                      {/* Badge de Portada para la primera imagen */}
                      {index === 0 && (
                        <span className="absolute top-2 left-2 bg-gold text-[8px] font-black px-2 py-1 rounded-full uppercase text-black">
                          Portada
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setImages(images.filter((_, i) => i !== index))
                        }
                        className="absolute top-2 cursor-pointer right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campo oculto para el formulario (envía JSON al Server Action) */}
            <input
              type="hidden"
              name="imagenes"
              value={JSON.stringify(images)}
            />
          </section>
        </div>
      </main>
    </form>
  );
}

// function StatusButton({
//   active,
//   label,
//   onClick,
// }: {
//   active: boolean;
//   label: string;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
//         active
//           ? "bg-gold border-gold text-white shadow-lg shadow-gold/20 translate-y-[-2px]"
//           : "bg-transparent border-slate-100 text-slate-400 hover:border-slate-200"
//       }`}
//     >
//       {label}
//     </button>
//   );
// }
