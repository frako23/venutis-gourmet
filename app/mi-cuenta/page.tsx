import type { Metadata } from "next";
import { Toaster } from "sonner";

import Footer from "@/components/productos/footer";
import Header from "@/components/productos/header";
import { AccesoCliente } from "@/components/mi-cuenta/accesoCliente";
import { RegistroCliente } from "@/components/mi-cuenta/registroCliente";
import { ResumenCuentaVista } from "@/components/mi-cuenta/resumenCuenta";
import { VerificarCorreo } from "@/components/mi-cuenta/verificarCorreo";
import { VinculoPendiente } from "@/components/mi-cuenta/vinculoPendiente";
import { obtenerResumenCuenta, obtenerSesionCliente } from "@/lib/cuenta-cliente";

export const metadata: Metadata = {
  title: "Mi cuenta | Venuti's Gourmet",
  description: "Consulta tus puntos de fidelización, tu saldo y tus pedidos.",
};

export const dynamic = "force-dynamic";

export default async function MiCuentaPage() {
  const sesion = await obtenerSesionCliente();
  const resumen = sesion.estado === "vinculada" ? await obtenerResumenCuenta(sesion.clienteId) : null;

  return (
    <div className="min-h-screen bg-background-dark font-century-gothic text-[#f9f7f0] antialiased">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {sesion.estado === "anonimo" && <AccesoCliente />}
        {sesion.estado === "correo_sin_verificar" && <VerificarCorreo email={sesion.email} />}
        {sesion.estado === "sin_vinculo" && <RegistroCliente email={sesion.email} nombreSugerido={sesion.nombreSugerido} />}
        {sesion.estado === "pendiente" && <VinculoPendiente email={sesion.email} />}
        {resumen && <ResumenCuentaVista resumen={resumen} />}
      </main>
      <Footer />
      <Toaster position="top-right" expand={false} richColors theme="light" toastOptions={{ style: { borderRadius: "1.2rem", fontFamily: "var(--font-inter)" } }} />
    </div>
  );
}
