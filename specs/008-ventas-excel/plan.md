# Implementation Plan: Control de ventas desde Excel: carga masiva, tipo de precio y cuentas por cobrar

**Branch**: `008-ventas-excel` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-ventas-excel/spec.md`

## Summary

El panel incorpora lo que la dueña registra hoy en su Excel de "Control de ventas":

- **Carga masiva de archivos `.xlsx`**: vista previa, conciliación de productos y clientes que se recuerda y creación atómica e idempotente de pedidos.
- **Tipo de precio en cada línea**: Detal, Mayor o Promo.
- **Cantidades con hasta 2 decimales**: en todos los pedidos del panel, con el inventario también en decimales.
- **Abonos parciales**: con saldo por pedido y resumen de cuentas por cobrar por cliente.
- **Descarga del control de ventas**: con las mismas columnas del Excel.

El enfoque técnico reutiliza el stack sin dependencias nuevas:

- **Lectura del Excel**: un lector propio de `.xlsx` (`node:zlib` y XML acotado), simétrico al escritor que ya existe en `sales-export.ts`.
- **Carga**: dos Server Actions. La vista previa no escribe nada; la confirmación vuelve a leer el archivo y aplica todo en una transacción Prisma. Las notas del Excel se convierten en pedidos con su número, que ya es único y hace la recarga idempotente.
- **Abonos**: son registros de `Pago` marcados con `esAbono`. El saldo se deriva de ellos y no se guarda.
- **Inventario**: un único ajustador redondea y bloquea la fila del producto, y lo usan los cuatro flujos que escriben inventario.
- **Esquema**: una sola migración.

## Technical Context

**Language/Version**: TypeScript estricto, React 19.1 y Next.js 15.5 (App Router).

**Primary Dependencies**: Prisma 6, Zod 4, sonner, lucide-react y los módulos de Node `node:zlib` (descompresión del `.xlsx`). **Sin dependencias nuevas.**

**Storage**: PostgreSQL con Prisma. Una migración (`20261029000000_control_ventas_excel`):

- enum `TipoPrecio`;
- `MetodoPago.NoEspecificado`;
- `DetalleCompra.cantidad` y `Producto.inventario` pasan a `Float`;
- `DetalleCompra.tipoPrecio`;
- `Transaccion.importada`;
- en `Pago`: `esAbono`, `actorId`, `actorEmail` y `anuladoEn`;
- `Cliente.celular` pasa a ser opcional;
- dos modelos de equivalencias.

Detalle en [data-model.md](./data-model.md).

**Testing**:

- `node:test` con `npm.cmd run test:admin` y `npm.cmd run test:checkout`.
- Unitarias para el lector, el núcleo de la carga, las reglas de inventario, los abonos y la exportación.
- Integración (`RUN_ADMIN_INTEGRATION=1`, base aislada) para la carga, los abonos y la cancelación.
- `npm.cmd run lint`, `npm.cmd run build` y la validación manual de [quickstart.md](./quickstart.md) con el archivo real, en escritorio y en móvil.

**Target Platform**: Panel administrativo en navegadores modernos de escritorio y teléfono; servidor Node (las Server Actions de la carga usan `node:zlib`).

**Project Type**: Aplicación web monolítica Next.js (Server Components, Server Actions y componentes cliente).

**Performance Goals**:

- Vista previa del archivo mensual (54 líneas) en menos de 2 s, y de 2.000 líneas en menos de 10 s.
- Confirmación de 2.000 líneas dentro del tope de 60 s de la transacción (el mismo del editor masivo).
- Registrar un abono en menos de 1 minuto de interacción (SC-007).

**Constraints**:

- La carga es atómica (todo o nada) y no toca inventario ni fidelidad.
- Archivos de hasta 5 MB y 2.000 líneas; el límite de las Server Actions sube a 6 MB.
- Las fechas importadas se guardan a las 12:00 de Caracas.
- Notificaciones solo con sonner y UI en español.
- Las cantidades y el inventario se redondean siempre a 2 decimales; la tienda sigue vendiendo unidades enteras.

**Scale/Scope**:

- Unas 50 a 100 líneas por mes y hasta 2.000 por carga; decenas de pedidos abiertos.
- Toca el Panel administrativo y, en dos puntos acotados, la tienda: el checkout guarda el tipo de precio y la tienda, la venta rápida y la cotización ven `floor(inventario)`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la Constitución v2.0.0.

- [x] **I. Simplicidad ante todo (puerta de simplicidad)**:
  - **Alternativa más simple que cumple la spec**:
    - leer el `.xlsx` con un lector mínimo propio, en lugar de una librería;
    - Server Actions sin estado intermedio (el archivo se reenvía al confirmar);
    - equivalencias como dos tablas pequeñas;
    - abonos sobre la tabla `Pago` existente;
    - cuentas por cobrar como un filtro y un resumen en la tabla de ventas, sin página nueva;
    - exportación en la ruta y el escritor existentes.
  - **Qué se reutiliza**:
    - `requireAdmin`, Zod y sonner;
    - `EstadoTransaccionHistorial` (importación, saldado y anulación) y `normalizeSearchName`;
    - `calculateSaleTotals`/`roundMoney`, `nextOrderNumber`, el escritor ZIP de `sales-export.ts` y la ruta `/admin/transactions/export`;
    - el patrón de núcleo con `tx` de `order-state-change.ts`;
    - el filtro y la paginación de "Ventas y pedidos".
  - **Qué se añade**:
    - cinco módulos: `lib/inventory.ts`, `lib/admin/xlsx-reader.ts`, `lib/admin/sales-import-core.ts`, `lib/admin/sales-import.ts` y `lib/admin/abonos.ts`;
    - una acción (`lib/actions/sales-import.ts`);
    - tres componentes;
    - una ruta (`/admin/transactions/import`);
    - dos modelos y un ajuste en `next.config.ts`.

    Cada adición está justificada en *Complexity Tracking*. No hay dependencias, servicios externos ni capas nuevas.
- [x] **II. Una sola fuente de verdad**:
  - **Escrituras**: todas son Server Actions con Zod; la carga, los abonos y los ajustes de inventario se ejecutan en transacciones Prisma que revalidan en el servidor (la confirmación vuelve a leer el archivo y no confía en la vista previa).
  - **Caminos de escritura**: la carga crea pedidos con su propio núcleo transaccional porque no hay camino existente para ventas históricas que no tocan inventario. Reutiliza las mismas reglas de totales (`roundMoney`), historial y numeración, y no abre otro camino para ventas nuevas.
  - **Pagos y estados**: los pagos siguen en una sola tabla. Los cambios de estado por abonos escriben el historial append-only con escritura condicionada.
  - **Inventario**: la regla vive en un solo lugar (`ajustarInventario`), que usan los cuatro escritores.
  - **Esquema**: el cambio se entrega con migración y `prisma generate`.
- [x] **III. Superficies con límites claros**:
  - **Panel administrativo**: carga, abonos, tipo de precio, decimales, analíticas y exportación; la ruta nueva es hija de `/admin/transactions`.
  - **Tienda**: solo cambia lo que persiste el checkout (añade `tipoPrecio`, cubierto por esta spec, FR-026) y la lectura de stock como unidades enteras.
  - **Venta rápida y cotización rápida**: solo leen `floor(inventario)`; no persisten nada nuevo.
- [x] **IV. Seguridad del lado del servidor**:
  - `requireAdmin()` en las dos acciones de carga, en `registrarAbono`/`anularAbono` y en la ruta de exportación (ya existente).
  - El archivo se valida en el servidor (tamaño, ZIP, límites de descompresión) y el XML se lee sin interpretar DTD ni entidades externas.
  - El archivo real de la clienta no entra al repositorio.
  - La vista previa expone solo nombre y tipo de los clientes, nunca teléfono, RIF ni correo.
- [x] **V. Pruebas proporcionales al riesgo**:
  - **Unitarias**: lector, normalización, agrupación, cobro, coincidencias, cantidades, saldo y reparto de la exportación.
  - **Integración** (base aislada): la transacción de carga (atomicidad, idempotencia, sin inventario, secuencia), abonos con bloqueo y paso a "Pagado", cancelación de importados y de cantidades decimales, y el checkout con tipo de precio.
  - Sin frameworks nuevos.

**Resultado de la puerta previa**: APROBADA, con las adiciones registradas en *Complexity Tracking*.

## Design Decisions

El detalle y las alternativas descartadas están en [research.md](./research.md); los contratos, en [contracts/sales-import.md](./contracts/sales-import.md), [contracts/abonos.md](./contracts/abonos.md) y [contracts/ventas-lineas.md](./contracts/ventas-lineas.md).

### Flujo de una carga

1. La persona sube el `.xlsx` en `/admin/transactions/import`, que envía `archivo` a `previsualizarCargaVentas`.
2. La acción ejecuta `requireAdmin` y comprueba el tamaño. Después:
   1. `leerLibroXlsx(bytes)` devuelve las hojas y sus celdas;
   2. `construirCarga(hojas, hoy)` localiza los encabezados, normaliza las filas, las agrupa por nota y calcula importes y lo cobrado;
   3. `prepararVistaPrevia(prisma, carga)` resuelve las equivalencias, las coincidencias exactas y las sugerencias, y decide si cada nota es nueva, ya registrada, conflicto o con error.
3. La persona concilia los productos y clientes pendientes y confirma. El componente reenvía el **mismo archivo** y las `resoluciones` a `confirmarCargaVentas`.
4. La acción repite el paso 2 y ejecuta `prisma.$transaction(tx => aplicarCargaVentas(tx, carga, resoluciones, actor, nombre))`. El núcleo:
   - revalida;
   - crea los clientes nuevos;
   - crea cada pedido con sus líneas, su abono (si hubo cobro) y su historial;
   - guarda las equivalencias y avanza el correlativo si hace falta.

   No toca el inventario.
5. Se revalidan las rutas, aparece la notificación con el resumen y un enlace a la tabla filtrada por el rango cargado.

### Flujo de un abono

`AbonosPanel` envía los datos a `registrarAbono`. La acción ejecuta `requireAdmin` y Zod y luego `prisma.$transaction(tx => registrarAbonoEnPedido(tx, input, actor))`. El núcleo:

1. bloquea la fila del pedido (`FOR UPDATE`);
2. valida el estado y el saldo;
3. crea el `Pago` con `esAbono`;
4. si el saldo llega a 0, pasa el pedido a "Pagado" con escritura condicionada y escribe el historial "Saldado con abonos".

Se revalidan las rutas y se muestra la notificación.

### Cambios por archivo

**Esquema y configuración**

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` + `prisma/migrations/20261029000000_control_ventas_excel/` | Cambios de [data-model.md](./data-model.md). |
| `next.config.ts` | `experimental.serverActions.bodySizeLimit: "6mb"`. |

