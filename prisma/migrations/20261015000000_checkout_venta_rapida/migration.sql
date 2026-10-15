ALTER TABLE "Transaccion"
  ADD COLUMN "montoDelivery" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "zonaEntrega" TEXT,
  ADD COLUMN "aliasEntrega" TEXT,
  ADD COLUMN "direccionEntrega" TEXT,
  ADD COLUMN "claveIdempotencia" TEXT;

CREATE UNIQUE INDEX "Transaccion_claveIdempotencia_key"
  ON "Transaccion"("claveIdempotencia");
