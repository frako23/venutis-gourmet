---

description: "Task list for the manual sale form (client search and creation), order editing and order deletion"
---

# Tasks: Formulario de venta con búsqueda y alta de clientes, edición y eliminación de pedidos

**Input**: Design documents from `/specs/012-formulario-venta-pedidos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/server-actions.md](./contracts/server-actions.md), [contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen porque la función toca dinero, inventario, puntos y el ciclo de vida del pedido (Constitución v2.1.0, Principio V). [contracts/server-actions.md](./contracts/server-actions.md) define los casos:

- **Pruebas puras**, sin base de datos, en `npm.cmd run test:admin`:
  - `tests/admin/fechas-caracas.test.ts`;
  - `tests/admin/client-rules.test.ts`;
  - `tests/admin/sales-calculations.test.ts`;
  - `tests/admin/order-edit-rules.test.ts`.
- **Integración** (`tests/admin/order-edit.integration.test.ts`): contra una base **aislada**, con `RUN_ADMIN_INTEGRATION=1` y `ADMIN_TEST_DATABASE_URL`.

El buscador, la modal de alta, el formulario en modo edición y la modal de eliminación se validan a mano con [quickstart.md](./quickstart.md).

**Organization**: Las tareas se agrupan por historia de usuario de la spec:

- **US1 (P1)**: buscar al cliente por nombre en el formulario de venta.
- **US2 (P1)**: registrar un cliente nuevo sin salir del formulario.
- **US3 (P1)**: editar un pedido existente desde la tabla (incluidos los pagados).
- **US4 (P2)**: eliminar un pedido con confirmación.

**Convenciones que aplican a todas las tareas**:

- avisos solo con `toast` de sonner;
- textos en español;
- clases `admin-*` y tokens existentes, sin colores nuevos;
- fechas siempre con `ZONA_HORARIA` (`lib/format.ts`);
- los módulos de `lib/admin/` que importan las pruebas usan imports **relativos con extensión `.ts`** (sin `@/`), como `lib/admin/manual-sale.ts`;
- el inventario se mueve solo con `ajustarInventario` (`lib/inventory.ts`);
- los bloqueos van siempre en orden Cliente → Transaccion → Producto.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario de la tarea (US1, US2, US3, US4).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fijar la línea base. No hay dependencias nuevas ni migraciones.

- [X] T001 Preparar la línea base en la rama `012-formulario-venta-pedidos`:
  - Confirmar que `DATABASE_URL` de `.env` apunta a una base de **desarrollo** (hoy `venutis_local`), nunca a la de producción.
  - Ejecutar `npm.cmd run lint`, `npm.cmd run test:admin` y `npm.cmd run test:checkout`, y anotar el resultado base (0 errores de lint; admin 131 pasan; checkout 48 pasan).
  - Crear en la base de desarrollo los datos de quickstart.md: un producto A con `inventario` 10, y los clientes consumidores "María Pérez" y "Marcos Díaz", con `nombreBusqueda` calculado con `normalizeSearchName` de `lib/client-rules.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fechas de Caracas, la regla única del total de un pedido existente y los tipos compartidos. US3 y US4 dependen de esta fase; US1 y US2 solo de T004.

**⚠️ CRITICAL**: No empezar US3 ni US4 hasta completar esta fase.

- [X] T002 [P] Agregar a `lib/format.ts`, junto a `ZONA_HORARIA`, dos funciones puras sin dependencias:
  - `fechaHoraLocalCaracas(instante: Date | string): string` devuelve `"YYYY-MM-DDTHH:mm"`. Usa `Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts`.
  - `interpretarFechaHoraCaracas(texto: string): Date | null`:
    - acepta solo `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/`;
    - crea el instante con `new Date(`${texto}:00-04:00`)`;
    - devuelve `null` si el formato o la fecha no son válidos, y también si el día no coincide al volver a formatear (por ejemplo, "2026-02-30").

  Agregar un comentario que explique que Caracas es UTC−4 sin horario de verano (constitución v2.1.0, "Fechas y horas").
- [X] T003 [P] Crear `tests/admin/fechas-caracas.test.ts` (`node:test` + `node:assert/strict`, importando `../../lib/format.ts`) con los casos del contrato:
  - `fechaHoraLocalCaracas(new Date("2026-11-11T01:30:00Z")) === "2026-11-10T21:30"`;
  - `fechaHoraLocalCaracas(new Date("2026-11-10T04:00:00Z")) === "2026-11-10T00:00"`;
  - `interpretarFechaHoraCaracas("2026-11-10T21:30")?.toISOString() === "2026-11-11T01:30:00.000Z"`;
  - `"2026-13-01T00:00"`, `""` y `"2026-11-10"` → `null`;
  - ida y vuelta (`interpretar(fechaHoraLocal(x))` conserva el minuto).
- [X] T004 Corregir la fecha de las ventas nuevas (FR-010) con las funciones de T002:
  - En `components/admin/ventas/manualSaleForm.tsx`, el `defaultValue` de `fechaCompra` pasa a ser `fechaHoraLocalCaracas(new Date())`, en lugar de `new Date().toISOString().slice(0, 16)`.
  - En `lib/actions/admin-sales.ts` (`manualSaleSchema`/`parseInput` de `registrarVentaManual`):
    - `fechaCompra` deja de usar `z.coerce.date()`;
    - se valida como texto `YYYY-MM-DDTHH:mm` y se convierte con `interpretarFechaHoraCaracas`;
    - si viene vacío, se usa `new Date()`;
    - si es inválido, se devuelve `{ success: false, message: "La fecha no es válida." }`.

  Depende de T002.
