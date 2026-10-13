---

description: "Tareas de implementación del panel administrativo integral"
---

# Tasks: Panel administrativo integral

**Input**: Design documents from `/specs/002-panel-administrativo-integral/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/admin-panel.md](./contracts/admin-panel.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen pruebas de dominio e integración porque la feature modifica importes, descuentos, inventario, estados y documentos administrativos. Las pruebas deben ejecutarse contra una base local aislada y no contra producción.

**Organization**: Las tareas están agrupadas por historia de usuario para permitir implementación y validación incremental.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar las dependencias y carpetas compartidas sin cambiar todavía el flujo de negocio.

- [X] T001 Add `pdf-lib` and the `test:admin` command to `package.json` and update `package-lock.json` without modifying authentication or environment secrets.
- [X] T002 [P] Create the feature directories `components/admin/dashboard/`, `components/admin/ventas/`, `components/admin/analiticas/`, `components/admin/notas-entrega/`, `lib/admin/`, and `tests/admin/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Completar la base de datos, autorización y reglas puras que necesitan todas las historias.

**⚠️ CRITICAL**: No iniciar tareas de historias de usuario hasta completar esta fase.

- [X] T003 Extend `prisma/schema.prisma` with discount fields, the `por_cobrar` and `en_pedido` states, `EstadoTransaccionHistorial`, `NotaEntrega`, `DetalleNotaEntrega`, relations and indexes described in `data-model.md`; preserve `pendiente`, `pagado` and `cancelado` for historical compatibility.
- [X] T004 Create the additive migration `prisma/migrations/20261013000000_admin_panel/migration.sql` to add enums, fields, tables and indexes, backfill `montoSubtotal = montoTotal` and `montoDescuento = 0`, and avoid destructive rewrites of historical states.
- [X] T005 [P] Implement server-side administrator authorization in `lib/admin/auth.ts` by reusing Stack Auth and `ALLOWED_EMAILS`, with clear unauthorized behavior for pages, Server Actions and the PDF route.
- [X] T006 [P] Implement pure money and discount rules in `lib/admin/sales-calculations.ts`, including USD canonical totals, percentage discounts, USD discounts with transaction-rate conversion, two-decimal rounding and the non-negative-total invariant.
- [X] T007 [P] Implement state labels, legacy mappings and selectable-state guards in `lib/admin/status.ts` for `por_cobrar`, `en_pedido`, `pagado`, legacy `pendiente` and historical `cancelado`.
- [X] T008 [P] Update `lib/prisma.ts` and the feature-touched administrative reads to use the shared Prisma instance instead of creating duplicate clients, without changing unrelated public routes.
- [X] T009 [P] Add isolated local fixtures and test helpers in `tests/admin/fixtures.ts` for products, stock, detal/mayorista clients, active transactions, legacy states and canceled transactions; do not reference `.env` values or production data.
- [X] T010 Define shared administrative input/result types in `lib/admin/types.ts` and align them with `contracts/admin-panel.md`, including validation errors, money fields, operational states and paginated rows.

**Checkpoint**: The schema, migration, authorization, shared calculations and fixtures are ready; each user story can now be implemented and tested incrementally.

---

## Phase 3: User Story 1 - Operar desde un panel administrativo unificado (Priority: P1) 🎯 MVP

**Goal**: Dar al administrador una navegación coherente, protegida, responsive y con un dashboard operativo sin perder las rutas actuales.

**Independent Test**: Iniciar sesión con un administrador autorizado, abrir `/admin`, recorrer ventas/pedidos, inventario, analíticas y notas de entrega desde escritorio y 360 px, y comprobar que las gestiones existentes siguen accesibles.

### Implementation for User Story 1

