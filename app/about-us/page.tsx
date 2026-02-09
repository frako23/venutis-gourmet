import {
  CheckCircle2,
  Instagram,
  Mail,
  MapPin,
  MessageCircleMore,
  Phone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AboutUs() {
  return (
    <div className="bg-background-dark  font-century-gothic text-cream selection:bg-gold selection:text-background-dark">
      {/* Sticky Header */}
      <header className="fixed top-0 w-full z-50  border-gold border-b-2 bg-background-dark/80 backdrop-blur-md px-6 md:px-20 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo_Venutis.png"
            alt="Logo Venutis"
            width={50}
            height={50}
          />
        </Link>
        <nav className="hidden md:flex items-center gap-10">
          <NavLink href="/productos/consumidores">Consumidores</NavLink>
          <NavLink href="/productos/mayoristas">Mayoristas</NavLink>
        </nav>
        {/* <button className="bg-primary text-white px-6 py-2 text-xs font-bold tracking-widest uppercase hover:bg-opacity-80 transition-all rounded">
          Shop Now
        </button> */}
      </header>

      {/* Hero Section */}
      <section className="relative w-full items-start justify-center overflow-hidden">
        <div
          className="absolute inset-0 parallax-bg sepia-filter opacity-60 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(26,26,26,0.6), rgba(26,26,26,0.9)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBhCALuKQGR8D6eS_iCZ-PNEFTKVY-uMyDqILlwHeHtD7HCDGDyo4McizZhJCM42YSy68aHsqyo-6cLLQUPPNvzKbdAh7hTi1pcKnnCkgXS9PAjA9F2dXxEF3VJUOty1AZVy5TM183QKgTHjOs6SiXczpgltYNcYc8Fg5QwCAQmDasigEijv9Tnj_MmaJvdVHuC5Ov-8tfwoEv4sZYmbphXya2w30HY2dp4jMxrtuJ28ZTUEUpPVFENx9mC_vH4x2SqZWr0ubazTwY')`,
          }}
        />
        <div className="relative z-10 text-center px-4 pt-24">
          <h1 className="font-reklame text-6xl text-white md:text-9xl tracking-tighter mb-4">
            Nuestra Historia
          </h1>
          {/* <div className="w-96 h-px bg-gold mx-auto mb-8"></div> */}
          <p className="max-w-6xl mx-auto text-gold text-2xl leading-relaxed font-century-gothic">
            En Venuti's creemos que la comida tiene el poder de reunir, de crear
            recuerdos y de decir te quiero sin palabras.
          </p>
        </div>

        <div className="py-24 px-6 md:px-20 max-w-7xl mx-auto overflow-hidden relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <p className="text-white text-2xl leading-relaxed mb-6 drop-cap font-century-gothic">
                Nuestra historia comienza en casa, en la cocina familiar. Desde
                pequeña, <span className="font-bold">Antonieta Venuti</span>{" "}
                vivió rodeada de manos que amasan, aromas de sémla y la alegría
                de una mesa que une generaciones. La pasta no era solo comida;
                era tradición, era familia, era amor compartido.
              </p>
            </div>
            <div className="order-1 md:order-2 relative">
              <div className="absolute -top-4 -left-4 w-full h-full border border-gold/20 -z-10"></div>
              <Image
                width={800}
                height={500}
                alt="Vintage recipe book"
                className="w-full h-[500px] object-cover sepia-filter rounded shadow-2xl"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBup6t-t7gsgaD9TJpf2jrSKzitTccBkqNjG4rfbmvYy6AJLdNO4krrcs8jplE1k8bZYElNFeJc8j1YRNjGvBmgbFLU2z2z45YB9OIW8baJ50JoW4fJGYsF0umCNMOXjd-9x_ufsdOiTq9P39BhxIIXWDbrOOrzfNOqrzqcL_KXaEkaWZ-kwOpZV10E_Ncrguv2fGabzDGyKbCIvXPYuKJeAnbxLRWihFWUobZinzG7FVy3Xzoiw4lMsLApb33Pp-z499WfbKUklRM"
              />
            </div>
          </div>
          <p className="text-white text-2xl leading-relaxed mb-6 drop-cap font-century-gothic pt-12">
            Esa conexión profunda con la cocina y el sabor verdadero dio origen
            a <span className="font-bold">Venuti's Gourmet</span>, una marca que
            rescata el arte de la pasta artesanal, hecha a mano, con dedicación,
            respeto por los ingredientes y por las recetas que se trabajan sin
            prisa.
          </p>
        </div>

        <div className=" px-6 md:px-20 max-w-7xl mx-auto overflow-hidden relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -bottom-4 -right-4 w-full h-full border border-primary/30 -z-10"></div>
              <Image
                width={800}
                height={500}
                alt="Artisanal ingredients"
                className="w-full h-[500px] object-cover grayscale brightness-75 rounded shadow-2xl"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuArWYabT3G8I8O_Yf3_4EtBapLaQGW8fFjVKB_pmO8pFiUevZa9pQ7HhyfvjMuFX1bzVMWWk3SifsOrhU4HcoU3pYJtF8k98wzGexkXfDgUZC9Ux89rcez-JG5dManFzUeux48f-ksj0Lvm-kfLGfPmd9MOW_jwi-WIe20eJQy_JUST0p4haA2_8l7FmiKbkbSVeVzyCxjuYD7blJic2xgh5kqfAasaSiIOgqlUfMd4IpZmxjsAdq6w8DHSy6h0ULf1EIYFkiuMJto"
              />
            </div>
            <div>
              <p className="text-white text-2xl leading-relaxed mb-6 drop-cap font-century-gothic">
                Cada pasta que hacemos lleva tiempo, cuidado y atención al
                detalle, porque sabemos que del otro lado hay una mesa, una
                familia y una ocasión especial. Nada aquí es automático: cada
                pieza se rellena, se cierra y se revisa con el mismo cariño con
                el que cocinaríamos para los nuestros.
              </p>
            </div>
          </div>
          <p className="text-white text-2xl leading-relaxed mb-6 drop-cap font-century-gothic pt-12">
            Elegimos <span className="font-bold">sémola de calidad</span>,
            rellenos honestos y sabores equilibrados para que cada bocado se
            sienta auténtico, reconfortable y mmemorable
          </p>
          <p className="text-white text-2xl leading-relaxed mb-6 drop-cap font-century-gothic pt-12">
            Hoy, Venuti's llega tanto a hogares que buscan algo especial, como a
            restaurantes y negocios gastronómicos que valoran la contrancia, la
            calidad y el detalle. Es tradición, es pasión y es amor por lo bien
            hecho.
          </p>
        </div>
      </section>

      {/* Legacy Quote */}
      <section className="relative py-32 overflow-hidden bg-background-dark">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h5 className="text-gold font-bold tracking-widest uppercase font-century-gothic text-4xl">
            Venuti's es ARTE EN TU MESA
          </h5>
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
