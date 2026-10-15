# Tasks: Analíticas de visitas con Vercel

**Input**: Documentos de diseño de `/specs/004-analiticas-visitas-vercel/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/vercel-web-analytics.md` y `quickstart.md`.

**Tests**: Incluidos porque la especificación exige escenarios verificables, regresión
de las analíticas comerciales y cobertura de errores, privacidad y configuración.

**Organization**: Las tareas están agrupadas por historia de usuario. Cada fase termina
con un incremento comprobable antes de ampliar el alcance.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar la configuración segura y la documentación operativa sin añadir
dependencias ni tocar el esquema de Prisma.

- [X] T001 Documentar en `README.md` las variables `VERCEL_ANALYTICS_TOKEN`, `VERCEL_ANALYTICS_PROJECT_ID`, `VERCEL_ANALYTICS_TEAM_ID` y `VERCEL_ANALYTICS_TEAM_SLUG`, indicando que el token solo vive en el servidor, que los valores reales no se versionan y que Web Analytics debe estar habilitado en producción.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Crear los tipos, reglas de periodo y adaptador server-only que necesitan las
tres historias.

**Checkpoint**: No comenzar las historias hasta que los tipos, la consulta externa y la
normalización puedan ejecutarse sin tocar PostgreSQL.

- [X] T002 Define en `lib/admin/types.ts` `VisitPeriod`, `VisitMetric`, `VisitBreakdownRow`, `WebsiteVisitsStatus` y `WebsiteVisitsResult`, respetando las restricciones del modelo: `preset` solo puede ser `"7d" | "30d" | "90d" | "custom"`, `since` y `until` usan `YYYY-MM-DD`, `until` no puede ser anterior a `since`, las métricas son enteros no negativos y el estado solo puede ser `"ready" | "no_data" | "not_configured" | "unavailable" | "unauthorized" | "invalid"`.
- [X] T003 [P] Create `lib/admin/visit-periods.ts` con el periodo inicial de 7 días, los presets de 30 y 90 días y el rango personalizado; validar fechas incompletas, invertidas o con formato inválido antes de construir una consulta a Vercel y generar etiquetas localizadas para el panel.
- [X] T004 [P] Implementar en `lib/admin/vercel-web-analytics.ts` el adaptador server-only para `visits/count` y `visits/aggregate`, usando las variables definidas en `README.md`, `fetch` nativo, timeout controlado, producción como entorno único, límite de 10 filas por desglose y el mapeo de errores del contrato externo.
- [X] T005 Implementar en `lib/admin/website-visits.ts` la orquestación del conteo y los cuatro agregados (`requestPath`, `referrerHostname`, `country`, `deviceType`) en paralelo, devolver `WebsiteVisitsResult`, convertir una respuesta sin filas en `no_data`, sanitizar rutas/hostnames y excluir `visitorId`, query strings, hashes y valores desconocidos sin lanzar errores hacia la página administrativa.

---

## Phase 3: User Story 1 - Consultar el tráfico del sitio (Priority: P1) 🎯 MVP

**Goal**: Mostrar en `/admin/analytics` un resumen de visitas separado de las ventas,
con visitantes agregados, páginas vistas, periodo y entorno productivo.

**Independent Test**: Con una respuesta simulada válida y una respuesta sin datos, abrir la
página como administrador y comprobar el resumen, el estado vacío y la permanencia de
las cifras comerciales existentes.

### Tests for User Story 1

- [X] T006 [P] [US1] Añadir en `tests/admin/website-visits.test.ts` pruebas del conteo válido (`pageviews` y `visitors`), respuesta sin datos y separación del resultado de visitas respecto del resultado comercial, usando respuestas simuladas sin PostgreSQL ni credenciales reales.

### Implementation for User Story 1

- [X] T007 [P] [US1] Crear `components/admin/analiticas/websiteVisitsDashboard.tsx` con el bloque visual `Visitas del sitio`, tarjetas de visitantes agregados y páginas vistas, etiquetas que expliquen la métrica de Vercel, periodo consultado, entorno productivo y estados `ready`/`no_data`.
- [X] T008 [US1] Integrar `consultarAnaliticasVisitas` en `app/admin/analytics/page.tsx` sin cambiar los filtros ni los cálculos comerciales; mantener la lectura protegida por `app/admin/layout.tsx` y pasar a la nueva vista solo la proyección normalizada, sin configuración ni token.

