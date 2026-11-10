# Implementation Plan: Zonas de delivery administrables y delivery en la venta rápida

**Branch**: `011-zonas-delivery` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-zonas-delivery/spec.md`

## Summary

La dueña administrará las zonas de delivery desde una sección nueva del panel, `/admin/delivery`. Es una tabla donde edita el nombre y el costo directamente en la celda, agrega zonas desde una fila nueva y desactiva o reactiva las que ya no atiende. Esas zonas pasan a ser las únicas de toda la tienda:

- el checkout cobra con ellas;
- el selector de sector de las direcciones y la cotización rápida las ofrecen;
- la venta rápida las muestra para armar el pedido por WhatsApp con delivery. Ahí quien compra busca su zona, la elige y completa nombre, teléfono y dirección de quien recibe.

El enfoque técnico:

- **Esquema**: un modelo nuevo, `ZonaDelivery` (`nombre`, `clave` única, `costoUsd`, `activa`). La migración lo carga con las 90 zonas actuales y `DELIVERY_ZONES` se elimina.
- **Una sola regla**: `lib/delivery-zone-rules.ts` es puro y lo comparten el checkout, las acciones, los tres selectores y las pruebas. Contiene:
  - la clave normalizada (sin acentos ni mayúsculas), que se usa para la unicidad, la búsqueda y la resolución de direcciones;
  - la validación;
  - el orden;
  - el filtro;
  - el agrupado por costo;
  - la validación de los datos de entrega.
- **Direcciones sin clave foránea**: `Direccion.urbanizacion` sigue siendo texto. El checkout resuelve la zona por clave, y renombrar una zona reescribe las direcciones afectadas en la misma transacción.
- **Escrituras**: dos Server Actions con `requireAdmin` y Zod (`crearZonaDelivery`, `actualizarZonaDelivery`), que se guardan celda por celda e invalidan las páginas con `revalidatePath("/", "layout")`.
- **Venta rápida sin persistencia**: un componente nuevo, `deliverySelector`, más `mensajeWhatsapp` con un `delivery` opcional. No se registra nada.
- **Sin dependencias nuevas.**

## Technical Context

**Language/Version**: TypeScript estricto, React 19.1 y Next.js 16.4 (App Router). Usa Server Components, Server Actions, `revalidatePath` y `useTransition`.

**Primary Dependencies**: Prisma 6.17, Zod 4, sonner, lucide-react y Tailwind 4, todas ya instaladas. **Sin dependencias nuevas.**

**Storage**: PostgreSQL con Prisma. **Un modelo nuevo**, `ZonaDelivery`, con una migración que lo crea y lo carga con las 90 zonas actuales (ver [data-model.md](./data-model.md)). No cambian columnas de `Direccion` ni de `Transaccion`.

**Testing**: `node:test`:

- pruebas puras de las reglas de zonas y del mensaje de WhatsApp (`npm.cmd run test:checkout`);
- dos casos nuevos en la integración del checkout, contra una base aislada.

Además `npm.cmd run lint`, `npm.cmd run build` y la validación manual de [quickstart.md](./quickstart.md) en teléfono y escritorio.

**Target Platform**: Navegadores modernos. El panel se usa en escritorio y teléfono; la venta rápida y el checkout son móvil primero.

**Project Type**: Aplicación web monolítica Next.js.

**Performance Goals**:

- Guardar una celda tarda menos de 1 segundo: un `UPDATE` y, si se renombra, una lectura de valores distintos de `urbanizacion` y un `updateMany`.
- Listar las zonas es una consulta de unas 90 filas por carga de página.
- El checkout añade un `findUnique` por la clave única.
- El buscador de la venta rápida filtra en memoria al escribir.
- SC-001: cambiar un costo en menos de 15 segundos. SC-002: agregar una zona en menos de 30 segundos. SC-005: elegir la zona y completar los datos en menos de 1 minuto.

**Constraints**:

- Una sola fuente de zonas y costos, y el cargo lo decide el servidor dentro de la transacción del checkout.
- La unicidad la garantiza la base de datos.
- La autorización se verifica en el servidor.
- La venta rápida no persiste nada.
- Notificaciones solo con sonner; UI en español; clases `admin-*` en el panel y tokens existentes en la tienda.
- La migración se aplica antes de desplegar el código.

**Scale/Scope**: unas 90 zonas, una sola lista y un único costo por zona.

- **Superficies que cambian**: el panel (sección nueva), el checkout (lectura y cobro), las direcciones, la cotización rápida y la venta rápida.
- **Fuera de alcance**: la venta manual del panel, la carga de Excel y las notas de entrega, que no usan zonas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la Constitución v2.0.0.

- [x] **I. Simplicidad ante todo (puerta de simplicidad)**:
  - **Alternativa más simple**: una tabla con cuatro campos útiles, sin clave foránea en `Direccion`, sin historial de costos, sin orden manual y sin borrado. Una tabla administrable es el mínimo que cumple FR-004 y FR-005.
  - **Qué se reutiliza**: `lib/prisma.ts`, `requireAdmin`, Zod, sonner y `roundMoney`.
    - En el checkout: `validateDeliveryInput` y `validatePaymentInput` sin cambios.
    - En la cotización: `QuoteDelivery` y `buildQuoteDraft`.
    - En la venta rápida: `mensajeWhatsapp`.
    - En el panel: las clases `admin-table`/`admin-sheet` y el patrón de desplazamiento de `BulkInventoryEditor`.
    - En la tienda: los primitivos de `components/venta-rapida/`.
  - **Qué se añade y por qué**: ver *Complexity Tracking*.
  - **Qué se elimina**: `DELIVERY_ZONES` y sus siete usos, y los grupos fijos `[3, 4, 5, 6]` de `ZoneSelector`.
  - Sin dependencias, capas ni superficies nuevas. `/admin/delivery` es una ruta dentro del panel.
- [x] **II. Una sola fuente de verdad**:
  - Las zonas pasan de una constante a PostgreSQL, y una sola regla (`delivery-zone-rules.ts`) decide clave, validación, orden y búsqueda.
  - Las escrituras son Server Actions en `lib/actions/delivery-zones.ts`, con Zod. El renombre y la reescritura de direcciones van en una sola transacción.
  - El checkout lee el costo dentro de su transacción y no confía en el navegador.
  - Los pedidos conservan su copia de la zona y del costo.
  - El cambio de `schema.prisma` va con su migración y `prisma generate`.
  - El estado duplicado del checkout no se amplía: `CheckoutData`, `appStore` y `checkoutContext` no ganan campos.
- [x] **III. Superficies con límites claros**:
  - **Panel**: gana una ruta propia.
  - **Tienda**: el checkout persiste lo mismo que hoy (zona y costo), ahora leídos de la base de datos.
  - **Venta rápida**: sigue sin crear `Transaccion` ni tocar inventario; solo añade datos al mensaje de WhatsApp.
  - **Cotización rápida**: sigue sin persistir.
  - Ninguna superficie cambia lo que persiste.
- [x] **IV. Seguridad del lado del servidor**:
  - `requireAdmin()` corre en cada escritura, y la página vive bajo el layout que exige autenticación y `ALLOWED_EMAILS`.
  - La lectura pública (`getZonasDelivery`/`listarZonasActivas`) expone solo `id`, `nombre` y `costoUsd` de las zonas activas, datos que hoy ya son públicos en el código.
  - Los datos de quien recibe en la venta rápida no salen del navegador salvo en el mensaje de WhatsApp.
- [x] **V. Pruebas proporcionales al riesgo**:
  - El costo del delivery es dinero:
    - las reglas puras (`validarCostoZona`, `claveZona`, `buscarZona`…) llevan pruebas unitarias;
    - el cobro en el checkout lleva pruebas de integración (costo de la base y zona inactiva) contra una base aislada.
  - El mensaje de WhatsApp lleva prueba unitaria.
  - La interfaz y el renombre con direcciones se validan con el quickstart. Las acciones dependen de `requireAdmin` (`server-only`), como las demás acciones del panel.

**Resultado de la puerta previa**: APROBADA. Sin violaciones; las adiciones estructurales se registran en *Complexity Tracking*.

**Re-evaluación tras la fase 1**: APROBADA. El diseño de [data-model.md](./data-model.md) y [contracts/delivery-zones.md](./contracts/delivery-zones.md) no añadió dependencias, campos al checkout ni escrituras en la venta rápida. El único ajuste fue de spec: el caso borde del costo que cambia a mitad del checkout ahora describe el rechazo que ya hace `validatePaymentInput` ([research.md](./research.md), Decisión 8).

## Design Decisions

El detalle y las alternativas descartadas están en [research.md](./research.md). Los contratos de las reglas, las acciones, el checkout, el mensaje y la interfaz están en [contracts/delivery-zones.md](./contracts/delivery-zones.md).

### Flujo de una edición en el panel

1. La dueña abre `/admin/delivery`. La página consulta todas las zonas y las pasa por `ordenarZonas`.
2. Edita una celda y pulsa Enter, o sale de ella. El componente valida con `validarNombreZona` o `validarCostoZona` y, si el valor cambió, llama a `actualizarZonaDelivery(id, { campo })` dentro de `useTransition`.
3. La acción ejecuta `requireAdmin` y Zod, y luego `prisma.$transaction`:
   1. lee la zona;
   2. la actualiza;
   3. si cambió el nombre, reescribe `Direccion.urbanizacion` en las direcciones con la clave anterior.

   Un `P2002` se traduce a "Ya existe una zona…".
4. `revalidatePath("/", "layout")` invalida la tienda, la venta rápida y la cotización.
5. El cliente muestra el aviso, reemplaza la fila con la zona devuelta y reordena. Si hay error, conserva el borrador marcado como inválido.

### Flujo del cobro en el checkout

`registrarCompraWeb` resuelve la zona con `claveZona(address.urbanizacion)` dentro de la transacción:

- si no existe o está inactiva, rechaza con `INVALID_ADDRESS`;
- si existe, usa `costoUsd` como `montoDelivery` y `nombre` como `zonaEntrega`.

El resto del checkout no cambia.

### Cambios por archivo

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Modelo `ZonaDelivery`. |
| `prisma/migrations/<timestamp>_zonas_delivery/migration.sql` (**nuevo**) | Crea la tabla, inserta las 90 zonas con su clave literal y comprueba el conteo. |
| `lib/delivery-zone-rules.ts` (**nuevo**) | Reglas puras: `claveZona`, `normalizarNombreZona`, `validarNombreZona`, `validarCostoZona`, `ordenarZonas`, `filtrarZonas`, `agruparPorCosto`, `buscarZona` y `validarDatosEntrega`, más los tipos `ZonaDeliveryVista`/`ZonaDeliveryPanel`. Sin `@/`. |
| `lib/delivery-zones.ts` (**nuevo**) | `listarZonasActivas()` (`server-only`). |
| `lib/actions/delivery-zones.ts` (**nuevo**) | `crearZonaDelivery` y `actualizarZonaDelivery`. |
| `lib/actions/address.ts` | Valida el sector contra las zonas activas por clave, guarda el nombre canónico y añade `getZonasDelivery()`. |
| `lib/checkout-core.ts` | Resuelve la zona en la base de datos por clave y rechaza zonas inactivas. Quita el import de `DELIVERY_ZONES`. |
| `lib/pos.ts` | `mensajeWhatsapp` acepta `delivery` y se exporta el tipo `DeliveryVentaRapida`. |
| `lib/constants/constants.ts` | Elimina `DELIVERY_ZONES`. |
| `app/admin/delivery/page.tsx` (**nuevo**) | Consulta todas las zonas y renderiza la tabla. |
| `components/admin/delivery/deliveryZonesTable.tsx` (**nuevo**) | Tabla editable: celdas, fila nueva, activar/desactivar y avisos. |
| `components/admin/sidebar.tsx` | Entrada "Delivery" (`Truck`) en `adminNavigation`. |
| `components/admin/header.tsx` | Título "Delivery" para `/admin/delivery`. |
| `app/venta-rapida/page.tsx` | Carga las zonas activas y pasa `zonas`/`zonasError` a `PuntoDeVenta`. |
| `components/venta-rapida/puntoDeVenta.tsx` | Estado `entrega`, totales con delivery, validación antes de enviar, `mensajeWhatsapp` con delivery y reinicio en "Vaciar". El contenido del `Sheet` se desplaza. |
| `components/venta-rapida/deliverySelector.tsx` (**nuevo**) | Interruptor, buscador, lista agrupada, zona elegida con "Cambiar" y formulario de quien recibe. |
| `components/finalizar-compra/zoneSelector.tsx` | Recibe `zonas` y agrupa de forma dinámica con las reglas compartidas. |
| `components/finalizar-compra/addressManager.tsx` | Carga las zonas con `getZonasDelivery()`, calcula el costo con `buscarZona` y marca "Sin delivery en este sector". |
| `app/cotizacion-rapida/page.tsx` | Carga las zonas activas y las pasa a `QuickQuote`. |
| `components/cotizacion-rapida/quickQuote.tsx` | Usa `zonas` por props y `agruparPorCosto`. |
| `tests/checkout/delivery-zones.test.ts` (**nuevo**) | Casos de las tablas del contrato. |
| `tests/checkout/quick-sale-channel.test.ts` | Mensaje con y sin delivery. |
| `tests/checkout/checkout.integration.test.ts` | Cobra el costo de una zona creada en la prueba ($4,50) y rechaza una zona inactiva sin crear el pedido ni tocar el stock. |
| `CLAUDE.md`, `docs/descripcion-tecnica.md` | Documentan `ZonaDelivery` como única fuente, la clave, la sección del panel y el delivery por WhatsApp de la venta rápida. |

### Decisiones de interfaz

- **Campos siempre editables en la tabla** (estilo hoja de cálculo, como el editor masivo), en lugar de "clic para editar". Así se edita en el teléfono sin un toque extra.
- **La fila nueva va al principio**: con 90 zonas, al final quedaría fuera de la vista. Se crea solo con Enter o "Guardar", nunca al salir del campo.
- **Desactivar sin confirmación**: es reversible desde la misma fila.
- **Sin buscador en la tabla del panel** (Assumptions de la spec). El orden por costo y nombre y la búsqueda del navegador bastan para unas 90 filas.
- **En la venta rápida, el bloque de delivery está pegado al botón de WhatsApp**, con la ayuda "Solo para el pedido por WhatsApp", para que no se confunda con "Procesar pedido en la app".
- **Desglose solo con zona elegida**: con el interruptor apagado, el resumen se ve igual que hoy.

## Project Structure

### Documentation (this feature)

```text
specs/011-zonas-delivery/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── delivery-zones.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera $speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                              # + ZonaDelivery
└── migrations/<timestamp>_zonas_delivery/     # NUEVO: tabla + 90 zonas

