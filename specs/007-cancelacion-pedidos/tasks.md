---

description: "Task list for order cancellation and inline state changes in the sales table"
---

# Tasks: Cancelación de pedidos y cambio de estado desde la tabla

**Input**: Design documents from `/specs/007-cancelacion-pedidos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/order-state.md](./contracts/order-state.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen porque la constitución (Principio V) exige pruebas para las reglas que tocan estados de pedido e inventario. Las reglas puras se prueban sin base de datos. La transacción real se prueba en una base aislada (`RUN_ADMIN_INTEGRATION=1` y `ADMIN_TEST_DATABASE_URL`). La interfaz se valida a mano con [quickstart.md](./quickstart.md).

**Organization**: Las tareas se agrupan por historia de usuario. US1 y US2 son P1; US2 reutiliza el control de estado creado en US1, igual que en la feature 006. US3 (P2) es sobre todo verificación, porque el filtro, el historial y la exclusión en analíticas ya existen.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario de la tarea (US1, US2, US3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fijar la línea base antes de tocar código. No hay dependencias ni migraciones nuevas.

- [X] T001 Ejecutar `npm.cmd run test:admin` y `npm.cmd run lint` y anotar los fallos preexistentes, para no confundirlos con regresiones. Confirmar en `prisma/schema.prisma` que `enum EstadoTransaccion` ya incluye `cancelado` y que `EstadoTransaccionHistorial` ya tiene `motivo String?`. No crear migraciones, no ejecutar `prisma migrate` y no añadir dependencias a `package.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Reglas puras de estado y el núcleo transaccional testeable que usan todas las historias.

**⚠️ CRITICAL**: No comenzar las historias de usuario hasta completar esta fase.

- [X] T002 [P] En `tests/admin/order-status.test.ts`, reemplazar el caso "solo ofrece estados activos" (que usa `canSelectOrderState`) y añadir casos que fallen hasta que exista T003:
  - `getNextOrderStates`: `"cancelado"` → `[]`; `"pagado"` → `["por_cobrar", "en_pedido", "pagado"]`; `"por_cobrar"`, `"en_pedido"` y `"pendiente"` → `["por_cobrar", "en_pedido", "pagado", "cancelado"]`.
  - `canCancelOrder`: `true` solo para `por_cobrar`, `en_pedido` y `pendiente`; `false` para `pagado` y `cancelado`.
  - `normalizeStateReason`: `"  Cliente desistió  "` → `"Cliente desistió"`; `"   "`, `""`, `undefined` y `null` → `null`.
  - `getRestockQuantities([{ productoId: 1, cantidad: 2 }, { productoId: 2, cantidad: 1 }, { productoId: 1, cantidad: 3 }, { productoId: 3, cantidad: 0 }])` → `[{ productoId: 1, cantidad: 5 }, { productoId: 2, cantidad: 1 }]`.
  - `requiresExplicitPaymentConfirmation("pendiente", "pagado", false)` → `true`.

  Importar desde `../../lib/admin/status.js`, como el resto del archivo.
- [X] T003 En `lib/admin/status.ts`, añadir:
  - `getNextOrderStates(state: EstadoTransaccion): EstadoTransaccion[]`: `[]` si está cancelado; `por_cobrar, en_pedido, pagado` si está pagado; los cuatro en cualquier otro caso.
  - `canCancelOrder(state)`: `true` solo para `por_cobrar`, `en_pedido` y `pendiente`.
  - `normalizeStateReason(value?: string | null): string | null`: texto recortado, o `null` si queda vacío.
  - `getRestockQuantities(lines: Array<{ productoId: number; cantidad: number }>)`: una entrada por producto con la suma de sus cantidades; ignora las cantidades que no sean positivas. Conservar el orden de primera aparición.

  Ampliar `requiresExplicitPaymentConfirmation` para que `pendiente` cuente como `por_cobrar`. Eliminar `canSelectOrderState`, que solo usa el test. No importar nada nuevo salvo tipos de `@prisma/client`.