- [X] T011 [P] [US1] Redesign the navigation and responsive menu in `components/admin/sidebar.tsx` with `/admin`, `/admin/transactions`, `/admin/inventory`, `/admin/analytics` and `/admin/delivery-notes`, using Spanish labels and active states.
- [X] T012 [P] [US1] Redesign the route-aware header, search placeholder, primary action and mobile controls in `components/admin/header.tsx` without exposing administrative data in the public layout.
- [X] T013 [US1] Integrate `requireAdmin` and the responsive shell in `app/admin/layout.tsx`, preserving the existing protected behavior, notification provider and scroll boundaries.
- [X] T014 [US1] Implement dashboard summary queries in `lib/admin/dashboard.ts` for current sales, open operational states, inventory alerts and quick-action counts using server-side aggregation and pagination-safe queries.
- [X] T015 [US1] Create the dashboard page in `app/admin/page.tsx` and reusable KPI/access components in `components/admin/dashboard/`, with useful empty and loading states in Spanish.
- [X] T016 [US1] Preserve and adapt current administrative navigation and states in `app/admin/inventory/page.tsx`, `app/admin/products/page.tsx`, `components/admin/UI/inventoryHeader.tsx` and related existing UI so product and inventory management remain reachable after the redesign.

**Checkpoint**: US1 is independently usable as the protected administrative shell and dashboard; existing product and inventory workflows remain reachable.

---

## Phase 4: User Story 2 - Consultar y registrar ventas en una vista operativa (Priority: P1)

**Goal**: Convertir transacciones y ventas manuales en una hoja operativa filtrable con persistencia atómica.

**Independent Test**: Filtrar una venta existente, crear una venta manual con dos productos en stock, confirmar su fila, detalle, total y actualización completa del inventario, y repetir un fallo de stock sin persistencia parcial.

### Tests for User Story 2

> Escribir primero las pruebas de reglas; deben fallar antes de implementar el comportamiento nuevo.

- [X] T017 [P] [US2] Add money, line-item and atomic-sale unit cases in `tests/admin/sales-calculations.test.ts` for positive quantities, two-decimal totals, empty lines, invalid prices and stock failure behavior.

### Implementation for User Story 2

- [X] T018 [US2] Implement `registrarVentaManual` in `lib/actions/admin-sales.ts` using Zod validation, `requireAdmin`, `prisma.$transaction`, conditional stock checks, `Transaccion`, `DetalleCompra`, optional `Pago` and the initial state history.
- [X] T019 [P] [US2] Build the manual sale line editor and client/product selectors in `components/admin/ventas/manualSaleForm.tsx`, including pre-save summary, validation messages and mobile-friendly row editing.
- [X] T020 [P] [US2] Build the spreadsheet-style rows and responsive fallback in `components/admin/ventas/salesTable.tsx`, showing order, date, client, subtotal, discount, total, currency, state and actions.
- [X] T021 [P] [US2] Build date, client, order and state filters with pagination controls in `components/admin/ventas/salesFilters.tsx`, keeping filter state in the URL or server query contract.
- [X] T022 [US2] Replace the incomplete form in `app/admin/add-transaction/page.tsx` with the manual sale flow from `manualSaleForm.tsx`, preserving the existing route and returning structured errors.
- [X] T023 [US2] Implement paginated server-side loading and filtering in `app/admin/transactions/page.tsx`, using `salesTable.tsx`, `salesFilters.tsx`, shared status labels and real result counts instead of placeholders.
- [X] T024 [US2] Update `app/admin/transactions/[id]/page.tsx` to show the persisted client, lines, subtotal, discount, total, payment context, stock-safe order details and actions without unsafe array assumptions for missing payments.
- [X] T025 [US2] Add the manual-sale integration coverage in `tests/admin/admin-sales.integration.test.ts` using the isolated fixtures and verifying all-or-nothing writes for transaction, details, payment and inventory.

**Checkpoint**: US2 is independently testable as a complete sales register and manual-sale flow.

---

## Phase 5: User Story 3 - Aplicar descuentos controlados a una venta (Priority: P1)

**Goal**: Permitir descuentos por porcentaje o USD con cálculo único, visible y auditable.

**Independent Test**: Aplicar un descuento porcentual en una venta y un descuento USD en otra, comprobar subtotal/descuento/total en tabla y detalle, y verificar que valores inválidos no se guardan.

### Tests for User Story 3

- [X] T026 [P] [US3] Add percentage, USD, exchange-rate, zero, over-subtotal and negative cases in `tests/admin/discounts.test.ts`, covering the exact invariants from `data-model.md`.

