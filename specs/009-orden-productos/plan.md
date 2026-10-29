# Implementation Plan: Orden manual de productos, igual en todas las vistas

**Branch**: `009-orden-productos` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-orden-productos/spec.md`

## Summary

La dueña podrá ordenar el catálogo desde una pantalla del panel (`/admin/inventory/sort`): arrastra los productos o elige su posición con un selector, y guarda o descarta los cambios. Ese orden se guarda en el propio producto (`Producto.orden`) y es el único que usan la tienda, la venta rápida, la cotización rápida y todas las listas y selectores de productos del panel.

El enfoque técnico:

- **Esquema**: una columna opcional, `Producto.orden Int?`. `null` significa "sin posición" y va al final, así que un producto nuevo queda último sin tocar `addProduct`.
- **Una sola definición**: `ORDEN_CATALOGO` en `lib/catalog-order.ts` es el `orderBy` de las 11 consultas que listan productos (`orden` con nulos al final, luego `nombre`, luego `id`). Se eliminan los dos mapas fijos `PRODUCT_ORDER`, que hoy no coinciden entre sí.
- **Guardado**: la Server Action `guardarOrdenProductos` recibe la lista completa y reescribe las posiciones `1..N` en una transacción. Así el último guardado prevalece completo y los productos creados o eliminados mientras tanto no rompen el guardado.
- **Migración**: rellena el orden inicial replicando exactamente lo que la tienda muestra hoy.
- **Sin dependencias nuevas**: el arrastre reutiliza `@dnd-kit`, que el panel ya usa para ordenar las fotos.

## Technical Context

**Language/Version**: TypeScript estricto, React 19.1 y Next.js 15.5 (App Router). El árbol de trabajo tiene, sin confirmar, un cambio a `next@^16.4.3`; este diseño solo usa `revalidatePath` y Server Actions, que no cambian entre ambas versiones.

**Primary Dependencies**: Prisma 6.17, Zod 4, sonner, lucide-react, `@dnd-kit/core` 6, `@dnd-kit/sortable` 10 y `@dnd-kit/utilities` 3 (ya instaladas y en uso). **Sin dependencias nuevas.**

**Storage**: PostgreSQL con Prisma. **Un cambio de esquema**: `Producto.orden Int?`, con una migración que lo añade y lo rellena (ver [data-model.md](./data-model.md)). Solo `guardarOrdenProductos` escribe esa columna.

**Testing**: `node:test` con `npm.cmd run test:admin`, más una prueba unitaria nueva de `ordenFinal` (pura, sin base de datos). Además `npm.cmd run lint`, `npm.cmd run build` y la validación manual de [quickstart.md](./quickstart.md) en teléfono y escritorio.

**Target Platform**: Navegadores modernos de escritorio y de teléfono: el panel para ordenar y las cuatro superficies para ver el resultado.

**Project Type**: Aplicación web monolítica Next.js (Server Components, Server Actions y componentes cliente).

**Performance Goals**:

- Guardar el orden de unos 30 productos tarda menos de 1 segundo (una transacción con unos 30 `UPDATE`).
- Las vistas no añaden consultas: el orden se aplica en la consulta que ya hacen, y desaparece el ordenamiento en memoria.
- SC-001: mover el último producto al primer lugar en menos de 30 segundos. SC-002: reordenar el catálogo completo en menos de 5 minutos.

**Constraints**:

- Una sola definición del orden, aplicada en la base de datos.
- El último guardado completo prevalece, sin posiciones repetidas.
- La autorización se verifica en el servidor.
- Notificaciones solo con sonner; UI en español; tokens y clases `admin-*` del panel.
- La migración se aplica antes de desplegar el código.

**Scale/Scope**: Unos 30 productos y un solo orden global. Afecta 11 consultas de productos en las cuatro superficies; las líneas de pedidos, las notas de entrega, el PDF, el carrito, la exportación y los rankings no cambian.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la Constitución v2.0.0.

- [x] **I. Simplicidad ante todo (puerta de simplicidad)**:
  - **Alternativa más simple**: una columna entera opcional en `Producto`, un `orderBy` compartido y una acción que reescribe la lista completa. Sin tablas, posiciones fraccionarias ni movimientos parciales.
  - **Qué se reutiliza**: `lib/prisma.ts`, `requireAdmin`, Zod, sonner, `@dnd-kit` y su patrón de `editProductForm.tsx`, las clases `admin-*`, `unidadesDisponibles` y el layout del panel para la autorización de la página.
  - **Qué se añade**:
    - `lib/catalog-order.ts`: regla de negocio con 11 usos que debe vivir en un único lugar;
    - una página pequeña (`app/admin/inventory/sort/page.tsx`) y un componente (`productOrderEditor.tsx`), justificados en *Complexity Tracking*;
    - una prueba.
  - **Qué se elimina**: los dos `PRODUCT_ORDER`, `normalizeProductName`, `orderForProduct` y tres ordenamientos en memoria.
  - Sin dependencias, capas ni superficies nuevas.
- [x] **II. Una sola fuente de verdad**:
  - El orden pasa a vivir en PostgreSQL, en lugar de en dos mapas divergentes en el código.
  - La única escritura es una Server Action en `lib/actions/products.ts`, con Zod y una transacción Prisma.
  - El cambio de `schema.prisma` va con su migración y `prisma generate`.
  - La venta rápida pasa a usar el singleton `lib/prisma.ts`.
- [x] **III. Superficies con límites claros**: toca las cuatro superficies, pero solo en el **orden de presentación**:
  - **Tienda**: `/productos/consumidores`.
  - **Panel**: inventario, la pantalla nueva de ordenar y los selectores de producto.
  - **Venta rápida** y **cotización rápida**: el orden de su catálogo.
  - No cambia lo que ninguna superficie persiste. La pantalla de ordenar es una ruta dentro del panel, no una superficie nueva.
- [x] **IV. Seguridad del lado del servidor**:
  - `requireAdmin()` se ejecuta en cada guardado.
  - La página queda bajo el layout del panel, que exige autenticación y `ALLOWED_EMAILS`.
  - La acción recibe solo ids y no expone datos personales.
- [x] **V. Pruebas proporcionales al riesgo**:
  - El orden de presentación no toca dinero, inventario ni estados, y la autorización se reutiliza sin cambios.
  - La lógica no trivial (`ordenFinal`) es pura y lleva prueba unitaria con `node:test`.
  - La validación de interfaz y de concurrencia es manual y está documentada en el quickstart.

**Resultado de la puerta previa**: APROBADA. Sin violaciones; las adiciones estructurales se registran en *Complexity Tracking*.

## Design Decisions

El detalle y las alternativas descartadas están en [research.md](./research.md). El contrato de la acción, del orden canónico y de la pantalla está en [contracts/product-order.md](./contracts/product-order.md).

### Flujo de un guardado

1. La dueña abre `/admin/inventory/sort`. La página consulta el catálogo completo con `ORDEN_CATALOGO`.
2. Reordena con el asa o con el selector "Posición". Los cambios viven solo en el estado del componente; "Descartar" los revierte.
3. "Guardar orden" envía la lista completa de ids a `guardarOrdenProductos` dentro de `useTransition`.
4. La acción ejecuta `requireAdmin` y Zod, y luego `prisma.$transaction`:
   1. lee los ids actuales;
   2. calcula `ordenFinal(enviados, actuales)`;
   3. escribe `orden = 1..N` con `updateMany`, recorriendo por `id` ascendente.
5. `revalidatePath("/", "layout")` invalida todas las vistas.
6. El cliente muestra `toast.success` y llama a `router.refresh()`. Si hay error, muestra `toast.error` y conserva la lista en pantalla.

### Cambios por archivo

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | `Producto.orden Int?`. |
| `prisma/migrations/<timestamp>_orden_productos/migration.sql` (**nuevo**) | Añade la columna y la rellena replicando el orden actual de la tienda (Decisión 3). |
| `lib/catalog-order.ts` (**nuevo**) | `ORDEN_CATALOGO` y `ordenFinal`. Sin `server-only` ni `@/`. |
| `lib/actions/products.ts` | Nueva acción `guardarOrdenProductos`. |
| `app/admin/inventory/sort/page.tsx` (**nuevo**) | Consulta el catálogo completo y renderiza el editor. |
| `components/admin/inventario/productOrderEditor.tsx` (**nuevo**) | Lista ordenable con asa y selector de posición, más "Descartar" y "Guardar orden". |
| `components/admin/inventario/inventoryTable.tsx` | Botón "Ordenar productos" junto a "Editor masivo". |
| `components/admin/header.tsx` | Título "Ordenar productos" para `/admin/inventory/sort`, declarado antes de `/admin/inventory`. |
| `app/productos/consumidores/page.tsx` | `orderBy: ORDEN_CATALOGO`; elimina el `.sort` y el import de `PRODUCT_ORDER`. |
| `app/venta-rapida/page.tsx` | `orderBy: ORDEN_CATALOGO` con el singleton `prisma`; elimina la copia de `PRODUCT_ORDER`, `normalizeProductName`, el `.sort` y `new PrismaClient()`. |
| `app/cotizacion-rapida/page.tsx` | `orderBy: ORDEN_CATALOGO`; elimina el `.sort` y el import de `PRODUCT_ORDER`. |
| `lib/actions/cotizacion-rapida.ts` | `orderBy: ORDEN_CATALOGO` en `getCurrentQuoteCatalog`; elimina `orderForProduct` y el `.sort`. |
| `app/admin/inventory/page.tsx` | `orderBy: ORDEN_CATALOGO` (antes `createdAt desc`). |
| `app/admin/add-transaction/page.tsx`, `app/admin/transactions/page.tsx`, `app/admin/delivery-notes/new/page.tsx`, `app/admin/analytics/sales/page.tsx` | `orderBy: ORDEN_CATALOGO` en la consulta de productos (antes `nombre asc`). |
| `lib/admin/sales-import.ts` | `orderBy: ORDEN_CATALOGO` en el catálogo, con import relativo (`../catalog-order.ts`) porque lo cargan los tests de integración. |
| `lib/constants/constants.ts` | Elimina `PRODUCT_ORDER`. |
| `tests/admin/catalog-order.test.ts` (**nuevo**) | Casos de `ordenFinal` de la tabla del contrato. |
| `CLAUDE.md`, `docs/descripcion-tecnica.md` | Documentan `Producto.orden`, `ORDEN_CATALOGO` como única definición y la pantalla de ordenar. |

### Decisiones de interfaz

- **Asa en lugar de fila arrastrable**: en el teléfono, tocar fuera del asa sigue desplazando la página. Solo el asa lleva `touch-action: none`.
- **Selector nativo de posición**: lleva el último producto al primer lugar en un toque (SC-001). Abre el selector del sistema en móvil y es accesible por teclado.
- **Datos de cada fila**: miniatura, nombre, categoría y la marca "Agotado". Bastan para reconocer el producto sin abrir su ficha.
- **Barra de acciones fija** al pie de la pantalla: con 30 filas, "Guardar" queda siempre a mano.
- **Sin filtro por categoría** en la pantalla de ordenar: el orden es global (Assumptions de la spec) y 30 filas son manejables.
- **Sin aviso al salir con cambios sin guardar**: la spec no lo pide.

## Project Structure

### Documentation (this feature)

```text
specs/009-orden-productos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── product-order.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera $speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                           # Producto.orden Int?
└── migrations/<timestamp>_orden_productos/ # NUEVO: columna + orden inicial

