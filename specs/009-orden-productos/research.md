# Research: Orden manual de productos, igual en todas las vistas

**Feature**: `009-orden-productos`
**Fecha**: 2026-10-29

El Technical Context no dejó incógnitas abiertas: la spec fijó el alcance ("todas las vistas" incluye los selectores del panel), el orden único global y el orden inicial (el de la tienda). Esta investigación fija las decisiones de diseño a partir del código existente.

## Hallazgos del código actual

- `Producto` no tiene ningún campo de orden. El orden de presentación se decide en memoria con mapas `nombre → posición` escritos a mano:
  - `PRODUCT_ORDER` en `lib/constants/constants.ts` (27 nombres en mayúsculas). Lo usan la tienda (`app/productos/consumidores/page.tsx`, clave `nombre.toUpperCase()`, `|| 999`), la cotización rápida (`app/cotizacion-rapida/page.tsx`, clave `nombre.trim().toUpperCase()`, `?? 999`) y su relectura (`lib/actions/cotizacion-rapida.ts`).
  - Una copia **distinta** en `app/venta-rapida/page.tsx` (30 posiciones, con alias y nombres sin acentos vía `normalizeProductName`). Por ejemplo, "Mezzaluna de camarones" es 6 aquí y 10 en la tienda.
  - Los productos que el mapa no reconoce quedan al final en el orden de la consulta (`createdAt desc`), gracias a que `Array.prototype.sort` es estable.
- El panel ordena por otros criterios: `nombre asc` en venta manual (`app/admin/add-transaction`), pedidos (`app/admin/transactions`), nueva nota de entrega (`app/admin/delivery-notes/new`), analíticas de ventas (`app/admin/analytics/sales`) y catálogo de la carga de Excel (`lib/admin/sales-import.ts`); `createdAt desc` en inventario (`app/admin/inventory`).
- El detalle de producto (`app/productos/consumidores/[id]`) no lista otros productos. `/` redirige a la tienda.
- Solo `addProduct` (`lib/actions/products.ts`) crea productos en la app; los tests de integración crean productos en sus fixtures (7 archivos) sin conocer ningún campo de orden.
- `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities` **ya son dependencias** y se usan para ordenar las fotos de un producto (`components/admin/edit-product/editProductForm.tsx`, `components/producto/sortableImage.tsx`) con `PointerSensor` (distancia 8) y `KeyboardSensor`.
- `requireAdmin()` (`lib/admin/auth.ts`) es la verificación de autorización de las acciones del panel; `editInventory` y `editInventoryMasiva` ya la usan.
- `app/venta-rapida/page.tsx` crea `new PrismaClient()` en cada petición en lugar de usar el singleton `lib/prisma.ts`.
- Las migraciones se aplican a mano (`npx prisma migrate deploy`); el build no las ejecuta.
- Los módulos que cargan los tests (`node:test` + ts-node) usan imports relativos con extensión explícita y nunca `@/`.

## Decisión 1: Guardar la posición en el producto, como entero opcional

**Decisión**: Se añade `Producto.orden Int?`. Un valor menor va antes. `null` significa "todavía sin posición" y siempre queda al final. La migración asigna una posición a todos los productos existentes; los productos creados después nacen con `null` (al final) hasta que la dueña guarda un orden, que reescribe posiciones contiguas `1..N` para todo el catálogo.

**Razonamiento**:

- La posición pertenece al producto, así que renombrarlo o editarlo no la altera (FR-007), a diferencia del mapa por nombre actual.
- Con `null` al final, un producto nuevo queda último sin tocar `addProduct` ni los fixtures de los tests (FR-013), y cualquier camino futuro de creación hereda el comportamiento correcto.
- Reescribir `1..N` en cada guardado mantiene los datos limpios (sin huecos acumulados tras eliminar productos) y hace que el resultado no dependa de valores anteriores.

**Alternativas consideradas**:

- **`orden Int` obligatorio y `addProduct` calcula `max + 1`**: descartada. Obliga a tocar `addProduct` y los 7 archivos de tests con fixtures; un `@default(0)` lo evitaría pero pondría primero, en silencio, a cualquier producto creado por otro camino.
- **Tabla aparte con el orden (o una lista de ids en una fila de configuración)**: descartada. Añade un modelo y un join para un dato que es un atributo del producto.
- **Posiciones fraccionarias o "lexorank" para mover un producto con una sola escritura**: descartada. Con unos 30 productos reescribir todas las posiciones cuesta poco y es mucho más simple de razonar.

## Decisión 2: Una sola definición del orden, aplicada en la consulta

