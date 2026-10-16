---

description: "Task list for quick quotation and WhatsApp image sharing"
---

# Tasks: Cotización rápida para compartir

**Input**: Design documents from `/specs/006-cotizacion-rapida/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/cotizacion-rapida.md](./contracts/cotizacion-rapida.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen pruebas puras porque la constitución y el plan exigen criterios verificables para cálculos, estado e integración de WhatsApp. La captura PNG, el selector nativo y el comportamiento móvil se validan adicionalmente en navegador real.

**Organization**: Las tareas están agrupadas por historia de usuario y ordenadas por dependencias. Todas las historias son P1; US2 depende de la selección funcional de US1 y US3 depende de la imagen generada por US2.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar la generación local del arte de cotización en PNG sin agregar servicios externos.

- [x] T001 Confirmar la generación local del PNG con APIs nativas del navegador; no agregar hosting de imágenes, API de WhatsApp, pagos, persistencia ni dependencias de captura DOM.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Crear las reglas, la lectura segura del catálogo y el comportamiento global que todas las historias necesitan.

**⚠️ CRITICAL**: No comenzar las historias de usuario hasta completar esta fase.

- [x] T002 [P] Add failing unit cases for quote line validation, totals, finite positive exchange rate, quantity limits, fingerprint changes and WhatsApp text in `tests/checkout/quick-quote.test.ts`, using no real database and no checkout writes.
- [x] T003 Implement the pure quote types and rules in `lib/cotizacion-rapida.ts`, including `ProductProjection`, `QuoteLine`, `QuoteRecipient` and `QuoteDraft`; enforce that lines require a positive integer quantity, quantity cannot exceed current inventory, the exchange rate must be finite and greater than zero for Bs totals, and subtotal/total values are calculated rather than accepted as independent input.
- [x] T004 Implement the read-only catalog revalidation action in `lib/actions/cotizacion-rapida.ts`, selecting only product id, name, category, detal price, inventory and image URL; return explicit price/availability changes and perform no writes to `Producto`, `Transaccion`, `DetalleCompra`, `Pago`, `Cliente`, `Direccion` or inventory.
- [x] T005 [P] Update `components/global/whatsappButtonWrapper.tsx` so the global floating WhatsApp action does not overlap the dedicated quotation actions on `/cotizacion-rapida`, while preserving its current behavior on all unrelated routes.

**Checkpoint**: The domain rules, catalog read path and shared WhatsApp layout behavior are ready; no database migration is required.

---

## Phase 3: User Story 1 - Armar una cotización rápidamente (Priority: P1) 🎯 MVP

**Goal**: Permitir seleccionar productos y cantidades en una página visualmente consistente con `/venta-rapida`, sin usar el checkout persistido.

**Independent Test**: Con productos de desarrollo disponibles, una operadora puede buscar, agregar, reducir y eliminar líneas, ver el resumen actualizado y vaciar la cotización sin navegar al checkout ni modificar la base de datos.

### Tests for User Story 1

- [x] T006 [US1] Extend `tests/checkout/quick-quote.test.ts` with selection scenarios that reject empty lines, reject non-positive quantities, cap quantities at the inventory projection and preserve valid lines after an invalid update.

### Implementation for User Story 1

- [x] T007 [US1] Create the server route in `app/cotizacion-rapida/page.tsx`, loading the catalog through the existing Prisma singleton, reusing the established product ordering, filtering `inventario > 0`, and passing only the `ProductProjection` required by the client.
- [x] T008 [US1] Create the client shell in `components/cotizacion-rapida/quickQuote.tsx` with the `/venta-rapida` visual language, local React state only, product search across name/category, product cards, selected-count indicators, and a sticky mobile summary action.
- [x] T009 [US1] Implement add/reduce/remove/clear interactions in `components/cotizacion-rapida/quickQuote.tsx` using the validation rules from `lib/cotizacion-rapida.ts`; keep the current valid selection when an attempted quantity exceeds inventory or is invalid.
- [x] T010 [US1] Implement empty-catalog, empty-selection, loading/error, zero/invalid-rate and mobile accessibility states in `components/cotizacion-rapida/quickQuote.tsx`, ensuring the page never exposes checkout, payment or order-confirmation actions.

**Checkpoint**: US1 is independently usable as a quote builder and demonstrably performs no commercial write.

---

## Phase 4: User Story 2 - Revisar y generar la imagen de la cotización (Priority: P1)

**Goal**: Convertir una cotización revisada en un PNG fiel, legible y descargable, con destinatario opcional y datos monetarios consistentes.

**Independent Test**: Con una selección válida y a tasa positiva, la operadora puede introducir opcionalmente nombre/teléfono, generar una imagen, previsualizarla, descargarla y comprobar que coincide con el resumen.

### Tests for User Story 2

- [x] T011 [US2] Extend `tests/checkout/quick-quote.test.ts` with immutable snapshot/fingerprint cases, stale-image invalidation after line or recipient changes, valid/invalid exchange-rate cases and expected document fields without using browser APIs.

### Implementation for User Story 2

- [x] T012 [P] [US2] Create the complete non-scrolling artwork component in `components/cotizacion-rapida/quoteArtwork.tsx`, including local brand asset, title/date, optional recipient fields, line quantity/name/unit price/line total, USD/Bs totals, rate and a note that distinguishes the quote from a confirmed sale.
- [x] T013 [P] [US2] Implement `lib/cotizacion-imagen.ts` con Canvas 2D, logo local, texto, líneas, totales y `canvas.toBlob`, creando un `image/png` Blob/File y URL temporal revocable sin importar Prisma ni el store persistido.
- [x] T014 [US2] Add recipient fields, summary-sheet details, generation progress/error state, image preview and download action to `components/cotizacion-rapida/quickQuote.tsx`; generate from one immutable `QuoteDraft` snapshot so screen and image share the same values.
- [x] T015 [US2] Integrate `getCurrentQuoteCatalog` from `lib/actions/cotizacion-rapida.ts` into the generation flow in `components/cotizacion-rapida/quickQuote.tsx`; block generation and explain the change when a selected product price, existence or inventory differs from the current read, then preserve or correct the valid selection.

**Checkpoint**: US1 and US2 work together; the generated PNG is accurate, downloadable and marked stale after any relevant edit.

---

## Phase 5: User Story 3 - Compartir la cotización por WhatsApp (Priority: P1)

**Goal**: Share the latest valid PNG through native file sharing when supported and provide an honest download-plus-WhatsApp fallback otherwise.

**Independent Test**: With a generated image, a compatible secure-context device opens the native share sheet with the file; an incompatible browser downloads/offers the file and opens WhatsApp with prepared text without claiming the image was attached.

### Tests for User Story 3

- [x] T016 [US3] Extend `tests/checkout/quick-quote.test.ts` with share-message formatting, WhatsApp phone normalization, stale-artifact rejection and cancellation/error result cases for the share decision helper.

### Implementation for User Story 3

- [x] T017 [US3] Implement native-share and fallback helpers in `lib/cotizacion-imagen.ts`, checking `navigator.canShare({ files })` before `navigator.share({ files, title, text })`, handling secure-context/unsupported cases, downloading the PNG and opening the prepared `wa.me` text fallback without attaching or uploading the Blob.
- [x] T018 [US3] Add `Compartir por WhatsApp`, `Descargar imagen` and status feedback to `components/cotizacion-rapida/quickQuote.tsx`, allowing share only when the artifact fingerprint matches the current draft and keeping the file available after a cancelled share.
- [x] T019 [US3] Handle duplicate-click prevention, user cancellation, missing WhatsApp, recoverable share errors and manual-attachment messaging in `components/cotizacion-rapida/quickQuote.tsx`; keep all user-entered recipient data local to the page and generated file.

**Checkpoint**: The complete quote-to-image-to-share journey works with both native sharing and fallback behavior.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document the route, verify regression boundaries and prove the rendered behavior described by the specification.

- [x] T020 [P] Document `/cotizacion-rapida` as a temporary, non-persisted quotation tool and record its no-checkout/no-inventory boundary in `docs/descripcion-tecnica.md`.
- [x] T021 Run `npm.cmd run test:checkout`, `npm.cmd run lint` and `npm.cmd run build`; record any pre-existing warnings separately from feature failures in `specs/006-cotizacion-rapida/quickstart.md`.
- [ ] T022 Execute every scenario in `specs/006-cotizacion-rapida/quickstart.md` on a narrow mobile viewport and desktop browser, including PNG inspection, stale-image blocking, secure-context native share, fallback download/WhatsApp and confirmation that no Prisma entities or inventory changed.
- [x] T023 Review the final diff with `git diff --check` and confirm that `prisma/schema.prisma`, migrations, `.env`, `.env.local`, payment flows and `/venta-rapida` behavior were not changed for this feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 must complete before the local image renderer is integrated or built.
- **Foundational (Phase 2)**: T002 → T003 → T004; T005 can run in parallel with T002/T003. This phase blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on T003, T004 and T005; delivers the MVP quote builder.
- **User Story 2 (Phase 4)**: Depends on US1's route/component shell and T011 before integrating image generation; T012 and T013 can proceed in parallel after the tests are specified.
- **User Story 3 (Phase 5)**: Depends on US2's valid image artifact and fingerprint; T016 precedes the share implementation.
- **Polish (Phase 6)**: Depends on the desired user stories being complete; T020 can run in parallel with final implementation, while T021–T023 require the integrated feature.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on the foundational domain/catalog work; no dependency on US2 or US3.
- **User Story 2 (P1)**: Depends on US1 because it adds the review and artwork flow to the quote builder.
- **User Story 3 (P1)**: Depends on US2 because it shares only a generated, current PNG artifact.

### Parallel Opportunities

- T002 and T005 can run in parallel after setup.
- T012 and T013 can run in parallel after T011 because they touch separate files.
- T020 can run in parallel with the final story work.
- Within T022, mobile and desktop manual validation can be performed as separate checks, but both results are required.

## Parallel Example: User Story 1

```text
Task T006: Add quote-builder unit cases in tests/checkout/quick-quote.test.ts
Task T007: Create the server route in app/cotizacion-rapida/page.tsx
```

T008–T010 remain sequential because they progressively integrate the route data, selection rules and user-facing error states in the same client component.

## Implementation Strategy

### MVP First

1. Complete T001–T005.
2. Complete T006–T010.
3. Stop and validate US1: product selection, totals, mobile layout and no commercial writes.

### Incremental Delivery

1. Add US2 with T011–T015 and validate the PNG against the visible summary.
2. Add US3 with T016–T019 and validate native share plus fallback.
3. Complete T020–T023 and perform the final regression review.

## Notes

- `[P]` means the task can run in parallel with other tasks in its phase without sharing an incomplete file.
- Every task names the file or project artifact it changes or validates.
- No task creates a Prisma migration or calls checkout persistence.
- The access policy intentionally remains the same as `/venta-rapida`; restricting the new route to admin users would require a separately approved security scope.
