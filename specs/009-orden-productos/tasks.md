---

description: "Task list for manual product ordering shared by every product view"
---

# Tasks: Orden manual de productos, igual en todas las vistas

**Input**: Design documents from `/specs/009-orden-productos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/product-order.md](./contracts/product-order.md), [quickstart.md](./quickstart.md)

**Tests**: Solo una prueba unitaria de `ordenFinal`, que pide el plan (research, Decisión 8). El orden de presentación no toca dinero, inventario ni estados (Principio V), así que no hay pruebas de integración nuevas. La interfaz, la propagación a las vistas y la concurrencia se validan a mano con [quickstart.md](./quickstart.md).

**Organization**: Las tareas se agrupan por historia de usuario:

- **US1 (P1)**: la pantalla de ordenar y la tienda, porque su prueba independiente se verifica en la tienda.
- **US2 (P1)**: el resto de vistas y el retiro de los órdenes fijos.
- **US3 (P2)**: solo verificación. El diseño (`orden` opcional con nulos al final y nada fuera de `guardarOrdenProductos` escribe `orden`) ya cubre productos nuevos, renombrados y eliminados.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario de la tarea (US1, US2, US3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fijar la línea base antes de migrar. No se añaden dependencias: `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities` ya están en `package.json`.

- [X] T001 Confirmar que `DATABASE_URL` apunta a una base de desarrollo **aislada** (nunca la de producción), con al menos 10 productos de varias categorías, uno agotado y uno cuyo nombre no esté en `PRODUCT_ORDER` (`lib/constants/constants.ts`). Ejecutar `npm.cmd run test:admin` y `npm.cmd run lint` y anotar los fallos preexistentes. Con `npm.cmd run dev`, abrir `/productos/consumidores?contexto=consumidor` en "Todos" y anotar la secuencia completa de nombres: es la referencia de FR-015 y SC-005 (quickstart §1, paso 1).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: La columna `Producto.orden`, el orden inicial y la única definición del orden (`ORDEN_CATALOGO`), que usan todas las historias.

**⚠️ CRITICAL**: No comenzar las historias de usuario hasta completar esta fase.

- [X] T002 En `prisma/schema.prisma`, dentro de `model Producto`, añadir `orden Int?` después de `ubicacion`, con el comentario `// Posición en el catálogo (menor = antes); null = sin posición, va al final.` Respetar lo que fija data-model.md: "`orden` | `Int` | Nulo: Sí | Default: —". Sin `@default`, sin `@unique` y sin índice.
- [X] T003 Crear la migración con `npx prisma migrate dev --create-only --name orden_productos`. En `prisma/migrations/<timestamp>_orden_productos/migration.sql` debe quedar `ALTER TABLE "Producto" ADD COLUMN "orden" INTEGER;`. Añadir después un `UPDATE` que rellene `orden` en todos los productos existentes:
  - un CTE `referencia(nombre, posicion) AS (VALUES …)` con los 27 pares nombre/posición copiados textualmente de `PRODUCT_ORDER` en `lib/constants/constants.ts` (líneas 163–200; de "RAVIOLI DE CARNE", 1 a "PAN DE JAMÓN", 27);
  - un CTE `numerados` que calcule `ROW_NUMBER() OVER (ORDER BY COALESCE(r.posicion, 999), p."createdAt" DESC, p."id" DESC)` sobre `"Producto" p LEFT JOIN referencia r ON translate(upper(p."nombre"), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ') = translate(upper(r.nombre), 'áéíóúüñ', 'ÁÉÍÓÚÜÑ')`;
  - `UPDATE "Producto" p SET "orden" = n.orden FROM numerados n WHERE p."id" = n."id";`.

  Encabezar el archivo con un comentario en español que explique que replica el orden que mostraba la tienda (`PRODUCT_ORDER`, con 999 para los no reconocidos y `createdAt desc` como desempate), y por qué se usa `translate` (research.md, Decisión 3).
- [X] T004 Aplicar la migración de `prisma/migrations/<timestamp>_orden_productos/` con `npx prisma migrate dev` y regenerar el cliente con `npx prisma generate`. Verificar con `SELECT "orden", "nombre", "categoria" FROM "Producto" ORDER BY "orden" NULLS LAST, "nombre", "id";` lo siguiente:
  - ningún `orden` es `null`;
  - los valores van de `1..N` sin repetir;
  - la secuencia coincide con la anotada en T001, incluidos los nombres con tildes o "ñ".

  Si no coincide, corregir T003 antes de seguir.
