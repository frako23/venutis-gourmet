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
      className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border-2 active:cursor-grabbing ${
        index === 0 ? "border-[#c8a45d]" : "border-[#dedfd6]"
      } ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      {/* El área de arrastre son los listeners unidos al div */}
      <div
        {...attributes}
        {...listeners}
        className="size-full bg-cover bg-center"
        style={{ backgroundImage: `url('${img.url}')` }}
      />

      {/* Badge de "Principal" para la primera foto */}
      {index === 0 && (
        <span className="absolute left-2 top-2 rounded-full bg-[#c8a45d] px-2 py-1 text-[8px] font-black text-[#18211d]">
          Principal
        </span>
      )}

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute right-2 top-2 z-10 cursor-pointer rounded-full bg-white/90 p-1.5 text-[#b85f49] opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
};