- [X] T005 [P] Agregar a `lib/admin/sales-calculations.ts` la regla pura `recalcularTotalPedido({ lineasCobradas, descuento, tasaCambio, descuentoPuntosUsd, montoDeliveryUsd }): SaleTotals`:
  - llama a `calculateSaleTotals(lineasCobradas, descuento, tasaCambio, descuentoPuntosUsd)`;
  - devuelve los mismos campos, pero con `totalUsd = roundMoney(totals.totalUsd + montoDeliveryUsd)` y `totalBs` recalculado sobre ese total si hay tasa.

  El delivery **no** entra en la base del porcentaje de descuento.
- [X] T006 [P] Agregar a `tests/admin/sales-calculations.test.ts` los casos de `recalcularTotalPedido`:
  - subtotal 20 + delivery 3 − 10 % = 21;
  - con descuento por puntos 2 → 19;
  - un descuento por encima del subtotal lanza error;
  - el porcentaje se calcula sin el delivery.
- [X] T007 Corregir la pérdida del delivery en los editores existentes (research.md, Decisión 6) con `recalcularTotalPedido` en `lib/actions/admin-sales.ts`:
  - `actualizarDescuentoVenta`: pasa `montoDeliveryUsd: transaction.montoDelivery` y conserva `validarTotalContraAbonado`.
  - `guardarEdicionMasivaVentas`, filas existentes: lo mismo, con `transaction.montoDelivery`.
  - Las filas nuevas del editor masivo no tienen delivery: quedan como están.

  Depende de T005.
- [X] T008 [P] Ampliar los tipos de `lib/admin/types.ts`:
  - **`ClienteBusqueda`**: `{ id: number; nombre: string; apellido: string; tipoCliente: "detal" | "mayorista"; nombreBusqueda: string; celular: string | null; rif: string | null }`.
  - **`ClientCreateState`**: `ActionResult<{ clientId: number; cliente: ClienteBusqueda }>`.
  - **`EdicionVentaState`**:
    - éxito: `{ success: true; message; transactionId; numeroOrden; totalUsd }`;
    - error: `{ success: false; message; issues?; requiereAutorizacion?: InfoCredito; requiereConfirmarDiferencia?: { diferenciaUsd: number } }`.

    Importar `InfoCredito` como tipo desde `lib/admin/manual-sale.ts`.
  - **`SalesRow`**: suma `editable: boolean`, `eliminable: boolean`, `motivoNoEliminable: string | null`, `importada: boolean` y `tienePagoDeclarado: boolean`.

  Corregir los usos de `SalesRow` que dejen de compilar, asignando valores por defecto donde se construye (`app/admin/transactions/page.tsx`: `editable: transaction.estado !== "cancelado"`; los demás campos van en `false`/`null` hasta que T031 los calcule).

**Checkpoint**: `npm.cmd run test:admin` en verde con los casos nuevos. Las ventas nuevas guardan la hora de Caracas, y cambiar el descuento de un pedido con delivery conserva el delivery en el total.

---

## Phase 3: User Story 1 - Buscar al cliente por nombre al registrar una venta (Priority: P1) 🎯 MVP

**Goal**: Elegir al cliente escribiendo parte de su nombre o apellido, sin recorrer la lista completa.

**Independent Test**: En `/admin/add-transaction`, escribir "mar pe" muestra solo a "María Pérez" con su teléfono. Elegirla con ↓ y Enter aplica su precio detal ([quickstart.md](./quickstart.md), Historia 1).

### Tests for User Story 1

- [X] T009 [P] [US1] Agregar a `tests/admin/client-rules.test.ts` los casos de `filtrarClientes`:
  - "maria" encuentra a "María Pérez";
  - "mar pe" la encuentra y excluye a "Marcos Díaz";
  - "  MARÍA   " (espacios de más y mayúsculas) la encuentra;
  - el texto vacío devuelve los primeros N según el orden por nombre;
  - respeta el `limite`;
  - los que empiezan por la primera palabra van antes que los que solo la contienen.

### Implementation for User Story 1

- [X] T010 [P] [US1] Agregar a `lib/client-rules.ts` la regla pura `filtrarClientes<T extends { nombre: string; apellido: string; nombreBusqueda: string }>(clientes: T[], texto: string, limite = 20): T[]`:
  - normaliza `texto` con `normalizeSearchName` y lo parte por espacios;
  - exige que **todas** las palabras estén contenidas en `nombreBusqueda`;
  - ordena primero los que empiezan por la primera palabra y luego por `nombre`/`apellido` con `localeCompare("es")`;
  - devuelve "como máximo 20 resultados" por defecto.