**Checkpoint**: La historia P1 debe funcionar con datos válidos y sin datos, sin impedir
que `/admin/analytics` siga mostrando ventas y predictor.

---

## Phase 4: User Story 2 - Explorar el origen y la distribución de las visitas (Priority: P2)

**Goal**: Permitir cambiar el periodo y consultar los cuatro desgloses agregados sin
mezclar resultados entre periodos.

**Independent Test**: Consultar dos periodos simulados con valores distintos, cambiar
entre 7, 30, 90 días y personalizado, y verificar que resumen y desgloses reflejan solo
el periodo actual.

### Tests for User Story 2

- [X] T009 [P] [US2] Extender `tests/admin/website-visits.test.ts` con pruebas de presets, rango personalizado, rechazo de rango invertido, construcción de `since`/`until`, límite 10 y agrupación correcta de `requestPath`, `referrerHostname`, `country` y `deviceType`.

### Implementation for User Story 2

- [X] T010 [P] [US2] Crear `components/admin/analiticas/websiteVisitsFilters.tsx` con un formulario GET independiente de los filtros de ventas, opciones de 7/30/90 días, fechas personalizadas, estado seleccionado, etiquetas accesibles y acción de actualización que conserve el contexto.
- [X] T011 [US2] Ampliar `components/admin/analiticas/websiteVisitsDashboard.tsx` para renderizar páginas/rutas, referentes, países y dispositivos con hasta 10 filas, `Others` cuando lo entregue Vercel, estados vacíos por panel y diseño usable en móvil.
- [X] T012 [US2] Completar en `app/admin/analytics/page.tsx` la lectura y validación de `visitasPeriodo`, `visitasDesde` y `visitasHasta`, conectar `websiteVisitsFilters.tsx` y garantizar que el periodo resuelto se aplica al resumen y a los cuatro agregados sin modificar la query comercial.

**Checkpoint**: La historia P2 debe permitir comparar periodos y localizar las
distribuciones principales sin mostrar datos de una consulta anterior.

---

## Phase 5: User Story 3 - Confiar en el estado de los datos (Priority: P3)

**Goal**: Comunicar configuración pendiente, autorización, indisponibilidad, timeout,
validación y privacidad sin bloquear el resto del panel.

**Independent Test**: Simular falta de variables, respuestas 401/403/404/410/503,
timeout, respuesta parcialmente inválida y una consulta válida; comprobar el estado
visible, la ausencia de secretos y la disponibilidad de las analíticas comerciales.

### Tests for User Story 3

- [X] T013 [US3] Completar `tests/admin/website-visits.test.ts` con pruebas de los estados `not_configured`, `unauthorized`, `unavailable`, `invalid` y `no_data`, sanitización de etiquetas, exclusión de `visitorId`/query strings y conservación del resultado comercial cuando Vercel falla.

### Implementation for User Story 3

- [X] T014 [US3] Implementar en `components/admin/analiticas/websiteVisitsDashboard.tsx` mensajes localizados para configuración pendiente, autorización inválida, fuente no disponible, consulta inválida y timeout; incluir una acción de reintento que conserve los parámetros GET y no exponga detalles del proveedor.
- [X] T015 [US3] Revisar `app/admin/layout.tsx`, `app/admin/analytics/page.tsx` y `lib/admin/vercel-web-analytics.ts` para preservar `requireAdmin`, mantener toda consulta con token en el servidor, no crear una ruta `/api` pública y evitar que errores de visitas rechacen las analíticas comerciales.

**Checkpoint**: La historia P3 debe dejar claro si el dato está disponible, vacío,
pendiente o temporalmente indisponible, sin revelar secretos ni datos individuales.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Completar calidad, documentación, accesibilidad y evidencia de entrega.