**Reglas y núcleos (sin `@/`, se pueden probar con `node:test`)**

| Archivo | Cambio |
|---|---|
| `lib/inventory.ts` (**nuevo**) | `isValidQuantity`, `roundQuantity`, `unidadesDisponibles` y `ajustarInventario(tx, …)` con bloqueo de fila. |
| `lib/admin/xlsx-reader.ts` (**nuevo**) | `leerLibroXlsx(bytes)`: ZIP (métodos 0 y 8, con límites), workbook, rels, sharedStrings y celdas. Puro. |
| `lib/admin/sales-import-core.ts` (**nuevo**) | Funciones puras: normalización de texto y encabezados, localización de la tabla, lectura de filas, fechas (serial y `d/m/aaaa`), validaciones, agrupación por nota, cobro, claves de producto y cliente, coincidencia exacta y sugerencia, y situación de cada nota. |
| `lib/admin/sales-import.ts` (**nuevo**) | `prepararVistaPrevia(db, carga)` y `aplicarCargaVentas(tx, …)`. Reciben el cliente o la transacción. |
| `lib/admin/abonos.ts` (**nuevo**) | Reglas puras (abonado, saldo, montos, estados admitidos y agrupación de cuentas por cobrar) y los núcleos `registrarAbonoEnPedido(tx, …)` y `anularAbonoEnPedido(tx, …)`. |
| `lib/admin/order-state-change.ts` | La devolución al cancelar usa `ajustarInventario` y se omite si `transaction.importada`. |
| `lib/admin/sales-calculations.ts` | `calculateSubtotal` valida con `isValidQuantity`. |
| `lib/admin/sales-export.ts` | Separa el escritor genérico (ZIP, estilos y celdas, con un estilo de fecha) y añade `buildSalesControlWorkbook` con el reparto de deuda y abono. La cantidad se formatea con hasta 2 decimales en la exportación de pedidos. |