lib/
├── catalog-order.ts                        # NUEVO: ORDEN_CATALOGO + ordenFinal
├── constants/constants.ts                  # Se elimina PRODUCT_ORDER
├── actions/
│   ├── products.ts                         # + guardarOrdenProductos
│   └── cotizacion-rapida.ts                # orderBy canónico
└── admin/sales-import.ts                   # orderBy canónico

app/
├── productos/consumidores/page.tsx         # orderBy canónico
├── venta-rapida/page.tsx                   # orderBy canónico + singleton
├── cotizacion-rapida/page.tsx              # orderBy canónico
└── admin/
    ├── inventory/
    │   ├── page.tsx                        # orderBy canónico
    │   └── sort/page.tsx                   # NUEVO: pantalla de ordenar
    ├── add-transaction/page.tsx            # orderBy canónico
    ├── transactions/page.tsx               # orderBy canónico
    ├── delivery-notes/new/page.tsx         # orderBy canónico
    └── analytics/sales/page.tsx            # orderBy canónico

components/admin/
├── header.tsx                              # Título de la ruta nueva
└── inventario/
    ├── inventoryTable.tsx                  # Botón "Ordenar productos"
    └── productOrderEditor.tsx              # NUEVO: lista ordenable

tests/admin/
└── catalog-order.test.ts                   # NUEVO: ordenFinal
```

**Structure Decision**: Se mantiene el monolito Next.js:

- la escritura va en `lib/actions/products.ts`, junto a las demás escrituras de productos;
- la regla del orden en `lib/catalog-order.ts`, junto a `lib/catalog-context.ts`, que ya define reglas del catálogo;
- la pantalla, bajo `/admin/inventory`, donde se administra el catálogo.

Se añaden una columna, una ruta del panel, un componente, un módulo y una prueba; no se agregan modelos ni dependencias.

## Phase 1 Implementation Boundaries

- No cambian precios, inventario, pedidos, pagos ni lo que persiste cada superficie.
- No cambian `addProduct`, `editProduct`, `deleteProduct` ni los editores de inventario: el orden de un producto solo se escribe desde `guardarOrdenProductos`.
- No cambian las líneas de pedidos, las notas de entrega, el PDF, el carrito, la exportación del control de ventas ni los rankings de analíticas.
- Las categorías y el filtro por categoría de la tienda siguen igual.
- La validación manual debe cubrir un viewport estrecho y uno de escritorio; una compilación exitosa no la sustituye.

## Constitution Check (post-diseño)

- [x] **I**:
  - El diseño final añade una columna, un módulo con una regla de 11 usos, una página, un componente y una prueba, y elimina dos mapas de orden, dos helpers y tres ordenamientos en memoria.
  - Reutiliza `@dnd-kit`, `requireAdmin`, Zod y sonner.
  - La alternativa del modo dentro del inventario se descartó y queda registrada abajo.
- [x] **II**:
  - Una sola definición del orden, en la base de datos.
  - Una sola escritura, en una transacción, con migración y regeneración del cliente.
- [x] **III**: las cuatro superficies, solo en el orden de presentación; ninguna cambia lo que persiste.
- [x] **IV**: la autorización se verifica en el servidor en cada guardado y en la carga de la página.
- [x] **V**: prueba unitaria de la única lógica no trivial, con `node:test`. El resto de la validación es manual y está documentada; no toca dinero, inventario ni estados.

**Resultado**: APROBADA.

## Complexity Tracking

| Cambio | Motivo | Alternativa más simple descartada |
|---|---|---|
| Nueva ruta `/admin/inventory/sort` (página de unas 15 líneas) | El editor necesita el catálogo completo, y la pantalla de inventario lo consulta ya filtrado por categoría (`?tipo=`). La ruta propia recibe la lista completa con una sola consulta y deja la lista larga sin el resto de controles del inventario, lo que es mejor en el teléfono. | Un "modo" dentro de `InventoryTable`, como el editor masivo: obligaría a cambiar la carga de datos de la página de inventario (consultar todo y filtrar en memoria, o una consulta extra) y las props de la tabla. El resultado tendría el mismo número de componentes y más acoplamiento. |