**Decisión**: `lib/catalog-order.ts` exporta `ORDEN_CATALOGO`, el `orderBy` de Prisma que usan **todas** las consultas de listas de productos:

1. `orden` ascendente, con `null` al final;
2. `nombre` ascendente (desempate de FR-012);
3. `id` ascendente (desempate final, totalmente determinista).

Las vistas dejan de ordenar en memoria; solo filtran (categoría, contexto mayorista, disponibilidad, búsqueda), y filtrar conserva el orden relativo (FR-009).

**Razonamiento**: Es la "regla de negocio que debe vivir en un único lugar" del Principio I y tiene 11 usos reales. Ordenar en la base de datos evita que cada vista reimplemente el criterio, que es exactamente el problema actual. Prisma 6 admite `{ sort: "asc", nulls: "last" }` en PostgreSQL.

**Alternativas consideradas**:

- **Una función `ordenarProductos(lista)` en memoria**: descartada. Cada vista seguiría siendo responsable de llamarla después de consultar; olvidarla en una vista rompe FR-008 sin que nada lo detecte.
- **Copiar el `orderBy` en cada consulta**: descartada; reproduciría la divergencia actual entre vistas.

## Decisión 3: Orden inicial en la propia migración SQL

**Decisión**: La migración añade la columna y la rellena replicando el orden que la tienda muestra hoy: posición = `ROW_NUMBER()` sobre (posición en `PRODUCT_ORDER` o 999, `createdAt` descendente, `id` descendente). Los 27 nombres de `PRODUCT_ORDER` van como una tabla `VALUES` dentro de la migración. Para comparar nombres sin depender de la configuración regional de la base, ambos lados se normalizan con `translate(upper(nombre), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ')`.

**Razonamiento**:

- FR-015 y SC-005 piden que, al activar la función, la tienda no cambie. La tienda es la referencia (no la venta rápida), como fijó la spec.
- Al ir dentro de la migración, el orden inicial se aplica en el mismo paso que el esquema en cada entorno; no hay un script manual que olvidar.
- `upper()` de PostgreSQL convierte los caracteres no ASCII según el `LC_CTYPE` de la base; con una configuración `C` dejaría "ú" o "ñ" en minúscula y no reconocería "SALSA ATÚN" o "…CHAMPIÑONES". El `translate` posterior cubre las letras del español en cualquier configuración.
- La columna es opcional, así que aplicar la migración antes de desplegar el código no afecta al código anterior.

**Alternativas consideradas**:

- **Script de Node con `toUpperCase()`**: descartada. Reproduce la clave exacta de JavaScript, pero sería un paso manual extra en cada entorno.
- **Dejar todo en `null` y que la dueña ordene desde cero**: descartada; incumple FR-015 y SC-005.
- **Tomar el orden de la venta rápida**: descartada por la spec (Assumptions).

El quickstart incluye la comparación del resultado con la tienda antes de la migración.

## Decisión 4: Guardar el orden completo en una sola transacción

**Decisión**: La Server Action `guardarOrdenProductos(ids)` recibe la lista completa de ids en el orden elegido. Después de `requireAdmin()` y Zod (enteros positivos, sin repetidos, entre 1 y 1000), una transacción Prisma:

1. lee los ids actuales con `ORDEN_CATALOGO`;
2. calcula el orden final con la función pura `ordenFinal(enviados, actuales)`: los enviados que todavía existen, en el orden enviado, seguidos de los productos que existen pero no se enviaron (creados mientras tanto), en su orden actual;
3. escribe `orden = 1..N` en **todos** los productos con `updateMany({ where: { id } })`, recorriéndolos por `id` ascendente.

**Razonamiento**:

- Escribir todas las filas hace que el último guardado completo prevalezca sin mezclas ni posiciones repetidas cuando dos personas guardan a la vez (caso borde de la spec).
- Recorrer por `id` ascendente hace que dos guardados simultáneos tomen los bloqueos de fila en el mismo orden: el segundo espera al primero en lugar de provocar un *deadlock*.
- `updateMany` no falla si un producto se eliminó entre la lectura y la escritura, y `ordenFinal` ignora los ids que ya no existen y añade al final los creados mientras tanto: el guardado no falla por cambios concurrentes del catálogo.
- Unos 30 `UPDATE` dentro de una transacción interactiva están muy por debajo del tiempo límite por defecto (5 s).

**Alternativas consideradas**:

