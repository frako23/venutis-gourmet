# Contrato: orden del catálogo

**Feature**: `009-orden-productos`

## 1. Orden canónico — `lib/catalog-order.ts`

Módulo sin `server-only` ni imports `@/` (lo cargan los tests).

```ts
export const ORDEN_CATALOGO // orderBy de Prisma para Producto:
// [{ orden: { sort: "asc", nulls: "last" } }, { nombre: "asc" }, { id: "asc" }]

export function ordenFinal(enviados: number[], actuales: number[]): number[]
```

`ordenFinal` devuelve la secuencia de ids que se guardará:

- primero, los ids de `enviados` que están en `actuales`, en el orden enviado y sin repetir;
- después, los ids de `actuales` que no estaban en `enviados` (productos creados mientras se reordenaba), en el orden de `actuales`.

Los ids enviados que ya no existen se ignoran. El resultado siempre contiene cada id de `actuales` exactamente una vez.

| `enviados` | `actuales` | Resultado |
|---|---|---|
| `[3, 1, 2]` | `[1, 2, 3]` | `[3, 1, 2]` |
| `[3, 9, 1, 2]` (9 eliminado) | `[1, 2, 3]` | `[3, 1, 2]` |
| `[2, 1]` (4 creado después) | `[1, 2, 4]` | `[2, 1, 4]` |
| `[]` | `[1, 2]` | `[1, 2]` |

### Consumidores obligatorios de `ORDEN_CATALOGO`

| Superficie | Archivo | Antes |
|---|---|---|
| Tienda | `app/productos/consumidores/page.tsx` | `createdAt desc` + `PRODUCT_ORDER` en memoria |
| Venta rápida | `app/venta-rapida/page.tsx` | `createdAt desc` + copia local de `PRODUCT_ORDER` |
| Cotización rápida | `app/cotizacion-rapida/page.tsx` | `createdAt desc` + `PRODUCT_ORDER` en memoria |
| Cotización rápida | `lib/actions/cotizacion-rapida.ts` (`getCurrentQuoteCatalog`) | `orderForProduct` en memoria |
| Panel | `app/admin/inventory/page.tsx` | `createdAt desc` |
| Panel | `app/admin/inventory/sort/page.tsx` (nueva) | — |
| Panel | `app/admin/add-transaction/page.tsx` | `nombre asc` |
| Panel | `app/admin/transactions/page.tsx` | `nombre asc` |
| Panel | `app/admin/delivery-notes/new/page.tsx` | `nombre asc` |
| Panel | `app/admin/analytics/sales/page.tsx` | `nombre asc` |
| Panel | `lib/admin/sales-import.ts` (catálogo de equivalencias) | `nombre asc` |

Quedan **fuera**: las líneas de pedidos, las notas de entrega y su PDF, el carrito, la exportación del control de ventas y los rankings de analíticas (FR-016).

## 2. Server Action — `guardarOrdenProductos`

Vive en `lib/actions/products.ts` (`"use server"`), junto a las demás escrituras de productos.

```ts
export async function guardarOrdenProductos(ids: number[]): Promise<{ success: boolean; message: string }>
```

**Entrada**: la lista completa de ids en el orden elegido.

**Validación** (Zod, antes de tocar la base de datos):

- arreglo de enteros positivos, con entre 1 y 1000 elementos;
- sin ids repetidos.

**Comportamiento**:

1. `await requireAdmin()`: sin sesión redirige a `/admin-login`; un correo fuera de `ALLOWED_EMAILS` redirige a `/unauthorized`. No se escribe nada.
2. Si la entrada no es válida, devuelve `{ success: false, message: "El orden enviado no es válido. Recarga la página e inténtalo de nuevo." }` sin escribir.
3. En `prisma.$transaction`:
   1. lee `id` de todos los productos con `ORDEN_CATALOGO`;
   2. calcula `ordenFinal(ids, actuales)`;
   3. para cada producto, recorriendo por `id` ascendente, ejecuta `updateMany({ where: { id }, data: { orden: posicion } })` con `posicion` de 1 a N.
4. `revalidatePath("/", "layout")`.
5. Devuelve `{ success: true, message: "Orden guardado. Todas las vistas ya lo muestran." }`.

**Errores**: cualquier fallo de la transacción devuelve `{ success: false, message: "No se pudo guardar el orden. Intenta de nuevo." }`, deja el orden anterior intacto (la transacción se revierte) y se registra con `console.error`.

**Concurrencia**: el último guardado completo prevalece. Un producto eliminado mientras tanto se ignora; uno creado mientras tanto queda al final.

## 3. Interfaz — `/admin/inventory/sort`

**Entrada**: botón secundario "Ordenar productos" en la cabecera de `/admin/inventory`, junto a "Editor masivo".

**Página** (Server Component): consulta todos los productos con `ORDEN_CATALOGO` y selecciona `id`, `nombre`, `categoria`, `inventario` y la primera imagen. Renderiza `ProductOrderEditor`.

**`components/admin/inventario/productOrderEditor.tsx`** (cliente):

| Elemento | Comportamiento |
|---|---|
| Encabezado | Eyebrow "Catálogo", título "Ordenar productos", una línea que explica que el orden se aplica a la tienda, la venta rápida, la cotización y el panel, y el enlace "Volver al inventario". |
| Fila | Asa de arrastre (`GripVertical`, `touch-action: none`), número de puesto, miniatura, nombre, categoría y la marca "Agotado" si `unidadesDisponibles(inventario) === 0`. |
| Arrastrar | `DndContext` + `SortableContext` con `verticalListSortingStrategy`, `PointerSensor` (distancia 8) y `KeyboardSensor` (`sortableKeyboardCoordinates`). Al soltar, `arrayMove`. |
| Posición | `<select>` nativo con `aria-label="Posición de {nombre}"` y opciones 1…N. Elegir P mueve el producto a la posición P. |
| Barra de acciones (fija abajo) | "Descartar" vuelve a la lista guardada. "Guardar orden" llama a la acción dentro de `useTransition` y muestra "Guardando…". Ambos se deshabilitan sin cambios o mientras se guarda. |
| Resultado | `toast.success(message)` y `router.refresh()`; la lista guardada pasa a ser la nueva referencia. Si falla: `toast.error(message)` y los cambios en pantalla se conservan para reintentar. |
| Catálogo con 0 o 1 producto | Mensaje "No hay productos que ordenar todavía." sin lista ni botones. |

El título de la cabecera del panel muestra "Ordenar productos" en esta ruta.