### Implementation for User Story 3

- [X] T027 [P] [US3] Build the discount selector and fields in `components/admin/ventas/discountEditor.tsx`, showing one active type, raw value, converted amount and total preview in Spanish.
- [X] T028 [US3] Extend `lib/actions/admin-sales.ts` with validated discount persistence/editing, recalculation through `sales-calculations.ts`, and rejection of a discount that exceeds the comparable subtotal.
- [X] T029 [US3] Integrate `discountEditor.tsx` and the subtotal/discount/total breakdown into `app/admin/transactions/[id]/page.tsx`, preserving the existing order and payment context.
- [X] T030 [US3] Add discount columns, labels and filter-compatible values to `components/admin/ventas/salesTable.tsx` and `app/admin/transactions/page.tsx`, ensuring USD/Bs display uses the stored transaction rate.

**Checkpoint**: US3 is independently testable on an existing or newly created sale without changing the public checkout.

---

## Phase 6: User Story 4 - Monitorear y actualizar el estado de los pedidos (Priority: P1)

**Goal**: Mostrar estados operativos claros, permitir cambios autorizados y conservar un historial append-only.

**Independent Test**: Cambiar una venta entre “Por cobrar”, “En pedido” y “Pagado”, comprobar el reflejo en lista/detalle y validar actor, fecha y estado anterior/nuevo en el historial.

### Tests for User Story 4

- [X] T031 [P] [US4] Add state mapping, valid-transition, paid-confirmation and legacy-state cases in `tests/admin/order-status.test.ts`.

### Implementation for User Story 4

- [X] T032 [US4] Implement `actualizarEstadoPedido` in `lib/actions/order-status.ts` with `requireAdmin`, payment confirmation rules, append-only history and revalidation of list/detail paths.
- [X] T033 [P] [US4] Build the state selector and confirmation UI in `components/admin/ventas/orderStatusControl.tsx`, including an explicit confirmation for `Pagado` and correction of an already-paid operation.
- [X] T034 [P] [US4] Build the audit timeline in `components/admin/ventas/statusHistory.tsx`, showing old/new labels, timestamp, actor and optional reason without exposing unnecessary identity data.
- [X] T035 [US4] Integrate state filtering and labels in `app/admin/transactions/page.tsx` and state control/history in `app/admin/transactions/[id]/page.tsx`, keeping `pendiente` and `cancelado` historical records visible.
- [X] T036 [US4] Add state-change integration coverage in `tests/admin/order-status.integration.test.ts` for concurrent-safe persistence, history rows and paid confirmation in the isolated database.

**Checkpoint**: US4 is independently testable as order monitoring and status audit over the sales register.

---

## Phase 7: User Story 5 - Consultar analíticas y una predicción de ventas (Priority: P2)

**Goal**: Ofrecer totales semanales/mensuales, desglose por producto y un predictor explicable sin inventar datos.

**Independent Test**: Consultar una semana y un mes con fixture conocida, contrastar totales por producto, solicitar predicción con historia suficiente y comprobar “Datos insuficientes” sin historia.

### Tests for User Story 5

- [X] T037 [P] [US5] Add weekly/monthly moving-average, canceled-exclusion and insufficient-history cases in `tests/admin/forecast.test.ts`.

### Implementation for User Story 5

- [X] T038 [US5] Implement server-side aggregate queries in `lib/admin/analytics.ts` for date range, week/month granularity, product filter, non-canceled transactions and paginated product breakdowns.
- [X] T039 [US5] Implement the explainable forecast in `lib/admin/forecast.ts` using four completed weeks or three completed months, returning reference periods and `datos_insuficientes` when the minimum history is absent.
- [X] T040 [P] [US5] Build chart/table/KPI components in `components/admin/analiticas/analyticsDashboard.tsx` with accessible labels, Spanish empty states and no misleading chart when the period is empty.
- [X] T041 [US5] Create `app/admin/analytics/page.tsx` with server-side filters, weekly/monthly selection, product breakdown and predictor presentation using the contract in `contracts/admin-panel.md`.
- [X] T042 [US5] Add dashboard links or summary data in `app/admin/page.tsx` without duplicating analytics queries in the browser or changing public pages.
- [X] T043 [US5] Add aggregate and predictor integration coverage in `tests/admin/analytics.integration.test.ts` against known local fixture values and canceled records.

