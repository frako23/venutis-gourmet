import {
  Search,
  UserCircle,
  ShoppingBag,
  Wine,
  UtensilsCrossed,
  Fish,
  Droplets,
  Soup,
  Gift,
  ChevronDown,
  Eye,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  Phone,
  Star,
  StarHalf,
} from "lucide-react";
import Image from "next/image";

export default function Productos() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-[#1d0c10] dark:text-[#f9f7f0] min-h-screen font-display">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-6 lg:px-12 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
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
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-widest">
              <a className="hover:text-primary transition-colors" href="#">
                Our Heritage
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Shipping
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Wholesale
              </a>
            </nav>
          </div>

          <div className="flex flex-1 max-w-md items-center relative">
            <Search className="absolute left-3 text-primary/50" size={18} />
            <input
              className="w-full pl-10 pr-4 py-2 bg-primary/5 border-none rounded-full focus:ring-1 focus:ring-primary/20 text-sm outline-none"
              placeholder="Search our cellars..."
              type="text"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter hover:text-primary transition-colors">
              <UserCircle size={20} />
              <span className="hidden sm:inline">Login</span>
            </button>
            <button className="relative p-2 rounded-full bg-accent-gold/10 text-accent-gold hover:bg-accent-gold hover:text-white transition-all duration-300">
              <ShoppingBag size={20} />
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-background-light">
                3
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 p-6 lg:p-10 border-r border-primary/5 shrink-0">
          <div className="sticky top-28">
            <div className="mb-10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-gold mb-4">
                Marketplace
              </h3>
              <ul className="space-y-1">
                <SidebarItem icon={Wine} label="Wines" active />
                <SidebarItem icon={UtensilsCrossed} label="Cheese" />
                <SidebarItem icon={Fish} label="Charcuterie" />
                <SidebarItem icon={Droplets} label="Truffles & Oils" />
                <SidebarItem icon={Soup} label="Pastas" />
                <SidebarItem icon={Gift} label="Gift Baskets" />
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary/40 dark:text-gold mb-4">
                Filter By
              </h3>
              <div className="space-y-4">
                <FilterCheckbox label="Imported Only" />
                <FilterCheckbox label="Organic" />
                <FilterCheckbox label="On Sale" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-12 overflow-x-hidden">
          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-2xl mb-16 group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-transparent z-10"></div>
            <div
              className="relative aspect-[21/9] w-full bg-center bg-cover transition-transform duration-1000 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD3ptxr431Bb03rx6Bfnn-KP6jUnJBndcQILf74kTCuNQB8yLpPTx5Vtn1a_bxFSiWGuMGbgcM-NFD94AosXBknfdXLnPX9XuXetyDX9RXUEUCFjy5ljIETM8WtZU96QI_BsYVfz7OgK4rJ5VRTVMszwBqDPijvZ2i2SnubtSRv5ZuV6LL9lO0rBhkdIvyh6st2GTUXs5oGSI0w3b6s233q9zP6mbmXFWF0bZ6KSqJj8KciuSO8Qj5UaLFxRjalIgCfZVvfrgCn2bU')`,
              }}
            />
            <div className="absolute inset-0 z-20 flex flex-col justify-center px-12 max-w-2xl">
              <span className="text-accent-gold font-bold tracking-[0.3em] uppercase text-xs mb-4">
                Limited Release
              </span>
              <h2 className="text-white text-4xl lg:text-6xl font-serif mb-6 leading-tight">
                The Autumn Harvest Collection
              </h2>
              <p className="text-white/80 text-lg mb-8 font-light">
                Experience the rich, earthy flavors of our seasonal curation.
                Featuring limited edition aged balsamic and reserve Chianti
                Classico.
              </p>
              <div className="flex gap-4">
                <button className="bg-primary text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-primary/85 transition-all">
                  Shop Collection
                </button>
                <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-white/20 transition-all">
                  Learn More
                </button>
              </div>
            </div>
          </section>

          {/* Product Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-primary/5 pb-6">
            <h2 className="text-2xl font-serif italic">
              Curated Wines{" "}
              <span className="text-primary/30 text-base font-sans ml-2 not-italic">
                (42 items)
              </span>
            </h2>
            <div className="flex gap-3 flex-wrap">
              <ToolbarButton label="Sort: Featured" />
              <ToolbarButton label="Price: Low-High" />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            <ProductCard
              badge="Award Winner"
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuAwscoo_CCm6gz8ten5xtQYlnWRB9qJkKzuJSiyo_NprWCXVvJhGO_DqxrlZjV8SYA0QDKZ2MLbXvverY2bXEnBEKWwq9kOsXvWjMlVae_yWnqJvQhiOizQJkeVBYc3FZu61ji9cSVrV4rL6QM7YX4S3bWdELYhM5ByUKQUZhLrsy739QST9dnz8DtRGlmTurfbYck-TD5FcTYCfO9VD3SvkKD8_pD6IuzDHkOt3DVy-MkuBzst4yfqXmdBte1dHdoj2gSlAWRK94M"
              title="Castellani Chianti Classico"
              price="34.00"
              desc="A bold reserve from the heart of Tuscany, notes of cherry and toasted oak."
            />
            <ProductCard
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuC_w4MsK0bl24HMabd9OzFfYsFjUP2yGlPPSDv5L7sqLsyLrAJNK_EPvnykKPJC1ypZP0QraIkMVMvsoixSMJ0TrRhTdMR-z4H-fYb_eoSUrFuZIefa8m8BmP-ZnRWZYwRaww6kVo4m7nEBYPCV-3J7MtMEm2zXF9OGmuJB3v6Y1-Qfbs-glOQs4E70dOoNfts3U1Df6rlHNfyxQxSlgS3CxhTms97q3JjeAFXFA8wmvOuEiYpAJPQrZ4t0BG4Yuyycx0pJes0n1yk"
              title="Aged Pecorino Romano"
              price="18.50"
              desc="24-month aged sheep's milk cheese, sharp and slightly salty finish."
            />
            <ProductCard
              badge="Rare Find"
              badgeColor="bg-primary"
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuBOWDBLCboSBKPyc3pTxLxXEtE8TJHqDf6Og9p8LBhGe8CDjceMCMgPJXv0pAklHESGs926D7id2EpANjzhfFKsel6QGRdeZ0EEph3zSe99yFCbM5WgwNlJhHZl78xrOc0vGIy4Ad9kVzzJiatkzf0If7fOoYZo9d2yGIS2XS4v8fYDKHKiJPkMYwVT-_EimCWzZsiBN8j94jPLNp_tPKYE_j5MSH3-pjCCVEGkt_ERzMmiqBNtjSIftyrHbkMBePhxdYZQ7MU7DAg"
              title="Artisanal Prosciutto"
              price="22.00"
              desc="Traditional dry-cured ham from Parma, paper-thin and melt-in-the-mouth."
            />
          </div>

          {/* Pagination */}
          <div className="mt-20 flex justify-center items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary dark:bg-parchment  transition-colors">
              <ChevronLeft
                size={20}
                className="dark:text-primary text-parchment"
              />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white font-bold">
              1
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full  transition-colors text-primary/60">
              2
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full  transition-colors text-primary/60">
              3
            </button>
            <span className="px-2 text-primary/40">...</span>
            <button className="w-10 h-10 flex items-center justify-center rounded-full  transition-colors text-primary/60">
              8
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary dark:bg-parchment  transition-colors">
              <ChevronRight
                size={20}
                className="dark:text-primary text-parchment"
              />
            </button>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-white/60 py-12 px-6 lg:px-12 mt-20">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6 text-white">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 48 48">
                <path d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" />
              </svg>
              <span className="text-xl font-black uppercase tracking-tighter">
                Venuti's Gourmet
              </span>
            </div>
            <p className="max-w-md text-sm leading-relaxed mb-6">
              Sourcing the finest Italian delicacies since 1924. Our commitment
              to heritage, quality, and artisan producers remains unchanged.
            </p>
            <div className="flex gap-4">
              <FooterSocial icon={Globe} />
              <FooterSocial icon={Mail} />
              <FooterSocial icon={Phone} />
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">
              Shop
            </h4>
            <ul className="space-y-4 text-sm">
              <FooterLink label="New Arrivals" />
              <FooterLink label="Best Sellers" />
              <FooterLink label="Gift Cards" />
              <FooterLink label="Subscriptions" />
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">
              Support
            </h4>
            <ul className="space-y-4 text-sm">
              <FooterLink label="Track Order" />
              <FooterLink label="Shipping Policy" />
              <FooterLink label="FAQ" />
              <FooterLink label="Contact Us" />
            </ul>
          </div>
        </div>
        <div className="max-w-[1440px] mx-auto border-t border-white/10 mt-12 pt-8 text-[10px] uppercase tracking-[0.2em] flex justify-between">
          <p>© 2026 Venuti's Gourmet. All Rights Reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-components ---

function SidebarItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <li>
      <a
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
          active
            ? "bg-primary text-white shadow-lg shadow-primary/20"
            : "hover:bg-primary/5"
        }`}
        href="#"
      >
        <Icon
          className={`${active ? "text-white" : "text-primary/60 group-hover:text-primary"}`}
          size={18}
        />
        <span className="font-medium text-sm">{label}</span>
      </a>
    </li>
  );
}

function FilterCheckbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        className="rounded text-primary focus:ring-primary bg-background-light border-primary/20"
        type="checkbox"
      />
      <span className="text-sm font-medium group-hover:text-primary transition-colors">
        {label}
      </span>
    </label>
  );
}

function ToolbarButton({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-parchment dark:bg-primary/10 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-primary/5 transition-colors">
      <span>{label}</span>
      <ChevronDown size={14} />
    </button>
  );
}

function ProductCard({
  image,
  title,
  price,
  desc,
  badge,
  badgeColor = "bg-accent-gold",
  rating = 5, // Nueva prop para estrellas
  reviews = 3, // Nueva prop para número de reseñas
  stock = 5, // Nueva prop para inventario
}: any) {
  // Lógica para renderizar estrellas (ej. 4.5)
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-accent-gold">
        {[...Array(5)].map((_, i) => {
          const starValue = i + 1;
          if (starValue <= rating)
            return <Star key={i} size={12} fill="currentColor" />;
          if (starValue - 0.5 <= rating)
            return <StarHalf key={i} size={12} fill="currentColor" />;
          return (
            <Star
              key={i}
              size={12}
              className="text-gray-300 dark:text-gray-600"
            />
          );
        })}
        <span className="text-[10px] text-primary/40 dark:text-gold/40 ml-1">
          ({reviews})
        </span>
      </div>
    );
  };

  return (
    <div className="group bg-parchment dark:bg-primary/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border border-transparent hover:border-primary/10 flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden">
        {badge && (
          <div className="absolute top-4 left-4 z-10">
            <span
              className={`${badgeColor} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full`}
            >
              {badge}
            </span>
          </div>
        )}
        <Image
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          src={image}
        />
        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
          <button className="bg-white text-primary p-3 rounded-full hover:bg-gold hover:text-white transition-all shadow-xl">
            <Eye size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        {/* Calificación */}
        <div className="mb-2">{renderStars(rating)}</div>

        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-serif italic group-hover:text-primary dark:group-hover:text-gold transition-colors">
            {title}
          </h3>
          <span className="text-xl font-bold text-primary dark:text-gold">
            ${price}
          </span>
        </div>

        <p className="text-sm text-primary/60 dark:text-gold/70 mb-4 line-clamp-2">
          {desc}
        </p>

        {/* Sección de Inventario / Stock */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <span
              className={`text-[10px] uppercase font-bold tracking-tighter ${stock < 5 ? "text-red-500" : "text-primary/40 dark:text-gold/40"}`}
            >
              {stock === 0
                ? "Out of Stock"
                : stock < 5
                  ? `Only ${stock} left in stock`
                  : "In Stock"}
            </span>
            <span className="text-[10px] font-mono opacity-40">
              {stock} units
            </span>
          </div>
          <div className="h-1 w-full bg-primary/10 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${stock < 5 ? "bg-red-500" : "bg-primary dark:bg-gold"}`}
              style={{ width: `${Math.min((stock / 20) * 100, 100)}%` }} // Asumiendo 20 como stock "lleno"
            />
          </div>
        </div>

        <button
          disabled={stock === 0}
          className={`mt-auto w-full py-3 rounded-lg font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all shadow-lg 
            ${
              stock === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-primary text-white hover:bg-primary/90 shadow-primary/10"
            }`}
        >
          <ShoppingCart size={14} />
          {stock === 0 ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

function FooterSocial({ icon: Icon }: { icon: any }) {
  return (
    <a className="hover:text-white transition-colors" href="#">
      <Icon size={20} strokeWidth={1.5} />
    </a>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <li>
      <a className="hover:text-white transition-colors" href="#">
        {label}
      </a>
    </li>
  );
}
