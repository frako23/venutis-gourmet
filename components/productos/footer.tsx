import { Globe, Mail, Phone } from "lucide-react";
import React from "react";

const Footer = () => {
  return (
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
            Sourcing the finest Italian delicacies since 1924. Our commitment to
            heritage, quality, and artisan producers remains unchanged.
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
  );
};

export default Footer;

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
