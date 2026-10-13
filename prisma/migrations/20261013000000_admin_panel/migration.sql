-- Additive migration for the administrative panel redesign.
ALTER TYPE "EstadoTransaccion" ADD VALUE IF NOT EXISTS 'por_cobrar';
ALTER TYPE "EstadoTransaccion" ADD VALUE IF NOT EXISTS 'en_pedido';

CREATE TYPE "TipoDescuento" AS ENUM ('porcentaje', 'usd');

ALTER TABLE "Transaccion"
  ADD COLUMN "montoSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "tipoDescuento" "TipoDescuento",
  ADD COLUMN "valorDescuento" DOUBLE PRECISION,
  ADD COLUMN "montoDescuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "tasaCambio" DOUBLE PRECISION;

UPDATE "Transaccion"
SET "montoSubtotal" = "montoTotal",
    "montoDescuento" = 0
WHERE "montoSubtotal" = 0;

CREATE TABLE "EstadoTransaccionHistorial" (
    "id" SERIAL NOT NULL,
    "transaccionId" INTEGER NOT NULL,
    "estadoAnterior" "EstadoTransaccion",
    "estadoNuevo" "EstadoTransaccion" NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstadoTransaccionHistorial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotaEntrega" (
    "id" SERIAL NOT NULL,
    "numeroNota" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "transaccionId" INTEGER,
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direccionEntrega" TEXT,
    "personaRecibe" TEXT,
    "observaciones" TEXT,
    "creadoPorId" TEXT,
    "creadoPorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotaEntrega_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DetalleNotaEntrega" (
    "id" SERIAL NOT NULL,
    "notaEntregaId" INTEGER NOT NULL,
    "productoId" INTEGER,
    "productoNombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitarioUsd" DOUBLE PRECISION,
    "subtotalUsd" DOUBLE PRECISION,

    CONSTRAINT "DetalleNotaEntrega_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transaccion_fechaCompra_estado_idx" ON "Transaccion"("fechaCompra", "estado");
CREATE INDEX "Transaccion_clienteId_fechaCompra_idx" ON "Transaccion"("clienteId", "fechaCompra");
CREATE INDEX "DetalleCompra_productoId_transaccionId_idx" ON "DetalleCompra"("productoId", "transaccionId");
CREATE INDEX "EstadoTransaccionHistorial_transaccionId_createdAt_idx" ON "EstadoTransaccionHistorial"("transaccionId", "createdAt");
CREATE UNIQUE INDEX "NotaEntrega_numeroNota_key" ON "NotaEntrega"("numeroNota");
CREATE INDEX "NotaEntrega_clienteId_fechaEntrega_idx" ON "NotaEntrega"("clienteId", "fechaEntrega");
CREATE INDEX "NotaEntrega_transaccionId_idx" ON "NotaEntrega"("transaccionId");
CREATE INDEX "DetalleNotaEntrega_notaEntregaId_idx" ON "DetalleNotaEntrega"("notaEntregaId");
CREATE INDEX "DetalleNotaEntrega_productoId_idx" ON "DetalleNotaEntrega"("productoId");

ALTER TABLE "EstadoTransaccionHistorial"
  ADD CONSTRAINT "EstadoTransaccionHistorial_transaccionId_fkey"
  FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotaEntrega"
  ADD CONSTRAINT "NotaEntrega_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NotaEntrega_transaccionId_fkey"
  FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DetalleNotaEntrega"
  ADD CONSTRAINT "DetalleNotaEntrega_notaEntregaId_fkey"
  FOREIGN KEY ("notaEntregaId") REFERENCES "NotaEntrega"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DetalleNotaEntrega_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
