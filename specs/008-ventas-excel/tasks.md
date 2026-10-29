---

description: "Task list for Excel sales import, price type per line, decimal quantities, payments on account and sales control export"
---

# Tasks: Control de ventas desde Excel: carga masiva, tipo de precio y cuentas por cobrar

**Input**: Design documents from `/specs/008-ventas-excel/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/sales-import.md](./contracts/sales-import.md), [contracts/abonos.md](./contracts/abonos.md), [contracts/ventas-lineas.md](./contracts/ventas-lineas.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen porque la constitución (Principio V) exige pruebas para las reglas que tocan dinero, inventario y estados de pedido.

- Las reglas puras se prueban sin base de datos con `node:test`.
- Las transacciones se prueban en una base aislada (`RUN_ADMIN_INTEGRATION=1` y `ADMIN_TEST_DATABASE_URL`).
- La interfaz se valida a mano con [quickstart.md](./quickstart.md).
- Los tests importan con ruta relativa y extensión `.js` (`../../lib/admin/status.js`), como los existentes.
- Los módulos que se prueban no usan `@/` ni `server-only` e importan sus dependencias con `./x.ts` o `../x.ts`.

**Organization**: Las tareas se agrupan por historia de usuario, en el orden de prioridad de la spec:

| Historia | Prioridad | Contenido |
|---|---|---|
| US1 | P1 | Carga de Excel |
| US2 | P1 | Tipo de precio |
| US3 | P2 | Abonos y cuentas por cobrar |
| US4 | P3 | Exportación del control de ventas |

La fase Foundational concentra la migración única, las cantidades e inventario con decimales (FR-017) y las reglas puras de saldo, porque las usan varias historias.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario de la tarea (US1, US2, US3, US4).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fijar la línea base antes de tocar código.

- [X] T001 Fijar la línea base:
  - Ejecutar `npm.cmd run test:admin`, `npm.cmd run test:checkout` y `npm.cmd run lint`, y anotar los fallos preexistentes para no confundirlos con regresiones.
  - Confirmar que `package.json` no tiene librerías de hojas de cálculo. **No añadir dependencias**: el lector `.xlsx` es propio (research, Decisión 1).
  - Confirmar con `git ls-files "*.xlsx"` que el archivo real de la clienta (`Ventas PASTAS para la Web.xlsx`) no está en el repositorio. No debe copiarse nunca: tiene datos personales de sus clientes.
  - Confirmar que existe una base de desarrollo aislada para `ADMIN_TEST_DATABASE_URL`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migración única, regla única de cantidades e inventario (FR-017) adoptada por los cuatro escritores, lecturas de stock entero en la tienda, `celular` opcional y reglas puras de saldo.

**⚠️ CRITICAL**: No comenzar las historias de usuario hasta completar esta fase.

### Esquema

- [X] T002 Editar `prisma/schema.prisma` según [data-model.md](./data-model.md):
  - Nuevo `enum TipoPrecio { detal mayor promo }`.
  - Añadir `NoEspecificado` al final de `enum MetodoPago`.
  - `Producto`: `inventario Float @default(0)` y la relación `equivalencias EquivalenciaProducto[]`.
  - `Cliente`: `celular String? @unique` y la relación `equivalencias EquivalenciaCliente[]`.
  - `Transaccion`: `importada Boolean @default(false)`.
  - `DetalleCompra`: `cantidad Float` y `tipoPrecio TipoPrecio?`.
  - `Pago`: `esAbono Boolean @default(false)`, `actorId String?`, `actorEmail String?` y `anuladoEn DateTime?`.
  - Nuevo modelo `EquivalenciaProducto`: `id Int @id @default(autoincrement())`, `clave String @unique`, `productoId Int`, `grupo String?`, `producto String`, `sabor String?`, `gramos Int?`, `actorEmail String?`, `createdAt DateTime @default(now())` y `updatedAt DateTime @updatedAt`. Relación `productoRef Producto @relation(fields: [productoId], references: [id], onDelete: Cascade)` e índice `@@index([productoId])`.
  - Nuevo modelo `EquivalenciaCliente`: `id`, `clave String @unique`, `clienteId Int`, `actorEmail String?`, `createdAt` y `updatedAt`. Relación `cliente Cliente @relation(fields: [clienteId], references: [id], onDelete: Cascade)` e índice `@@index([clienteId])`.

  No tocar `DetalleNotaEntrega.cantidad`, que sigue siendo `Int` (fuera de alcance).
- [X] T003 Crear la migración `prisma/migrations/20261029000000_control_ventas_excel/migration.sql`, contra la base aislada: generarla con `npx prisma migrate dev --create-only --name control_ventas_excel` y renombrar la carpeta al prefijo `20261029000000_`, siguiendo el estilo de `20261028000000_correlativo_ordenes`. Revisar que el SQL contenga:
  - `CREATE TYPE "TipoPrecio"`;
  - `ALTER TYPE "MetodoPago" ADD VALUE 'NoEspecificado'`;
  - `ALTER COLUMN "inventario" SET DATA TYPE DOUBLE PRECISION` y lo mismo para `"cantidad"`;
  - `ALTER COLUMN "celular" DROP NOT NULL`, conservando el índice único;
  - las columnas nuevas de `Pago`, `Transaccion` y `DetalleCompra`;
  - las dos tablas nuevas con sus claves foráneas `ON DELETE CASCADE`.

  Debe ser sin migración de datos. Aplicar con `npx prisma migrate dev` y ejecutar `npx prisma generate`.

### Cantidades e inventario (FR-017)

- [X] T004 [P] Crear `tests/admin/inventory.test.ts`, importando de `../../lib/inventory.js`. Casos que deben fallar hasta T005:
  - `isValidQuantity`: `16.5`, `0.01`, `3` y `0.3` → `true`; `0`, `-1`, `1.005`, `NaN` e `Infinity` → `false`.
  - `roundQuantity(0.1 + 0.2)` → `0.3`; `roundQuantity(3.3 - 3)` → `0.3`.
  - `unidadesDisponibles`: `12.5` → `12`, `0.5` → `0`, `-0.2` → `0` y `7` → `7`.
  - `formatQuantity`: `16.5` → `"16,5"` y `3` → `"3"`.
- [X] T005 Crear `lib/inventory.ts`, sin `@/` ni `server-only` y con solo tipos de `@prisma/client` (precedente: `lib/order-number.ts`), según [contracts/ventas-lineas.md](./contracts/ventas-lineas.md) §1:
  - `isValidQuantity(x)`: `Number.isFinite(x) && x > 0 && Math.abs(Math.round(x * 100) - x * 100) < 1e-6`.
  - `roundQuantity(x)`: `Math.round((x + Number.EPSILON) * 100) / 100`.
  - `unidadesDisponibles(inventario)`: `Math.max(0, Math.floor(roundQuantity(inventario)))`.
  - `formatQuantity(x)`: `roundQuantity(x).toLocaleString("es-VE", { maximumFractionDigits: 2 })`.
  - `class StockInsuficienteError extends Error`, con la propiedad `productoNombre`.
  - `ajustarInventario(tx: Prisma.TransactionClient, productoId: number, delta: number, opciones: { exigirStock: boolean })`:
    1. `const filas = await tx.$queryRaw<Array<{ inventario: number; nombre: string }>>\`SELECT "inventario", "nombre" FROM "Producto" WHERE "id" = ${productoId} FOR UPDATE\``;
    2. si no hay fila, lanzar `Error("Uno de los productos seleccionados no existe.")`;
    3. calcular `siguiente = roundQuantity(actual + delta)`;
    4. si `opciones.exigirStock && siguiente < 0`, lanzar `StockInsuficienteError`;
    5. ejecutar `tx.producto.update({ where: { id: productoId }, data: { inventario: siguiente } })` y devolver `siguiente`.
- [X] T006 [P] Actualizar `tests/admin/sales-calculations.test.ts`:
  - `calculateSubtotal([{ productoId: 1, cantidad: 16.5, precioUnitarioUsd: 8 }])` → `132`;
  - una cantidad `1.005` lanza `La cantidad debe ser mayor que cero y tener como máximo 2 decimales`;
  - sustituir cualquier caso que espere el error de "entero".
