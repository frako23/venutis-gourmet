-- La nota de entrega sale de un pedido: número de factura opcional y cantidades con decimales (igual que DetalleCompra).
ALTER TABLE "NotaEntrega" ADD COLUMN "numeroFactura" TEXT;
ALTER TABLE "DetalleNotaEntrega" ALTER COLUMN "cantidad" SET DATA TYPE DOUBLE PRECISION;
