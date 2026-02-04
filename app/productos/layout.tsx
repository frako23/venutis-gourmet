import Footer from "@/components/productos/footer";
import Header from "@/components/productos/header";
import Sidebar from "@/components/productos/sidebar";
import { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Panel Administrativo | Venuti's Gourmet - Gestión de Calidad",
  description:
    "Gestión centralizada de clientes, inventarios y pedidos de Venuti's Gourmet. Control total para garantizar la excelencia en cada entrega artesanal.",
};

export default function ProductosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Agregamos 'antialiased' para que la fuente Inter se vea nítida
    <div className="bg-background-dark text-[#f9f7f0] min-h-screen font-display">
      <Header />
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        <Sidebar />
        {children}
        <Toaster
          position="top-right"
          expand={false}
          richColors
          theme="light"
          toastOptions={{
            style: {
              borderRadius: "1.2rem",
              fontFamily: "var(--font-inter)",
            },
          }}
        />
      </div>
      <Footer />
    </div>
  );
}