- [X] T007 En `lib/admin/sales-calculations.ts`, `calculateSubtotal` valida con `isValidQuantity` (importado de `../inventory.ts`) en lugar de `Number.isInteger`, con el mensaje `La cantidad debe ser mayor que cero y tener como máximo 2 decimales`.
- [X] T008 En `lib/admin/order-state-change.ts`, la devolución al cancelar recorre `getRestockQuantities(transaction.detalles)` ordenado por `productoId` ascendente y llama a `ajustarInventario(tx, productoId, cantidad, { exigirStock: false })` (import `../inventory.ts`) en lugar de `tx.producto.update({ … increment })`.
- [X] T009 En `lib/actions/checkout.ts`, reemplazar el bucle `updateMany({ where: { inventario: { gte } }, data: { decrement } })` por `ajustarInventario(tx, line.productoId, -line.cantidad, { exigirStock: true })`, recorriendo `validatedLines` ordenadas por `productoId`. Importar `../inventory`, como `../order-number`. Capturar `StockInsuficienteError` y relanzar `CheckoutError("STOCK_INSUFFICIENT", "El inventario cambió. Revisa el carrito e inténtalo nuevamente.")`. Conservar `Number.isInteger(line.cantidad)` en el carrito, la comprobación previa `producto.inventario < line.cantidad`, los códigos de error y la idempotencia.
- [X] T010 En `lib/actions/admin-sales.ts`:
  - `lineSchema.cantidad` y `bulkNewRowSchema.cantidad` pasan a `z.coerce.number().refine(isValidQuantity, "La cantidad debe ser mayor que cero y tener como máximo 2 decimales.")`.
  - `registrarVentaManual` agrupa las cantidades en `uniqueQuantities`, las recorre ordenadas por `productoId` y llama a `ajustarInventario(tx, id, -cantidad, { exigirStock: true })`.
  - Las filas nuevas de `guardarEdicionMasivaVentas` también usan `ajustarInventario`.
  - En ambos, `StockInsuficienteError` se traduce a `Stock insuficiente para ${productoNombre}.`, que es el mensaje actual.
  - Importar desde `@/lib/inventory`, como hace el archivo con sus otros imports.
- [X] T011 En `lib/actions/products.ts`:
  - `ProductSchema.inventario`: `z.coerce.number().refine((v) => v > 0 && isValidQuantity(v), "El inventario debe ser mayor a 0 y tener como máximo 2 decimales")`.
  - `InventoryUpdateSchema.inventario` y el esquema del editor masivo: `z.number().refine((v) => v === 0 || isValidQuantity(v), "El inventario no puede ser negativo y admite como máximo 2 decimales")`.
  - Guardar siempre `roundQuantity(inventario)`.
- [X] T012 [P] Inventario con decimales en la interfaz del panel:
  - `step="0.01"` en los campos de inventario de `components/admin/inventario/bulkInventoryEditor.tsx`, `components/admin/inventario/inventoryTable.tsx` (edición en línea), `app/admin/add-product/page.tsx` y `components/admin/edit-product/editProductForm.tsx`;
  - mostrar el valor con `formatQuantity` en `inventoryTable.tsx`.

  Las alertas `<= 5` no cambian.
- [X] T013 [P] Stock entero en la tienda (research, Decisión 9): exponer `inventario: unidadesDisponibles(p.inventario)` donde se mapean los productos en:
  - `app/productos/consumidores/page.tsx`;
  - `app/productos/consumidores/[id]/page.tsx`;
  - `app/venta-rapida/page.tsx`;
  - `app/cotizacion-rapida/page.tsx`;
  - `lib/actions/cotizacion-rapida.ts`, tanto en el snapshot como en la comparación `current.inventario !== snapshot.inventario`.

  No modificar los componentes cliente.
- [X] T014 [P] Etiqueta del método de pago y cantidades con decimales en lecturas:
  - en `lib/admin/status.ts` crear `getPaymentMethodLabel(metodo: MetodoPago)` con `TransferenciaBs` → "Transferencia Bs", `EfectivoUsd` → "Efectivo USD", `Zelle` → "Zelle", `PagoMovil` → "Pago móvil", `TransferenciaUsd` → "Transferencia USD" y `NoEspecificado` → "No especificado"; sustituir `paymentLabel` de `lib/admin/sales-export.ts` por esta función y usarla también en `components/admin/ventas/salesTable.tsx`, `app/admin/transactions/[id]/page.tsx`, `components/admin/ventas/abonosPanel.tsx` y `lib/admin/abonos.ts` (T046);
  - usar `formatQuantity` en `components/admin/ventas/salesTable.tsx` (lista de productos) y en `lib/admin/sales-export.ts` (`formatProducts`: `` `${nombre} × ${formatQuantity(cantidad)}` ``);
  - en `lib/admin/analytics.ts`, redondear `cantidadVendida` con `roundQuantity` en `porProducto`.

### `celular` opcional (FR-012)

- [X] T015 [P] Adaptar los tipos y las lecturas a `Cliente.celular: string | null`:
  - `lib/admin/types.ts`: `ClientRow.celular: string | null`;
  - `lib/admin/client-query.ts`;
  - `lib/admin/delivery-note-pdf.ts`: el tipo `celular: string | null`; si falta, mostrar solo el correo u omitir la línea;
  - `components/admin/clientes/clientsTable.tsx`: "Sin teléfono" en gris;
  - `components/admin/clientes/bulkClientsEditor.tsx`: `value={row.celular ?? ""}`, sin permitir vaciar el teléfono de un cliente que ya lo tenía.

  No cambiar los Zod de alta de `lib/actions/admin-clients.ts` ni `lib/actions/clients.ts`, que siguen exigiendo teléfono.

### Reglas puras de saldo (usadas por US3 y US4)

- [X] T016 [P] Crear `tests/admin/abonos.test.ts`, importando de `../../lib/admin/abonos.js`. Casos:
  - `calcularAbonado` ignora los pagos con `esAbono: false` y los que tienen `anuladoEn`: `[{ esAbono: true, montoUsd: 20, anuladoEn: null }, { esAbono: true, montoUsd: 5, anuladoEn: new Date() }, { esAbono: false, montoUsd: 33, anuladoEn: null }]` → `20`.
  - `calcularSaldo`:
    - `{ estado: "pagado", montoTotal: 33, pagos: [] }` → `0`;
    - `{ estado: "por_cobrar", montoTotal: 33, pagos: [abono de 20] }` → `13`;
    - un pedido "Por cobrar" de la tienda con un pago declarado de 33 (`esAbono: false`) → `33`.
  - `puedeRecibirAbono`: `true` para `por_cobrar`, `pendiente` y `en_pedido`; `false` para `pagado` y `cancelado`.
  - `puedeAnularAbono`: `false` para `pagado` y `cancelado`.
  - `convertirAbonoAUsd({ moneda: "bs", monto: 3650, tasaCambio: 182.5 })` → `20`; `moneda: "bs"` sin tasa lanza error.
  - `validarMontoAbono`: `(0, 13)` y `(13.01, 13)` fallan; `(13, 13)` es válido.
  - `validarTotalContraAbonado(totalUsd, abonadoUsd)`: falla si el total es menor que lo abonado.
  - `agruparCuentasPorCobrar(pedidos)`: excluye los de saldo 0 y agrupa por cliente con `deudaUsd`, `pedidos` y `desde` (la fecha más antigua), ordenados por `deudaUsd` descendente.
- [X] T017 Crear `lib/admin/abonos.ts`, sin `@/` y con `roundMoney` importado de `./sales-calculations.ts`, con las funciones puras de [contracts/abonos.md](./contracts/abonos.md) §1:
  - `calcularAbonado`, `calcularSaldo`, `puedeRecibirAbono`, `puedeAnularAbono`, `convertirAbonoAUsd` y `validarMontoAbono` (compara en centavos con `Math.round(x * 100)`);
  - `validarTotalContraAbonado`, que lanza `El descuento dejaría el total por debajo de lo ya abonado (USD {abonado}).`;
  - `agruparCuentasPorCobrar(pedidos: Array<{ clienteId; cliente; fechaCompra; estado; montoTotal; pagos }>)`, que devuelve el tipo `CuentasPorCobrar` del contrato.

  Los núcleos transaccionales se añaden en US3.
