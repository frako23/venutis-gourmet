import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LoginButton } from "./loginButton";
import { ShoppingCartButton } from "./shoppingCartButton";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md border-b-2 border-gold px-6 lg:px-12 py-4 font-century-gothic">
      <div className=" mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo_Venutis.png"
              alt="Logo Venutis"
              width={70}
              height={70}
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-widest">
            <a className="hover:text-gold transition-colors" href="/about-us">
              Nuestra historia
            </a>
            {/* <a className="hover:text-gold transition-colors" href="#">
              Shipping
            </a> */}
            <a
              className="hover:text-gold transition-colors"
              href="/prodcutos/mayoristas"
            >
              Mayoristas
            </a>
          </nav>
        </div>

        <div className="flex flex-1 max-w-md items-center relative">
          <Search className="absolute left-3 text-gold/50" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2 bg-gold/5 border-none rounded-full focus:ring-1 focus:ring-gold/20 text-sm outline-none"
            placeholder="Buscar tus productos favoritos..."
            type="text"
          />
        </div>

        <div className="flex items-center gap-6">
          <LoginButton />

          <ShoppingCartButton />
        </div>
      </div>
    </header>
  );
};

export default Header;
