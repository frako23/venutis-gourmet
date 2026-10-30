-- CreateEnum
CREATE TYPE "EstadoCuentaCliente" AS ENUM ('vinculada', 'pendiente');

-- CreateEnum
CREATE TYPE "OrigenMovimientoSaldo" AS ENUM ('sobrepago', 'pago_cuenta', 'pedido_cancelado', 'aplicacion_pedido', 'anulacion', 'ajuste');

-- CreateEnum
CREATE TYPE "TipoPremio" AS ENUM ('descuento', 'producto');

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'SaldoAFavor';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoMovimiento" ADD VALUE 'devolucion';
ALTER TYPE "TipoMovimiento" ADD VALUE 'reversion';
ALTER TYPE "TipoMovimiento" ADD VALUE 'ajuste';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "creditoHabilitado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limiteCreditoUsd" DOUBLE PRECISION,
ADD COLUMN     "notasInternas" TEXT;

-- AlterTable
ALTER TABLE "Fidelidad" ADD COLUMN     "actorEmail" TEXT,
ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "premioId" INTEGER;

-- AlterTable
ALTER TABLE "HistorialCliente" ADD COLUMN     "detalle" TEXT;

-- AlterTable
ALTER TABLE "Transaccion" ADD COLUMN     "montoDescuentoPuntos" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CuentaCliente" (
    "id" SERIAL NOT NULL,
    "stackUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "estado" "EstadoCuentaCliente" NOT NULL,
    "confirmadaPorEmail" TEXT,
    "confirmadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoSaldo" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "montoUsd" DOUBLE PRECISION NOT NULL,
    "origen" "OrigenMovimientoSaldo" NOT NULL,
    "transaccionId" INTEGER,
    "pagoId" INTEGER,
    "metodoPago" "MetodoPago",
    "referencia" TEXT,
    "fechaPago" TIMESTAMP(3),
    "montoBs" DOUBLE PRECISION,
    "tasaCambio" DOUBLE PRECISION,
    "motivo" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoSaldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Premio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoPremio" NOT NULL,
    "costoPuntos" INTEGER NOT NULL,
    "montoDescuentoUsd" DOUBLE PRECISION,
    "productoId" INTEGER,
    "cantidad" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Premio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuentaCliente_stackUserId_key" ON "CuentaCliente"("stackUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaCliente_clienteId_key" ON "CuentaCliente"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoSaldo_pagoId_key" ON "MovimientoSaldo"("pagoId");

-- CreateIndex
CREATE INDEX "MovimientoSaldo_clienteId_createdAt_idx" ON "MovimientoSaldo"("clienteId", "createdAt");

-- CreateIndex
CREATE INDEX "MovimientoSaldo_transaccionId_idx" ON "MovimientoSaldo"("transaccionId");

-- CreateIndex
CREATE INDEX "Fidelidad_clienteId_fecha_idx" ON "Fidelidad"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "Fidelidad_transaccionId_idx" ON "Fidelidad"("transaccionId");

-- AddForeignKey
ALTER TABLE "Fidelidad" ADD CONSTRAINT "Fidelidad_premioId_fkey" FOREIGN KEY ("premioId") REFERENCES "Premio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaCliente" ADD CONSTRAINT "CuentaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoSaldo" ADD CONSTRAINT "MovimientoSaldo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoSaldo" ADD CONSTRAINT "MovimientoSaldo_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoSaldo" ADD CONSTRAINT "MovimientoSaldo_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Premio" ADD CONSTRAINT "Premio_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
