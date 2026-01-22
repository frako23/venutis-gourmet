/*
  Warnings:

  - You are about to drop the column `category` on the `Producto` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[celular]` on the table `Cliente` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `categoria` to the `Producto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "category",
ADD COLUMN     "categoria" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_celular_key" ON "Cliente"("celular");
