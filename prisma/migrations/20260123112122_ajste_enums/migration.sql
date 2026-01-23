/*
  Warnings:

  - The values [tercera] on the enum `TipoDireccion` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'TransferenciaUsd';

-- AlterEnum
BEGIN;
CREATE TYPE "TipoDireccion_new" AS ENUM ('principal', 'secundaria', 'terceraria');
ALTER TABLE "Direccion" ALTER COLUMN "tipo" TYPE "TipoDireccion_new" USING ("tipo"::text::"TipoDireccion_new");
ALTER TYPE "TipoDireccion" RENAME TO "TipoDireccion_old";
ALTER TYPE "TipoDireccion_new" RENAME TO "TipoDireccion";
DROP TYPE "public"."TipoDireccion_old";
COMMIT;