- [X] T005 Crear `lib/catalog-order.ts`, sin `server-only` ni imports `@/`, porque lo cargan los tests. Contenido:
  - `import type { Prisma } from "@prisma/client";`
  - `export const ORDEN_CATALOGO: Prisma.ProductoOrderByWithRelationInput[] = [{ orden: { sort: "asc", nulls: "last" } }, { nombre: "asc" }, { id: "asc" }];`, con un comentario de una línea: "Único orden de las listas de productos: posición manual, luego nombre, luego id."
  - `export function ordenFinal(enviados: number[], actuales: number[]): number[]`, que devuelve primero los ids de `enviados` que están en `actuales`, en el orden enviado y sin repetir, y después los ids de `actuales` que no estaban en `enviados`, en el orden de `actuales`. El resultado contiene cada id de `actuales` exactamente una vez (contracts/product-order.md §1).
- [X] T006 Crear `tests/admin/catalog-order.test.ts` con `node:test` y `node:assert/strict`, importando `ordenFinal` desde `"../../lib/catalog-order.ts"`. Un `it` por cada fila de la tabla del contrato:
  - `[3, 1, 2]` + `[1, 2, 3]` → `[3, 1, 2]`;
  - `[3, 9, 1, 2]` + `[1, 2, 3]` → `[3, 1, 2]` (id eliminado);
  - `[2, 1]` + `[1, 2, 4]` → `[2, 1, 4]` (producto creado después);
  - `[]` + `[1, 2]` → `[1, 2]`.

  Añadir un caso con un id repetido en `enviados` (`[2, 2, 1]` + `[1, 2]` → `[2, 1]`). Ejecutar `node --loader ts-node/esm --test tests/admin/catalog-order.test.ts` y confirmar que pasa.

**Checkpoint**: La columna existe con el orden inicial correcto, el cliente está regenerado y `ORDEN_CATALOGO` y `ordenFinal` están listos y probados.

---

## Phase 3: User Story 1 - Reordenar el catálogo desde el panel (Priority: P1) 🎯 MVP

**Goal**: La dueña ordena el catálogo en `/admin/inventory/sort`, arrastrando o eligiendo la posición, guarda o descarta, y la tienda muestra ese orden.

**Independent Test**: Mover el último producto (p. ej. "Pan de jamón") a la primera posición y guardar. En `/productos/consumidores` ("Todos") aparece primero, y los demás conservan su orden relativo (quickstart §2).

### Implementation for User Story 1

- [X] T007 [P] [US1] En `lib/actions/products.ts`, añadir `export async function guardarOrdenProductos(ids: number[]): Promise<{ success: boolean; message: string }>` siguiendo contracts/product-order.md §2:
  1. `await requireAdmin()`.
  2. Validar con un `OrdenProductosSchema` de Zod: `z.array(z.number().int().positive()).min(1).max(1000)` más un `refine` de que no haya repetidos. Si falla, devolver `{ success: false, message: "El orden enviado no es válido. Recarga la página e inténtalo de nuevo." }` sin escribir.
  3. En `prisma.$transaction(async (tx) => …)`:
     1. leer `tx.producto.findMany({ orderBy: ORDEN_CATALOGO, select: { id: true } })`;
     2. calcular `ordenFinal(ids, actuales.map((p) => p.id))`;
     3. construir pares `[id, posicion]` con `posicion = índice + 1`, ordenarlos por `id` ascendente y ejecutar `tx.producto.updateMany({ where: { id }, data: { orden: posicion } })` para cada uno (`updateMany`, no `update`, para no fallar si el producto se eliminó).
  4. `revalidatePath("/", "layout")` y devolver `{ success: true, message: "Orden guardado. Todas las vistas ya lo muestran." }`.

  En el `catch`, ejecutar `console.error` y devolver `{ success: false, message: "No se pudo guardar el orden. Intenta de nuevo." }`. Importar `ORDEN_CATALOGO` y `ordenFinal` con ruta relativa `"../catalog-order"`, como los imports existentes del archivo.
