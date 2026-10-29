# Data Model: Orden manual de productos

**Feature**: `009-orden-productos`
**Fecha**: 2026-10-29

## Producto (cambio)

| Campo | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `orden` | `Int` | Sí | — | Posición del producto en el catálogo. Menor = antes. `null` = todavía sin posición: va al final de todas las vistas. |

El resto del modelo no cambia. No se añaden índices: el catálogo tiene unos 30 productos.

### Reglas

- **Orden canónico** (`ORDEN_CATALOGO` en `lib/catalog-order.ts`, la única definición): `orden` ascendente con `null` al final, luego `nombre` ascendente y luego `id` ascendente. Toda consulta que liste productos lo usa; ninguna vista reordena en memoria.
- **Al guardar un orden** se escriben posiciones contiguas `1..N` en todos los productos existentes, según `ordenFinal` (ver [contrato](./contracts/product-order.md)). Tras un guardado no quedan `null`, huecos ni repetidos.
- **Al crear un producto** (`addProduct`): `orden` queda en `null`, así que aparece al final. Si se crean varios antes de reordenar, se desempatan por nombre.
- **Al editar un producto** (ficha, inventario, editor masivo): `orden` no se toca.
- **Al eliminar un producto**: el resto conserva sus valores; el hueco no se ve porque las vistas no muestran el valor guardado sino el puesto en la lista, y desaparece en el siguiente guardado.
- `orden` no tiene unicidad en la base de datos: los empates (por datos antiguos o creaciones concurrentes) se resuelven con el desempate canónico. Una restricción `UNIQUE` complicaría reescribir todas las posiciones en una transacción sin aportar nada visible.

## Orden del catálogo (concepto, no tabla)

Es la secuencia de productos que resulta de aplicar `ORDEN_CATALOGO`. Las vistas la **filtran** (categoría, contexto mayorista, disponibilidad, búsqueda) y nunca la reordenan, de modo que los productos visibles conservan su orden relativo.

## Migración `AAAAMMDDHHMMSS_orden_productos`

1. `ALTER TABLE "Producto" ADD COLUMN "orden" INTEGER;`
2. Rellenar `orden` en todos los productos existentes con `ROW_NUMBER()` sobre:
   1. la posición del nombre en la lista de referencia (los 27 nombres de `PRODUCT_ORDER`, como `VALUES`), o 999 si no aparece;
   2. `createdAt` descendente;
   3. `id` descendente.

   La comparación de nombres usa `translate(upper(x), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ')` en ambos lados (ver [research.md](./research.md), Decisión 3).

La columna es opcional, así que el código anterior sigue funcionando con la migración aplicada: **la migración se aplica antes de desplegar el código**. Tras la migración se ejecuta `npx prisma generate`.

## Transiciones

No hay estados. El único cambio de `orden` fuera de la migración es `guardarOrdenProductos`, que reescribe la secuencia completa.