**Server Actions**

| Archivo | Cambio |
|---|---|
| `lib/actions/sales-import.ts` (**nuevo**) | `previsualizarCargaVentas` y `confirmarCargaVentas`. |
| `lib/actions/admin-orders.ts` | Añade `registrarAbono` y `anularAbono`. |
| `lib/actions/admin-sales.ts` | Las líneas y las filas nuevas aceptan `tipoPrecio` y cantidades decimales. El stock se descuenta con `ajustarInventario`. `actualizarDescuentoVenta` rechaza un total menor que lo abonado. |
| `lib/actions/checkout.ts` | Guarda `tipoPrecio` según el contexto; el descuento de stock usa `ajustarInventario` y conserva sus códigos de error. |
| `lib/actions/products.ts` | `inventario` con 2 decimales (crear, editar y editor masivo). |
| `lib/actions/cotizacion-rapida.ts` | `unidadesDisponibles` en el snapshot y en la comparación. |

**Consultas y tipos**

| Archivo | Cambio |
|---|---|
| `lib/admin/analytics.ts` | `porTipoPrecio`; cantidades redondeadas. |
| `lib/admin/sales-query.ts` | Filtro `saldo=pendiente` y `consultarCuentasPorCobrar(prisma)`. |
| `lib/admin/types.ts` | `SalesRow` (`abonadoUsd`, `saldoUsd` y productos con `tipoPrecio`), `AnalyticsResult.porTipoPrecio`, `ClientRow.celular: string \| null` y los tipos de la carga y los abonos. |
| `lib/admin/client-query.ts`, `lib/admin/delivery-note-pdf.ts` | Admiten `celular` nulo. |