- [X] T008 [P] [US1] Crear `components/admin/inventario/productOrderEditor.tsx` (`"use client"`), siguiendo contracts/product-order.md §3 y el patrón de dnd-kit de `components/admin/edit-product/editProductForm.tsx`:
  - **Props**: `productos: Array<{ id: number; nombre: string; categoria: string; inventario: number; imagenUrl: string | null }>`. Estado `items` inicializado con `productos`.
  - **Encabezado**: eyebrow "Catálogo", `h1` "Ordenar productos", una línea "El orden se aplica a la tienda, la venta rápida, la cotización y las listas del panel." y un enlace "Volver al inventario" a `/admin/inventory`. Usar las clases `admin-page`, `admin-content`, `admin-eyebrow`, `admin-title` y `admin-subtitle`.
  - **Lista**:
    - `DndContext` con `closestCenter` y `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))`;
    - `SortableContext` con `items={items.map((p) => p.id)}` y `verticalListSortingStrategy`; `onDragEnd` aplica `arrayMove`.
  - **Fila**: un subcomponente local con `useSortable({ id })` y `CSS.Transform.toString(transform)`. Contiene:
    - el asa `<button type="button">` con `GripVertical`, `aria-label="Arrastrar {nombre}"`, `className` con `touch-none cursor-grab` (`touch-action: none`), y los `attributes`/`listeners` solo en el asa;
    - el número de puesto;
    - una miniatura con `next/image` de 44×44 (`imagenUrl ?? "/food-avatar.png"`);
    - el nombre, la categoría y una insignia "Agotado" si `unidadesDisponibles(inventario) === 0` (`@/lib/inventory`);
    - un `<select className="admin-field">` con `aria-label="Posición de {nombre}"` y opciones `1..items.length`, cuyo `onChange` mueve el producto con `arrayMove(items, actual, elegido - 1)`.
  - **Barra fija al pie** (`sticky bottom-0`), con "Descartar" (`admin-button-secondary`, vuelve a `productos`) y "Guardar orden" (`admin-button-primary admin-button-brass`, `Save`). Ambos se deshabilitan si `items.map(id).join(",") === productos.map(id).join(",")` o si `isPending`; mientras se guarda, el botón dice "Guardando…".
  - **Guardar**: dentro de `useTransition`, llamar a `guardarOrdenProductos(items.map((p) => p.id))`:
    - si `success`, `toast.success(message)` y `router.refresh()`;
    - si no, `toast.error(message)`, conservando `items`.
  - **Menos de 2 productos**: mostrar solo "No hay productos que ordenar todavía." sin lista ni botones.
- [X] T009 [US1] Crear `app/admin/inventory/sort/page.tsx` (Server Component, depende de T008):
  1. Consultar `prisma.producto.findMany({ orderBy: ORDEN_CATALOGO, select: { id: true, nombre: true, categoria: true, inventario: true, imagenes: { select: { url: true }, take: 1 } } })`, con `prisma` de `@/lib/prisma` y `ORDEN_CATALOGO` de `@/lib/catalog-order`.
  2. Mapear a `{ id, nombre, categoria, inventario, imagenUrl: imagenes[0]?.url ?? null }`.
  3. Renderizar `<ProductOrderEditor key={productos.map((p) => p.id).join(",")} productos={productos} />`. La `key` remonta el editor cuando cambia el orden guardado, así que tras `router.refresh()` la lista guardada pasa a ser la referencia.
- [X] T010 [P] [US1] En `components/admin/inventario/inventoryTable.tsx`, añadir antes de "Agregar producto", en el grupo de botones de la cabecera (junto a "Editor masivo"), `<a href="/admin/inventory/sort" className="admin-button-secondary"><ArrowUpDown size={16} /> Ordenar productos</a>`. Importar `ArrowUpDown` en el import existente de `lucide-react`.
- [X] T011 [P] [US1] En `components/admin/header.tsx`, añadir al mapa `titles` la entrada `"/admin/inventory/sort": "Ordenar productos"` **antes** de `"/admin/inventory"`. `find` toma la primera ruta activa y `isActive` también acepta las subrutas de `/admin/inventory`.
- [X] T012 [P] [US1] En `app/productos/consumidores/page.tsx`:
  - cambiar `orderBy: { createdAt: "desc" }` por `orderBy: ORDEN_CATALOGO` (de `@/lib/catalog-order`);
  - eliminar el bloque `sortedProducts` con su `.sort` y el import de `PRODUCT_ORDER`;
  - usar `products` donde se usaba `sortedProducts` (en `wholesaleProducts` y `contextProducts`).

  Los filtros de contexto y categoría no cambian: solo filtran y conservan el orden (FR-009).