- [X] T018 (ejecutada en base local aislada, ok) Crear `tests/admin/inventory.integration.test.ts` con `{ skip: !integrationEnabled }` y `createIntegrationClient()`. Cada caso crea su producto y lo limpia en `finally`:
  - `ajustarInventario` sobre 3.3 con `-3` deja `0.3` exacto;
  - con `exigirStock: true` y un resultado negativo lanza `StockInsuficienteError` sin cambiar el valor.

  Ampliar `tests/admin/order-status.integration.test.ts`: cancelar con `aplicarCambioEstadoPedido` un pedido creado en la prueba con una línea de `cantidad: 16.5` devuelve exactamente `16.5` al inventario.

**Checkpoint**: La migración está aplicada y `npm.cmd run test:admin` y `npm.cmd run test:checkout` pasan (con integración en la base aislada). Las ventas manuales del servidor aceptan 16,5 y descuentan inventario exacto. La tienda muestra unidades enteras y los clientes pueden no tener teléfono. Ninguna historia de usuario está visible todavía.

---

## Phase 3: User Story 1 - Cargar un archivo de ventas de Excel (Priority: P1) 🎯 MVP

**Goal**: Subir el `.xlsx` de "Control de ventas", revisar una vista previa con errores y conciliación de productos y clientes, y crear los pedidos de forma atómica e idempotente, sin tocar inventario (FR-001 a FR-023).

**Independent Test**: [quickstart.md](./quickstart.md), escenarios 1 a 3. Con el archivo de agosto quedan 27 pedidos (1200–1227, sin 1219) por USD 2.901,05: 26 "Pagado" y el 1225 "Por cobrar" con USD 33,00 pendientes. El inventario no cambia y recargar el archivo crea 0 pedidos.

### Tests for User Story 1 ⚠️

> Escribirlos primero y comprobar que fallan antes de implementar.

- [X] T019 [P] [US1] Crear el helper `tests/admin/xlsx-fixture.ts`, que exporta `crearLibroControlVentas(opciones?)` y devuelve un `Uint8Array` con un `.xlsx` válido armado en memoria:
  - **ZIP**: entradas comprimidas con `zlib.deflateRawSync` (método 8), salvo `[Content_Types].xml`, que va sin comprimir (método 0), para cubrir ambos métodos; directorio central correcto.
  - **`xl/workbook.xml`**: hojas "VENTAS" y "Hoja1" (vacía), con `.rels`.
  - **`xl/sharedStrings.xml`**: un encabezado con salto de línea codificado como `CANT&#10;X PAQ.`, un texto enriquecido (`<si><r><t>CLÍNICA </t></r><r><t>DEMO</t></r></si>`) y textos con espacios sobrantes y acentos (`"RAVIOLI "`, `"CHAMPIÑON"`).
  - **Hoja "VENTAS"**: `B1 = "CONTROL DE VENTAS"`, encabezados en B2:Q2 y la columna A vacía. Filas de datos ficticias:
    - una nota de 4 líneas mayoristas;
    - una nota con el mismo producto repetido a dos precios;
    - una línea PROMO y una cantidad `16.5`;
    - una nota con PAGADO "NO";
    - FECHA como serial (por ejemplo, `46263` = 29/08/2026);
    - VENTA, ABONO, DEUDA y X COBRAR como celdas con `<f>` y valor guardado en `<v>`;
    - una celda booleana y una `inlineStr`.
  - **Última fila**: solo fórmulas.
  - **`opciones`**: permiten sobrescribir celdas para los casos de error.

  Documentar en un comentario los totales esperados. Usar solo nombres de cliente ficticios.
- [X] T020 [P] [US1] Crear `tests/admin/xlsx-reader.test.ts`, que importa `leerLibroXlsx` de `../../lib/admin/xlsx-reader.js` y el helper de T019. Casos:
  - devuelve las hojas `["VENTAS", "Hoja1"]` en orden y `date1904: false`;
  - B1 vale `"CONTROL DE VENTAS"`;
  - el encabezado vale `"CANT\nX PAQ."`;
  - el texto enriquecido se concatena;
  - las fórmulas devuelven su valor guardado (número o texto);
  - la celda booleana devuelve `true`/`false`;
  - las celdas vacías son `null`;
  - lee entradas con método 0 y con método 8;
  - bytes que empiezan con la firma `D0 CF 11 E0` (mensaje de contraseña / `.xls`), un ZIP con el bit de cifrado, un método distinto de 0/8 o bytes que no son ZIP lanzan los mensajes de [contracts/sales-import.md](./contracts/sales-import.md) §1;
  - se rechaza un contenido descomprimido que supera el límite (probar con un límite inyectable pequeño).
- [X] T021 [P] [US1] Crear `tests/admin/sales-import-core.test.ts`, que importa de `../../lib/admin/sales-import-core.js` y usa el helper de T019 y `leerLibroXlsx`. Casos de [contracts/sales-import.md](./contracts/sales-import.md) §1 y [data-model.md](./data-model.md):
  - **Tabla**: localiza la fila 2 de "VENTAS" e ignora "Hoja1"; si falta `PVP UND`, devuelve `No se encontraron las columnas obligatorias: PVP UND.`
  - **Filas ignoradas**: la fila final solo con fórmulas no es una línea ni un problema.
  - **Normalización**: `normalizarTexto("  Champiñon ")` → `"CHAMPINON"`.
  - **Fechas**: un serial y `"29/8/2026"` dan el mismo día; una fecha posterior a `hoy` es un error bloqueante.
  - **GR**: `500` y `"500 g"` → 500; `""` o `"n/a"` → vacío con advertencia.
  - **Cantidad**: `16.5` es válida; `1.005` y `"abc"` dan el error de cantidad.
  - **Tipo**: `"oferta"` → `El tipo debe ser DETAL, MAYOR o PROMO.`
  - **Pagado**: `"Sí "` → SI; vacío → NO con advertencia.
  - **Cobro**: ABONO numérico tiene prioridad sobre PAGADO; ABONO mayor que el importe es un error; PAGADO SI con ABONO 0 da advertencia.
  - **Venta**: una VENTA distinta de CANT × PVP da advertencia.
  - **Agrupación**: agrupa por nota y suma totales; una nota con dos clientes da el error de nota.
  - **Estado**: abonado ≥ total → `pagado`; en otro caso → `por_cobrar`.
  - **Clave de producto**: `claveProducto({ grupo: "PASTA", producto: "RAVIOLI ", sabor: "ESPINACA", gramos: 500 })` → `"PASTA|RAVIOLI|ESPINACA|500"`.
  - **Coincidencia exacta**: `GNOCCHI` + `PAPAS` frente a `"GNOCCHI DE PAPAS"`.
  - **Sugerencia**: única para `RAVIOLI` + `ESPINACA` entre `"RAVIOLI DE RICOTTA Y ESPINACA"` y `"RAVIOLI DE CARNE"`. Para `RAVIOLI` + `CHAMPINON` sugiere `"RAVIOLI DE RICOTTA Y CHAMPIÑONES"` (prefijo de 5 letras). Sin sugerencia ante un empate o puntaje 0.
  - **Clientes**: clave con `normalizeSearchName`; dos clientes con el mismo `nombreBusqueda` → pendiente con ambas coincidencias.
  - **Situación de la nota**:
    - mismo cliente, día e importe de productos (±0,01) → `ya_registrada`;
    - otro cliente o importe → `conflicto`;
    - las líneas de una nota `ya_registrada` con TIPO vacío no bloquean;
    - `puedeConfirmar` es falso si hay `con_error` o `conflicto`.
