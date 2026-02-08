/*
  Warnings:

  - You are about to drop the column `imagenes[0]` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `precio` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the `Inventario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Inventario" DROP CONSTRAINT "Inventario_productoId_fkey";

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "imagenes[0]",
DROP COLUMN "precio",
ADD COLUMN     "inventario" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "precioDetal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "precioMayorista" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "tipoCliente" "TipoCliente" NOT NULL DEFAULT 'detal',
ADD COLUMN     "ubicacion" TEXT;

-- AlterTable
ALTER TABLE "Transaccion" ALTER COLUMN "tipodeRetiro" SET DEFAULT 'envio';

-- DropTable
DROP TABLE "public"."Inventario";

-- CreateTable
CREATE TABLE "Imagen" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Imagen_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Imagen" ADD CONSTRAINT "Imagen_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
