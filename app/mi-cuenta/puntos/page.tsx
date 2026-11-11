import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MisPuntosVista } from "@/components/mi-cuenta/misPuntos";
import { obtenerMisPuntos, obtenerSesionCliente } from "@/lib/cuenta-cliente";

export const metadata: Metadata = {
  title: "Mis puntos | Venuti's Gourmet",
  description: "Consulta tus puntos y los premios que puedes canjear.",
};

export const dynamic = "force-dynamic";

export default async function MisPuntosPage() {
  const sesion = await obtenerSesionCliente();
  if (sesion.estado !== "vinculada") redirect("/mi-cuenta");
  const datos = await obtenerMisPuntos(sesion.clienteId);
  if (!datos.mostrar) redirect("/mi-cuenta");
  return <MisPuntosVista datos={datos} />;
}
