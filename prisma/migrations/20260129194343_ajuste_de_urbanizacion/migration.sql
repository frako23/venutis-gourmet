/*
  Warnings:

  - You are about to drop the column `urbanizacion` on the `Cliente` table. All the data in the column will be lost.
  - Added the required column `urbanizacion` to the `Direccion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "urbanizacion";

-- AlterTable
ALTER TABLE "Direccion" ADD COLUMN     "urbanizacion" TEXT NOT NULL;