- [X] T022 (ejecutada en base local aislada, ok) [P] [US1] Crear `tests/admin/sales-import.integration.test.ts` con `{ skip: !integrationEnabled }`. Crear los productos y clientes de la prueba con `uniqueValue` y limpiar en `finally` pedidos, pagos, historial, equivalencias y clientes creados. Llamar a `prepararVistaPrevia(prisma, carga)` y a `prisma.$transaction(tx => aplicarCargaVentas(tx, carga, resoluciones, actor, "prueba.xlsx"))` con el libro de T019, usando números de nota únicos por ejecución. Casos:
  - **Carga correcta**:
    - crea los pedidos con `importada: true`, el `numeroOrden` de la nota y `fechaCompra` a las 16:00 UTC del día;
    - las líneas tienen `tipoPrecio` y `cantidad` 16.5;
    - el pedido pagado tiene un `Pago` con `esAbono: true`, `metodoPago: "NoEspecificado"` y monto igual al total;
    - la nota NO queda `por_cobrar` y sin pago;
    - el historial dice `Importado desde Excel: prueba.xlsx`;
    - **el inventario de los productos no cambia** y no se crea `Fidelidad`.
  - **Recarga**: una segunda vista previa marca todas las notas `ya_registrada` y aplicar crea 0.
  - **Conflicto**: con un número existente de otro cliente, `aplicarCargaVentas` lanza, no queda ningún pedido nuevo y la equivalencia no se guarda.
  - **Cliente nuevo**: la resolución `crear` deja un cliente con `celular: null`, `apellido: ""`, el `nombreBusqueda` normalizado y `HistorialCliente` con `accion: "creado"`.
  - **Equivalencias**: una resolución manual de producto crea `EquivalenciaProducto` con `grupo`/`producto`/`sabor`/`gramos` originales, y una segunda carga la aplica sola.
  - **Correlativo**: una nota ≥ 1300 (único, por ejemplo `9000000 + aleatorio`) deja `orden_correlativo_seq` con un siguiente valor mayor que el número importado.

### Implementation for User Story 1

- [X] T023 [US1] Crear `lib/admin/xlsx-reader.ts`, puro y solo con `node:zlib`, según research, Decisión 1. Exporta `leerLibroXlsx(bytes: Uint8Array, limites = { maxEntradas: 2000, maxDescomprimido: 50 * 1024 * 1024 })`, que devuelve `{ date1904: boolean; hojas: Array<{ nombre: string; filas: Array<Array<string | number | boolean | null>> }> }`. Implementación:
  - **ZIP**: leer el registro de fin de directorio central (buscando la firma desde el final) y luego el directorio central. Para cada entrada, saltar la cabecera local usando sus longitudes de nombre y extra. Antes de leer el ZIP, rechazar la firma `D0 CF 11 E0` con el mensaje del contrato §1. Rechazar el bit 0 del indicador (cifrado) y los métodos distintos de 0 y 8. Inflar con `inflateRawSync(datos, { maxOutputLength })` y acumular el total.
  - **Libro**: leer `xl/workbook.xml` (`<sheet name r:id>`, `date1904`) y resolver las rutas con `xl/_rels/workbook.xml.rels`.
  - **Textos**: leer `xl/sharedStrings.xml`, concatenando todos los `<t>` de cada `<si>`.
  - **Celdas**: de cada hoja, leer `<c r="B3" t=…>` y convertir la referencia de columna a índice. Tipos: `s`, `str`, `inlineStr` (`<is><t>`), `b`, `e` → `null`, y numérico por defecto. De las fórmulas se usa `<v>`.
  - **XML**: decodificar `&amp; &lt; &gt; &quot; &apos; &#N; &#xH;` con expresiones regulares, sin DTD.

  Errores con los mensajes exactos de [contracts/sales-import.md](./contracts/sales-import.md) §1.
- [X] T024 [US1] Crear `lib/admin/sales-import-core.ts`, puro (importa `../client-rules.ts`, `./sales-calculations.ts` y `../inventory.ts`), con la lectura y las validaciones:
  - `normalizarTexto` y `normalizarEncabezado`;
  - la tabla de encabezados del contrato §1;
  - `localizarTabla(hojas)`: primeras 10 filas de cada hoja;
  - `leerFilas`, que ignora las filas sin fecha, nota, cliente ni producto;
  - `interpretarFecha(valor, date1904)`: serial o `d/m/aaaa`, devuelve `AAAA-MM-DD`;
  - `fechaAlMediodiaCaracas(AAAA-MM-DD)` → `new Date("AAAA-MM-DDT16:00:00.000Z")`;
  - validaciones por línea con los mensajes exactos del contrato §1, incluidas las advertencias;
  - `claveProducto` y `claveCliente`, que es `normalizeSearchName(texto)`;
  - cálculo de `importeUsd = roundMoney(cantidad × precio)` y de `abonadoUsd` según data-model ("Cálculo de lo cobrado");
  - agrupación por nota, con `totalUsd`, `abonadoUsd`, `saldoUsd`, `estadoResultante` y el error de nota inconsistente;
  - `construirCarga(libro, hoy: string)`: devuelve las notas, los problemas, la hoja y la fila de encabezados, y lanza el error de más de 2.000 líneas.
- [X] T025 [US1] Completar `lib/admin/sales-import-core.ts` con la conciliación (research, Decisión 3):
  - `PALABRAS_VACIAS = ["DE", "DEL", "Y", "A", "AL", "LA", "LAS", "LOS", "CON", "EN"]`;
  - `coincidenciaExactaProducto(linea, catalogo)`: conjunto de palabras igual al de un único producto;
  - `sugerirProducto(linea, catalogo)`: puntaje por palabras iguales o que comparten un prefijo de 5 letras; único y mayor que 0;
  - `resolverProductos(claves, catalogo, equivalencias)` y `resolverClientes(claves, clientes, equivalencias)`, con las variantes de `resolucion` del contrato §2;
  - `tipoClientePropuesto`: `mayorista` si alguna línea es MAYOR;
  - `situacionNota(nota, pedidoExistente, clienteIdResuelto)`: compara contra `montoSubtotal || montoTotal` y el día en Caracas;
  - `puedeConfirmar`.
- [X] T026 [US1] Añadir a `lib/admin/types.ts` los tipos `VistaPreviaCarga`, `ResolucionesCarga`, `PrevisualizacionState` y `ConfirmacionState`, exactamente como en [contracts/sales-import.md](./contracts/sales-import.md) §2 y §3.
- [X] T027 [US1] Crear `lib/admin/sales-import.ts`, sin `@/` (importa `./sales-import-core.ts` y `../order-number.ts` si hace falta), con `prepararVistaPrevia(db, carga, nombreArchivo)`:
  - lee el catálogo (`id`, `nombre`, `categoria`, `precioDetal`, `precioMayorista`), los clientes (`id`, `nombre`, `apellido`, `nombreBusqueda`, `tipoCliente`; **nunca** `celular`, `rif` ni `email`), las dos tablas de equivalencias y los pedidos con `numeroOrden in` las notas (con el cliente);
  - arma `VistaPreviaCarga` con `resumen` (solo notas nuevas en `totalUsd`/`porCobrarUsd`), `productos` y `clientes` (solo claves de notas nuevas), `catalogo`, `problemas` y `puedeConfirmar`.
- [X] T028 [US1] Completar `lib/admin/sales-import.ts` con `class CargaError extends Error` (con `problemas`) y `aplicarCargaVentas(tx, carga, resoluciones, actor: { id: string; email: string | null }, nombreArchivo)`, según [contracts/sales-import.md](./contracts/sales-import.md) §3, paso 3:
  1. Recalcula la situación contra los pedidos vigentes; si hay `con_error`, `conflicto` o claves sin resolver, lanza `CargaError("La carga tiene problemas sin resolver. Revisa la vista previa.")`.
  2. Verifica que existen los `productoId`/`clienteId` resueltos; si no, lanza `Un producto o cliente elegido ya no existe. Vuelve a previsualizar el archivo.`
  3. Crea los clientes `crear` con `celular: null`, `apellido: ""`, `nombre` = texto recortado, `nombreBusqueda` y `tipoCliente`, más `HistorialCliente { accion: "creado", actorId, actorEmail, camposModificados: [] }`.
  4. Por cada nota nueva, en orden de número:
     - `transaccion.create` con `numeroOrden`, `clienteId`, `fechaCompra` (mediodía de Caracas), `montoSubtotal = montoTotal = totalUsd`, `montoDescuento: 0`, `montoDelivery: 0`, `tasaCambio: null`, `estado` e `importada: true`;
     - `detalleCompra.createMany` con `cantidad`, `precioUnitario` y `tipoPrecio`;
     - si `abonadoUsd > 0`, `pago.create` con `esAbono: true`, `metodoPago: "NoEspecificado"`, `montoUsd: abonadoUsd`, `fechaPago` = fecha de la venta, `actorId` y `actorEmail`;
     - `estadoTransaccionHistorial.create` con `estadoAnterior: null`, el estado, el actor y el motivo `` `Importado desde Excel: ${nombreArchivo.slice(0, 120)}` ``.
  5. Upsert de `EquivalenciaProducto` (solo las claves cuya resolución vino de `resoluciones`, con grupo, producto, sabor y gramos originales recortados y `actorEmail`) y de `EquivalenciaCliente` (solo los `vincular` cuyo `nombreBusqueda` difiere de la clave).
  6. Si el máximo número importado es ≥ 1300: `SELECT setval('orden_correlativo_seq', GREATEST(${max}, (SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END FROM orden_correlativo_seq)))`.
  7. **No** tocar `Producto.inventario` ni crear `Fidelidad`.

  Devuelve `{ creados, omitidos, totalUsd }`.
