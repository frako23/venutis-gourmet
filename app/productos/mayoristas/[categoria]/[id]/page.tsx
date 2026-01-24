"use client";

import React, { useState } from "react";
import {
  Search,
  Heart,
  ShoppingCart,
  ChevronRight,
  Star,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
  BadgeCheck,
  ThumbsUp,
  MessageSquare,
  PenSquare,
  Share2,
  EclipseIcon,
} from "lucide-react";

export default function ProductDetail() {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="bg-background-dark text-slate-100 min-h-screen font-display">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/80 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="size-8 text-primary">
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
              <h2 className="text-white text-xl font-bold tracking-tight">
                Venuti's
              </h2>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              {["Vinegars", "Oils", "Truffles", "Gifts"].map((item) => (
                <a
                  key={item}
                  className="text-white/70 hover:text-primary text-sm font-medium transition-colors"
                  href="#"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group hidden lg:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                className="bg-surface-dark border-none rounded-lg pl-10 pr-4 py-2 text-sm w-64 focus:ring-1 focus:ring-primary text-white outline-none"
                placeholder="Search collection..."
                type="text"
              />
            </div>
            <button className="p-2 text-white/70 hover:text-primary transition-colors">
              <Heart size={20} />
            </button>
            <button className="p-2 text-white/70 hover:text-primary transition-colors relative">
              <ShoppingCart size={20} />
              <span className="absolute top-1 right-1 bg-primary text-[10px] font-bold text-white rounded-full size-4 flex items-center justify-center">
                2
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-8 text-sm text-slate-500 font-medium">
          <a className="hover:text-primary" href="#">
            Home
          </a>
          <ChevronRight size={14} />
          <a className="hover:text-primary" href="#">
            Vinegars
          </a>
          <ChevronRight size={14} />
          <span className="text-white">Gold Reserve Balsamic</span>
        </nav>

        {/* Product Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
          {/* Left: Image Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-[4/5] rounded-xl overflow-hidden bg-surface-dark group relative cursor-zoom-in">
              <img
                alt="Aged Balsamic Vinegar"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCN4SpOwn9-91BB6WrPrLRkWp3V9NYlY3hk0ycmN_WKvFvtmrhwd6Y1l_BSdapI37ccEpMg6g2FXj3nlh28eMR5TUSKms9vIYxIUpN8lJ4iV_EWKA3EbbElt-2MytauVUZ6uQm7JMPFvEu-bbi6AGduuTesN7iWj7GohLwDG7JGvjC6vqpI4cfrylMFOZ4ra_i1QQmECbSt3MJaHh1ASsiiqA6Jfbv6l8z2csHXLFkdeaqG1AEgZoSDZxWKB8Ntrn71mFge_OnGukE"
              />
              <div className="absolute top-4 left-4 px-3 py-1 bg-primary/90 text-white text-[10px] font-bold uppercase tracking-widest rounded">
                Best Seller
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[12, 13, 14, 15].map((img, i) => (
                <div
                  key={img}
                  className={`aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${i === 0 ? "border-2 border-primary" : "hover:opacity-80"}`}
                >
                  <img
                    className="w-full h-full object-cover"
                    src={`http://googleusercontent.com/profile/picture/${img}`}
                    alt="Gallery thumbnail"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="sticky top-24">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4 italic font-serif">
                Aged Balsamic Vinegar - Gold Reserve
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex gap-0.5 text-accent">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <span className="text-slate-400 text-sm font-medium">
                  4.9 (128 Reviews)
                </span>
                <span className="h-4 w-[1px] bg-border-dark"></span>
                <span className="text-primary text-sm font-semibold uppercase tracking-tighter">
                  In Stock
                </span>
              </div>

              <p className="text-3xl font-bold text-white mb-8">
                $124.00{" "}
                <span className="text-lg font-normal text-slate-500 line-through ml-2">
                  $145.00
                </span>
              </p>

              <div className="space-y-6 pb-8 border-b border-border-dark mb-8 text-slate-300 leading-relaxed">
                <p>
                  Crafted in the heart of Modena, Italy, our Gold Reserve is
                  aged for 25 years in battery of various woods. Dense, velvety
                  texture with a complex bouquet.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 group">
                    <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <EclipseIcon size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Certified Organic
                    </span>
                  </div>
                  <div className="flex items-center gap-3 group">
                    <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <MapPin size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Origin: Modena
                    </span>
                  </div>
                </div>
              </div>

              {/* Add to Cart Block */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex items-center bg-surface-dark border border-border-dark rounded-lg p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="size-10 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors text-slate-400"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center text-white font-bold">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="size-10 flex items-center justify-center hover:bg-white/5 rounded-md transition-colors text-slate-400"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-3">
                    <ShoppingBag size={18} />
                    Add to Cart
                  </button>
                </div>
                <button className="w-full py-3 px-8 border border-border-dark text-white font-semibold rounded-lg hover:bg-white/5 transition-colors">
                  Subscribe & Save 15%
                </button>
              </div>

              {/* Shipping Info */}
              <div className="mt-8 grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-dark/50 border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Truck className="text-slate-400" size={20} />
                  <div className="text-[10px]">
                    <p className="text-white font-bold uppercase">
                      Free Shipping
                    </p>
                    <p className="text-slate-500">Orders over $150</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BadgeCheck className="text-slate-400" size={20} />
                  <div className="text-[10px]">
                    <p className="text-white font-bold uppercase">Authentic</p>
                    <p className="text-slate-500">DOP Protected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Reviews Section */}
        <section className="py-24 border-t border-border-dark">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
            <div>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">
                Customer Reviews
              </h2>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-black text-white">4.9</p>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    Average
                  </p>
                </div>
                <div className="h-12 w-[1px] bg-border-dark"></div>
                <div className="flex-1 min-w-[240px] space-y-2">
                  <RatingProgress bar="5" percent={92} />
                  <RatingProgress bar="4" percent={6} />
                  <RatingProgress bar="3" percent={2} />
                </div>
              </div>
            </div>
            <button className="bg-surface-dark border border-border-dark text-white font-bold py-3 px-8 rounded-lg hover:border-primary transition-all flex items-center gap-2">
              <PenSquare size={18} />
              Write a Review
            </button>
          </div>

          {/* Bento Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Highlighted Review */}
            <div className="lg:col-span-2 p-8 rounded-2xl bg-surface-dark border border-border-dark flex flex-col justify-between hover:border-primary/40 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      MD
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">
                        Marco Donatelli
                      </p>
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={12} className="text-primary" />
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">
                          Verified Gourmet Member
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    3 days ago
                  </span>
                </div>
                <div className="flex gap-0.5 mb-4 text-accent">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 italic">
                  "Liquid Gold. The complexity is unmatched."
                </h3>
                <p className="text-slate-400 leading-relaxed mb-6">
                  I've tried many traditional balsamics, but the Venuti Gold
                  Reserve is in a class of its own. I used it on a 36-month aged
                  Parmigiano Reggiano and it was a spiritual experience.
                </p>
              </div>
              <div className="flex items-center gap-4 border-t border-border-dark pt-6">
                <ReviewAction icon={ThumbsUp} label="Helpful (24)" />
                <ReviewAction icon={MessageSquare} label="Reply" />
              </div>
            </div>

            {/* Photo Review */}
            <div className="p-6 rounded-2xl bg-surface-dark/40 border border-border-dark flex flex-col hover:border-primary/40 transition-colors">
              <div className="aspect-video w-full rounded-lg overflow-hidden mb-4">
                <img
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgm3JONSj6Fo4l7V6mHRSeJ9lkCWvInF-Zm_dHJ6-1tnw-s8vJJRThz6TiQoCkeNMFQDWEQ6LVBwykhf-61R8WvwGx-u7tIG40C0-PgF2g2qIvlVkbYLmMcT9wi8aMWxcob_hXq9EErA6hGTRV_8Cs5zOePHIyUa_Qn-dqCWjsmgYp0sOC-6Q0o8euuRGeh-DmAd-eLm9k-HoZW1CRzQrqkxv-u_8UcjnhN6te3gbhiCK4L26bqsFqHqelV4dMKCWG84o-l5fqwCg"
                  alt="Review photo"
                />
              </div>
              <p className="text-white text-sm font-bold mb-1">Eliza Beth</p>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                Photo Review
              </span>
              <p className="text-slate-400 text-sm leading-relaxed">
                Look at that shine! Perfection on seasonal fruit.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-dark border-t border-border-dark py-12 px-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 text-white mb-6">
              <div className="size-6 text-primary">
                <svg fill="currentColor" viewBox="0 0 48 48">
                  <path d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold uppercase tracking-widest">
                Venuti's Gourmet
              </h2>
            </div>
            <p className="text-slate-400 text-sm max-w-sm mb-8">
              Sourcing the world's most exceptional ingredients since 1924.
            </p>
            <button className="size-10 rounded-lg bg-background-dark border border-border-dark flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
              <Share2 size={18} />
            </button>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">
              Explore
            </h4>
            <ul className="space-y-3 text-sm text-slate-500">
              {["Our Story", "Journal", "Wholesale", "Gift Cards"].map(
                (link) => (
                  <li key={link}>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      {link}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">
              Support
            </h4>
            <ul className="space-y-3 text-sm text-slate-500">
              {["Shipping Policy", "Refunds", "Contact Us", "FAQ"].map(
                (link) => (
                  <li key={link}>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      {link}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto mt-12 pt-8 border-t border-border-dark flex flex-col md:flex-row justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <p>© 2026 Venuti's Gourmet. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---

function RatingProgress({ bar, percent }: { bar: string; percent: number }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
      <span className="w-2">{bar}</span>
      <div className="flex-1 h-1.5 bg-background-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-1000"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <span className="w-8 text-right">{percent}%</span>
    </div>
  );
}

function ReviewAction({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
      <Icon size={14} />
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
}
