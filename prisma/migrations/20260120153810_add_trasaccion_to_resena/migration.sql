/*
  Warnings:

  - Added the required column `transaccionId` to the `Resena` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Resena_clienteId_productoId_idx";

-- AlterTable
ALTER TABLE "Resena" ADD COLUMN     "transaccionId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Resena_clienteId_productoId_transaccionId_idx" ON "Resena"("clienteId", "productoId", "transaccionId");

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