- [X] T029 [US1] En `lib/admin/order-state-change.ts`, incluir `importada` en la lectura del pedido y omitir la devolución de inventario de la rama de cancelación cuando `transaction.importada` (FR-016). Añadir a `tests/admin/order-status.integration.test.ts` el caso: cancelar un pedido con `importada: true` deja el inventario igual y registra el historial.
- [X] T030 [US1] En `next.config.ts`, añadir `experimental: { serverActions: { bodySizeLimit: "6mb" } }` sin tocar `images` (Complexity Tracking).
- [X] T031 [US1] Crear `lib/actions/sales-import.ts` (`"use server"`):
  - **`previsualizarCargaVentas(_prev, formData)`**:
    1. `requireAdmin()`;
    2. valida que `archivo` es un `File` de hasta 5 MB (`El archivo supera el límite de 5 MB.`) con extensión `.xlsx`;
    3. ejecuta `leerLibroXlsx(new Uint8Array(await archivo.arrayBuffer()))`, `construirCarga(libro, hoyCaracas)` y `prepararVistaPrevia(prisma, carga, archivo.name)`;
    4. responde `{ success: true, message: "Revisa la vista previa antes de confirmar.", vista }`, o `{ success: false, message }` con los mensajes del contrato (`No se pudo leer el archivo.` ante un error inesperado).
  - **`confirmarCargaVentas(_prev, formData)`**:
    1. `requireAdmin()`;
    2. valida el archivo igual y aplica Zod a `resoluciones` (`productos: z.record(z.string(), z.number().int().positive())`; `clientes: z.record(z.string(), z.discriminatedUnion("accion", [...]))`);
    3. vuelve a leer y construir la carga;
    4. ejecuta `prisma.$transaction(tx => aplicarCargaVentas(...), { maxWait: 10000, timeout: 60000 })`;
    5. traduce `CargaError` (con `problemas`) y P2002 (`Algunas notas ya fueron registradas. Vuelve a previsualizar el archivo.`) y responde con los mensajes de éxito del contrato §3;
    6. ejecuta `revalidatePath` de `/admin`, `/admin/transactions`, `/admin/clients` y `/admin/analytics/sales`.

  `hoyCaracas` sale de `Intl.DateTimeFormat` con `America/Caracas`, como `currentCaracasDate` en `app/admin/transactions/export/route.ts`.
- [X] T032 [US1] Crear `components/admin/ventas/salesImport.tsx` (`"use client"`) según [contracts/sales-import.md](./contracts/sales-import.md) §4:
  - **Estado**: guarda el `File` elegido. Usa `useActionState` para la vista previa y la confirmación.
  - **Encabezado de la vista previa**: resumen con tarjetas y lista de problemas (errores en el color de error y advertencias en ámbar), con fila, columna y nota.
  - **Conciliación de productos** (FR-011): todas las claves, incluidas las ya reconocidas por equivalencia o coincidencia exacta, tienen su `<select>` editable y preseleccionado; cambiar una reconocida la guarda como nueva equivalencia. Un `<select>` del `catalogo` por clave, con la sugerencia preseleccionada y la marca "Sugerido", el precio del archivo junto al de catálogo y la cantidad de líneas afectadas.
  - **Conciliación de clientes** (FR-011): igual, los reconocidos aparecen preseleccionados y se pueden cambiar. "Vincular" (un `<select>` de clientes recibido por prop, con las coincidencias primero) o "Crear" con un `<select>` de tipo (valor inicial `tipoPropuesto`).
  - **Notas**: tabla en escritorio y tarjetas en móvil, con su situación y el pedido existente en los conflictos.
  - **Confirmar**: "Confirmar carga" se deshabilita si `!vista.puedeConfirmar`, si queda alguna clave sin resolver o mientras se procesa. Envía el mismo `File` y `resoluciones` en JSON, incluidas las sugerencias que la persona dejó.
  - **Resultado**: `toast.success`/`toast.error` (sonner) y un enlace a `/admin/transactions?desde=…&hasta=…` con el rango de fechas de las notas creadas.

  Usar las clases `admin-*` y los tokens existentes.
- [X] T033 [US1] Crear `app/admin/transactions/import/page.tsx`, un Server Component:
  - cabecera con `admin-eyebrow` "Registro operativo", título "Cargar ventas desde Excel" y un subtítulo que explique que la carga no descuenta inventario;
  - consulta `prisma.cliente.findMany` (`id`, `nombre`, `apellido` y `tipoCliente`, ordenados por apellido y nombre) y la pasa a `SalesImport`.

  La protección la da `app/admin/layout.tsx`; las acciones revalidan con `requireAdmin`.
- [X] T034 [US1] En `app/admin/transactions/page.tsx`, añadir en la cabecera un enlace-botón "Cargar Excel" (`admin-button-secondary`, ícono `FileSpreadsheet` de lucide-react) hacia `/admin/transactions/import`.

**Checkpoint**: Los escenarios 1, 2 y 3 del quickstart funcionan con el archivo real en la base aislada: totales correctos, inventario sin cambios, recarga idempotente y errores y conflictos bloqueantes.

---

## Phase 4: User Story 2 - Registrar el tipo de precio y el precio pactado de cada línea (Priority: P1)

**Goal**: Cada línea nueva (venta manual, editor masivo y tienda) guarda Detal, Mayor o Promo; el detalle muestra tipo, precio e importe; las analíticas desglosan por tipo (FR-024 a FR-029). La interfaz del panel acepta cantidades con decimales (FR-017).

**Independent Test**: [quickstart.md](./quickstart.md), escenarios 4 y 5. Una venta manual a un mayorista con líneas Mayor, Detal y Promo (precio escrito a mano) y cantidad 16,5 se guarda con el tipo y el precio de cada línea. Un pedido web guarda `detal` o `mayor` según el contexto. Las analíticas del periodo muestran el desglose.

### Tests for User Story 2 ⚠️

- [X] T035 [P] [US2] En `tests/checkout/checkout-rules.test.ts`, añadir pruebas de `getPriceTypeForContext` (importado de `../../lib/catalog-context.js`): `"consumidor"` → `"detal"` y `"mayorista"` → `"mayor"`. En `tests/checkout/checkout.integration.test.ts`, comprobar que el pedido directo guarda `tipoPrecio: "detal"` en sus líneas con `contexto: "consumidor"`.
- [X] T036 [P] [US2] (convertida en prueba unitaria de `resumirPorTipoPrecio` en `tests/admin/sales-calculations.test.ts`, porque `consultarAnaliticas` no se puede cargar en node:test) Originalmente: caso con líneas `detal`, `mayor`, `promo` y `null` en el periodo, más una línea de un pedido cancelado. `consultarAnaliticas` devuelve `porTipoPrecio` con las cuatro entradas (`null` con la etiqueta `"Sin especificar"`), sin la cancelada, con `cantidadVendida` redondeada y `porcentajeDelTotal` que suma 100 (±0,05).

### Implementation for User Story 2