- [X] T011 [US1] En `app/admin/add-transaction/page.tsx`, el `select` de clientes suma `nombreBusqueda`, `celular` y `rif`, y se pasa a `ManualSaleForm` como `ClienteBusqueda[]`. Ajustar el tipo de la prop `clients` en `components/admin/ventas/manualSaleForm.tsx`.
- [X] T012 [US1] Crear `components/admin/ventas/clientSearch.tsx` (`"use client"`) según [contracts/ui.md](./contracts/ui.md#clientsearch-nuevo-componentsadminventasclientsearchtsx):
  - **Props**: `clientes: ClienteBusqueda[]`, `value: number | null`, `onChange(id: number | null)`, `onCrear(textoBuscado: string)`, `disabled?: boolean`.
  - **Búsqueda**: un input con el placeholder "Busca por nombre o apellido", que filtra con `filtrarClientes`.
  - **Resultados**: lista `role="listbox"` con hasta 20 opciones. Cada una muestra "Nombre Apellido", una insignia Consumidor o Mayorista y `celular ?? rif` en gris.
  - **Accesibilidad y teclado**: el input lleva `role="combobox"`, `aria-expanded`, `aria-controls` y `aria-activedescendant`. ↑/↓ mueven la opción activa, Enter elige y Escape cierra.
  - **Sin coincidencias**: "No hay clientes con «texto»" y el botón "Registrar «texto» como cliente nuevo", que llama a `onCrear(texto)`.
  - **Alta siempre visible**: junto al input, el botón "Registrar cliente nuevo" (`onCrear("")`).
  - **Con selección**: muestra el cliente elegido con el botón "Cambiar", que llama a `onChange(null)` y enfoca el input.
  - **`disabled`**: muestra el cliente y la nota "No se puede cambiar: el pedido tiene puntos o saldo a favor de este cliente".
  - **Teléfono**: funciona a 390 px de ancho sin desplazamiento horizontal.
- [X] T013 [US1] Integrar `ClientSearch` en `components/admin/ventas/manualSaleForm.tsx`:
  - reemplaza el `<select name="clienteId">`, con `value={clientId ? Number(clientId) : null}`;
  - `onChange` llama a la función existente `selectClient` (conserva el tipo de precio propuesto, el reinicio de canjes y saldo, y los puntos);
  - agregar `<input type="hidden" name="clienteId" value={clientId}>`;
  - el botón "Confirmar venta" se desactiva sin cliente y muestra la ayuda "Selecciona un cliente".

  `onCrear` queda como `() => {}` hasta US2.

**Checkpoint**: La Historia 1 del quickstart pasa completa; se puede registrar una venta eligiendo al cliente desde el buscador.

---

## Phase 4: User Story 2 - Registrar un cliente nuevo sin salir del formulario de venta (Priority: P1)

**Goal**: Crear al comprador desde la venta, que queda seleccionado y no pierde las líneas cargadas.

**Independent Test**: Con 2 unidades de A cargadas, buscar "Lucía Rojas", registrarla desde el botón precargado y comprobar que queda seleccionada con las 2 unidades intactas ([quickstart.md](./quickstart.md), Historia 2).

**Depends on**: US1 (el botón vive en `ClientSearch`).

### Implementation for User Story 2

- [X] T014 [P] [US2] En `lib/actions/admin-clients.ts`, `crearClienteAdministrativo`:
  - el `select` del `tx.cliente.create` pasa a ser `{ id: true, nombre: true, apellido: true, tipoCliente: true, nombreBusqueda: true, celular: true, rif: true }`;
  - la respuesta de éxito suma `cliente` (tipo `ClienteBusqueda`).

  No cambian las validaciones, la unicidad, `historialCliente` ni `revalidateClientSurfaces`.
- [X] T015 [P] [US2] En `components/admin/clientes/clientCreateModal.tsx`, agregar las props opcionales `nombreInicial?: string` y `onCreated?: (cliente: ClienteBusqueda) => void`:
  - Con `nombreInicial`, precargar `nombre` con la primera palabra y `apellido` con el resto, usando `defaultValue`.
  - En el efecto de éxito:
    - si hay `onCreated`, mostrar `toast.success`, llamar a `onCreated(state.cliente)` y luego a `onClose()`, **sin** `router.refresh()`;
    - si no lo hay, comportarse como hoy.

  El listado de clientes (`components/admin/clientes/clientsTable.tsx` o quien la use) no cambia.
- [X] T016 [US2] En `components/admin/ventas/manualSaleForm.tsx`:
  - Mantener `const [clientes, setClientes] = useState(clients)` como la lista local que se pasa a `ClientSearch` y que usan `selectClient`/`proposedType`.
  - Estado `altaAbierta: { nombreInicial: string } | null`; `onCrear(texto)` lo abre.
  - Renderizar `<ClientCreateModal nombreInicial=... onCreated=... onClose=... />` sin desmontar el formulario.
  - `onCreated(cliente)` agrega el cliente a `clientes` y llama a `selectClient(String(cliente.id))`, que aplica el tipo de precio.
  - Al cerrar sin guardar, el formulario conserva todo su estado.

  Depende de T013, T014 y T015.

**Checkpoint**: La Historia 2 del quickstart pasa: los conflictos de teléfono, correo o RIF muestran el error en el campo y no crean nada.

---

## Phase 5: User Story 3 - Editar un pedido existente desde la tabla de ventas (Priority: P1)

**Goal**: Corregir cualquier pedido no cancelado (incluidos los pagados) desde el mismo formulario, ajustando el inventario por diferencia y dejando la edición en el historial.

**Independent Test**: Un pedido "Por cobrar" de 3 unidades de A pasa a 5 desde "Editar". El total refleja 5, A baja 2 unidades más y el historial muestra "Pedido editado: … 3 → 5" ([quickstart.md](./quickstart.md), Historia 3).

**Depends on**: Foundational (T002, T004, T005, T008) y US1 (`ClientSearch` con `disabled`).

### Tests for User Story 3

- [X] T017 [P] [US3] Crear `tests/admin/order-edit-rules.test.ts` con los casos del contrato para las reglas de T019:
  - **`motivoNoEditable`**: `cancelado` → texto; los demás → `null`.
  - **`diferenciasInventario`**: un aumento da +2; una reducción, −1; un producto nuevo, +n; un producto quitado, −n. El mismo producto en dos líneas se suma, los deltas en 0 se omiten y el resultado sale ordenado por `productoId`.
  - **`requiereConfirmarDiferencia`**: pagado de 10 a 12 → `true`; pagado de 10 a 9 → `false`; por cobrar de 10 a 12 → `false`; una diferencia menor a un centavo → `false`.
  - **`ajustePuntosPorEdicion`**:
    - ganados 10, esperados 15 → +5;
    - ganados 10, esperados 4, disponibles 20 → −6;
    - ganados 10, esperados 0, disponibles 3 → −3 (tope);
    - iguales → 0.
  - **`versionPedido`**: es determinista, devuelve 16 caracteres hexadecimales y cambia si cambia el estado, el total, un pago (incluida su anulación), una línea o el último evento del historial.
  - **`resumirCambiosPedido`**: sin cambios → `""`; muestra la cantidad "3 → 5" y las líneas agregadas o quitadas; recorta a 500 caracteres con "…".
- [X] T018 [P] [US3] Crear `tests/admin/order-edit.integration.test.ts`, con `{ skip: !integrationEnabled }` y los helpers de `tests/admin/integration-helpers.ts`. Usa `editarPedidoEnTx` directamente (sin `requireAdmin`), con datos creados en la prueba y borrados en `finally`. Casos:
  1. editar de 3 a 5 baja la existencia en 2; de 5 a 1 la sube en 4; agregar o quitar un producto mueve solo ese producto;
  2. un aumento sin stock suficiente se rechaza y no cambia el pedido, las líneas, el inventario ni el historial;
  3. un pedido con `importada: true` editado no mueve inventario;
  4. un pedido pagado de un cliente `detal` con `acumulacion` previa: al subir el total con `confirmarCobroDiferencia`, se acredita la diferencia de puntos; al bajar, se revierte con tope;
  5. una `version` distinta se rechaza sin escribir;
  6. un pedido con `montoDelivery` 3 conserva el delivery en `montoTotal` tras editar.

  Las pruebas deben fallar hasta completar T020.

### Implementation for User Story 3

- [X] T019 [US3] Crear `lib/admin/order-edit-rules.ts` (puro, sin `@/` y con imports relativos `.ts`). Define los tipos:
  - `SnapshotPedido`: estado, `montoTotal`, `numeroOrden`, `clienteId`, `fechaCompra`, líneas `{ id, productoId, cantidad, precioUnitario }`, pagos `{ id, anuladoEn }`, ids de movimientos de puntos y de saldo, e id del último evento del historial;
  - `PedidoEditable`, con los campos de [data-model.md](./data-model.md#pedidoeditable).

  Y las reglas:
  - `motivoNoEditable({ estado })`: "Los pedidos cancelados no se pueden editar." o `null`.
  - `diferenciasInventario(anteriores, nuevas)`: `Array<{ productoId, delta }>` "ordenado por `productoId`, sin deltas en 0 y redondeado a 2 decimales" (usar `roundQuantity` de `../inventory.ts`).
  - `requiereConfirmarDiferencia({ estado, totalAnteriorUsd, totalNuevoUsd })`: `true` si `estado === "pagado"` y el total nuevo es mayor en centavos.
  - `ajustePuntosPorEdicion({ ganadosNetos, esperados, disponibles, devueltos })`: devuelve `esperados − ganadosNetos` si es positivo; si es negativo, `−topeReversion({ ganadosNetos: ganadosNetos − esperados, devueltos, disponibles })`.
  - `versionPedido(snapshot)`: `createHash("sha256")` de `node:crypto` sobre un JSON con las líneas y los pagos ordenados por id, truncado a 16 caracteres hexadecimales.
  - `resumirCambiosPedido(antes, despues)`:
    - lista los cambios de número, cliente, fecha (con `formatFechaHora` de `../format.ts`), entrega, tasa y descuento;
    - lista las líneas agregadas, quitadas y modificadas (producto, cantidad o precio);
    - incluye el total "antes → después";
    - devuelve `""` si no hay cambios y se recorta a 500 caracteres con "…".
- [X] T020 [US3] Crear `lib/admin/order-edit.ts` (sin `@/`) con:
  - **`cargarPedidoEditable(db, id): Promise<PedidoEditable | null>`**:
    - incluye líneas con el nombre del producto, pagos, ids de `fidelidades` y `movimientosSaldo`, y el último `historialEstados`;
    - devuelve `null` si el pedido no existe o está cancelado;
    - `fechaLocal = fechaHoraLocalCaracas(fechaCompra)`;
    - `clienteBloqueado` = hay movimientos de puntos o de saldo;
    - `abonadoUsd = calcularAbonado(pagos)`;
    - separa `lineas` (`precioUnitario > 0`; si `tipoPrecio` es `null` → `"detal"`) de `lineasPremio`.
  - **`editarPedidoEnTx(tx, input, actor)`**, en este orden ([data-model.md](./data-model.md#edición-editarpedidoentx)):
    1. Lee el `clienteId` actual. Bloquea con `bloquearCliente` los clientes `{actual, nuevo}` en orden ascendente, y luego el pedido con `SELECT "id" FROM "Transaccion" WHERE "id" = … FOR UPDATE`.
    2. Carga el snapshot y compara `versionPedido` (si no coincide: "El pedido cambió mientras lo editabas. Vuelve a abrirlo para ver los datos actuales.") y `motivoNoEditable`.
    3. Si cambia el cliente y hay movimientos de puntos o saldo, lanza "Este pedido tiene puntos o saldo a favor del cliente actual y no puede cambiar de cliente.".
    4. Calcula `recalcularTotalPedido` con las líneas nuevas, el `descuento`, la `tasaCambio`, el `montoDescuentoPuntos` y el `montoDelivery` guardados, y luego:
       - aplica `validarTotalContraAbonado`, con el mensaje "El total quedaría por debajo de lo ya abonado (USD X).";
       - con `requiereConfirmarDiferencia` y sin `confirmarCobroDiferencia`, lanza la clase nueva `ConfirmarDiferenciaRequerida` con `diferenciaUsd`;
       - si el pedido no está pagado, evalúa `evaluarCredito` con `consultarDeudaCliente`. Si es el mismo cliente, `montoSinCobrarUsd = max(0, nuevo − anterior)`; si es otro, `max(0, nuevo − abonado)`. Sin `autorizarCredito`, lanza `CreditoRequiereAutorizacion`.
    5. Arma `resumirCambiosPedido`; si da `""`, lanza "No hay cambios para guardar.".
    6. Si el pedido no es importado, aplica `diferenciasInventario` con `ajustarInventario(tx, productoId, -delta, { exigirStock: delta > 0 })`.
    7. `deleteMany` de las líneas con `precioUnitario > 0` y `createMany` de las nuevas con `tipoPrecio`.
    8. `transaccion.update`: número, cliente y fecha (si `fechaCompra === fechaOriginal`, conserva el instante guardado); `tipodeRetiro`, `tasaCambio`, `tipoDescuento`, `valorDescuento`, `montoSubtotal`, `montoDescuento` y `montoTotal`. Un error P2002 se traduce a "Ya existe un pedido con el número X.".
    9. Si el pedido está pagado, cumple `participaEnFidelidad` y tiene una `acumulacion` previa: calcula `ajustePuntosPorEdicion` con `calcularPuntosGanados` sobre los montos nuevos, `puntosDisponiblesDelCliente` y los devueltos. Crea una `acumulacion` (+) o una `reversion` (−) con el motivo "Ajuste por edición del pedido {numeroOrden}" y el actor.
    10. Inserta en `estadoTransaccionHistorial` `{ estadoAnterior: estado, estadoNuevo: estado, actorId, actorEmail, motivo: "Pedido editado: " + resumen + (autorización de crédito si aplica) }`.

    Devuelve `{ id, numeroOrden, totalUsd, clienteAnteriorId }`.

  Depende de T019, T005 y T002.
- [X] T021 [US3] Agregar a `lib/actions/admin-sales.ts` la acción `editarVentaManual(previo: EdicionVentaState, formData: FormData): Promise<EdicionVentaState>`:
  - **Validación y autorización**: `requireAdmin()` y un Zod con los campos de `EdicionVentaInput`:
    - `transaccionId`: "Entero positivo";
    - `version`: "Cadena de 16 caracteres hexadecimales";
    - `numeroOrden`: "Texto recortado, de 1 a 80 caracteres";
    - `lineas`: "Mínimo 1", con `lineSchema` (precio > 0, cantidad con 2 decimales como máximo);
    - `descuento`: `{ tipo: "porcentaje" | "usd", valor ≥ 0 } | null`;
    - `fechaCompra` y `fechaOriginal`: `YYYY-MM-DDTHH:mm`, interpretadas con `interpretarFechaHoraCaracas`;
    - `confirmarCobroDiferencia` y `autorizarCredito`: `"true"`.
  - **Ejecución**: `prisma.$transaction((tx) => editarPedidoEnTx(...), { maxWait: 10000, timeout: 30000 })`.
  - **Errores**: `CreditoRequiereAutorizacion` → `requiereAutorizacion`; `ConfirmarDiferenciaRequerida` → `requiereConfirmarDiferencia` con el mensaje "Confirma que cobraste la diferencia de USD X o pasa el pedido a Por cobrar."; los demás errores → `message`.
  - **Éxito**: "Pedido X actualizado." y `revalidatePath` de `/admin`, `/admin/transactions`, `/admin/transactions/{id}`, `/admin/inventory` y `/admin/clients/{id}` (cliente anterior y nuevo).

  Depende de T020.
- [X] T022 [US3] En `app/admin/add-transaction/page.tsx`, agregar el modo `?editar=<id>`:
  - recibe `searchParams: Promise<{ editar?: string }>`;
  - si `editar` es un entero positivo, llama a `cargarPedidoEditable(prisma, id)` y, si es `null`, responde `notFound()`;
  - la consulta de productos queda en `where: { OR: [{ inventario: { gt: 0 } }, { id: { in: idsDelPedido } }] }` con `ORDEN_CATALOGO`;
  - con un pedido, el título pasa a "Editar pedido {numeroOrden}", el subtítulo explica que se actualiza el mismo pedido y se muestra un enlace "← Volver al pedido" a `/admin/transactions/{id}`;
  - pasa `pedido` a `ManualSaleForm`.

  Depende de T020.
- [X] T023 [US3] Implementar el modo edición de `components/admin/ventas/manualSaleForm.tsx` según la tabla de [contracts/ui.md](./contracts/ui.md#manualsaleform-modo-edición), con la prop `pedido?: PedidoEditable`:
  - **Precarga**: cliente, `fechaLocal`, número de orden (obligatorio), `tipodeRetiro`, líneas, descuento y tasa. Inputs ocultos `transaccionId`, `version` y `fechaOriginal`.
  - **`ClientSearch`**: `disabled={pedido.clienteBloqueado}`.
  - **Stock mostrado por línea**: `inventario` más la cantidad del mismo producto en `pedido.lineas`.
  - **Bloques ocultos**: estado inicial, "Confirmo el cobro", canjes y saldo a favor. En su lugar va la nota "El estado se cambia desde la tabla o el detalle".
  - **Bloque de solo lectura**: premios canjeados (`lineasPremio`), descuento por puntos (`descuentoPuntosUsd`) y delivery (`zonaEntrega`, `montoDeliveryUsd`). Si `importada`, muestra la insignia "Importado: no mueve inventario ni puntos".
  - **Resumen**:
    - el total suma el delivery y el descuento por puntos del pedido;
    - muestra "Antes: $X" y la diferencia ±;
    - muestra "Abonado: $Y" si `abonadoUsd > 0`.
  - **Pedido pagado con total mayor**: aparece la casilla obligatoria `confirmarCobroDiferencia` con el texto "Confirmo que cobré la diferencia de $Z", y el botón queda desactivado hasta marcarla.
  - **Envío**: con `pedido`, el formulario usa `useActionState(editarVentaManual)`; sin él, sigue con `registrarVentaManual`. El botón dice "Guardar cambios", y la modal de crédito reutiliza la misma lógica (`autorizarCredito`).
  - **Al tener éxito**: `toast.success` y `router.push(`/admin/transactions/${id}`)`.
  - **Salir**: el enlace "Cancelar edición" vuelve sin escribir.

  Depende de T021 y T022.
- [X] T024 [US3] En `components/admin/ventas/salesTable.tsx`:
  - la última columna cambia su encabezado de "Ver" a "Acciones";
  - `SalesTableRow` muestra "Ver" y, si `row.editable`, el enlace "Editar" (`Pencil` de lucide-react) a `/admin/add-transaction?editar={id}`;
  - `SalesCard` muestra las mismas acciones al pie.

  `editable` ya llega desde T008.
- [X] T025 [P] [US3] En `app/admin/transactions/[id]/page.tsx`, agregar un botón "Editar" (`admin-button-secondary` con `Pencil`) en la cabecera, junto al estado, que enlaza a `/admin/add-transaction?editar={id}` y no aparece si `transaction.estado === "cancelado"`.

**Checkpoint**: T017 y T018 en verde. Los pasos 1 a 9 de la Historia 3 del quickstart pasan, incluidas la doble pestaña y la edición de un pedido pagado.

---

## Phase 6: User Story 4 - Eliminar un pedido con confirmación (Priority: P2)

**Goal**: Borrar de forma definitiva los pedidos duplicados o de prueba (sin cobros, puntos, saldo, notas ni reseñas), con confirmación y devolviendo el inventario cuando corresponde.

**Independent Test**: Un pedido duplicado "Por cobrar" de 1 unidad de A se elimina desde la tabla tras confirmar. Desaparece de la tabla y A sube 1 ([quickstart.md](./quickstart.md), Historia 4).

**Depends on**: Foundational (T008). La columna "Acciones" de T024: si US3 no está hecha, crearla en T033.

### Tests for User Story 4

- [X] T026 [P] [US4] Agregar a `tests/admin/order-edit-rules.test.ts` los casos de `motivoNoEliminable`:
  - por cobrar sin movimientos → `null`;
  - pagado → motivo;
  - con un abono anulado → motivo;
  - con puntos, saldo, nota o reseña → motivo;
  - cancelado sin movimientos → `null`.
- [X] T027 [P] [US4] Agregar a `tests/admin/order-edit.integration.test.ts` los casos de `eliminarPedidoEnTx`:
  1. eliminar un pedido por cobrar devuelve el inventario y borra el pedido, sus líneas, sus pagos declarados y su historial;
  2. eliminar uno cancelado no vuelve a devolver inventario;
  3. eliminar uno con un abono (aunque esté anulado) se rechaza sin borrar nada;
  4. un `estadoEsperado` o `totalEsperadoUsd` distinto se rechaza.

### Implementation for User Story 4

- [X] T028 [US4] Agregar a `lib/admin/order-edit-rules.ts` la regla `motivoNoEliminable({ estado, tieneAbonos, movimientosPuntos, movimientosSaldo, notasEntrega, resenas }): string | null`. Devuelve el primer motivo que aplique, siempre terminado en "Cancélalo en lugar de eliminarlo." cuando el pedido no está pagado:
  - "Los pedidos pagados no se eliminan.";
  - "Este pedido tiene abonos registrados.";
  - "Este pedido tiene movimientos de puntos.";
  - "Este pedido tiene movimientos de saldo a favor.";
  - "Este pedido tiene una nota de entrega.";
  - "Este pedido tiene reseñas.".
- [X] T029 [US4] Agregar a `lib/admin/order-edit.ts` la función `eliminarPedidoEnTx(tx, { transaccionId, estadoEsperado, totalEsperadoUsd })` ([data-model.md](./data-model.md#eliminación-eliminarpedidoentx)):
  1. Bloquea con `bloquearCliente` y luego el pedido `FOR UPDATE`.
  2. Si el pedido no existe, lanza "El pedido ya no existe.".
  3. Compara el estado y el total en centavos; si no coinciden, lanza "El pedido cambió mientras lo revisabas. Recarga la tabla.".
  4. Cuenta `fidelidad`, `movimientoSaldo`, `notaEntrega`, `resena` y `pago` con `esAbono`, y aplica `motivoNoEliminable`.
  5. Si `!importada && estado !== "cancelado"`, devuelve las cantidades con `getRestockQuantities` y `ajustarInventario(..., { exigirStock: false })`, en orden de `productoId`.
  6. `deleteMany` de `pago` y de `detalleCompra`, y luego `transaccion.delete` (el historial se borra por cascada).

  Devuelve `{ numeroOrden, clienteId }`. Depende de T028.
- [X] T030 [US4] Agregar a `lib/actions/admin-orders.ts` la acción `eliminarPedido(formData)`:
  - `requireAdmin()` y un Zod con `transaccionId` ("Entero positivo"), `estadoEsperado` (uno de `EstadoTransaccion`) y `totalEsperadoUsd` ("Número finito");
  - ejecuta `prisma.$transaction(eliminarPedidoEnTx)`;
  - **éxito**: "Pedido X eliminado." y `revalidatePath` de `/admin`, `/admin/transactions`, `/admin/inventory`, `/admin/analytics` y `/admin/clients/{clienteId}`;
  - **error**: `{ success: false, message }`.

  Depende de T029.
- [X] T031 [US4] En `app/admin/transactions/page.tsx`, ampliar la consulta de pedidos con:
  - `importada`;
  - `_count: { select: { fidelidades: true, movimientosSaldo: true, notasEntrega: true, resenas: true } }`.

  `pagos` ya trae `esAbono`. Calcular por fila:
  - `motivoNoEliminable(...)` y `eliminable` (cuando es `null`);
  - `importada`;
  - `tienePagoDeclarado = pagos.some((p) => !p.esAbono)`.

  Depende de T028.
- [X] T032 [P] [US4] Crear `components/admin/ventas/deleteOrderDialog.tsx` (`"use client"`) según [contracts/ui.md](./contracts/ui.md#deleteorderdialog-nuevo-componentsadminventasdeleteorderdialogtsx):
  - **Props**: `pedido: { id, numeroOrden, cliente, fechaCompra, totalUsd, estado, importada, tienePagoDeclarado }`, `onClose()`, `ultimaFilaDeLaPagina: boolean`, `page: number`.
  - **Contenido**:
    - título "¿Eliminar el pedido {numeroOrden}?";
    - cliente, fecha (`formatFecha`) y total;
    - advertencia "Esta acción no se puede deshacer." más "Los productos vuelven al inventario.", o "No mueve inventario." si el pedido es importado o está cancelado;
    - si `tienePagoDeclarado`, "También se eliminará el pago declarado por el cliente.".
  - **Accesibilidad**: `role="dialog"`, `aria-modal`, `aria-labelledby`. El foco inicial va a "Volver", y Escape o un clic fuera cierran sin eliminar.
  - **Confirmar**: "Eliminar pedido" llama a `eliminarPedido` dentro de `useTransition`, y queda desactivado con el texto "Eliminando…" mientras procesa.
  - **Éxito**: `toast.success`, `onClose()` y `router.refresh()`. Si `ultimaFilaDeLaPagina && page > 1`, navega a `?…&page=${page - 1}` conservando los filtros.
  - **Error**: `toast.error(message)` y `router.refresh()`.
- [X] T033 [US4] En `components/admin/ventas/salesTable.tsx`:
  - agregar el botón "Eliminar" (`Trash2`, tono `text-[#b85f49]`) a las acciones de `SalesTableRow` y de `SalesCard`, solo si `row.eliminable`, que abre `DeleteOrderDialog`;
  - si no es eliminable, el contenedor de acciones lleva `title={row.motivoNoEliminable ?? undefined}`;
  - pasar `ultimaFilaDeLaPagina = result.rows.length === 1` y `page = result.page`.

  Depende de T031 y T032 (y de T024 si existe la columna; si no, crearla aquí).

**Checkpoint**: T026 y T027 en verde. Los pasos 1 a 6 de la Historia 4 del quickstart pasan.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, verificación completa y validación manual.

- [X] T034 [P] Actualizar `CLAUDE.md` (sección "Modelo de pedidos" o una nueva viñeta en "Checkout y flujos de venta"):
  - los pedidos se editan desde `/admin/add-transaction?editar=<id>` (`editarPedidoEnTx` en `lib/admin/order-edit.ts`), con el inventario por diferencia, la huella `versionPedido` y el evento en el historial;
  - los pagados exigen confirmar la diferencia y ajustan los puntos;
  - la eliminación es definitiva solo sin cobros, puntos, saldo, notas ni reseñas;
  - `recalcularTotalPedido` es la regla única del total de un pedido existente (incluye el delivery);
  - el alta de clientes se puede hacer desde la venta.

  Reflejar lo mismo en `docs/descripcion-tecnica.md`.
- [X] T035 Revisar el diff completo (`git diff main`) en busca de cambios fuera de alcance, código muerto, secretos, usos de `alert()` o de `toISOString().slice(0, 16)` para fechas de formulario, e imports con `@/` dentro de `lib/admin/order-edit*.ts`.
- [X] T036 Ejecutar `npm.cmd run lint`, `npm.cmd run test:admin`, `npm.cmd run test:checkout` y `npm.cmd run build`. Si hay una base aislada disponible, ejecutar también la integración con `$env:RUN_ADMIN_INTEGRATION = "1"`. Declarar cualquier verificación omitida.
- [ ] T037 Ejecutar a mano [quickstart.md](./quickstart.md) completo: las historias 1 a 4, las fechas en hora de Caracas y el teléfono a 390 px. Marcar en la spec cualquier desviación.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. T004 depende de T002 y T007 de T005. **Bloquea US3 y US4**; US1 y US2 solo necesitan T004 (fecha del formulario) para no chocar en `manualSaleForm.tsx`.
- **US1 (Phase 3)**: tras Foundational.
- **US2 (Phase 4)**: tras US1, porque el botón de alta vive en `ClientSearch`.
- **US3 (Phase 5)**: tras Foundational y US1.
- **US4 (Phase 6)**: tras Foundational. Es independiente de US1 a US3, salvo por compartir `salesTable.tsx` con T024.
- **Polish (Phase 7)**: tras las historias que se entreguen.

### Within Each User Story

- Las pruebas (T009, T017, T018, T026, T027) se escriben primero y fallan hasta implementar la regla.
- El orden es: reglas puras → transacción (`lib/admin/order-edit.ts`) → acción (`lib/actions/*`) → página → componentes.
- Archivos compartidos que obligan a trabajar en secuencia:
  - `manualSaleForm.tsx`: T004 → T013 → T016 → T023;
  - `salesTable.tsx`: T024 → T033;
  - `order-edit-rules.ts`: T019 → T028;
  - `order-edit.ts`: T020 → T029;
  - `admin-sales.ts`: T004 → T007 → T021.

### Parallel Opportunities

- **Foundational**: T002, T005 y T008 en paralelo; luego T003, T006 y T007.
- **US1**: T009 y T010 en paralelo.
- **US2**: T014 y T015 en paralelo.
- **US3**: T017 y T018 en paralelo antes de T019. T025 en paralelo con T023 y T024.
- **US4**: T026, T027 y T032 en paralelo. US4 puede avanzar en paralelo con US2 y US3 si no se toca `salesTable.tsx` a la vez.

---

## Parallel Example: User Story 3

```text
Task: "T017 [P] [US3] Crear tests/admin/order-edit-rules.test.ts con los casos del contrato"
Task: "T018 [P] [US3] Crear tests/admin/order-edit.integration.test.ts con skip: !integrationEnabled"
# Luego, tras T022:
Task: "T025 [P] [US3] Botón Editar en app/admin/transactions/[id]/page.tsx"
```

## Parallel Example: User Story 4

```text
Task: "T026 [P] [US4] Casos de motivoNoEliminable en tests/admin/order-edit-rules.test.ts"
Task: "T027 [P] [US4] Casos de eliminarPedidoEnTx en tests/admin/order-edit.integration.test.ts"
Task: "T032 [P] [US4] Crear components/admin/ventas/deleteOrderDialog.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) y, de la fase 2, T002 a T004: la fecha de Caracas en las ventas nuevas.
2. Phase 3 (US1): el buscador de clientes.
3. **Validar**: Historia 1 y fechas del quickstart. Ya se puede entregar: es el arreglo más visible del formulario.

### Incremental Delivery

1. Completar Foundational (T005 a T008), que además corrige el delivery perdido en los editores existentes.
2. US1 → US2: el formulario de venta queda "arreglado" (buscador y alta de clientes).
3. US3: editar pedidos. Validar con integración y quickstart antes de entregar, porque toca inventario y puntos.
4. US4: eliminar pedidos.
5. Polish: documentación, verificación completa y quickstart.

Cada incremento deja `lint`, `test:admin` y `build` en verde.

---

## Notes

- No hay migraciones: si una tarea parece requerir un cambio de `prisma/schema.prisma`, detenerse y revisar [research.md](./research.md), porque el diseño lo evita a propósito.
- Las fechas del editor masivo (`guardarEdicionMasivaVentas`) siguen con `z.coerce.date()`: quedan fuera de alcance (research.md, Decisión 9) como trabajo de adopción de la constitución.
- Commit por historia completada, con mensajes en español al estilo del repo (`feat(ventas): …`).
