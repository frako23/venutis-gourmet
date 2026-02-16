import {
  BriefcaseBusiness,
  Instagram,
  LucideIcon,
  Mail,
  MessageCircleMore,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";

interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText: string;
  link: string;
}

export default function StorefrontEntry() {
  return (
    <div className="bg-background-dark font-reklame text-white overflow-x-hidden">
      {/* Contenedor Principal con Fondo */}
      <div
        className="relative min-h-screen w-full flex flex-col bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYLx5U8bIFkHZJFYzHoekqIhxm-sYalhCoePs9JG8kqtLIOiHchK__w-QIPRZDpV4P5NEFgUnc7zwNc5jus1K48QWgapL-ctbuc8eAQ1NaAUSiw-YI7xGHVWamLagJJXbymPGWQPGQrXZoMux1uWbtK1bFulCahnIfOkZHqvHz3VSTLPQydK4KhTzp2VugCMItXhkcyEommYzcec01sGMbXBmjXC-P_J4BUWiXCRjTwNImd_xB2PsknGoUd6z2F-VjZ6WcCdOxq9c")',
        }}
      >
        {/* Overlay para legibilidad */}
        <div className="absolute inset-0 custom-gradient-overlay"></div>

        {/* Navegación */}
        <header className="relative z-10 w-full px-6 lg:px-20 py-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-venutis.avif"
              alt="Logo Venutis"
              width={100}
              height={100}
            />
          </div>
          <div className="flex gap-8 items-center">
            <a
              className="text-lg font-century-gothic tracking-widest uppercase hover:text-gold transition-colors hidden md:block"
              href="/about-us"
            >
              Nuestra historia
            </a>
            <a
              href="/admin-login"
              className="bg-gold/70 px-6 py-2 rounded-lg text-lg font-century-gothic tracking-widest uppercase hover:bg-gold transition-all border border-gold/30 text-primary hover:font-bold"
            >
              Admin Login
            </a>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 ">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-9xl tracking-tight text-white text-shadow-elegant">
              Pastas Artesanales
            </h1>
            <p className="text-white font-dk-coal-brush text-lg md:text-6xl tracking-widest  opacity-90">
              Arte en tu mesa
            </p>
            <p
              className="text-gold
              font-century-gothic text-lg md:text-2xl tracking-widest  opacity-90"
            >
              Selecciona tu experiencia de compra
            </p>
          </div>

          {/* Tarjetas de Selección */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
            <ChoiceCard
              icon={ShoppingCart}
              title="Consumidores"
              description="Pastas artesanales elaboradas con sémola de calidad. Variedades frescas para llevar el sabor gourmet a casa"
              buttonText={"Ver \n catálogo"}
              link="/productos/consumidores"
            />
            <ChoiceCard
              icon={BriefcaseBusiness}
              title="Mayoristas"
              description="Soluciones premium para restaurantes y negocios grastronómicos. Productos diferenciadores, calidad constante y atención personalizada"
              buttonText={"Ver \n catálogo"}
              link="/productos/mayoristas"
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 w-full px-6 py-10 font-century-gothic">
          <div className=" mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-t border-gold/20 pt-10">
            <div className="flex gap-8">
              <FooterLink text="Nuestra Historia" link="/about-us" />
              <FooterLink text="Consumidores" link="/productos/consumidores" />
              <FooterLink text="Mayoristas" link="/productos/mayoristas" />
            </div>

            <div className="flex gap-6 items-center">
              <SocialIcon
                icon={Instagram}
                link="https://www.instagram.com/venutis.gourmet"
              />
              <SocialIcon
                icon={MessageCircleMore}
                link="https://wa.me/584123456789"
              />
              <SocialIcon icon={Mail} link="mailto:info@venutisgourmet.com" />
            </div>

            <p className="text-xs tracking-widest uppercase text-gray-500">
              © 2024 Venuti's Gourmet. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Sub-componentes para mantener el código limpio
function ChoiceCard({
  icon: Icon,
  title,
  description,
  buttonText,
  link,
}: ChoiceCardProps) {
  return (
    <div className="group relative bg-charcoal/80 backdrop-blur-md gold-border p-10 rounded-xl flex flex-col items-center text-center transition-transform hover:-translate-y-2 duration-500 shadow-2xl font-dk-coal-brush">
      <div className="mb-8 p-4 bg-background-dark rounded-full border border-gold/20 text-gold group-hover:scale-110 transition-transform duration-500">
        <Icon className="w-10 h-10 " />
      </div>
      <h2 className="text-6xl font-bold mb-4 tracking-wide uppercase text-white">
        {title}
      </h2>
      <p className="text-gray-300 text-2xl leading-relaxed mb-10 max-w-xs font-century-gothic">
        {description}
      </p>
      <a
        href={link}
        className="w-full bg-gold py-4 rounded-lg tracking-[0.2em] uppercase text-primary hover:bg-opacity-90 transition-all active:scale-95 shadow-lg font-good-brush text-4xl"
      >
        {buttonText}
      </a>
    </div>
  );
}

function FooterLink({ text, link }: { text: string; link: string }) {
  return (
    <a
      className="text-lg tracking-widest uppercase text-gray-400 hover:text-gold"
      href={link}
    >
      {text}
    </a>
  );
}

function SocialIcon({ icon: Icon, link }: { icon: LucideIcon; link: string }) {
  return (
    <a className="text-gray-400 hover:text-gold" href={link}>
      <Icon size={32} />
    </a>
  );
}