- [X] T037 [US2] En `lib/catalog-context.ts`, añadir `getPriceTypeForContext(context: PurchaseContext): "detal" | "mayor"`. En `lib/actions/checkout.ts`, añadir `tipoPrecio: getPriceTypeForContext(normalizedContext)` a cada línea de `validatedLines` que se guarda con `detalleCompra.createMany`. No cambiar la entrada `CheckoutData`.
- [X] T038 [US2] En `lib/admin/status.ts`, añadir `getPriceTypeLabel(tipo: TipoPrecio | null)`: `detal` → "Detal", `mayor` → "Mayor", `promo` → "Promo" y `null` → "Sin especificar".
- [X] T039 [US2] En `lib/actions/admin-sales.ts`, añadir `tipoPrecio: z.enum(["detal", "mayor", "promo"])` (obligatorio) a `lineSchema` y `bulkNewRowSchema`, y guardarlo en `detalleCompra.createMany`/`create` de `registrarVentaManual` y de las filas nuevas de `guardarEdicionMasivaVentas`. Las filas `existentes` no cambian.
- [X] T040 [US2] En `components/admin/ventas/manualSaleForm.tsx` (contrato `ventas-lineas.md` §2):
  - `SaleLine` añade `tipoPrecio` y permite `precioUnitarioUsd: number | null`;
  - mantener el cliente elegido en el estado: al elegir el cliente o agregar una línea, proponer `mayor` si `tipoCliente === "mayorista"` y `detal` si no, con el precio de catálogo correspondiente;
  - nuevo `<select>` "Tipo" por línea. Detal o Mayor reescriben el precio con el de catálogo; Promo lo deja vacío (`null`) con el placeholder "Precio de promoción";
  - deshabilitar "Guardar" y no calcular totales mientras haya un precio vacío;
  - cantidad con `step="0.01" min="0.01"`;
  - enviar `tipoPrecio` en `lineas`.
- [X] T041 [P] [US2] En `components/admin/ventas/bulkSalesEditor.tsx`, las filas nuevas añaden el `<select>` "Tipo" (propuesto por el tipo del cliente de la fila; precio de catálogo para Detal/Mayor y vacío para Promo, bloqueando el guardado mientras falte) y la cantidad con `step="0.01"`. Enviar `tipoPrecio` en `nuevas`.
- [X] T042 [US2] En `app/admin/transactions/[id]/page.tsx`, cada línea del pedido muestra el tipo (`getPriceTypeLabel(detalle.tipoPrecio)`), la cantidad (`formatQuantity`), el precio unitario y el importe (`roundMoney(cantidad × precio)`), en la tabla de escritorio y en la vista móvil.
- [X] T043 [US2] En `lib/admin/analytics.ts` y `lib/admin/types.ts`: `AnalyticsResult` añade `porTipoPrecio: Array<{ tipoPrecio: "detal" | "mayor" | "promo" | null; etiqueta: string; cantidadVendida: number; totalUsd: number; porcentajeDelTotal: number }>`, calculado sobre las mismas `lines` (sin canceladas y respetando `productoId`), con `getPriceTypeLabel`, `roundQuantity` y redondeo de dinero como en `porProducto`, ordenado por `totalUsd` descendente.
- [X] T044 [P] [US2] En `components/admin/analiticas/analyticsDashboard.tsx`, añadir una tabla corta "Ventas por tipo de precio" (tipo, unidades, USD y %) con las clases y tokens existentes. Sin gráfico nuevo y sin dependencias.

**Checkpoint**: Los escenarios 4 y 5 del quickstart funcionan. Las líneas antiguas se ven como "Sin especificar".

---

## Phase 5: User Story 3 - Registrar abonos y conocer lo que se debe (Priority: P2)

**Goal**: Registrar y anular abonos con saldo por pedido, paso automático a "Pagado" al saldar, abonado y saldo en la tabla, filtro "Con saldo pendiente" y resumen de cuentas por cobrar por cliente (FR-030 a FR-038).

**Independent Test**: [quickstart.md](./quickstart.md), escenario 6:

- con USD 33 pendientes, un abono de 20 deja USD 13;
- uno de 20 se rechaza;
- uno de 13 pasa el pedido a "Pagado" con "Saldado con abonos";
- el resumen muestra y luego quita al cliente;
- la anulación recalcula el saldo.

### Tests for User Story 3 ⚠️

- [X] T045 (ejecutada en base local aislada, ok) [P] [US3] Crear `tests/admin/abonos.integration.test.ts` con `{ skip: !integrationEnabled }`, usando `registrarAbonoEnPedido` y `anularAbonoEnPedido` (de `../../lib/admin/abonos.js`) dentro de `prisma.$transaction`, sobre un pedido `por_cobrar` de USD 33 creado en la prueba. Casos:
  - un abono de 20 USD crea un `Pago` con `esAbono: true`, `actorEmail` y el estado sigue `por_cobrar`;
  - un abono de 20 lanza el mensaje de saldo (`USD 13.00`);
  - un abono de 13 deja el estado `pagado` y un historial con `estadoAnterior: "por_cobrar"` y `motivo: "Saldado con abonos"`;
  - un abono en Bs (`monto: 3650`, `tasaCambio: 182.5`) guarda `montoUsd: 20`, `montoBs: 3650` y `tasaCambio: 182.5`;
  - anular un abono de un pedido `por_cobrar` fija `anuladoEn`, recalcula el saldo e inserta un historial con `estadoAnterior = estadoNuevo` y el motivo `Abono anulado: USD 20.00 (Zelle)`;
  - anular en un pedido `pagado` lanza el mensaje del contrato;
  - registrar en un pedido `cancelado` lanza `Solo se registran abonos en pedidos por cobrar o en pedido.`

  Limpiar en `finally`.

### Implementation for User Story 3

- [X] T046 [US3] Añadir a `lib/admin/abonos.ts` los núcleos transaccionales de [contracts/abonos.md](./contracts/abonos.md) §2 y §3:
  - **`registrarAbonoEnPedido(tx, input: { transaccionId; moneda: "usd" | "bs"; monto; tasaCambio?: number | null; metodoPago; referencia?: string | null; fechaPago: Date }, actor)`**:
    1. `tx.$queryRaw\`SELECT "id" FROM "Transaccion" WHERE "id" = ${id} FOR UPDATE\``;
    2. leer el pedido con sus `pagos`;
    3. validar con `puedeRecibirAbono` y `validarMontoAbono`;
    4. `pago.create` con `esAbono: true`, `montoUsd`, `montoBs` y `tasaCambio` solo si es en Bs, `metodoPago`, `referencia`, `fechaPago`, `actorId` y `actorEmail`;
    5. si el nuevo saldo es 0: `updateMany({ where: { id, estado: leído }, data: { estado: "pagado" } })`, exigiendo `count === 1` (si no, `El pedido cambió mientras lo editabas. Revisa su estado actual.`), y un historial con el motivo `Saldado con abonos`.

    Devuelve `{ abonadoUsd, saldoUsd, estado, numeroOrden }`.
  - **`anularAbonoEnPedido(tx, pagoId, actor)`**: según §3. Usa `updateMany({ where: { id: pagoId, anuladoEn: null } })`, exige `count === 1` y crea el historial sin cambio de estado con el monto formateado con `toFixed(2)` y la etiqueta del método.

  `MetodoPago` se importa solo como tipo.
- [X] T047 [US3] En `lib/actions/admin-orders.ts`, añadir:
  - **`registrarAbono(formData)`**: `requireAdmin()` y Zod:
    - `transaccionId` entero positivo;
    - `moneda` `usd|bs`;
    - `monto` > 0 con 2 decimales como máximo;
    - `tasaCambio` > 0, obligatoria si `moneda = "bs"` (con `superRefine`);
    - `metodoPago`: `z.nativeEnum(MetodoPago).refine(m => m !== "NoEspecificado")`;
    - `referencia` hasta 120 caracteres, opcional;
    - `fechaPago` no posterior a hoy.

    Si Zod falla: `Revisa los datos del abono.` Luego ejecuta `prisma.$transaction(tx => registrarAbonoEnPedido(...))`, responde con los mensajes de §2 y revalida `/admin`, `/admin/transactions` y `/admin/transactions/{id}`.
  - **`anularAbono(formData)`**: `pagoId` entero positivo; mensajes de §3 y las mismas revalidaciones.