lib/
├── delivery-zone-rules.ts                     # NUEVO: reglas puras
├── delivery-zones.ts                          # NUEVO: listarZonasActivas
├── checkout-core.ts                           # zona desde la BD por clave
├── pos.ts                                     # mensajeWhatsapp con delivery
├── constants/constants.ts                     # - DELIVERY_ZONES
└── actions/
    ├── delivery-zones.ts                      # NUEVO: crear / actualizar
    └── address.ts                             # validación por clave + getZonasDelivery

app/
├── admin/delivery/page.tsx                    # NUEVO: sección "Delivery"
├── venta-rapida/page.tsx                      # zonas activas
└── cotizacion-rapida/page.tsx                 # zonas activas

components/
├── admin/
│   ├── sidebar.tsx                            # entrada "Delivery"
│   ├── header.tsx                             # título
│   └── delivery/deliveryZonesTable.tsx        # NUEVO: tabla editable
├── venta-rapida/
│   ├── puntoDeVenta.tsx                       # estado de entrega + mensaje
│   └── deliverySelector.tsx                   # NUEVO: selector + formulario
├── finalizar-compra/
│   ├── zoneSelector.tsx                       # zonas por props
│   └── addressManager.tsx                     # costo por clave
└── cotizacion-rapida/quickQuote.tsx           # zonas por props