- [X] T004 Crear `lib/admin/order-state-change.ts` con `aplicarCambioEstadoPedido(tx: Prisma.TransactionClient, input, actor: { id: string; email: string | null })`, moviendo el cuerpo transaccional actual de `actualizarEstadoPedido` (`lib/actions/admin-orders.ts`), con la firma de `contracts/order-state.md` §2 y el campo `numeroOrden` en el resultado. Reglas:
  - Sin `import "server-only"`, sin `@/` y sin importar `prisma`. Importar las reglas con `./status.ts` (extensión explícita, como `website-visits-core.ts`).
  - Leer el pedido con `pagos` y con `detalles: { select: { productoId: true, cantidad: true } }`.
  - Conservar los errores actuales, pero con el mensaje `El pedido ya está cancelado y no admite cambios.` para pedidos cancelados.
  - Conservar el no-op cuando el estado no cambia y no hay pago.
  - Sustituir `transaccion.update` por `updateMany({ where: { id, estado: <estado leído> }, data: { estado } })`. Si `count !== 1`, lanzar `El pedido cambió mientras lo editabas. Revisa su estado actual.`
  - Guardar en el historial `estadoAnterior` = estado leído y `motivo: normalizeStateReason(input.motivo)`.
- [X] T005 Refactorizar `actualizarEstadoPedido` en `lib/actions/admin-orders.ts`:
  - Mantener `requireAdmin()`, el `stateSchema` de Zod (`motivo` sigue en `z.string().trim().max(240).optional()`) y el parseo de `pago`.
  - Ejecutar `prisma.$transaction((tx) => aplicarCambioEstadoPedido(tx, input, actor))`.
  - Conservar la forma del resultado (`{ success: true, transactionId, estadoAnterior, estadoNuevo, changedAt, message }` / `{ success: false, message }`), las revalidaciones actuales y el `catch` con `No se pudo actualizar el estado.`

  Comprobar que `lib/actions/order-status.ts` sigue reexportando sin cambios.
- [X] T006 En `tests/admin/order-status.integration.test.ts`, reemplazar la prueba que replica la transacción en línea por pruebas que llamen a `aplicarCambioEstadoPedido` (importado desde `../../lib/admin/order-state-change.js`) dentro de `prisma.$transaction` del cliente aislado `createIntegrationClient()`. Casos:
  - `por_cobrar` → `en_pedido` deja una entrada de historial con `estadoAnterior: "por_cobrar"`, el `actorId` usado y `motivo: null`.
  - `en_pedido` → `pagado` sin `confirmacionPago` lanza `Confirma explícitamente el cobro antes de marcar la venta como pagada.`
  - `pendiente` → `pagado` sin confirmación también lanza.
  - El mismo estado sin pago no crea historial.

  Mantener `{ skip: !integrationEnabled }` y la limpieza en `finally`.

**Checkpoint**: Las reglas puras pasan, la acción funciona igual que antes sobre el núcleo extraído y la escritura condicionada está activa. Todavía no se puede cancelar.

---

## Phase 3: User Story 1 - Cancelar un pedido indicando la razón (Priority: P1) 🎯 MVP

**Goal**: Cancelar pedidos no cobrados desde el detalle del pedido, con una razón opcional en una modal, devolviendo el inventario y dejando el cambio en el historial.

**Independent Test**: En `/admin/transactions/{id}` de un pedido "Por cobrar" con dos líneas, elegir "Cancelado", confirmar con o sin razón y comprobar el estado "Cancelado" sin control para cambiarlo, la razón en el historial y el inventario de cada producto aumentado en su cantidad exacta (quickstart, escenarios 3 a 6).

### Tests for User Story 1

- [X] T007 [US1] En `tests/admin/order-status.integration.test.ts`, añadir pruebas de cancelación con `aplicarCambioEstadoPedido`. Preparar dos productos con inventario conocido y un pedido `por_cobrar` con dos `DetalleCompra` (cantidades 2 y 3) y un `Pago`. Casos:
  - Cancelar con `motivo: "   "` deja el estado en `cancelado`, aumenta el inventario exactamente en 2 y en 3, crea el historial con `estadoAnterior: "por_cobrar"`, `estadoNuevo: "cancelado"` y `motivo: null`, y conserva las líneas y el pago.
  - Una segunda cancelación lanza `El pedido ya está cancelado y no admite cambios.` y el inventario no cambia.
  - Dos cancelaciones concurrentes del mismo pedido (`Promise.allSettled` con dos `prisma.$transaction`) dejan exactamente una cumplida y el inventario devuelto una sola vez.
  - Cancelar un pedido `pagado` lanza `Solo se pueden cancelar pedidos por cobrar o en pedido.`
  - Cancelar con `pago` lanza `No se puede registrar un pago al cancelar un pedido.`

  Limpiar productos, pagos, líneas, historial, pedidos y cliente en `finally`.