- [X] T048 [US3] En `lib/actions/admin-sales.ts`, `actualizarDescuentoVenta` incluye `pagos` en la lectura y, antes de actualizar, llama a `validarTotalContraAbonado(totals.totalUsd, calcularAbonado(transaction.pagos))`. Si falla, responde `{ success: false, message }` con el mensaje de [contracts/abonos.md](./contracts/abonos.md) §5.
- [X] T049 [US3] Crear `components/admin/ventas/abonosPanel.tsx` (`"use client"`), con props: `transaccionId`, `numeroOrden`, `estado`, `totalUsd` y `abonos` (id, fechaPago, montoUsd, montoBs, tasaCambio, metodoPago, referencia, actorEmail, anuladoEn). Contenido según [contracts/abonos.md](./contracts/abonos.md) §4:
  - total, abonado y saldo, calculados con `calcularAbonado`/`calcularSaldo`;
  - la lista de abonos, con los anulados tachados y la etiqueta "Anulado";
  - si `puedeRecibirAbono`, un formulario con moneda (USD/Bs), monto, tasa (rellenada con `useDolar` de `hooks/useDolar.ts` y editable, visible solo en Bs), método (sin `NoEspecificado`), referencia y fecha (hoy por defecto);
  - si `puedeAnularAbono`, un botón "Anular" por abono vigente, que abre una modal propia (patrón de la modal de cancelación de `orderStateSelect.tsx`) con las acciones "Volver" y "Anular abono".

  Resultados con sonner y `router.refresh()`; los botones se bloquean mientras se envía.
- [X] T050 [US3] En `app/admin/transactions/[id]/page.tsx`:
  - incluir en `pagos` los campos `esAbono`, `anuladoEn` y `actorEmail`;
  - "Pago declarado" usa solo el último pago con `esAbono: false`;
  - añadir `<AbonosPanel>` con los pagos `esAbono: true`, en la columna principal, debajo de las líneas.
- [X] T051 [P] [US3] En `components/admin/ventas/statusHistory.tsx`, las entradas con `estadoAnterior === estadoNuevo` se muestran como un evento (motivo, responsable y fecha) sin la flecha de cambio de estado.
- [X] T052 [US3] Mostrar abonado y saldo en la tabla de ventas:
  - `lib/admin/types.ts`: `SalesRow` añade `abonadoUsd` y `saldoUsd`;
  - `app/admin/transactions/page.tsx`: la consulta de pagos añade `montoUsd`, `esAbono` y `anuladoEn`, y la fila calcula `abonadoUsd = calcularAbonado(pagos)` y `saldoUsd = calcularSaldo(...)`. La lista "Tipo de pago" sigue usando todos los pagos;
  - `components/admin/ventas/salesTable.tsx`: columnas "Abonado" y "Saldo" en escritorio y ambos datos en `SalesCard`; el saldo > 0 con el color de "Por cobrar".
- [X] T053 [US3] Añadir el filtro de saldo pendiente:
  - `components/admin/ventas/salesFilters.tsx`: añade a `values` un `saldo?: string` con la opción "Con saldo pendiente" (`saldo=pendiente`), lo que amplía `SalesFilterState`;
  - `lib/admin/sales-query.ts`: `buildSalesWhere` traduce `saldo === "pendiente"` a `estado: { in: ["por_cobrar", "pendiente", "en_pedido"] }`, combinado con el resto. Si también hay `estado`, se aplica la intersección; un estado incompatible da 0 resultados;
  - `app/admin/transactions/page.tsx`: lee `saldo` de `searchParams` y lo incluye en `paginationQuery`;
  - `app/admin/transactions/export/route.ts`: lee `saldo` para que la exportación de pedidos respete el filtro.
- [X] T054 [US3] Añadir el resumen de cuentas por cobrar:
  - `lib/admin/sales-query.ts`: `consultarCuentasPorCobrar()` usa el singleton `@/lib/prisma`. Lee los pedidos con estado `por_cobrar`, `pendiente` o `en_pedido`, con el cliente (`nombre` y `apellido`) y sus pagos (`montoUsd`, `esAbono` y `anuladoEn`), y devuelve `agruparCuentasPorCobrar(...)`;
  - nuevo `components/admin/ventas/receivablesSummary.tsx`: el total por cobrar y una lista por cliente (deuda, pedidos y "desde"), ordenada por deuda. Cada cliente enlaza a `/admin/transactions?saldo=pendiente&cliente={nombre}`. En móvil se muestran tarjetas;
  - `app/admin/transactions/page.tsx`: lo renderiza sobre la tabla solo cuando `saldo === "pendiente"`.

**Checkpoint**: El escenario 6 del quickstart funciona. Un pedido web "Por cobrar" con un pago declarado muestra un saldo igual a su total.

---

## Phase 6: User Story 4 - Descargar el control de ventas con el formato del Excel (Priority: P3)

**Goal**: Descargar las líneas de un periodo con las columnas del Excel de la dueña, de modo que el archivo se pueda volver a cargar sin crear pedidos (FR-039 a FR-041).

**Independent Test**: [quickstart.md](./quickstart.md), escenario 7. Agosto tiene 49 líneas de 25 notas y VENTA = USD 2.734,55. Volver a cargar el archivo marca todas las notas como "Ya registrada".

### Tests for User Story 4 ⚠️

- [X] T055 [P] [US4] En `tests/admin/sales-export.test.ts`, añadir pruebas sin quitar las actuales de `buildSalesWorkbook`:
  - **`repartirDeudaPorLineas`**:
    - ventas `[10, 20, 5]` con saldo 12 → DEUDA `[0, 7, 5]` y ABONO `[10, 13, 0]`;
    - pedido `pagado` → DEUDA en 0;
    - saldo mayor que Σ VENTA (delivery) → DEUDA = VENTA en todas las líneas.
  - **`buildSalesControlWorkbook`**: genera un `.xlsx` que `leerLibroXlsx` (US1, T023) lee con B1 `"CONTROL DE VENTAS"`, los encabezados de B2:Q2 del contrato, FECHA como serial, TIPO vacío para `null`, PAGADO `SI`/`NO` y X COBRAR `x`/`-`.
  - **Recarga**: `construirCarga` sobre ese libro produce notas con el mismo número, cliente e importe que los registros de entrada.

### Implementation for User Story 4

- [X] T056 [US4] En `lib/admin/sales-export.ts`:
  - separar lo genérico (`zip`, `crc32`, `textCell`, `numberCell`, `row`, los estilos y el armado de `[Content_Types]`/workbook/rels) en una función interna `buildWorkbook({ nombreHoja, worksheetXml })`, añadiendo al `styles.xml` un estilo de fecha (`numFmtId="14"` u otro con formato `dd/mm/yyyy`);
  - `buildSalesWorkbook` conserva su salida;
  - añadir `export type SalesControlLine` (fecha, nota, cliente, grupo, producto, sabor, gramos, cantidad, tipoPrecio, precioUnitario, venta, abono, deuda), la función pura exportada `repartirDeudaPorLineas(ventas: number[], estado, saldoUsd)` y `buildSalesControlWorkbook(lines)`, con la hoja "VENTAS", el título en B1, los encabezados en B2:Q2 y las columnas de [contracts/ventas-lineas.md](./contracts/ventas-lineas.md) §4. Conversión de fecha a serial: `(Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000`.
- [X] T057 [US4] En `app/admin/transactions/export/route.ts`, si `formato === "control"`:
  1. tomar `desde`/`hasta`; si faltan, usar el mes en curso de Caracas;
  2. consultar las transacciones con `estado: { not: "cancelado" }` y `fechaCompra` en el rango, ordenadas por `fechaCompra` y `numeroOrden`, incluyendo:
     - el cliente (`nombre` y `apellido`);
     - los detalles ordenados por `id`, con el producto (`nombre`, `categoria` y `equivalencias` ordenadas por `updatedAt` desc, `take: 1`);
     - los pagos (`montoUsd`, `esAbono` y `anuladoEn`);
  3. calcular el saldo con `calcularSaldo`, repartirlo con `repartirDeudaPorLineas` y armar las `SalesControlLine` (si no hay equivalencia, GRUPO = categoría, PRODUCTO = nombre y SABOR y GR vacíos; día de la fecha en Caracas);
  4. responder con `control-ventas-{desde}-{hasta}.xlsx` y las mismas cabeceras que hoy.

  `requireAdmin()` se mantiene al inicio. Sin `formato`, el comportamiento no cambia.
