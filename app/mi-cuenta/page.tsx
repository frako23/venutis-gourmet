import type { Metadata } from "next";

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
    <>
      {sesion.estado === "anonimo" && <AccesoCliente />}
      {sesion.estado === "correo_sin_verificar" && <VerificarCorreo email={sesion.email} />}
      {sesion.estado === "sin_vinculo" && <RegistroCliente email={sesion.email} nombreSugerido={sesion.nombreSugerido} />}
      {sesion.estado === "pendiente" && <VinculoPendiente email={sesion.email} />}
      {resumen && <ResumenCuentaVista resumen={resumen} />}
    </>
  );
}