### Implementation for User Story 1

- [X] T008 [US1] Implementar la rama de cancelación en `aplicarCambioEstadoPedido` (`lib/admin/order-state-change.ts`):
  - Aceptar `estadoNuevo: "cancelado"`.
  - Si `!canCancelOrder(estadoLeido)`, lanzar `Solo se pueden cancelar pedidos por cobrar o en pedido.`
  - Si llega `pago`, lanzar `No se puede registrar un pago al cancelar un pedido.`
  - Tras el `updateMany` condicionado, por cada entrada de `getRestockQuantities(transaction.detalles)`, ejecutar `tx.producto.update({ where: { id: productoId }, data: { inventario: { increment: cantidad } } })`.
  - Insertar el historial con la razón normalizada. Todo dentro de la misma `tx`; no crear `Pago` ni tocar `Fidelidad`, `NotaEntrega`, montos ni líneas.
- [X] T009 [US1] En `lib/actions/admin-orders.ts`:
  - Ampliar `estadoNuevo` del `stateSchema` a `z.enum(["por_cobrar", "en_pedido", "pagado", "cancelado"])`.
  - Si el resultado es `cancelado`, devolver `message: "Pedido {numeroOrden} cancelado. El inventario se actualizó."` (con el `numeroOrden` que devuelve el núcleo) y añadir `revalidatePath("/admin/inventory")`.
  - Mantener `Estado actualizado correctamente.` para los demás cambios.

  Depende de T008.
- [X] T010 [P] [US1] En `guardarEdicionMasivaVentas` (`lib/actions/admin-sales.ts`), junto a la comprobación actual de cancelados, añadir: si `row.estado === "cancelado" && transaction.estado !== "cancelado"`, lanzar `Cancela {row.numeroOrden} desde la tabla o el detalle para registrar la razón y devolver el inventario.` No cambiar `bulkExistingRowSchema`.
- [X] T011 [P] [US1] En `components/admin/ventas/bulkSalesEditor.tsx`, ampliar el aviso "Las filas nuevas descuentan inventario al guardar. Las órdenes canceladas conservan su estado y no se pueden reabrir desde esta vista." añadiendo al final "Para cancelar un pedido usa el control de estado de la tabla." No cambiar las opciones del selector de estado.
- [X] T012 [P] [US1] Crear `components/admin/ventas/orderStateSelect.tsx` (`"use client"`) con `export function OrderStateSelect({ transactionId, numeroOrden, cliente, totalUsd, estado, tienePagos }: { transactionId: number; numeroOrden: string; cliente: string; totalUsd: number; estado: EstadoTransaccion; tienePagos: boolean })`:
  - Si `getNextOrderStates(estado)` está vacío, renderizar `StatusBadge`, con la misma implementación que hoy hay en `components/admin/ventas/salesTable.tsx`: `bg-[#e8eee5] text-[#55704d]` para pagado, `bg-[#f8e8e3] text-[#a84f3b]` para cancelado y `bg-[#f5eddc] text-[#8c6a2c]` para el resto.
  - En otro caso, renderizar un `<select>` con esas opciones, etiquetadas con `getOrderStateLabel`. Su valor es `normalizeLegacyState` del estado optimista (`useOptimistic(estado)`); lleva `aria-label="Estado de la orden {numeroOrden}"`, la clase `admin-field` más el tono del estado, y `disabled` mientras `useTransition` esté pendiente.
  - `onChange`:
    - `por_cobrar`/`en_pedido`, o cualquier salida de `pagado`: enviar de inmediato.
    - `pagado` desde otro estado: abrir la modal de cobro (T014).
    - `cancelado`: abrir la modal de cancelación (T013).
  - Envío: construir `FormData` con `transaccionId`, `estadoNuevo`, `motivo` opcional y `confirmacionPago`. Dentro de `startTransition`, aplicar el estado optimista, `await actualizarEstadoPedido(formData)`, `toast.success(result.message)` o `toast.error(result.message)` y `router.refresh()`.
