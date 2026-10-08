import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginButton } from "./loginButton";
import { PurchaseContextSwitcher } from "./purchaseContextSwitcher";
import { ShoppingCartButton } from "./shoppingCartButton";

const Header = ({ showContextSwitcher = false }: { showContextSwitcher?: boolean }) => {
  return (
    <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md border-b-2 border-gold px-6 lg:px-12 py-4 font-century-gothic">
      <div className=" mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-venutis.avif"
              alt="Logo Venutis"
              width={70}
              height={70}
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-widest">
            <Link className="hover:text-gold transition-colors" href="/about-us">
              Nuestra historia
            </Link>
            {/* <a className="hover:text-gold transition-colors" href="#">
              Shipping
            </a> */}
            <Link
              className="hover:text-gold transition-colors"
              href="/productos/consumidores?contexto=mayorista"
            >
              Mayoristas
            </Link>
          </nav>
        </div>
        {/* 
        <div className="flex flex-1 max-w-md items-center relative">
          <Search className="absolute left-3 text-gold/50" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2 bg-gold/5 border-none rounded-full focus:ring-1 focus:ring-gold/20 text-sm outline-none"
            placeholder="Buscar tus productos favoritos..."
            type="text"
          />
        </div> */}

        <div className="flex items-center gap-6">
          {showContextSwitcher && (
            <Suspense
              fallback={
                <div className="h-9 w-40 animate-pulse rounded-full bg-gold/10" />
              }
            >
              <PurchaseContextSwitcher />
            </Suspense>
          )}
          <LoginButton />

          <ShoppingCartButton />
        </div>
      </div>
    </header>
  );
};

export default Header;