**Checkpoint**: US5 is independently testable over the persisted sales data without introducing an external analytics service.

---

## Phase 8: User Story 6 - Generar notas de entrega para mayoristas (Priority: P2)

**Goal**: Crear, consultar y descargar notas de entrega atractivas para clientes mayoristas sin tocar inventario ni pagos.

**Independent Test**: Crear una nota con cliente mayorista y líneas, bloquear un cliente detal, descargar el PDF y comprobar datos, saltos de página y ausencia de efectos sobre inventario/pago.

### Tests for User Story 6

- [X] T044 [P] [US6] Add mayorista-only, required-line, snapshot and no-inventory-mutation cases in `tests/admin/delivery-notes.test.ts`.

### Implementation for User Story 6

- [X] T045 [US6] Implement `crearNotaEntrega` and note queries in `lib/actions/delivery-notes.ts` with `requireAdmin`, Zod validation, mayorista guard, snapshots and no inventory/payment mutation.
- [X] T046 [P] [US6] Build the simple note form in `components/admin/notas-entrega/deliveryNoteForm.tsx` for client, optional transaction, date, delivery data, observations and positive-quantity lines.
- [X] T047 [P] [US6] Build the branded review component in `components/admin/notas-entrega/deliveryNotePreview.tsx`, including readable long names, totals available and reception area.
- [X] T048 [US6] Create list, new and detail routes in `app/admin/delivery-notes/page.tsx`, `app/admin/delivery-notes/new/page.tsx` and `app/admin/delivery-notes/[id]/page.tsx`, including re-download action and empty/error states.
- [X] T049 [US6] Implement the local PDF document builder in `lib/admin/delivery-note-pdf.ts` with logo/brand header, note number/date, wholesale client, lines, totals, observations, reception area and multi-page headers.
- [X] T050 [US6] Implement the protected download route in `app/admin/delivery-notes/[id]/pdf/route.ts` using `requireAdmin`, persisted snapshots and stable PDF filename/content headers.
- [X] T051 [US6] Add the authorized “Generar nota de entrega” entry point to `app/admin/transactions/[id]/page.tsx` only for wholesale clients, preserving the rule that note creation does not mark payment or change inventory.

**Checkpoint**: US6 is independently testable as a document workflow for wholesale clients.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cerrar documentación, accesibilidad, rendimiento, seguridad y evidencia de validación.

- [X] T052 [P] Update `README.md` and `docs/descripcion-tecnica.md` with the new admin routes, entities, local migration workflow, state compatibility and PDF behavior without documenting secrets.
- [X] T053 [P] Audit responsive layout, keyboard focus, labels, table alternatives and status contrast across `components/admin/`, `app/admin/analytics/page.tsx` and `app/admin/delivery-notes/` at 360 px and desktop widths.
- [ ] T054 Run every scenario in `specs/002-panel-administrativo-integral/quickstart.md` against an isolated PostgreSQL database and record counts, validation output and PDF evidence outside the repository.
- [X] T055 Review `prisma/schema.prisma`, `prisma/migrations/20261013000000_admin_panel/migration.sql`, `lib/actions/`, `app/admin/` and `components/admin/` for server-side authorization, partial-write risks, stale mock data, `console.log`, secrets and unnecessary remote integrations; resolve findings before delivery.
- [X] T056 Run `npm.cmd run test:admin`, `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npx.cmd prisma validate`, `npm.cmd run build` and `git diff --check`, then verify `git status --short` contains no `.env*`, credentials, dumps or generated artifacts.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No feature dependency; T001 and T002 can begin immediately.
- **Foundational (Phase 2)**: Depends on Setup. T003/T004 establish the schema; T005–T010 complete the shared authorization, calculations, status mapping, Prisma access and fixtures. This phase blocks all stories.
- **User Stories (Phase 3+)**: Begin after Foundational. US1 is the shared shell; US2 supplies the sales register; US3 and US4 extend that register; US5 consumes persisted sales; US6 can start after Foundation and integrates with the transaction detail after US2.
- **Polish (Phase 9)**: Depends on the desired user stories being complete and on the local migration being reproducible.

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2; no business story dependency.
- **US2 (P1)**: Depends on Phase 2 and uses the US1 shell when delivered together; it remains independently testable on its routes.
- **US3 (P1)**: Depends on US2 because discounts are applied to the persisted sale register and detail.
- **US4 (P1)**: Depends on US2 because status monitoring operates on the persisted transaction list/detail; its action and tests can be developed in parallel with US3 after the shared model is ready.
- **US5 (P2)**: Depends on US2 data and the status rules from US4 to exclude canceled records consistently.
- **US6 (P2)**: Depends on Phase 2 and can proceed in parallel with US3–US5; its transaction-detail entry point depends on US2's detail page.

