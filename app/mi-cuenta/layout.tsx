import { Toaster } from "sonner";

import Footer from "@/components/productos/footer";
import Header from "@/components/productos/header";

export default function MiCuentaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-dark font-century-gothic text-[#f9f7f0] antialiased">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      <Footer />
      <Toaster position="top-right" expand={false} richColors theme="light" toastOptions={{ style: { borderRadius: "1.2rem", fontFamily: "var(--font-inter)" } }} />
    </div>
  );
}