- [X] T013 [US1] En `components/admin/ventas/orderStateSelect.tsx`, implementar la modal de cancelación siguiendo el patrón de `components/admin/clientes/clientCreateModal.tsx`:
  - Estructura: overlay `fixed inset-0 z-50 grid place-items-center bg-[#18211d]/55 p-4` y sección con `role="dialog"`, `aria-modal="true"` y `aria-labelledby`.
  - Cierre sin enviar: Escape (listener de `keydown`), `onMouseDown` sobre el overlay y botón `Volver` (`admin-button-secondary`).
  - Título: `Cancelar pedido {numeroOrden}`.
  - Texto: `{cliente}. El pedido dejará de contar como venta y sus productos volverán al inventario. Esta acción no se puede deshacer.`
  - Solo si `tienePagos`: `Este pedido tiene pagos registrados. Se conservarán; la devolución del dinero se gestiona fuera del sistema.`
  - Campo: `Razón de la cancelación (opcional)`, textarea con `maxLength={240}`, `autoFocus` y el texto `Quedan {240 - longitud} caracteres`.
  - Botón de confirmar: `Confirmar cancelación`, con `admin-button-primary` y fondo de peligro `#b85f49` (`--admin-danger`); muestra `Cancelando...` mientras guarda.
  - Al confirmar, enviar `estadoNuevo: "cancelado"` y `motivo` con el texto escrito.

  No usar ningún botón llamado "Cancelar" dentro de la modal. Al cerrarla sin confirmar, el `<select>` vuelve a mostrar el estado guardado.
- [X] T014 [US1] En `components/admin/ventas/orderStateSelect.tsx`, reutilizar la misma estructura de modal de T013 para la confirmación de cobro:
  - Título: `Confirmar cobro`.
  - Texto: `¿Recibiste el pago de {numeroOrden} por ${totalUsd.toFixed(2)}?`
  - Campo: `Nota del cobro (opcional)`, textarea con `maxLength={240}` y placeholder `Ej. Cliente confirmó la transferencia`.
  - Botones: `Volver` y `Marcar como pagado` (`admin-button-primary admin-button-brass`).
  - Al confirmar, enviar `estadoNuevo: "pagado"`, `confirmacionPago: "true"` y `motivo` con la nota.
- [X] T015 [US1] En `app/admin/transactions/[id]/page.tsx`, reemplazar `<OrderStatusForm transactionId={transaction.id} currentState={transaction.estado} />`, dentro del panel "Seguimiento", por `<OrderStateSelect transactionId={transaction.id} numeroOrden={transaction.numeroOrden} cliente={`${transaction.cliente.nombre} ${transaction.cliente.apellido}`} totalUsd={transaction.montoTotal} estado={transaction.estado} tienePagos={transaction.pagos.length > 0} />` y actualizar el import. Conservar la insignia de estado de la cabecera y el botón "Generar nota".
- [X] T016 [US1] Eliminar `components/admin/ventas/orderStatusForm.tsx` y `components/admin/ventas/orderStatusControl.tsx`, y confirmar con una búsqueda de `OrderStatusForm` y `OrderStatusControl` en `app/`, `components/` y `lib/` que no queda ninguna referencia.
- [ ] T017 [US1] Validar a mano desde el detalle del pedido los escenarios 3, 4, 5, 6 y 9 de `specs/007-cancelacion-pedidos/quickstart.md`, anotando el inventario antes y después de cancelar.

**Checkpoint**: US1 funciona por sí sola. Se cancela desde el detalle con una razón opcional, el inventario se devuelve una sola vez, los pedidos pagados no se cancelan y el editor masivo no puede cancelar.

---

## Phase 4: User Story 2 - Cambiar el estado de un pedido desde la tabla (Priority: P1)

**Goal**: Cambiar el estado de cada pedido desde su fila o su tarjeta móvil en "Ventas y pedidos", sin abrir el editor masivo ni el detalle.