- [X] T058 [US4] En `app/admin/transactions/page.tsx`, junto a la exportación actual, añadir el enlace-botón "Descargar control de ventas" hacia `/admin/transactions/export?formato=control&desde=…&hasta=…`, con el rango de los filtros vigentes (vacío = mes en curso, resuelto por la ruta).

**Checkpoint**: El escenario 7 del quickstart funciona: el archivo abre en Excel con fechas reales, los totales coinciden y la recarga no crea nada.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, revisión de seguridad y verificación completa.

- [X] T059 [P] Actualizar `CLAUDE.md` (sección "Checkout y flujos de venta" y "Modelo de pedidos") y `docs/descripcion-tecnica.md` con:
  - la carga de Excel en `/admin/transactions/import`: no toca inventario ni fidelidad, marca `Transaccion.importada`, y su cancelación no devuelve stock;
  - los abonos (`Pago.esAbono`): saldo derivado y paso automático a "Pagado";
  - `Pago` con `esAbono: false` = pago declarado;
  - cantidades e inventario con hasta 2 decimales, siempre vía `ajustarInventario` (`lib/inventory.ts`), y la tienda que ve `floor(inventario)`;
  - `DetalleCompra.tipoPrecio`;
  - `Cliente.celular` opcional solo para los clientes importados;
  - `experimental.serverActions.bodySizeLimit`.
- [X] T060 Revisión de seguridad y de alcance:
  - `requireAdmin()` está al inicio de `previsualizarCargaVentas`, `confirmarCargaVentas`, `registrarAbono`, `anularAbono` y de la ruta de exportación;
  - `prepararVistaPrevia` no selecciona `celular`, `rif` ni `email`;
  - `git ls-files "*.xlsx"` no lista archivos de la clienta;
  - no se añadieron dependencias a `package.json`;
  - no queda código muerto (`grep` de `decrement:`/`increment:` sobre `inventario` fuera de `lib/inventory.ts` → sin resultados).
- [X] T061 (admin 108 ok con integración en base local aislada; build y lint ok; los 3 tests de integración de checkout no cargan por el alias @/ del loader, ya fallaban en HEAD) Ejecutar `npm.cmd run test:admin`, `npm.cmd run test:checkout`, `$env:RUN_ADMIN_INTEGRATION = "1"; npm.cmd run test:admin` (base aislada), `npm.cmd run lint` y `npm.cmd run build`. Corregir las regresiones frente a la línea base de T001 y declarar toda verificación omitida.
- [X] T062 (validado a mano por el usuario con el Excel de agosto en base local: sin fallos) Validar a mano todos los escenarios de [quickstart.md](./quickstart.md) (1 a 9) con el archivo real de agosto en la base aislada, en escritorio y en un viewport ≤ 390 px, y anotar los resultados.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de T001. **Bloquea todas las historias.**
  - Dentro de la fase:
    - T002 → T003 (esquema y migración) → todo lo demás.
    - T004 → T005 (inventario).
    - T005 → T007, T008, T009, T010, T011, T013 y T014.
    - T006 → T007.
    - T016 → T017.
    - T018 al final.
  - T015 solo depende de T003.
- **US1 (Phase 3)**: depende de Phase 2.
- **US2 (Phase 4)**: depende de Phase 2. No depende de US1.
- **US3 (Phase 5)**: depende de Phase 2 (usa T017). No depende de US1 ni de US2.
- **US4 (Phase 6)**: depende de Phase 2 (usa T017 y T005). Su prueba de recarga (T055) usa `leerLibroXlsx` y `construirCarga` de US1 (T023 y T024); la implementación (T056 a T058) no depende de US1.
- **Polish (Phase 7)**: depende de las historias que se entreguen.

### User Story Dependencies

- **US1 (P1)**: independiente tras Foundational.
- **US2 (P1)**: independiente tras Foundational. Toca `admin-sales.ts`, `checkout.ts` y el detalle del pedido, igual que US3 (T048 y T050): conviene hacerlas en secuencia y no en paralelo.
- **US3 (P2)**: independiente tras Foundational. Los pedidos importados de US1 ya traen abonos (`esAbono: true`) que US3 mostrará; sin US1 se prueba con pedidos del panel.
- **US4 (P3)**: independiente tras Foundational, salvo la prueba de recarga, que necesita el lector de US1.

### Within Each User Story

- Las pruebas se escriben primero y deben fallar.
- Las reglas puras van antes que los núcleos transaccionales, estos antes que las Server Actions y estas antes que la interfaz.
- `sales-import-core.ts` (T024 → T025) y `sales-import.ts` (T027 → T028) se editan en secuencia porque son el mismo archivo.
- `app/admin/transactions/page.tsx` lo tocan T034 (US1), T052, T053 y T054 (US3) y T058 (US4): en secuencia.

### Parallel Opportunities

- **Phase 2**: T004, T006 y T016 (pruebas) en paralelo. Después de T005: T012, T013, T014 y T015 en paralelo (archivos distintos).
- **US1**: T019, T020, T021 y T022 en paralelo (T020 a T022 usan el helper de T019, pero solo lo importan). T023 se puede hacer en paralelo con T024 (archivos distintos). T030 es independiente.
- **US2**: T035 y T036 en paralelo; T041 y T044 en paralelo con T040 y T043.
- **US3**: T045 en paralelo con T046; T051 en paralelo con todo lo demás de US3.
- **US4**: T055 en paralelo con T056 (se valida al terminar).
- Con varias personas, US1 y US2 pueden avanzar a la vez tras Foundational, coordinando `app/admin/transactions/page.tsx`.

---

## Parallel Example: User Story 1

```text
# Pruebas primero (archivos distintos):
Task: "T019 Helper xlsx-fixture.ts que genera el libro sintético"
Task: "T020 Pruebas del lector en tests/admin/xlsx-reader.test.ts"
Task: "T021 Pruebas del núcleo en tests/admin/sales-import-core.test.ts"
Task: "T022 Integración de la carga en tests/admin/sales-import.integration.test.ts"

# Implementación en paralelo (archivos distintos):
Task: "T023 Lector en lib/admin/xlsx-reader.ts"
Task: "T024 Lectura y validaciones en lib/admin/sales-import-core.ts"
Task: "T030 bodySizeLimit en next.config.ts"
```

## Parallel Example: Foundational

```text
# Tras T003 y T005:
Task: "T012 Inventario con decimales en la interfaz del panel"
Task: "T013 unidadesDisponibles en tienda, venta rápida y cotización"
Task: "T014 formatQuantity en tabla de ventas, exportación y analíticas"
Task: "T015 celular opcional en tipos, consultas, PDF y clientes"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (T001) y Phase 2 (T002 a T018). Es el paso más delicado, porque cambia el tipo de inventario y cantidades en todo el sistema; validar con las pruebas de integración y con una compra en la tienda antes de seguir.
2. Phase 3 (US1): la dueña ya puede cargar sus Excel históricos y ver ventas, clientes y analíticas.
3. **STOP and VALIDATE**: escenarios 1 a 3 del quickstart con el archivo real.

### Incremental Delivery

1. Foundational: inventario y cantidades decimales en producción, sin cambios visibles salvo los decimales permitidos.
2. **US1**: carga de Excel (MVP).
3. **US2**: tipo de precio en ventas nuevas y desglose en analíticas. Es más pequeña que US1 y, si conviene, puede entregarse antes, porque no depende de ella.
4. **US3**: abonos y cuentas por cobrar.
5. **US4**: descarga del control de ventas.

Cada entrega se valida con su escenario del quickstart y no rompe las anteriores.

---

## Notes

- `[P]` = archivos distintos y sin dependencias pendientes.
- Las etiquetas [USn] permiten trazar cada tarea hasta su historia.
- Todas las notificaciones usan `toast` de sonner; la UI y los mensajes, en español.
- No guardar el archivo real de la clienta en el repositorio, ni siquiera como fixture.
- Hacer commit por tarea o por grupo lógico; cada checkpoint permite validar la historia por separado.
