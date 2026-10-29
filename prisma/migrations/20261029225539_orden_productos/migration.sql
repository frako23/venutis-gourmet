-- Orden manual del catálogo. La columna es opcional: null = sin posición (va al final).
-- Se rellena replicando el orden que mostraba la tienda (PRODUCT_ORDER, con 999 para los
-- nombres no reconocidos y createdAt descendente como desempate). La comparación usa
-- translate() para no depender de la configuración regional de la base (tildes y "ñ").
ALTER TABLE "Producto" ADD COLUMN "orden" INTEGER;

WITH referencia(nombre, posicion) AS (
  VALUES
    ('RAVIOLI DE CARNE', 1),
    ('RAVIOLI DE RICOTTA Y ESPINACA', 2),
    ('RAVIOLI DE RICOTTA Y AJOPORRO', 3),
    ('RAVIOLI DE RICOTTA Y CHAMPIÑONES', 4),
    ('RAVIOLI DE RICOTTA Y TOCINETA AHUMADA', 5),
    ('TORTELLONI DE RICOTTA Y ESPINACA', 6),
    ('TORTELLINI DE CARNE', 7),
    ('GNOCCHI DE PAPAS', 8),
    ('GNOCCHI DE AUYAMA', 9),
    ('MEZZALUNA DE CAMARONES', 10),
    ('FUSILLI', 11),
    ('CAVATELLI', 12),
    ('TAGLIATELLE', 13),
    ('TAGLIATELLE DI SEPPIA', 14),
    ('PASTICHO TRADICIONAL', 15),
    ('PASTICHO FAMILIAR', 16),
    ('LASAGNA MINI ALBONDIGAS', 17),
    ('BERENJENA A LA PARMESSANA', 18),
    ('SALSA NAPOLI', 19),
    ('SALSA BOLOGNA', 20),
    ('SALSA ATÚN', 21),
    ('SALSA CREMA DE CHAMPIÑÓN', 22),
    ('SALSA CUATRO QUESOS', 23),
    ('SALSA PESTO DE ALBAHACA', 24),
    ('TRUFAS DE CHOCOLATE', 25),
    ('PANQUÉ DE LIMÓN', 26),
    ('PAN DE JAMÓN', 27)
),
numerados AS (
  SELECT p."id",
         ROW_NUMBER() OVER (ORDER BY COALESCE(r.posicion, 999), p."createdAt" DESC, p."id" DESC) AS orden
  FROM "Producto" p
  LEFT JOIN referencia r
    ON translate(upper(p."nombre"), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ') = translate(upper(r.nombre), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ')
)
UPDATE "Producto" p SET "orden" = n.orden FROM numerados n WHERE p."id" = n."id";