**Independent Test**: En `/admin/transactions`, en modo normal, pasar un pedido de "Por cobrar" a "En pedido" desde su fila, ver la notificación de éxito y el cambio en el historial, confirmar el cobro y cancelar otro pedido desde la tabla (quickstart, escenarios 1, 2, 7 y 8).

### Implementation for User Story 2

- [X] T018 [US2] En `components/admin/ventas/salesTable.tsx`, reemplazar `<StatusBadge state={row.estado} />` por `<OrderStateSelect transactionId={row.id} numeroOrden={row.numeroOrden} cliente={row.cliente} totalUsd={row.totalUsd} estado={row.estado} tienePagos={row.pagos.length > 0} />` en dos lugares: la celda "Estado" de `SalesTableRow` y la cabecera de `SalesCard`. En la tarjeta, mantener el enlace a la orden a la izquierda y comprobar que el control no desborda a ≈ 390 px. Depende de T012–T014.
- [X] T019 [US2] En `components/admin/ventas/salesTable.tsx`, eliminar la función `StatusBadge` (ahora vive en `orderStateSelect.tsx`) y el import `getOrderStateLabel` si queda sin uso. Confirmar que con `editing === true` se sigue renderizando solo `BulkSalesEditor`, sin controles por fila.
- [ ] T020 [US2] Validar a mano desde la tabla, en escritorio y con un viewport de ≈ 390 px, los escenarios 1, 2, 7 y 8 de `specs/007-cancelacion-pedidos/quickstart.md`, más una cancelación desde la tabla (escenario 3). Comprobar que tras cada éxito o error la fila muestra el estado guardado.

**Checkpoint**: US1 y US2 funcionan; el seguimiento diario se hace desde la tabla.

---

## Phase 5: User Story 3 - Consultar los pedidos cancelados y su razón (Priority: P2)

**Goal**: Identificar los pedidos cancelados, leer su razón y confirmar que no cuentan como ventas.

**Independent Test**: Con un pedido cancelado con razón, filtrar por "Cancelado", abrir el detalle y leer la razón en el historial, y comprobar que las ventas del periodo bajan en lo que sumaba (quickstart, escenario 10).

### Implementation for User Story 3

- [X] T021 [P] [US3] Verificar, sin cambios previstos:
  - que `components/admin/ventas/salesFilters.tsx` ofrece `<option value="cancelado">Cancelado</option>` y que `lib/admin/sales-query.ts` filtra por ese estado;
  - que `components/admin/ventas/statusHistory.tsx` muestra `event.motivo` cuando existe.

  Corregir solo lo que no cumpla FR-021 y FR-022.
- [X] T022 [P] [US3] Verificar, sin cambios previstos, que `lib/admin/dashboard.ts` (`estado: { not: "cancelado" }`) y `lib/admin/analytics.ts` (líneas actuales e históricas con `estado: { not: "cancelado" }`) excluyen los cancelados. Validar a mano el escenario 10 de `specs/007-cancelacion-pedidos/quickstart.md`.

**Checkpoint**: Las tres historias funcionan y son verificables por separado.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentación coherente con la constitución y verificaciones de entrega.

