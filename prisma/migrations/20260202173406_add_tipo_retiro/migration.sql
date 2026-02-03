/*
  Warnings:

  - Added the required column `tipodeRetiro` to the `Transaccion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoRetiro" AS ENUM ('envio', 'recogida');

-- AlterTable
ALTER TABLE "Transaccion" ADD COLUMN     "tipodeRetiro" "TipoRetiro" NOT NULL;