**Páginas y rutas**

| Archivo | Cambio |
|---|---|
| `app/admin/transactions/import/page.tsx` (**nuevo**) | Página de carga: cabecera y `SalesImport`, con la lista de clientes para vincular. |
| `app/admin/transactions/page.tsx` | Botones "Cargar Excel" y "Descargar control de ventas", columnas de abonado y saldo, filtro de saldo y `ReceivablesSummary` cuando el filtro está activo. |
| `app/admin/transactions/[id]/page.tsx` | Tipo de precio y cantidades en las líneas, y `AbonosPanel`. "Pago declarado" muestra solo los pagos que no son abonos. |
| `app/admin/transactions/export/route.ts` | `formato=control`. |
| `app/productos/consumidores/page.tsx`, `app/productos/consumidores/[id]/page.tsx`, `app/venta-rapida/page.tsx`, `app/cotizacion-rapida/page.tsx` | `inventario: unidadesDisponibles(p.inventario)`. |

**Componentes**

| Archivo | Cambio |
|---|---|
| `components/admin/ventas/salesImport.tsx` (**nuevo**) | Los tres pasos de la carga. |
| `components/admin/ventas/abonosPanel.tsx` (**nuevo**) | Lista, alta y anulación de abonos, con modal de confirmación. |
| `components/admin/ventas/receivablesSummary.tsx` (**nuevo**) | Resumen de cuentas por cobrar. |
| `components/admin/ventas/manualSaleForm.tsx`, `bulkSalesEditor.tsx` | Selector de tipo con precio de catálogo o promo manual, y cantidad con `step="0.01"`. |
| `components/admin/ventas/salesTable.tsx` | Abonado y saldo en la fila y en la tarjeta; cantidades con decimales. |
| `components/admin/ventas/salesFilters.tsx` | "Con saldo pendiente". |
| `components/admin/ventas/statusHistory.tsx` | Las entradas sin cambio de estado (anulaciones) se muestran como evento con su motivo. |
| `components/admin/analiticas/analyticsDashboard.tsx` | Tabla por tipo de precio. |
| `components/admin/inventario/*`, `app/admin/add-product/page.tsx`, `components/admin/edit-product/editProductForm.tsx` | Inventario con `step="0.01"` y formato con hasta 2 decimales. |
| `components/admin/clientes/bulkClientsEditor.tsx`, `clientsTable.tsx` | Teléfono vacío para los clientes importados. |

