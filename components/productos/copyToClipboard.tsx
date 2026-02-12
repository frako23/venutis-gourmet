import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("¡Datos copiados al portapapeles!");
    setTimeout(() => setCopied(false), 2000); // Vuelve al estado original tras 2s
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-accent-gold flex items-center gap-1 text-xs font-bold"
      title="Copiar al portapapeles"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
      {copied ? "Copiado!" : "Copiar datos"}
    </button>
  );
};


