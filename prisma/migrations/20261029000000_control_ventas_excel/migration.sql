-- Control de ventas desde Excel: tipo de precio, cantidades decimales, abonos y equivalencias de carga.

-- CreateEnum
CREATE TYPE "TipoPrecio" AS ENUM ('detal', 'mayor', 'promo');

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'NoEspecificado';

-- AlterTable
ALTER TABLE "Cliente" ALTER COLUMN "celular" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Producto" ALTER COLUMN "inventario" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DetalleCompra" ALTER COLUMN "cantidad" SET DATA TYPE DOUBLE PRECISION,
ADD COLUMN "tipoPrecio" "TipoPrecio";

-- AlterTable
ALTER TABLE "Transaccion" ADD COLUMN "importada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN "esAbono" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "actorId" TEXT,
ADD COLUMN "actorEmail" TEXT,
ADD COLUMN "anuladoEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EquivalenciaProducto" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "grupo" TEXT,
    "producto" TEXT NOT NULL,
    "sabor" TEXT,
    "gramos" INTEGER,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquivalenciaProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquivalenciaCliente" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquivalenciaCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquivalenciaProducto_clave_key" ON "EquivalenciaProducto"("clave");
CREATE INDEX "EquivalenciaProducto_productoId_idx" ON "EquivalenciaProducto"("productoId");
CREATE UNIQUE INDEX "EquivalenciaCliente_clave_key" ON "EquivalenciaCliente"("clave");
CREATE INDEX "EquivalenciaCliente_clienteId_idx" ON "EquivalenciaCliente"("clienteId");

-- AddForeignKey
ALTER TABLE "EquivalenciaProducto" ADD CONSTRAINT "EquivalenciaProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquivalenciaCliente" ADD CONSTRAINT "EquivalenciaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