- [X] T023 [P] En `CLAUDE.md`, sección "Modelo de pedidos", cambiar "Estados operativos: `por_cobrar`, `en_pedido`, `pagado`; `pendiente` (se muestra como "Por cobrar") y `cancelado` se conservan solo por compatibilidad histórica." por una redacción con estados operativos `por_cobrar`, `en_pedido`, `pagado` y `cancelado`. Debe decir que `cancelado` es final, solo se aplica a pedidos no cobrados, devuelve el inventario en la misma transacción y no se ofrece en el editor masivo, y que `pendiente` se conserva por compatibilidad histórica.
- [X] T024 [P] En `docs/descripcion-tecnica.md`, actualizar el párrafo de estados ("…`cancelado` no se ofrece como estado nuevo…") con la misma regla que T023 y mencionar la razón opcional de cancelación en `EstadoTransaccionHistorial.motivo`.
- [X] T025 [P] En `DESIGN.md`, actualizar la línea de estados de pedido ("`pendiente`/`cancelado` solo histórico") para que `cancelado` sea un estado operativo, manteniendo `--admin-danger` como su color.
- [ ] T026 Ejecutar `npm.cmd run test:admin`; `$env:RUN_ADMIN_INTEGRATION = "1"; npm.cmd run test:admin` con `ADMIN_TEST_DATABASE_URL` apuntando a una base aislada (nunca datos reales); `npm.cmd run lint`; y `npm.cmd run build`. Comparar con la línea base de T001 y declarar en la entrega cualquier verificación omitida.
- [X] T027 Revisar el diff completo:
  - sin secretos;
  - sin cambios fuera de alcance (tienda, venta rápida, cotización rápida y checkout intactos);
  - sin código muerto (`canSelectOrderState`, `OrderStatusForm`, `OrderStatusControl` y el `StatusBadge` de `salesTable.tsx` eliminados);
  - sin cambios en `prisma/schema.prisma`;
  - todas las notificaciones nuevas con `toast` de `sonner`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de T001 y bloquea todas las historias. Orden: T002 ∥ T003 → T004 → T005 → T006.
- **US1 (Phase 3)**: depende de la Fase 2.
- **US2 (Phase 4)**: depende de la Fase 2 y del control creado en US1 (T012–T014).
- **US3 (Phase 5)**: depende de que exista al menos una cancelación real (US1); puede hacerse en paralelo con US2.
- **Polish (Phase 6)**: después de las historias deseadas; T026 y T027 al final.

### Within Each User Story

- **US1**: T007 (pruebas) antes de T008. T008 → T009. T010, T011 y T012 en paralelo entre sí y con T007/T008. T012 → T013 → T014 (mismo archivo). T014 → T015 → T016 → T017.
- **US2**: T018 → T019 → T020 (mismo archivo; validación al final).
- **US3**: T021 ∥ T022.

### Parallel Opportunities

- T002 (tests) ∥ T003 (reglas): archivos distintos.
- En US1, T010 (`admin-sales.ts`), T011 (`bulkSalesEditor.tsx`) y T012 (`orderStateSelect.tsx`) en paralelo con la rama de cancelación T007–T009.
- US2 y US3 en paralelo una vez terminado US1.
- T023, T024 y T025 (documentación) en paralelo.

---

## Parallel Example: User Story 1

```text
# Tras completar la Fase 2, lanzar juntos:
Task: "T007 Pruebas de integración de cancelación en tests/admin/order-status.integration.test.ts"
Task: "T010 Guarda de cancelación del editor masivo en lib/actions/admin-sales.ts"
Task: "T011 Aviso del editor masivo en components/admin/ventas/bulkSalesEditor.tsx"
Task: "T012 Control OrderStateSelect en components/admin/ventas/orderStateSelect.tsx"

# Luego, en secuencia:
Task: "T008 Rama de cancelación en lib/admin/order-state-change.ts"
Task: "T009 Zod y mensaje de cancelación en lib/actions/admin-orders.ts"
Task: "T013 → T014 Modales en orderStateSelect.tsx"
Task: "T015 → T016 → T017 Detalle del pedido, limpieza y validación"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1 (línea base) y Fase 2 (reglas y núcleo transaccional).
2. Fase 3: cancelación desde el detalle con la razón y la devolución de inventario.
3. **Detenerse y validar** con el quickstart (escenarios 3 a 6 y 9). Ya se pueden cancelar los pedidos anulados por los clientes.

### Incremental Delivery

1. Fundaciones → la acción funciona igual que antes, sobre el núcleo probado.
2. US1 → cancelación con razón e inventario (MVP).
3. US2 → el control en cada fila y tarjeta de la tabla.
4. US3 → verificación de filtro, historial y analíticas.
5. Polish → documentación y verificaciones de entrega.

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- No hay migraciones: `cancelado` y `motivo` ya existen en el esquema.
- La cancelación es definitiva; ningún camino reabre un pedido cancelado.
- Los motivos solo se piden al cancelar (razón) y al confirmar el cobro (nota); los cambios inmediatos se registran sin motivo.
- Hacer commit por tarea o por grupo lógico, solo si la persona usuaria lo pide.
