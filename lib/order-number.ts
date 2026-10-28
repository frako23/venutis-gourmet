import type { Prisma } from "@prisma/client";

/** Siguiente número de orden correlativo (4 dígitos), desde la secuencia `orden_correlativo_seq`. */
export async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const [{ nextval }] = await tx.$queryRaw<Array<{ nextval: bigint }>>`SELECT nextval('orden_correlativo_seq') AS nextval`;
  return String(nextval).padStart(4, "0");
}
