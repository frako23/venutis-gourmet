"use client";

import { Header } from "@/components/admin/UI/header";
import { Input } from "@/components/admin/UI/input";
import { Label } from "@/components/admin/UI/label";
import { RichTextEditor } from "@/components/producto/richTextEditor";
import { SortableImage } from "@/components/producto/sortableImage";
import { editProduct } from "@/lib/actions/products";
import { ProductoConImagenes } from "@/prisma/types";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CloudUpload, Save, Utensils } from "lucide-react";
import { CldUploadButton } from "next-cloudinary";
import { useActionState, useState } from "react";

export const initialState = {
  message: "",
  status: "",
  errors: {} as Record<string, string[]>, // Para guardar los errores de Zod
  timestamp: undefined,
};

// Componente para mostrar el error debajo de cada input
const FieldError = ({ error }: { error?: string[] }) => {
  if (!error) return null;
  return (
    <p className="text-red-400 text-[10px] font-bold mt-1 ml-1 uppercase tracking-tighter italic">
      {error[0]}
    </p>
  );
};

export const EditProductForm = ({
  producto,
}: {
  producto: ProductoConImagenes;
}) => {
  const editProductWithId = editProduct.bind(null, producto.id);
  const [state, formAction, timestamp] = useActionState(
    editProductWithId,
    initialState,
  );
  const [descripcionHtml, setDescripcionHtml] = useState(
    producto.descripcion || "",
  ); // Initialize with empty string for new product

  // Mantenemos las imágenes iniciales convirtiéndolas al formato de Cloudinary si es necesario
  const [images, setImages] = useState<any[]>(
    producto.imagenes?.map((img) => ({ url: img.url, publicId: img.id })) || [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Previene que un click accidental inicie el arrastre
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.publicId === active.id);
        const newIndex = items.findIndex((item) => item.publicId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <form
      action={formAction}
      className="min-h-screen bg-background-dark text-white"
    >
      <main className="max-w-[1100px] mx-auto px-6 py-8">
        <Header headerText="Editar producto" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Datos */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-charcoal p-8 rounded-[2rem] border border-border-soft relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Utensils size={120} />
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                {/* Nombre */}
                <div className="flex flex-col gap-2">
                  <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                    Nombre del Producto
                  </Label>
                  <Input
                    name="nombre"
                    defaultValue={producto.nombre}
                    className={`h-14 rounded-2xl bg-slate-50 text-black font-bold focus:ring-4 focus:ring-gold/10 ${state.errors?.nombre ? "border-red-500 border-2" : "border-slate-100 border-2"}`}
                  />
                  <FieldError error={state.errors?.nombre} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Inventario */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Inventario
                    </Label>
                    <Input
                      type="number"
                      name="inventario"
                      defaultValue={producto.inventario}
                      className={`h-14 rounded-2xl bg-slate-50 text-black font-bold ${state.errors?.inventario ? "border-red-500 border-2" : "border-slate-100"}`}
                    />
                    <FieldError error={state.errors?.inventario} />
                  </div>

                  {/* Precio Detal */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Precio Detal
                    </Label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gold font-black z-10">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        name="precioDetal"
                        defaultValue={producto.precioDetal}
                        className={`h-14 pl-10 rounded-2xl bg-slate-50 text-black font-bold ${state.errors?.precioDetal ? "border-red-500 border-2" : "border-slate-100"}`}
                      />
                    </div>
                    <FieldError error={state.errors?.precioDetal} />
                  </div>

                  {/* Precio Mayorista */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Precio Mayorista
                    </Label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gold font-black z-10">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        name="precioMayorista"
                        defaultValue={producto.precioMayorista}
                        className={`h-14 pl-10 rounded-2xl bg-slate-50 text-black font-bold ${state.errors?.precioMayorista ? "border-red-500 border-2" : "border-slate-100"}`}
                      />
                    </div>
                    <FieldError error={state.errors?.precioMayorista} />
                  </div>
                </div>

                {/* Categoría y Ubicación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Categoría
                    </Label>
                    <select
                      name="categoria"
                      defaultValue={producto.categoria}
                      className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 font-bold text-slate-700 outline-none focus:border-gold"
                    >
                      <option value="PASTAS">Pastas</option>
                      <option value="SALSAS">Salsas</option>
                      <option value="PASTICHOS">Pastichos</option>
                      <option value="POSTRES">Postres</option>
                      <option value="PANES">Pan</option>
                      <option value="ENCURTIDOS">Encurtidos</option>
                    </select>
                    <FieldError error={state.errors?.categoria} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                      Ubicación
                    </Label>
                    <select
                      name="ubicacion"
                      defaultValue={producto.ubicacion || ""}
                      className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 font-bold text-slate-700 outline-none focus:border-gold"
                    >
                      <option value="NEVERA 1">Nevera 1</option>
                      <option value="NEVERA 2">Nevera 2</option>
                      <option value="NEVERA 3">Nevera 3</option>
                    </select>
                    <FieldError error={state.errors?.ubicacion} />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Label className="text-gold font-bold tracking-widest uppercase text-xs px-1">
                    Descripción
                  </Label>

                  <RichTextEditor
                    value={descripcionHtml}
                    onChange={setDescripcionHtml}
                  />

                  {/* Este input oculto es el que lee el Server Action */}
                  <input
                    type="hidden"
                    name="descripcion"
                    value={descripcionHtml}
                  />
                  <FieldError error={state.errors?.descripcion} />
                </div>
              </div>
            </section>
          </div>

          {/* Columna Derecha: Imágenes y Botón */}
          <div className="space-y-6">
            <section className="bg-charcoal p-6 rounded-[2rem] border border-border-soft shadow-sm">
              <h3 className="text-sm font-black text-cream mb-6 uppercase tracking-widest text-center">
                Galería
              </h3>

              <CldUploadButton
                uploadPreset="upload-unsigned-images"
                onSuccess={(result: any) => {
                  setImages((prev) => [
                    ...prev,
                    {
                      url: result?.info?.secure_url,
                      publicId: result?.info?.public_id,
                    },
                  ]);
                }}
                className="group w-full cursor-pointer border-2 border-dashed border-slate-200 rounded-[1.5rem] p-8 flex flex-col items-center justify-center hover:border-gold hover:bg-gold/5 transition-all bg-slate-50/50"
              >
                <CloudUpload className="text-gold mb-2" size={24} />
                <p className="text-[10px] font-black text-slate-700 uppercase group-hover:text-white">
                  Subir Foto
                </p>
              </CldUploadButton>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <SortableContext
                    items={images.map((i) => i.publicId)}
                    strategy={rectSortingStrategy}
                  >
                    {images.map((img, index) => (
                      <SortableImage
                        key={img.publicId}
                        img={img}
                        index={index}
                        onRemove={(idx: number) =>
                          setImages(images.filter((_, i) => i !== idx))
                        }
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
              <div className="flex gap-3 mt-4">
                <a
                  href="/admin/inventory"
                  className="px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-400 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all text-sm active:scale-95"
                >
                  Descartar
                </a>
                <button
                  type="submit"
                  className="cursor-pointer flex items-center gap-2 px-8 py-3 rounded-2xl bg-gold text-primary font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-slate-200 transition-all text-xs active:scale-95"
                >
                  <Save size={16} />
                  Guardar
                </button>
              </div>
              <input
                type="hidden"
                name="imagenes"
                value={JSON.stringify(images)}
              />
            </section>
          </div>
        </div>
      </main>
    </form>
  );
};
