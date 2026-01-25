import React from "react";
import {
  ChevronDown,
  Award,
  Leaf,
  History,
  Handshake,
  CheckCircle2,
  Instagram,
  Mail,
  MapPin,
  Phone,
  MessageCircleMore,
} from "lucide-react";

export default function AboutUs() {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-cream selection:bg-gold selection:text-background-dark">
      {/* Sticky Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-background-dark/80 backdrop-blur-md px-6 md:px-20 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="size-8 text-gold">
            <svg
              fill="none"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clipRule="evenodd"
                d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z"
                fill="currentColor"
                fillRule="evenodd"
              ></path>
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold tracking-widest uppercase">
            Venuti's
          </h1>
        </a>
        <nav className="hidden md:flex items-center gap-10">
          <NavLink href="/productos/consumidores">Consumidores</NavLink>
          <NavLink href="/productos/mayoristas">Mayoristas</NavLink>
        </nav>
        {/* <button className="bg-primary text-white px-6 py-2 text-xs font-bold tracking-widest uppercase hover:bg-opacity-80 transition-all rounded">
          Shop Now
        </button> */}
      </header>

      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 parallax-bg sepia-filter opacity-60 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(26,26,26,0.6), rgba(26,26,26,0.9)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBhCALuKQGR8D6eS_iCZ-PNEFTKVY-uMyDqILlwHeHtD7HCDGDyo4McizZhJCM42YSy68aHsqyo-6cLLQUPPNvzKbdAh7hTi1pcKnnCkgXS9PAjA9F2dXxEF3VJUOty1AZVy5TM183QKgTHjOs6SiXczpgltYNcYc8Fg5QwCAQmDasigEijv9Tnj_MmaJvdVHuC5Ov-8tfwoEv4sZYmbphXya2w30HY2dp4jMxrtuJ28ZTUEUpPVFENx9mC_vH4x2SqZWr0ubazTwY')`,
          }}
        />
        <div className="relative z-10 text-center px-4">
          <span className="text-gold tracking-[0.5em] uppercase text-sm mb-4 block">
            Desde 1920
          </span>
          <h1 className="text-white text-6xl md:text-8xl font-bold tracking-tighter mb-6">
            Nuestra Historia
          </h1>
          <div className="w-24 h-px bg-gold mx-auto mb-8"></div>
          <p className="text-cream/80 max-w-xl mx-auto italic text-lg leading-relaxed">
            Un legado de excelencia gourmet artesanal nacido entre los aromas de
            la vieja Italia y el corazón de nuestra familia.
          </p>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gold">
          <ChevronDown size={40} />
        </div>
      </section>

      {/* Capítulo I: Orígenes */}
      <section className="py-24 px-6 md:px-20 max-w-7xl mx-auto overflow-hidden">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <span className="text-primary font-bold tracking-widest uppercase text-xs mb-2 block">
              Capítulo I
            </span>
            <h2 className="text-gold text-4xl md:text-5xl font-bold mb-8">
              Nuestros Orígenes
            </h2>
            <p className="text-cream/90 text-lg leading-relaxed mb-6 drop-cap">
              Todo comenzó con un cuaderno de recetas escrito a mano y el sueño
              de traer los sabores más puros del Mediterráneo a la mesa moderna.
              Giuseppe Venuti no solo trajo consigo ingredientes; trajo una
              filosofía de respeto absoluto por la tierra y el tiempo.
            </p>
            <p className="text-cream/70 text-base leading-relaxed">
              En nuestro primer taller artesanal, cada lote de pasta se secaba
              lentamente al aire, y cada oliva se seleccionaba por su madurez
              perfecta. Esa paciencia sigue siendo el ingrediente secreto de
              cada producto que lleva nuestro nombre.
            </p>
          </div>
          <div className="order-1 md:order-2 relative">
            <div className="absolute -top-4 -left-4 w-full h-full border border-gold/20 -z-10"></div>
            <img
              alt="Vintage recipe book"
              className="w-full h-[500px] object-cover sepia-filter rounded shadow-2xl"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBup6t-t7gsgaD9TJpf2jrSKzitTccBkqNjG4rfbmvYy6AJLdNO4krrcs8jplE1k8bZYElNFeJc8j1YRNjGvBmgbFLU2z2z45YB9OIW8baJ50JoW4fJGYsF0umCNMOXjd-9x_ufsdOiTq9P39BhxIIXWDbrOOrzfNOqrzqcL_KXaEkaWZ-kwOpZV10E_Ncrguv2fGabzDGyKbCIvXPYuKJeAnbxLRWihFWUobZinzG7FVy3Xzoiw4lMsLApb33Pp-z499WfbKUklRM"
            />
          </div>
        </div>
      </section>

      {/* Filosofía Callout */}
      <section className="bg-background-alt py-24 px-6 border-y border-gold/10">
        <div className="max-w-4xl mx-auto text-center">
          <Award className="mx-auto text-gold mb-6" size={48} strokeWidth={1} />
          <h2 className="text-white text-3xl md:text-4xl font-bold mb-8">
            La Filosofía del "Slow Food"
          </h2>
          <p className="text-gold italic text-2xl md:text-3xl leading-snug">
            "No se trata de alimentar el cuerpo, sino de nutrir el alma a través
            de la artesanía que solo el tiempo puede perfeccionar."
          </p>
          <div className="mt-12 flex justify-center gap-12">
            <PhilosophyItem icon={Leaf} label="Sostenible" />
            <PhilosophyItem icon={History} label="Tradición" />
            <PhilosophyItem icon={Handshake} label="Ético" />
          </div>
        </div>
      </section>

      {/* Capítulo II: Calidad */}
      <section className="py-24 px-6 md:px-20 max-w-7xl mx-auto overflow-hidden">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -bottom-4 -right-4 w-full h-full border border-primary/30 -z-10"></div>
            <img
              alt="Artisanal ingredients"
              className="w-full h-[500px] object-cover grayscale brightness-75 rounded shadow-2xl"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuArWYabT3G8I8O_Yf3_4EtBapLaQGW8fFjVKB_pmO8pFiUevZa9pQ7HhyfvjMuFX1bzVMWWk3SifsOrhU4HcoU3pYJtF8k98wzGexkXfDgUZC9Ux89rcez-JG5dManFzUeux48f-ksj0Lvm-kfLGfPmd9MOW_jwi-WIe20eJQy_JUST0p4haA2_8l7FmiKbkbSVeVzyCxjuYD7blJic2xgh5kqfAasaSiIOgqlUfMd4IpZmxjsAdq6w8DHSy6h0ULf1EIYFkiuMJto"
            />
          </div>
          <div>
            <span className="text-primary font-bold tracking-widest uppercase text-xs mb-2 block">
              Capítulo II
            </span>
            <h2 className="text-gold text-4xl md:text-5xl font-bold mb-8">
              Compromiso con la Calidad
            </h2>
            <p className="text-cream/90 text-lg leading-relaxed mb-6">
              Nuestra búsqueda de la excelencia nos lleva a los rincones más
              remotos. Desde el aceite prensado en frío de olivares centenarios
              hasta el grano molido a piedra, cada ingrediente es un testimonio
              de nuestra integridad.
            </p>
            <div className="space-y-6">
              <QualityFeature
                title="Origen Controlado"
                desc="Trabajamos directamente con agricultores que comparten nuestro respeto por la biodiversidad."
              />
              <QualityFeature
                title="Procesado Manual"
                desc="Mantenemos técnicas de producción manuales para preservar la textura y el sabor original."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Legacy Quote */}
      <section className="relative py-32 overflow-hidden bg-background-dark">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-primary text-8xl font-serif leading-none mb-0 select-none opacity-50">
            “
          </div>
          <p className="text-white text-3xl font-light italic -mt-8 mb-8">
            Mi abuelo decía que la comida es la forma más honesta de amor. Si no
            pones tu corazón en la receta, el comensal lo notará en el primer
            bocado.
          </p>
          <h5 className="text-gold font-bold tracking-widest uppercase text-sm">
            — Marco Venuti, Tercera Generación
          </h5>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Vive la Tradición
          </h2>
          <p className="opacity-80 mb-10 text-lg">
            Descubre nuestra selección curada de productos gourmet y lleva un
            pedazo de nuestra historia a tu hogar.
          </p>
          <div className="flex flex-col sm:row gap-4 justify-center">
            <button className="bg-gold text-background-dark font-bold px-10 py-4 rounded hover:bg-white transition-all tracking-widest uppercase text-sm">
              Explorar la Tienda
            </button>
            <button className="border border-white/30 font-bold px-10 py-4 rounded hover:bg-white/10 transition-all tracking-widest uppercase text-sm">
              Nuestros Artesanos
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background-dark text-cream/50 py-16 px-6 md:px-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-6 text-gold">
                <svg fill="currentColor" viewBox="0 0 48 48">
                  <path d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" />
                </svg>
              </div>
              <h1 className="text-white text-lg font-bold tracking-widest uppercase">
                Venuti's Gourmet
              </h1>
            </div>
            <p className="max-w-sm mb-6 text-sm leading-relaxed">
              Preservando el arte de la gastronomía fina desde 1920. Nuestra
              pasión es la calidad, nuestra guía es la tradición.
            </p>
            <div className="flex gap-4">
              <SocialLink
                icon={MessageCircleMore}
                link="https://wa.me/584123456789"
              />
              <SocialLink
                icon={Instagram}
                link="https://www.instagram.com/venutis.gourmet"
              />
              <SocialLink icon={Mail} link="mailto:info@venutisgourmet.com" />
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">
              Explorar
            </h4>
            <ul className="space-y-3 text-sm">
              <FooterItem label="Colecciones" />
              <FooterItem label="Cestas de Regalo" />
              <FooterItem label="Suscripciones" />
              <FooterItem label="Recetas" />
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">
              Contacto
            </h4>
            <ul className="space-y-3 text-sm">
              <ContactItem icon={MapPin} text="Caracas" />
              <ContactItem icon={Mail} text="info@venutis.com" />
              <ContactItem icon={Phone} text="+58 412 345 6789" />
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] tracking-widest uppercase text-center">
          <p>© 2024 Venuti's Gourmet. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Términos
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-componentes auxiliares ---

const NavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    className="text-s font-bold tracking-[0.2em] uppercase text-white hover:text-gold transition-colors"
  >
    {children}
  </a>
);

const PhilosophyItem = ({
  icon: Icon,
  label,
}: {
  icon: any;
  label: string;
}) => (
  <div className="flex flex-col items-center gap-2">
    <Icon className="text-gold" size={24} strokeWidth={1.5} />
    <span className="text-[10px] tracking-widest uppercase opacity-60 text-white">
      {label}
    </span>
  </div>
);

const QualityFeature = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex items-start gap-4">
    <CheckCircle2 className="text-gold mt-1 shrink-0" size={20} />
    <div>
      <h4 className="text-white font-bold">{title}</h4>
      <p className="text-cream/60 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

const SocialLink = ({ icon: Icon, link }: { icon: any; link: string }) => (
  <a href={link} className="text-cream/50 hover:text-gold transition-colors">
    <Icon size={20} />
  </a>
);

const FooterItem = ({ label }: { label: string }) => (
  <li>
    <a href="#" className="hover:text-gold transition-colors">
      {label}
    </a>
  </li>
);

const ContactItem = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <li className="flex items-center gap-2">
    <Icon size={14} className="text-gold" />
    <span>{text}</span>
  </li>
);
