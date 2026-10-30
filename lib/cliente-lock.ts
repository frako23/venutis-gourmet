import type { Prisma } from "@prisma/client";

/** Bloquea la fila del cliente. Orden fijo de bloqueo: Cliente y luego Transaccion, para evitar interbloqueos. */
export async function bloquearCliente(tx: Prisma.TransactionClient, clienteId: number) {
  const filas = await tx.$queryRaw<Array<{ id: number }>>`SELECT "id" FROM "Cliente" WHERE "id" = ${clienteId} FOR UPDATE`;
  if (filas.length === 0) throw new Error("El cliente no existe.");
}