- [ ] T013 [US1] Validar la historia con `specs/009-orden-productos/quickstart.md` §2 (pasos 1–6: arrastrar, descartar, selector de posición, teléfono a ~390 px, teclado) y comprobar que la tienda en "Todos" y filtrada por categoría muestra el orden guardado.

**Checkpoint**: La dueña reordena y guarda; la tienda (consumidor y mayorista) refleja el orden. MVP utilizable.

---

## Phase 4: User Story 2 - El mismo orden en todas las vistas (Priority: P1)

**Goal**: La venta rápida, la cotización rápida, el inventario y todos los selectores de producto del panel usan `ORDEN_CATALOGO`, y desaparecen los órdenes fijos.

**Independent Test**: Con el último producto movido al primer lugar, encabeza la venta rápida, la cotización rápida (también tras releer precios), el inventario y los selectores de venta manual, nota de entrega, pedidos, analíticas y equivalencias de la carga de Excel (quickstart §3).

### Implementation for User Story 2

- [X] T014 [P] [US2] En `app/venta-rapida/page.tsx`:
  - reemplazar `new PrismaClient()` y su import por `import { prisma } from "@/lib/prisma";`;
  - cambiar `orderBy: { createdAt: "desc" }` por `orderBy: ORDEN_CATALOGO` (de `@/lib/catalog-order`) y dejar solo `include: { imagenes: true }`;
  - eliminar la constante local `PRODUCT_ORDER`, `normalizeProductName`, el bloque `sortedProducts` y el `Promise.all` de un solo elemento;
  - filtrar `availableProducts` directamente sobre `products`.
- [X] T015 [P] [US2] En `app/cotizacion-rapida/page.tsx`:
  - cambiar `orderBy: { createdAt: "desc" }` por `orderBy: ORDEN_CATALOGO` (de `@/lib/catalog-order`);
  - eliminar el `.sort(...)` encadenado tras el `.map(...)` y el import de `PRODUCT_ORDER`.
- [X] T016 [P] [US2] En `lib/actions/cotizacion-rapida.ts`:
  - añadir `orderBy: ORDEN_CATALOGO` (de `@/lib/catalog-order`) a la consulta `prisma.producto.findMany` de `getCurrentQuoteCatalog`;
  - eliminar `orderForProduct`, el `.sort(...)` y el import de `PRODUCT_ORDER`;
  - `products` queda como `currentRows.map(toQuoteProduct)`.
- [X] T017 [P] [US2] En `app/admin/inventory/page.tsx`, cambiar `orderBy: { createdAt: "desc" }` por `orderBy: ORDEN_CATALOGO` (de `@/lib/catalog-order`) en la consulta de productos. La consulta `distinct` de categorías no cambia.
- [X] T018 [P] [US2] En `app/admin/add-transaction/page.tsx`, cambiar `orderBy: { nombre: "asc" }` por `orderBy: ORDEN_CATALOGO` en `prisma.producto.findMany`. La consulta de clientes no cambia.
- [X] T019 [P] [US2] En `app/admin/transactions/page.tsx`, cambiar `orderBy: { nombre: "asc" }` por `orderBy: ORDEN_CATALOGO` en `prisma.producto.findMany`. Las consultas de transacciones y clientes no cambian.
- [X] T020 [P] [US2] En `app/admin/delivery-notes/new/page.tsx`, cambiar `orderBy: { nombre: "asc" }` por `orderBy: ORDEN_CATALOGO` en `prisma.producto.findMany`. La consulta de clientes mayoristas no cambia.
- [X] T021 [P] [US2] En `app/admin/analytics/sales/page.tsx`, cambiar `orderBy: { nombre: "asc" }` por `orderBy: ORDEN_CATALOGO` en `prisma.producto.findMany` (filtro de producto). Los rankings de `AnalyticsDashboard` siguen ordenados por su métrica.
- [X] T022 [P] [US2] En `lib/admin/sales-import.ts`, cambiar `orderBy: { nombre: "asc" }` por `orderBy: ORDEN_CATALOGO` en `db.producto.findMany` (catálogo de equivalencias). Importar con ruta relativa, `import { ORDEN_CATALOGO } from "../catalog-order.ts";`, igual que `../client-rules.ts`, porque lo cargan los tests de integración.
- [X] T023 [US2] En `lib/constants/constants.ts`, eliminar `export const PRODUCT_ORDER` y su comentario (depende de T012, T015 y T016). Confirmar con una búsqueda que no quedan referencias a `PRODUCT_ORDER`, `orderForProduct` ni `normalizeProductName` en `app/`, `lib/` y `components/`.
- [ ] T024 [US2] Validar la historia con `specs/009-orden-productos/quickstart.md` §3:
  - recorrer la lista de vistas;
  - comprobar el orden también con búsqueda en la venta rápida y tras la relectura de la cotización;
  - comprobar que **no** cambiaron las líneas del detalle de un pedido, el PDF de una nota de entrega ni los rankings de analíticas;
  - confirmar el acceptance 6 (orden inicial idéntico al anotado en T001).