**Pruebas**

| Archivo | Cambio |
|---|---|
| `tests/admin/xlsx-fixture.ts` (**nuevo**) | Helper que genera en memoria un `.xlsx` con la estructura del archivo real y nombres ficticios (ZIP con deflate, sharedStrings y fórmulas con valor guardado). |
| `tests/admin/xlsx-reader.test.ts`, `sales-import-core.test.ts`, `inventory.test.ts`, `abonos.test.ts` (**nuevos**) | Unitarias. |
| `tests/admin/sales-import.integration.test.ts`, `abonos.integration.test.ts` (**nuevos**) | Integración. |
| `tests/admin/sales-calculations.test.ts`, `sales-export.test.ts`, `order-status.integration.test.ts`, `admin-sales.integration.test.ts`, `analytics.integration.test.ts`, `tests/checkout/checkout.integration.test.ts` | Casos de decimales, tipo de precio, cancelación de importados y exportación de control. |

**Documentación**

| Archivo | Cambio |
|---|---|
| `CLAUDE.md`, `docs/descripcion-tecnica.md` | Nuevo flujo de carga (no toca inventario), abonos (`Pago.esAbono`) y saldo, inventario y cantidades con decimales mediante `ajustarInventario`, y `tipoPrecio`. |

### Decisiones de interfaz

- **Página de carga**: la vista previa es una página (`/admin/transactions/import`) y no una modal, porque puede tener cientos de líneas. En móvil las notas se muestran como tarjetas.
- **Conciliación**: usa `<select>` nativos (accesibles y con el selector del sistema en móvil). Las sugerencias aparecen preseleccionadas con la marca "Sugerido" y la persona las confirma.
- **Tipo de precio**: el cambio de tipo reescribe el precio de catálogo solo para Detal y Mayor. Promo deja el campo vacío para obligar a escribirlo y evitar guardar sin querer un precio de catálogo como promoción.
- **Resumen de cuentas por cobrar**: aparece con el filtro "Con saldo pendiente", para que la tabla y el resumen muestren siempre el mismo conjunto de pedidos.
- **Anulación de abonos**: pide confirmación en una modal con las acciones "Volver" y "Anular abono", siguiendo el patrón de la modal de cancelación de la 007.

### Orden de implementación sugerido

1. **Base**: esquema y migración, `lib/inventory.ts` y su adopción en los cuatro escritores, `calculateSubtotal` con decimales y lecturas de stock en la tienda. Es la única dependencia transversal.
2. **Historia 2 (P1)**: tipo de precio en la venta manual, el editor masivo y el checkout; detalle y analíticas.
3. **Historia 1 (P1)**: lector, núcleo de la carga, acciones y página. Usa `Pago.esAbono` y `Transaccion.importada`, creados en el paso 1.
4. **Historia 3 (P2)**: abonos, saldo, filtro y resumen de cuentas por cobrar.
5. **Historia 4 (P3)**: exportación del control de ventas.

