import {
  BriefcaseBusiness,
  Instagram,
  LucideIcon,
  Mail,
  MessageCircleMore,
  ShoppingCart,
} from "lucide-react";

interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText: string;
  link: string;
}

export default function StorefrontEntry() {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-x-hidden">
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
          </div>
          <div className="flex gap-8 items-center">
            <a
              className="text-sm tracking-widest uppercase hover:text-gold transition-colors hidden md:block"
              href="/about-us"
            >
              Nuestra historia
            </a>
            <a
              href="/admin-login"
              className="bg-gold px-6 py-2 rounded-lg text-sm font-bold tracking-widest uppercase hover:bg-opacity-80 transition-all border border-gold/30 text-primary"
            >
              Admin Login
            </a>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white text-shadow-elegant">
              Sabores Exquisitos. Tradición Atemporal.
            </h1>
            <p className="text-gold text-lg md:text-xl tracking-widest italic opacity-90">
              Selecciona tu experiencia de compra
            </p>
          </div>

          {/* Tarjetas de Selección */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
            <ChoiceCard
              icon={ShoppingCart}
              title="Compradores Individuales"
              description="Lleva a casa el auténtico sabor de nuestras pastas artesanales elaboradas con sémola de la mejor calidad. Explora nuestra cuidada selección de variedades frescas y secas, creadas para realzar cada plato con textura y sabor únicos."
              buttonText="Comprar Ahora"
              link="/productos/consumidores"
            />
            <ChoiceCard
              icon={BriefcaseBusiness}
              title="Socios Comerciales"
              description="Eleva tu propuesta gastronómica con nuestra colección premium al por mayor. Ofrecemos soluciones personalizadas para restaurantes, boutiques especializadas y regalos gourmet que buscan diferenciarse con productos auténticos y de calidad superior."
              buttonText="Consulta Mayorista"
              link="/productos/mayoristas"
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 w-full px-6 py-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-t border-gold/20 pt-10">
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
    <div className="group relative bg-charcoal/80 backdrop-blur-md gold-border p-10 rounded-xl flex flex-col items-center text-center transition-transform hover:-translate-y-2 duration-500 shadow-2xl">
      <div className="mb-8 p-4 bg-background-dark rounded-full border border-gold/20 text-gold group-hover:scale-110 transition-transform duration-500">
        <Icon className="w-10 h-10 " />
      </div>
      <h2 className="text-2xl font-bold mb-4 tracking-wide uppercase text-white">
        {title}
      </h2>
      <p className="text-gray-300 text-sm leading-relaxed mb-10 max-w-xs">
        {description}
      </p>
      <a
        href={link}
        className="w-full bg-gold py-4 rounded-lg font-bold tracking-[0.2em] uppercase text-primary hover:bg-opacity-90 transition-all active:scale-95 shadow-lg"
      >
        {buttonText}
      </a>
    </div>
  );
}

function FooterLink({ text, link }: { text: string; link: string }) {
  return (
    <a
      className="text-xs tracking-widest uppercase text-gray-400 hover:text-gold"
      href={link}
    >
      {text}
    </a>
  );
}

function SocialIcon({ icon: Icon, link }: { icon: LucideIcon; link: string }) {
  return (
    <a className="text-gray-400 hover:text-gold" href={link}>
      <Icon />
    </a>
  );
}