- **Una acción por movimiento (mover el producto X a la posición P)**: descartada. FR-005 pide guardar y descartar explícitamente; además, con movimientos parciales dos personas podrían intercalar cambios.
- **Escribir solo las filas que cambiaron**: descartada. Con lecturas concurrentes puede mezclar dos órdenes y dejar posiciones repetidas.
- **Un único `UPDATE … FROM unnest(...)` con SQL crudo**: descartada. Es una sola sentencia, pero el bucle Prisma es igual de atómico dentro de la transacción y se lee como el resto del código.

## Decisión 5: Pantalla propia en el panel, con arrastrar y un selector de posición

**Decisión**: Se crea `/admin/inventory/sort`, enlazada desde un botón "Ordenar productos" en la cabecera del inventario. Muestra el catálogo completo (con y sin inventario) en una lista vertical. Cada fila tiene:

- un asa para arrastrar, con `@dnd-kit/sortable`;
- un `<select>` nativo "Posición" (1…N) para llevar el producto directamente a cualquier posición;
- la imagen, el nombre, la categoría y una marca de "Agotado" para reconocerlo.

Una barra fija ofrece "Descartar" y "Guardar orden", deshabilitados mientras no hay cambios. El resultado se notifica con sonner.

**Razonamiento**:

- **Arrastrar** es lo natural en computadora y reutiliza una dependencia y un patrón que el panel ya tiene (`PointerSensor` con distancia 8 y `KeyboardSensor`). El asa lleva `touch-action: none` para que en el teléfono el resto de la fila siga desplazando la página.
- **El selector de posición** cumple FR-004 y SC-001 en el teléfono: llevar el último producto al primer lugar es un toque y una elección, sin arrastrar a lo largo de 30 filas. Es nativo, accesible y no necesita validación.
- **Una pantalla propia** recibe el catálogo completo con una sola consulta. El inventario filtra por categoría en la base de datos (`?tipo=`), así que un "modo" dentro de esa pantalla obligaría a cambiar su carga de datos y sus props. Vive bajo `/admin/inventory`, de modo que el layout del panel ya exige la autorización y la navegación la marca como "Inventario".

**Alternativas consideradas**:

- **Modo dentro de la tabla de inventario, como el editor masivo**: descartada por lo explicado arriba (se registra en *Complexity Tracking*).
- **Solo botones subir/bajar**: descartada; mover el último al primero exigiría unos 30 toques (incumple SC-001).
- **Solo arrastrar**: descartada; en el teléfono arrastrar a lo largo de una lista larga es impreciso.
- **Orden por categoría (una lista por categoría)**: descartada por la spec (un solo orden global).

## Decisión 6: Propagar el cambio invalidando todas las páginas

**Decisión**: Tras guardar, la acción llama a `revalidatePath("/", "layout")`.

**Razonamiento**: El orden afecta a unas 10 páginas de cuatro superficies (tienda, venta rápida, cotización rápida y panel). Invalidar todo el árbol garantiza FR-010 para cualquier página que se haya renderizado de forma estática, sin mantener una lista de rutas que se desactualice. Ordenar es una operación rara, así que el costo de invalidar de más es despreciable.

**Alternativas consideradas**: listar cada ruta con `revalidatePath`; descartada porque una vista nueva olvidada volvería a mostrar un orden viejo.

## Decisión 7: Retirar los órdenes fijos

**Decisión**: Se eliminan `PRODUCT_ORDER` de `lib/constants/constants.ts`, la copia de `app/venta-rapida/page.tsx` y su `normalizeProductName` (que solo servía para esa copia), y el `orderForProduct` de `lib/actions/cotizacion-rapida.ts`. Los 27 nombres quedan, como registro, solo dentro de la migración. Al tocar la consulta de la venta rápida, esta pasa a usar el singleton `lib/prisma.ts`.

**Razonamiento**: FR-011 (una sola definición) y el Principio I (el código muerto se elimina). Usar el singleton es lo que exige la convención del proyecto y no amplía el alcance: es la misma línea que se modifica.

## Decisión 8: Pruebas

**Decisión**: Prueba unitaria `node:test` de `ordenFinal` (orden enviado, ids eliminados, productos creados mientras tanto, lista vacía). Ninguna prueba de integración nueva. Validación manual del quickstart en teléfono y escritorio, y `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:admin`.

**Razonamiento**: El Principio V exige pruebas para dinero, inventario, estados y autorización. El orden de presentación no es ninguno de ellos y la autorización reutiliza `requireAdmin()` sin cambios. La única lógica no trivial (la combinación con cambios concurrentes) es pura y se prueba sin base de datos. `test:admin` se corre completo porque el catálogo de la carga de Excel cambia de orden; no debería afectar las sugerencias, ya que `sugerirProducto` no sugiere nada cuando hay empate y por tanto no depende de la posición en la lista.