- [X] T016 [P] Revisar `components/admin/analiticas/websiteVisitsFilters.tsx` y `components/admin/analiticas/websiteVisitsDashboard.tsx` en móvil, teclado, nombres accesibles, contraste, tablas con encabezados y textos que distingan visitantes agregados de páginas vistas.
- [X] T017 [P] Actualizar `specs/004-analiticas-visitas-vercel/quickstart.md` si los nombres finales de variables, mensajes de estado o pasos de validación difieren de la implementación.
- [X] T018 Ejecutar desde la raíz `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npm.cmd run test:admin` y `npm.cmd run build`; registrar en `specs/004-analiticas-visitas-vercel/quickstart.md` cualquier suite omitida o dependiente de una base aislada.
- [X] T019 Revisar `git diff --check`, `README.md`, `.gitignore`, `app/admin/analytics/page.tsx`, `lib/admin/vercel-web-analytics.ts` y `specs/004-analiticas-visitas-vercel/` para confirmar que no hay secretos, migraciones no previstas, rutas públicas nuevas ni cambios fuera de alcance.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 no depende de código y prepara la configuración documentada.
- **Foundational (Phase 2)**: T002 inicia los tipos; T003 y T004 pueden ejecutarse en paralelo después de T002; T005 depende de T003 y T004 y bloquea las historias.
- **User Story 1 (Phase 3)**: T006 y T007 pueden prepararse en paralelo después de T005; T008 integra ambos en la página.
- **User Story 2 (Phase 4)**: depende de T008 porque amplía el bloque y la página P1; T009 y T010 pueden prepararse en paralelo, luego T011 y T012 completan la integración.
- **User Story 3 (Phase 5)**: depende de T008 y puede reutilizar la estructura de T011; T013 debe cubrir los estados antes de cerrar T014 y T015.
- **Polish (Phase 6)**: depende de las historias que se decida entregar y de sus checkpoints.

### User Story Dependencies

- **US1 (P1)**: depende únicamente de la Fase 2 y es el MVP independiente.
- **US2 (P2)**: depende de US1 porque agrega filtros y desgloses al mismo bloque y a la misma página, pero su prueba valida un cambio de periodo de forma independiente.
- **US3 (P3)**: depende de US1 y reutiliza el panel; sus estados pueden probarse sin datos reales de Vercel ni PostgreSQL.

### Parallel Opportunities

- T003 y T004 pueden ejecutarse en paralelo después de T002.
- En US1, T006 y T007 afectan archivos distintos y pueden ejecutarse en paralelo después de T005.
- En US2, T009 y T010 afectan archivos distintos y pueden ejecutarse en paralelo después de T008.
- T016 y T017 son revisiones independientes y pueden ejecutarse en paralelo después de las historias.

## Parallel Example: User Story 1

```text
Después de completar T005:

T006: pruebas de conteo y estado sin datos en tests/admin/website-visits.test.ts
T007: componente de resumen en components/admin/analiticas/websiteVisitsDashboard.tsx

Después de ambos:

T008: integración protegida en app/admin/analytics/page.tsx
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar T001 y T002-T005.
2. Completar T006-T008.
3. Ejecutar las pruebas de US1 y comprobar manualmente `/admin/analytics` con una
   respuesta válida, sin datos y con las analíticas comerciales intactas.
4. Detenerse para revisión antes de incorporar desgloses y estados avanzados.

### Incremental Delivery

1. Añadir US1 para entregar el resumen básico.
2. Añadir US2 para filtros y distribución del tráfico.
3. Añadir US3 para estados, reintentos, privacidad y tolerancia a fallos.
4. Ejecutar la Fase 6 y validar el quickstart completo.

### Traceability

- US1 cubre FR-001, FR-002, FR-003, FR-005, FR-010 y la lectura básica de `WebsiteVisitsResult`.
- US2 cubre FR-004, FR-006 y FR-007, además de las reglas de `VisitPeriod` y `VisitBreakdownRow`.
- US3 cubre FR-008, FR-009, FR-011, FR-012, FR-013, FR-014 y FR-015, junto con el contrato de errores externo.
- T018 verifica SC-001 a SC-006; la validación manual de `quickstart.md` cubre SC-002 y SC-007.
