"use client";

import { MessageCircleMore } from "lucide-react"; // Usamos Lucide para el icono
import { usePathname } from "next/navigation";

export const WhatsAppButton = () => {
  const phoneNumber = "+584141713932"; // Sustituye por tu número real (con código de país sin el +)
  const message =
    "Hola Venuti's! Me gustaría obtener más información sobre sus productos.";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  const pathname = usePathname();
  // Si la ruta comienza con /admin o /admin-login, no mostramos nada
  const isAdminPage = pathname.startsWith("/admin");

  if (isAdminPage) return null;
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center size-14 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 hover:bg-[#20ba5a] transition-all duration-300 active:scale-95 group"
      aria-label="Contactar por WhatsApp"
    >
      {/* Tooltip opcional que aparece al pasar el mouse */}
      <span className="absolute right-16 bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none whitespace-nowrap">
        ¿Necesitas ayuda?
      </span>

      <MessageCircleMore size={32} strokeWidth={2.5} />
    </a>
  );
};