tests/checkout/
├── delivery-zones.test.ts                     # NUEVO
├── quick-sale-channel.test.ts                 # + delivery
└── checkout.integration.test.ts               # + zona de BD / inactiva
```

**Structure Decision**: se mantiene el monolito Next.js con sus convenciones:

- **Escrituras**: en `lib/actions/` (Server Actions con Zod).
- **Reglas puras**: en la raíz de `lib/`, junto a `checkout-rules.ts` y `catalog-order.ts`, porque las comparten la tienda y el panel.
- **Lectura compartida**: en `lib/delivery-zones.ts`.
- **Interfaz**: la sección del panel en `app/admin/delivery` con su componente en `components/admin/delivery/`, y el selector de la venta rápida junto a `puntoDeVenta.tsx`.
- **Pruebas**: en `tests/checkout/`, porque la regla afecta sobre todo el cobro.

## Complexity Tracking

| Adición | Por qué hace falta | Alternativa más simple descartada |
|---|---|---|
| Modelo `ZonaDelivery` + migración con 90 filas | La dueña debe editar zonas sin un desarrollador y el checkout debe cobrar lo mismo que ella ve (FR-004, FR-011). | Mantener `DELIVERY_ZONES`: no es editable. Tabla de configuración JSON: sin unicidad ni validación en la base de datos. |
| Columna `clave` única | La unicidad sin acentos ni mayúsculas debe resistir creaciones simultáneas (FR-006). | Comprobar en la aplicación: tiene una carrera. Índice con `unaccent`: extensión nueva y deriva del esquema. |
| `lib/delivery-zone-rules.ts` | La regla de clave, validación, orden, filtro y agrupado tiene 6 consumidores reales (checkout, acciones, 3 selectores y tabla) y afecta dinero. | Repetirla en cada componente: el checkout y los selectores divergirían, como ya pasa con los grupos fijos `[3, 4, 5, 6]`. |
| `lib/delivery-zones.ts` | La regla "solo activas, en orden" tiene 3 consumidores (venta rápida, cotización y checkout). | Repetir la consulta en las tres: tres copias de una regla de negocio. |
| `lib/actions/delivery-zones.ts` | Escrituras del panel con `requireAdmin`, separadas de la lectura pública de `address.ts`. | Ponerlas en `address.ts`: mezclaría acciones públicas y de administración en un mismo archivo. |
| `app/admin/delivery/page.tsx` + `deliveryZonesTable.tsx` | Es la sección pedida (FR-001). La tabla tiene estado propio de edición por celda. | Reutilizar `BulkInventoryEditor`: guarda por lotes y la spec pide guardar celda por celda. |
| `components/venta-rapida/deliverySelector.tsx` | La interacción (lista visible y luego solo la selección más el formulario) es distinta del combobox del checkout. | Generalizar `ZoneSelector` con modos: acopla dos interfaces y dos temas visuales por unas pocas líneas. |

## Phase 1 Implementation Boundaries

- No cambian `CheckoutData`, `appStore`, `checkoutContext`, `validateDeliveryInput` ni `validatePaymentInput`.
- No cambian las columnas de `Direccion` ni de `Transaccion`. Los pedidos registrados conservan su `zonaEntrega` y su `montoDelivery`.
- La venta rápida no crea pedidos, clientes ni direcciones, ni toca inventario. "Procesar pedido en la app" no cambia.
- No cambian la venta manual del panel, la carga y exportación de Excel, las notas de entrega ni las analíticas.
- El modal de clientes del panel conserva su campo "Urbanización" de texto libre. Sus direcciones solo sirven para delivery si coinciden por clave con una zona activa, igual que hoy con la lista fija.
- Sin historial de cambios de costos, sin orden manual de zonas y sin borrado de zonas.