Cada paso deja el sistema funcionando y se puede entregar por separado.

## Project Structure

### Documentation (this feature)

```text
specs/008-ventas-excel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── sales-import.md
│   ├── abonos.md
│   └── ventas-lineas.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera $speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma
└── migrations/20261029000000_control_ventas_excel/   # NUEVA

app/admin/transactions/
├── page.tsx                          # Saldo, filtro, resumen y botones
├── import/page.tsx                   # NUEVO: carga de Excel
├── [id]/page.tsx                     # Tipo de precio y abonos
└── export/route.ts                   # formato=control

components/admin/ventas/
├── salesImport.tsx                   # NUEVO
├── abonosPanel.tsx                   # NUEVO
├── receivablesSummary.tsx            # NUEVO
├── manualSaleForm.tsx                # Tipo de precio y decimales
├── bulkSalesEditor.tsx               # Tipo de precio y decimales
├── salesTable.tsx                    # Abonado y saldo
├── salesFilters.tsx                  # Con saldo pendiente
└── statusHistory.tsx                 # Eventos sin cambio de estado

lib/
├── inventory.ts                      # NUEVO: cantidades y ajuste de inventario
├── admin/
│   ├── xlsx-reader.ts                # NUEVO: lector .xlsx
│   ├── sales-import-core.ts          # NUEVO: reglas puras de la carga
│   ├── sales-import.ts               # NUEVO: vista previa y núcleo transaccional
│   ├── abonos.ts                     # NUEVO: reglas y núcleos de abonos
│   ├── order-state-change.ts         # Cancelación con ajustarInventario e importados
│   ├── sales-calculations.ts         # Cantidades decimales
│   ├── sales-export.ts               # Escritor genérico y control de ventas
│   ├── sales-query.ts                # Filtro de saldo y cuentas por cobrar
│   └── analytics.ts                  # Desglose por tipo de precio
└── actions/
    ├── sales-import.ts               # NUEVO: previsualizar y confirmar
    ├── admin-orders.ts               # registrarAbono y anularAbono
    ├── admin-sales.ts                # Tipo, decimales, ajustarInventario y descuento
    ├── checkout.ts                   # tipoPrecio y ajustarInventario
    └── products.ts                   # Inventario con decimales

tests/admin/
├── xlsx-fixture.ts                          # NUEVO: genera el libro sintético
├── xlsx-reader.test.ts                      # NUEVO
├── sales-import-core.test.ts                # NUEVO
├── inventory.test.ts                        # NUEVO
├── abonos.test.ts                           # NUEVO
├── sales-import.integration.test.ts         # NUEVO
└── abonos.integration.test.ts               # NUEVO
```

**Structure Decision**: Se mantiene el monolito Next.js. Las escrituras siguen en `lib/actions/*`. Las reglas puras y los núcleos transaccionales que reciben `tx` van en `lib/admin/*` y `lib/inventory.ts`, con imports relativos para poder probarlos (precedentes: `order-state-change.ts` y `order-number.ts`). La única ruta nueva es hija de "Ventas y pedidos" dentro del panel protegido.

## Phase 1 Implementation Boundaries

- La carga **no** descuenta ni devuelve inventario, no crea `Fidelidad`, no crea documentos `NotaEntrega` y no crea productos.
- El checkout conserva su entrada, sus códigos de error y su idempotencia. Solo añade `tipoPrecio` y delega el descuento de stock en `ajustarInventario`.
- La venta rápida y la cotización rápida no cambian lo que persisten (nada); solo leen `floor(inventario)`.
- Los pagos existentes quedan con `esAbono = false`; los pedidos y líneas existentes no se recalculan ni se les infiere el tipo.
- Las notas de entrega (`DetalleNotaEntrega.cantidad`) siguen siendo enteras: fuera de alcance.
- El editor masivo no gana abonos: los abonos se registran solo desde el detalle del pedido.
- La validación manual cubre un viewport estrecho y uno de escritorio, y usa el archivo real de agosto en una base aislada.