**Checkpoint**: Todas las vistas de FR-008 muestran la misma secuencia y el orden tiene una sola definición.

---

## Phase 5: User Story 3 - Productos nuevos y cambios del catálogo sin romper el orden (Priority: P2)

**Goal**: Crear, renombrar, editar, agotar, reponer o eliminar un producto no desordena el catálogo.

**Independent Test**: Un producto nuevo aparece último; uno renombrado en la posición 5 sigue en la 5; al eliminar uno del medio, el resto conserva su orden (quickstart §4).

### Implementation for User Story 3

- [X] T025 [US3] Revisar `lib/actions/products.ts` y confirmar que ningún camino distinto de `guardarOrdenProductos` escribe `orden`:
  - `ProductSchema` no incluye `orden`, así que `addProduct` crea con `orden = null` ("`null` = todavía sin posición: va al final", data-model.md) y `editProduct` (`...parsed.data`) no lo pisa;
  - `editInventory` y `editInventoryMasiva` solo escriben `inventario`, `precioDetal` y `precioMayorista`;
  - `deleteProduct` no reordena.

  No se espera ningún cambio de código. Si algún camino escribiera `orden`, quitarlo.
- [ ] T026 [US3] Validar la historia con `specs/009-orden-productos/quickstart.md` §4:
  - un producto nuevo aparece último en la tienda, la venta rápida y `/admin/inventory/sort`;
  - renombrar el de la posición 5 lo mantiene en la 5;
  - agotar y reponer un producto lo devuelve a su posición;
  - eliminar uno del medio conserva el orden relativo del resto.

**Checkpoint**: Las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, casos borde y verificación final.

- [X] T027 [P] En `CLAUDE.md`, después del párrafo **Catálogo unificado**, añadir un párrafo **Orden del catálogo** con lo siguiente:
  - `Producto.orden` (opcional; `null` va al final) es el único orden de las listas de productos;
  - toda consulta que liste productos usa `ORDEN_CATALOGO` de `lib/catalog-order.ts` y ninguna vista reordena en memoria;
  - solo `guardarOrdenProductos` (`lib/actions/products.ts`) lo escribe, desde `/admin/inventory/sort`;
  - las líneas de pedidos, las notas de entrega, las exportaciones y los rankings no siguen este orden.
- [X] T028 [P] En `docs/descripcion-tecnica.md`, documentar `Producto.orden` en "## 5. Modelo de datos", `/admin/inventory/sort` en "### Administración" (sección 4), `guardarOrdenProductos` en "## 7. Acciones de servidor" y, en "## 11. Consideraciones técnicas observadas", que el orden inicial se migró desde el antiguo `PRODUCT_ORDER` de la tienda.
- [ ] T029 Validar los casos borde con `specs/009-orden-productos/quickstart.md` §5:
  - dos pestañas guardando órdenes distintos: prevalece el segundo completo y `SELECT "orden", COUNT(*) FROM "Producto" GROUP BY "orden" HAVING COUNT(*) > 1;` devuelve 0 filas;
  - un producto creado mientras se ordena queda último;
  - un producto eliminado mientras se ordena no hace fallar el guardado;
  - un error de guardado conserva los cambios en pantalla.
