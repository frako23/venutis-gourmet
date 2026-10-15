import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const copiedSuccessfully = await copyToClipboard(text);

    if (!copiedSuccessfully) {
      toast.error("No pudimos copiar los datos al portapapeles.");
      return;
    }

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

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Algunos navegadores exponen la API, pero la rechazan fuera de un contexto seguro.
    }
  }

  if (typeof document === "undefined") return false;

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textArea.remove();
  }
}


