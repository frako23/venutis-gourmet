import Header from "@/components/admin/header";
import Sidebar from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/admin/auth";
import { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Panel Administrativo | Venuti's Gourmet - Gestión de Calidad",
  description:
    "Gestión centralizada de clientes, inventarios y pedidos de Venuti's Gourmet. Control total para garantizar la excelencia en cada entrega artesanal.",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    // Agregamos 'antialiased' para que la fuente Inter se vea nítida
    <div
      data-admin-shell
      className={`${inter.variable} ${mono.variable} flex h-screen overflow-hidden font-sans antialiased`}
    >
      {/* Sidebar Fija */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header superior */}
        <Header />

        {/* Contenido Dinámico */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="h-full">{children}</div>
        </main>
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
    </div>
  );
}
