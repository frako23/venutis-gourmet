import { WHATSAPP_PHONE_NUMBER } from "@/lib/constants/constants";
import {
  Globe,
  Headset,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function MayoristaPage() {
  return (
    <div className="bg-background-dark text-white min-h-screen flex flex-col selection:bg-accent-gold/30 font-sans">
      {/* Hero / Main Section */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Background Overlay Replacement */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1516594798947-e65505dbb29d?q=80&w=2070"
            alt="Fondo Gourmet"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background-dark/80 via-background-dark/90 to-background-dark" />
        </div>

        {/* Navigation Header */}

        {/* Central Card Container */}
        <div className="w-full max-w-3xl z-10 animate-in fade-in duration-1000">
          <div className="bg-charcoal-brown border border-accent-gold rounded-xl p-8 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden">
            {/* Decorative element */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-accent-gold"></div>

            <header className="mb-10">
              <h1 className="font-good-brush text-4xl md:text-6xl font-bold leading-tight mb-6 text-white tracking-tight">
                Portal Mayorista <br />
                <span className="italic text-accent-gold">en Construcción</span>
              </h1>
              <div className="w-16 h-[1px] bg-accent-gold/40 mx-auto mb-8"></div>
              <p className="text-lg text-white/80 leading-relaxed max-w-xl mx-auto font-light">
                Estamos diseñando una nueva experiencia digital exclusiva para
                nuestros socios comerciales. Muy pronto podrá gestionar sus
                pedidos con la excelencia de siempre.
              </p>
            </header>

            <div className="flex flex-col items-center gap-6">
              <Link
                href={`https://wa.me/${WHATSAPP_PHONE_NUMBER}`}
                className="group flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white px-8 py-5 rounded-lg font-bold tracking-wider uppercase text-sm transition-all transform hover:-translate-y-1 w-full md:w-auto"
              >
                <MessageCircle className="text-accent-gold w-5 h-5" />
                Finalizar pedido por WhatsApp
              </Link>
              <p className="text-white/50 text-xs tracking-widest uppercase font-medium">
                Atención Personalizada de Lunes a Viernes
              </p>
            </div>

            {/* Feature badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 pt-8 border-t border-white/5">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="text-accent-gold w-6 h-6" />
                <span className="text-[10px] uppercase tracking-widest text-white/60 text-center">
                  Garantía de Calidad
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Truck className="text-accent-gold w-6 h-6" />
                <span className="text-[10px] uppercase tracking-widest text-white/60 text-center">
                  Logística Premium
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Headset className="text-accent-gold w-6 h-6" />
                <span className="text-[10px] uppercase tracking-widest text-white/60 text-center">
                  Soporte Dedicado
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <div className="w-[1px] h-12 bg-accent-gold"></div>
        </div>
      </main>

      {/* Refined Footer */}
      <footer className="bg-background-dark border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-accent-gold">
              Venuti's Gourmet
            </h3>
            <p className="text-white/50 text-sm max-w-xs leading-relaxed">
              Proveedores de excelencia para la industria gastronómica y retail
              de lujo desde 1998.
            </p>
            <div className="flex gap-4 pt-2">
              <Link
                href="#"
                className="text-white/60 hover:text-accent-gold transition-colors"
              >
                <Globe size={20} />
              </Link>
              <Link
                href="#"
                className="text-white/60 hover:text-accent-gold transition-colors"
              >
                <Share2 size={20} />
              </Link>
              <Link
                href="#"
                className="text-white/60 hover:text-accent-gold transition-colors"
              >
                <Mail size={20} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h4 className="uppercase tracking-widest text-xs font-bold text-white">
                Contacto Directo
              </h4>
              <ul className="text-sm space-y-3 text-white/60">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-accent-gold" /> +54 11
                  1234-5678
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-accent-gold" />{" "}
                  mayoristas@venutisgourmet.com
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="uppercase tracking-widest text-xs font-bold text-white">
                Oficinas
              </h4>
              <ul className="text-sm space-y-3 text-white/60">
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="text-accent-gold mt-1" />
                  Distrito Gourmet, Calle 15
                  <br />
                  Buenos Aires, Argentina
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
            © 2024 Venuti's Gourmet. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="#"
              className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors"
            >
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
