import Header from "@/components/admin/header";
import Sidebar from "@/components/admin/sidebar";
import { stackServerApp } from "@/stack/server";
import { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { redirect } from "next/navigation";
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await stackServerApp.getUser();

  // Validar correo autorizado
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(",");

  // 1. Si NO hay usuario, mandarlo al login (Stack suele manejar esto, pero es bueno ser explícito)
  if (!user) {
    redirect("/admin-login");
  }

  // 2. Si está autenticado pero NO autorizado
  if (allowedEmails && !allowedEmails.includes(user.primaryEmail!)) {
    redirect("/unauthorized");
  }

  return (
    // Agregamos 'antialiased' para que la fuente Inter se vea nítida
    <div
      className={`${inter.variable} ${mono.variable} font-sans antialiased flex h-screen bg-background-light overflow-hidden text-slate-900`}
    >
      {/* Sidebar Fija */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header superior */}
        <Header />

        {/* Contenido Dinámico */}
        <main className="flex-1 overflow-y-auto">
          {/* He quitado el padding del div exterior y lo he puesto aquí 
              para que el scroll sea más natural y profesional.
          */}
          <div className="mx-auto">{children}</div>
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