## Constitution Check (post-diseño)

- [x] **I**: no hay dependencias nuevas. Los módulos nuevos tienen un solo propósito cada uno y se justifican abajo. `ajustarInventario` se extrae porque la regla de inventario tiene cuatro usos reales y debe vivir en un solo lugar. Las cuentas por cobrar y la exportación reutilizan la tabla y la ruta existentes.
- [x] **II**: cada escritura es atómica. La carga revalida contra el estado vigente, los abonos bloquean la fila del pedido y el inventario se ajusta siempre por el mismo camino. El historial es append-only y la migración acompaña al cambio de esquema.
- [x] **III**: el Panel administrativo es la superficie principal. En la tienda solo cambian el `tipoPrecio` del checkout y la lectura entera del stock; la venta rápida y la cotización no persisten nada nuevo.
- [x] **IV**: la autorización se comprueba en cada acción y en la ruta. La validación del archivo es defensiva (límites del ZIP y XML sin DTD) y la vista previa no expone datos de contacto.
- [x] **V**: hay pruebas unitarias e integración sobre el dinero (cobro, saldo, abonos), el inventario (decimales, cancelación de importados) y los estados (saldado automático), con `node:test`.

**Resultado**: APROBADA.

## Complexity Tracking

| Cambio | Motivo | Alternativa más simple descartada |
|---|---|---|
| Lector `.xlsx` propio (`lib/admin/xlsx-reader.ts`, unas 200 líneas) | La spec exige cargar archivos de Excel y no hay ninguna librería en el stack. | **SheetJS (npm)**: tiene vulnerabilidades sin corregir en el registro. **`exceljs`**: es una dependencia pesada para leer una tabla. **Pedir CSV**: incumple la spec y pierde fechas y acentos. |
| Ruta nueva `/admin/transactions/import` | La vista previa de cientos de líneas con conciliación no cabe en una modal. | **Modal en "Ventas y pedidos"**: ilegible en móvil y mezcla dos flujos en un componente que ya es grande. |
| `experimental.serverActions.bodySizeLimit = "6mb"` | FR-002 permite archivos de hasta 5 MB y el límite por defecto es 1 MB. | **Bajar el límite de la spec a 1 MB**: cubriría el uso mensual, pero contradice FR-002 sin consultar. **Route Handler aparte**: duplica la autorización y el manejo de errores. |
| `EquivalenciaProducto` y `EquivalenciaCliente` | FR-011 exige recordar las decisiones entre cargas, y FR-040 necesita la descripción original para exportar. | **Un solo modelo polimórfico**: necesita una restricción de verificación y no ahorra código. **No recordarlas**: incumple FR-011 y SC-005. |
| `lib/inventory.ts` con `ajustarInventario` (bloqueo `FOR UPDATE` vía `$queryRaw`) | Con inventario decimal, `increment`/`decrement` sobre `Float` acumulan restos binarios. La regla tiene cuatro usos y debe ser única. | **`Decimal(10,2)`**: es exacto, pero obliga a convertir en más de 15 lecturas y cada olvido falla en tiempo de ejecución. **Enteros en centésimas**: cambia el significado de cada lectura. |
| `Pago.esAbono` (+ actor y anulación) | Los `Pago` del checkout son montos declarados, no cobrados. Sin el indicador, un pedido "Por cobrar" de la tienda mostraría saldo cero. | **Modelo `Abono` separado**: dos tablas de pagos con la misma forma que la exportación y el detalle tendrían que unir. **Contar todos los pagos**: daría saldos falsos. |
| Núcleo de carga propio (`aplicarCargaVentas`) en lugar de reutilizar `registrarVentaManual` | Las ventas importadas no descuentan inventario, traen su número, su fecha y lo cobrado, y deben aplicarse cientos a la vez en una transacción. | **Llamar a `registrarVentaManual` por nota**: descontaría inventario, no sería atómico entre notas y obligaría a ampliar esa acción con banderas para ventas históricas. |
