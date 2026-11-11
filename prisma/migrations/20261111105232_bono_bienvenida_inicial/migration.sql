-- Bono de bienvenida para los consumidores que ya tenían su cuenta vinculada (spec 014, FR-034).
-- Va en una migración aparte: PostgreSQL no permite usar un valor de enum en la misma transacción que lo crea.
INSERT INTO "Fidelidad" ("clienteId", "tipoMovimiento", "puntos", "descripcion")
SELECT c."id", 'bono'::"TipoMovimiento", 25, 'Bono de bienvenida'
FROM "Cliente" c
JOIN "CuentaCliente" cc ON cc."clienteId" = c."id"
WHERE c."tipoCliente" = 'detal'
  AND cc."estado" = 'vinculada'
  AND NOT EXISTS (
    SELECT 1 FROM "Fidelidad" f WHERE f."clienteId" = c."id" AND f."tipoMovimiento" = 'bono'
  );