### Within Each User Story

- Write and run the story-specific tests before implementation where listed.
- Implement pure/domain rules before Server Actions, then pages and UI integration.
- Keep each mutation guarded by `requireAdmin` and validate again on the server.
- Stop at each checkpoint and execute the independent test before starting the next dependent story.

## Parallel Opportunities

- After T003, T005, T006, T007, T008 and T009 touch different files and can be worked on in parallel; T004 waits for the schema shape.
- In US1, T011 and T012 can run in parallel before T013 integrates the shell.
- In US2, T019, T020 and T021 can run in parallel after the contract/types are agreed; T022–T024 integrate them sequentially.
- In US4, T033 and T034 can run in parallel after T032's action contract.
- In US5, T038 and T039 can run in parallel after the data model; T040 can proceed independently before T041 composes the page.
- In US6, T046, T047 and T049 can run in parallel after T045's input contract; T048 and T050 integrate the persisted data and PDF response.
- Different user stories can be assigned to different developers after Phase 2, subject to the dependencies above and avoiding simultaneous edits to the same route files.

## Parallel Example: User Story 2

```text
Task T019: Build manualSaleForm.tsx in components/admin/ventas/
Task T020: Build salesTable.tsx in components/admin/ventas/
Task T021: Build salesFilters.tsx in components/admin/ventas/
```

These tasks use the shared types and contract but touch different files. T022–T024
should integrate them only after T018's Server Action and T017's rules are available.

## Implementation Strategy

### MVP operativo

1. Complete Phase 1 and Phase 2.
2. Deliver US1 for the protected shell and dashboard.
3. Deliver US2 for the real sales register and manual sale.
4. Deliver US3 and US4 as the minimum operational slice for discounts and order monitoring.
5. Stop and validate the P1 flow end-to-end before adding P2 analytics and notes.

US1 alone is the visual shell MVP, but US1–US4 form the first business-usable MVP
because the requested operation depends on registering, discounting and monitoring
sales together.

### Incremental delivery

1. Foundation ready → validate migration and authorization locally.
2. US1 → validate navigation and existing admin regression.
3. US2 → validate manual sale, filters and atomic inventory.
4. US3 → validate discounts and monetary invariants.
5. US4 → validate states and audit history.
6. US5 → validate reports and forecast against known fixtures.
7. US6 → validate wholesale note, PDF and no side effects.
8. Polish → execute the complete quickstart and repository quality gates.

### Traceability

- US1 maps to FR-001–FR-003 and SC-001, SC-009, SC-010.
- US2 maps to FR-004–FR-008 and SC-001–SC-003.
- US3 maps to FR-006, FR-009–FR-010 and SC-004.
- US4 maps to FR-011–FR-012 and SC-005.
- US5 maps to FR-013–FR-014 and SC-006–SC-007.
- US6 maps to FR-015–FR-017 and SC-008.
- Cross-cutting FR-018–FR-020 is covered by T005, T053, T055 and T056.

## Notes

- `[P]` means the task touches different files and has no dependency on incomplete work in the same phase.
- `[US1]`–`[US6]` map directly to the user stories in `spec.md`.
- The migration path is intentionally additive; do not reset the database, delete historical transactions or use a real remote database for fixtures.
- No task changes the public catalog, `/venta-rapida`, WhatsApp coordination or payment gateways.
