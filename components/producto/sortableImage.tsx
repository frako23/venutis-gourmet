import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";

export const SortableImage = ({ img, index, onRemove }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.publicId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square rounded-2xl overflow-hidden border-2 group cursor-grab active:cursor-grabbing ${
        index === 0 ? "border-gold" : "border-transparent"
      } ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      {/* El área de arrastre son los listeners unidos al div */}
      <div
        {...attributes}
        {...listeners}
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url('${img.url}')` }}
      />

      {/* Badge de "Principal" para la primera foto */}
      {index === 0 && (
        <span className="absolute top-2 left-2 bg-gold text-black text-[8px] font-black px-2 py-1 rounded-full uppercase">
          Principal
        </span>
      )}

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
};
