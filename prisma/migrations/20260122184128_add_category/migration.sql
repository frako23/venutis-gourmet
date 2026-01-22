/*
  Warnings:

  - Added the required column `category` to the `Producto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "category" TEXT NOT NULL;
