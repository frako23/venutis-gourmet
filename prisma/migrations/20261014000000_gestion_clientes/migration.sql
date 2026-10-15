-- Gestión administrativa de clientes: campos derivados e historial mínimo.
ALTER TABLE "Cliente"
  ADD COLUMN "rif" TEXT,
  ADD COLUMN "nombreBusqueda" TEXT NOT NULL DEFAULT '';

UPDATE "Cliente"
SET "nombreBusqueda" = regexp_replace(
  translate(
    lower(trim(coalesce("nombre", '') || ' ' || coalesce("apellido", ''))),
    'áéíóúüñ',
    'aeiouun'
  ),
  '\s+', ' ', 'g'
);

ALTER TABLE "Cliente"
  ALTER COLUMN "nombreBusqueda" DROP DEFAULT;

CREATE UNIQUE INDEX "Cliente_rif_key" ON "Cliente"("rif");

CREATE TYPE "AccionHistorialCliente" AS ENUM ('creado', 'actualizado');

CREATE TABLE "HistorialCliente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "accion" "AccionHistorialCliente" NOT NULL,
    "camposModificados" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialCliente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HistorialCliente_clienteId_createdAt_idx" ON "HistorialCliente"("clienteId", "createdAt");

ALTER TABLE "HistorialCliente"
  ADD CONSTRAINT "HistorialCliente_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
