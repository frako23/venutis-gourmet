-- AlterEnum
ALTER TYPE "TipoMovimiento" ADD VALUE 'bono';

-- AlterEnum
ALTER TYPE "TipoPremio" ADD VALUE 'delivery';

-- AlterTable
ALTER TABLE "Premio" ADD COLUMN     "compraMinimaUsd" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Transaccion" ADD COLUMN     "montoDescuentoDelivery" DOUBLE PRECISION NOT NULL DEFAULT 0;