- [ ] T030 Ejecutar (scripts de `package.json`) `npm.cmd run test:admin`, `npm.cmd run lint` y `npm.cmd run build`, y compararlos con la línea base de T001. Declarar en la entrega cualquier verificación omitida o fallo preexistente.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. Debe hacerse **antes** de migrar para capturar el orden de referencia.
- **Foundational (Phase 2)**: depende de T001. Va en secuencia: T002 → T003 → T004 → T005 → T006. T005 necesita el cliente regenerado para tipar `orden`. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de la Fase 2.
- **US2 (Phase 4)**: depende de la Fase 2. T014–T022 son independientes de US1. T023 depende de T012 (US1), porque la tienda también importa `PRODUCT_ORDER`.
- **US3 (Phase 5)**: depende de la Fase 2. Su validación (T026) usa la pantalla de US1 y las vistas de US2.
- **Polish (Phase 6)**: depende de las historias que se entreguen.

### Within Each User Story

- US1: T007, T008, T010, T011 y T012 en paralelo → T009 (necesita T008) → T013.
- US2: T014–T022 en paralelo → T023 → T024.
- US3: T025 → T026.

### Parallel Opportunities

- US1: T007 (acción), T008 (editor), T010 (botón), T011 (título) y T012 (tienda) tocan archivos distintos.
- US2: las nueve tareas T014–T022 tocan archivos distintos y son cambios de una línea o pocas líneas.
- US1 y US2 pueden avanzar en paralelo tras la Fase 2, salvo T023.
- T027 y T028 (documentación) en paralelo.

---

## Parallel Example: User Story 1

```text
Task: "T007 guardarOrdenProductos en lib/actions/products.ts"
Task: "T008 ProductOrderEditor en components/admin/inventario/productOrderEditor.tsx"
Task: "T010 Botón 'Ordenar productos' en components/admin/inventario/inventoryTable.tsx"
Task: "T011 Título de la ruta en components/admin/header.tsx"
Task: "T012 ORDEN_CATALOGO en app/productos/consumidores/page.tsx"
```

## Parallel Example: User Story 2

```text
Task: "T014 app/venta-rapida/page.tsx"
Task: "T015 app/cotizacion-rapida/page.tsx"
Task: "T016 lib/actions/cotizacion-rapida.ts"
Task: "T017 app/admin/inventory/page.tsx"
Task: "T018 app/admin/add-transaction/page.tsx"
Task: "T019 app/admin/transactions/page.tsx"
Task: "T020 app/admin/delivery-notes/new/page.tsx"
Task: "T021 app/admin/analytics/sales/page.tsx"
Task: "T022 lib/admin/sales-import.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1: capturar el orden actual de la tienda.
2. Fase 2: columna, migración con el orden inicial, `ORDEN_CATALOGO` y `ordenFinal`.
3. Fase 3: pantalla de ordenar, acción y tienda.
4. **Detenerse y validar** con quickstart §2: la dueña ya controla la vitrina.

Entregar solo el MVP dejaría la venta rápida y la cotización con sus órdenes fijos, en contra de FR-008 y FR-011. Como US2 son cambios de una línea, se recomienda entregar US1 y US2 juntas.

### Incremental Delivery

1. Setup y Foundational: el orden inicial está en la base de datos, sin cambios visibles.
2. US1: ordenar y verlo en la tienda.
3. US2: el mismo orden en todas las vistas y el retiro de los órdenes fijos.
4. US3: verificación de altas, cambios y bajas.
5. Polish: documentación, casos borde y verificación final.

---

## Notes

- **Despliegue**: aplicar la migración en producción (`npx prisma migrate deploy`) **antes** de desplegar el código. La columna es opcional, así que el código anterior sigue funcionando; el código nuevo, en cambio, falla si la columna no existe. Tras desplegar, repetir la comparación de T004 contra la tienda de producción.
- No modificar `addProduct`, `editProduct`, `deleteProduct` ni los editores de inventario: el orden solo se escribe desde `guardarOrdenProductos`.
- No cambian las líneas de pedidos, las notas de entrega, el PDF, el carrito, la exportación del control de ventas ni los rankings de analíticas (FR-016).
- Notificaciones solo con sonner; textos en español; estilos con las clases `admin-*` existentes.
