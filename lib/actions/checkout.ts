"use server";

import { obtenerClienteDeSesion } from "@/lib/cuenta-cliente";
import { type CheckoutData, type CheckoutFailure, type CheckoutSuccess, registrarCompraWeb } from "../checkout-core";

export type { CheckoutData };

type CheckoutState = { message: string; status: string; clientId: number | null };

/** Acción de la tienda: resuelve la sesión del cliente y delega en el núcleo transaccional. */
export async function procesarCompra(
  _prevState: CheckoutState,
  datos: CheckoutData,
): Promise<CheckoutSuccess | CheckoutFailure> {
  return registrarCompraWeb(datos, { clienteSesionId: await obtenerClienteDeSesion() });
}
