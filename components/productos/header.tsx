import { Search, ShoppingBag, UserCircle } from "lucide-react";
import React from "react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-6 lg:px-12 py-4">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-12">
          <a href="/" className="flex items-center gap-3">
            <div className="text-primary dark:text-gold">
              <svg
                className="w-8 h-8"
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
            <h1 className="text-2xl font-black tracking-tight text-primary dark:text-gold uppercase">
              Venuti's
            </h1>
          </a>
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
          <button className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter hover:text-gold transition-colors">
            <UserCircle size={20} />
            <span className="hidden sm:inline">Ingresar</span>
          </button>
          <a
            href="/productos/finalizar-compra"
            className="relative p-2 rounded-full bg-accent-gold/10 text-accent-gold hover:bg-accent-gold hover:text-white transition-all duration-300"
          >
            <ShoppingBag size={20} />
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-background-light">
              3
            </span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
