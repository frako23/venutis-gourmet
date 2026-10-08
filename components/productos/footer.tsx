import {
  VENUTIS_EMAIL,
  WHATSAPP_PHONE_NUMBER,
} from "@/lib/constants/constants";
import { Instagram, LucideIcon, Mail, MessageCircleMore } from "lucide-react";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="bg-primary text-white/60 py-16 px-6 lg:px-12 mt-20 font-century-gothic border-t border-white/5">
      <div className="mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-16">
        {/* SECCIÓN LOGO E HISTORIA */}
        <div className="col-span-1 md:col-span-2 space-y-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Contenedor del Logo con borde sutil para que resalte */}
            <div className="p-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
              <Image
                src="/logo-venutis.avif"
                alt="Logo Venutis"
                width={80}
                height={80}
                className="w-20 h-auto object-contain"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-serif italic text-xl tracking-wide">
                Tradición familiar en cada mesa
              </h3>
              <p className="max-w-md text-sm leading-relaxed font-light">
                El arte de la pasta hecha a mano, con respeto y dedicación.
              </p>
              <div className="flex gap-5 pt-2">
                <FooterSocial
                  icon={MessageCircleMore}
                  link={`https://wa.me/${WHATSAPP_PHONE_NUMBER}`}
                />
                <FooterSocial icon={Mail} link={`mailto:${VENUTIS_EMAIL}`} />
                <FooterSocial
                  icon={Instagram}
                  link="https://instagram.com/venutisgourmet"
                />
              </div>
            </div>
          </div>
          {/* Redes Sociales */}
        </div>

        {/* COLUMNAS DE LINKS (Mantener igual o ajustar títulos) */}
        <div>
          <h4 className="text-white font-bold uppercase tracking-[0.2em] text-[11px] mb-8 border-b border-white/10 pb-2 inline-block">
            Explorar
          </h4>
          <div className="flex gap-12">
            <ul className="space-y-4 text-sm">
              <FooterLink
                label="Todos"
                link="/productos/consumidores?contexto=consumidor"
              />
              <FooterLink
                label="Pastas"
                link="/productos/consumidores?categoria=PASTAS&contexto=consumidor"
              />
              <FooterLink
                label="Salsas"
                link="/productos/consumidores?categoria=SALSAS&contexto=consumidor"
              />
            </ul>
            <ul className="space-y-4 text-sm">
              <FooterLink
                label="Pastichos"
                link="/productos/consumidores?categoria=PASTICHOS&contexto=consumidor"
              />
              <FooterLink
                label="Postres"
                link="/productos/consumidores?categoria=POSTRES&contexto=consumidor"
              />
              <FooterLink
                label="Bakery"
                link="/productos/consumidores?categoria=BAKERY&contexto=consumidor"
              />
            </ul>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold uppercase tracking-[0.2em] text-[11px] mb-8 border-b border-white/10 pb-2 inline-block">
            Secciones
          </h4>
          <ul className="space-y-4 text-sm">
            <FooterLink label="Nuestra Historia" link="/about-us" />
            <FooterLink
              label="Mayoristas"
              link="/productos/consumidores?contexto=mayorista"
            />
          </ul>
        </div>
      </div>

      {/* BARRA INFERIOR CON TU FIRMA */}
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 mt-8 pt-8">
        {/* Copyright de la marca */}
        <p className="text-white/40 text-xs tracking-widest uppercase">
          © {new Date().getFullYear()} Venuti's Gourmet. Todos los derechos
          reservados.
        </p>

        {/* Créditos de Desarrollador */}
        <div className="group flex items-center gap-2 text-white/40 hover:text-gold transition-colors duration-300">
          <span className="text-[10px] uppercase tracking-[0.2em] font-medium">
            Desarrollado por
          </span>
          <a
            href="https://www.frakodev.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-cascadia-code text-sm border-b border-transparent group-hover:border-gold transition-all"
          >
            frakoDev
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

function FooterSocial({
  icon: Icon,
  link,
}: {
  icon: LucideIcon;
  link: string;
}) {
  return (
    <a className="hover:text-white transition-colors" href={link}>
      <Icon size={20} strokeWidth={1.5} />
    </a>
  );
}

function FooterLink({ label, link }: { label: string; link: string }) {
  return (
    <li>
      <a className="hover:text-white transition-colors" href={link}>
        {label}
      </a>
    </li>
  );
}
