---

description: "Tareas de implementación para la gestión administrativa de clientes"
---

# Tareas: Gestión administrativa de clientes

**Entrada**: Artefactos de diseño de `specs/003-gestion-clientes/`

**Prerrequisitos**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/admin-clients.md` y `quickstart.md`.

**Estrategia**: Las tareas están ordenadas por dependencias y agrupadas por historia de usuario. Las pruebas de integración se ejecutan contra una base aislada cuando están disponibles `RUN_ADMIN_INTEGRATION=1` y `ADMIN_TEST_DATABASE_URL`.

**Formato**: `[P]` indica que la tarea puede ejecutarse en paralelo con las tareas de su misma fase porque trabaja en archivos distintos y no depende de ellas. Cada tarea incluye la ruta concreta que debe modificarse o validarse.

## Fase 1: Preparación

**Propósito**: Confirmar el alcance y los patrones existentes antes de tocar el modelo o la interfaz.

- [X] T001 [P] Confirmar el alcance, las rutas objetivo y los patrones de autenticación/edición existentes en `specs/003-gestion-clientes/plan.md`, `app/admin/transactions/page.tsx`, `components/admin/inventario/bulkInventoryEditor.tsx` y `lib/actions/admin-sales.ts`; ajustar únicamente las rutas de implementación si la inspección del código lo exige.

---

## Fase 2: Fundamentos bloqueantes

**Propósito**: Preparar el modelo, las reglas compartidas y la persistencia que necesitan todas las historias.

**⚠️ CRÍTICO**: Ninguna historia de usuario debe darse por terminada antes de completar esta fase.

- [X] T002 [P] Implementar en `lib/client-rules.ts` la normalización de nombre de búsqueda, normalización/formato de RIF, cálculo local del dígito verificador, validación de RIF y mapeo de `detal`/`mayorista` a las etiquetas administrativas.
- [X] T003 [P] Actualizar `prisma/schema.prisma` con `Cliente.rif`, `Cliente.nombreBusqueda`, la relación `Cliente.historialCliente`, el enum de acciones y el modelo `HistorialCliente` con sus índices y restricciones descritos en `specs/003-gestion-clientes/data-model.md`.
- [X] T004 Crear `prisma/migrations/20261014000000_gestion_clientes/migration.sql` con una migración aditiva: columnas nuevas, backfill de `nombreBusqueda` para los clientes existentes, índice único nullable de `rif`, tabla/enum/índice de historial y claves foráneas sin alterar ventas, direcciones ni notas existentes.
- [X] T005 [P] Extender `lib/admin/types.ts` con `ClientRow`, tipos de dirección/resumen, parches de edición masiva y estados de resultado/errores por fila y campo conforme a `specs/003-gestion-clientes/contracts/admin-clients.md`.
- [X] T006 Regenerar y validar el cliente Prisma a partir de `prisma/schema.prisma` con `npx.cmd prisma generate` y comprobar que las relaciones de `Cliente` y `HistorialCliente` quedan disponibles para las acciones y consultas administrativas.
- [X] T007 Actualizar `lib/actions/clients.ts` para calcular y persistir `nombreBusqueda` en las altas y ediciones públicas existentes, sin exigir RIF, cambiar permisos ni alterar el comportamiento del checkout.
- [X] T008 [P] Añadir en `tests/admin/client-rules.test.ts` las pruebas unitarias de nombre con acentos/espacios, RIF compacto y formateado, prefijos permitidos, dígito verificador, RIF vacío de consumidor y obligatoriedad de RIF para mayorista.

**Punto de control**: el esquema puede generarse, los históricos sin RIF siguen siendo válidos y las reglas compartidas tienen cobertura unitaria.

---

## Fase 3: Historia de usuario 1 - Consultar y filtrar todos los clientes (Prioridad: P1) 🎯 MVP

**Objetivo**: Ofrecer `/admin/clients` con una tabla paginada que incluya consumidores y mayoristas, datos de perfil, direcciones resumidas, total de transacciones y filtros por nombre, RIF y tipo.

**Prueba independiente**: Con datos de ambos tipos, abrir `/admin/clients`, comprobar el total y la paginación, buscar nombres con/sin acentos, buscar RIF con/sin separadores, combinar cada búsqueda con cada tipo y verificar el estado vacío.

### Pruebas de la historia 1

- [X] T009 [US1] Escribir en `tests/admin/admin-clients.integration.test.ts` los escenarios de consulta paginada, filtro por tipo, búsqueda normalizada por nombre/RIF, clientes históricos sin RIF, varias direcciones sin duplicar filas y resultado vacío; omitirlos de forma explícita cuando no exista la base aislada.

### Implementación de la historia 1

- [X] T010 [P] [US1] Implementar en `lib/admin/client-query.ts` el parseo de `q`, `tipo` y `page`, la normalización de tokens/RIF, el filtro Prisma, orden estable, `take` de 50, `count`, `totalPages` y la proyección de direcciones/resumen sin pagos ni líneas completas de pedidos.
- [X] T011 [US1] Implementar `app/admin/clients/page.tsx` como página server-rendered que consuma `lib/admin/client-query.ts`, preserve los parámetros de URL, maneje páginas fuera de rango y entregue a la interfaz filas con fechas serializadas y etiquetas de tipo.
- [X] T012 [P] [US1] Crear `components/admin/clientes/clientsFilters.tsx` con búsqueda por nombre/RIF, selector Todos/Consumidor/Mayorista, envío por URL, limpieza de filtros y estado accesible de filtros activos.
- [X] T013 [P] [US1] Crear `components/admin/clientes/clientsTable.tsx` para mostrar una fila por cliente, tipo visible, identidad, RIF o “Sin RIF”, contacto, direcciones sin duplicados, resumen de relaciones, paginación y estado vacío accionable.
- [X] T014 [P] [US1] Añadir la entrada “Clientes” en `components/admin/sidebar.tsx` y el título/ruta activa correspondiente en `components/admin/header.tsx`, manteniendo la navegación existente en escritorio y móvil.
- [X] T015 [US1] Integrar `clientsFilters.tsx` y `clientsTable.tsx` desde `app/admin/clients/page.tsx`, incluyendo el botón “Nuevo cliente” como punto de extensión, mensajes de carga/estado vacío y actualización de la tabla tras cambios de URL.
- [X] T016 [US1] Ejecutar y ajustar los escenarios de `tests/admin/admin-clients.integration.test.ts` hasta demostrar que nombre, RIF y tipo se combinan con lógica AND, la paginación no expone más de una página y las relaciones no multiplican filas.

**Punto de control**: un administrador puede localizar y consultar cualquier cliente existente desde la nueva sección sin exponer detalles de pagos ni modificar datos.

---

## Fase 4: Historia de usuario 2 - Crear un cliente desde una modal (Prioridad: P1)

**Objetivo**: Permitir crear consumidores y mayoristas desde “Nuevo cliente”, con validación de identidad/contacto, RIF, dirección inicial opcional e historial atómico.

**Prueba independiente**: Crear un consumidor sin RIF y un mayorista con RIF/dirección válidos; comprobar su aparición única; probar campos inválidos, RIF mayorista ausente y duplicados de teléfono, correo o RIF.

### Pruebas de la historia 2

- [X] T017 [US2] Añadir en `tests/admin/admin-clients.integration.test.ts` los escenarios de alta de consumidor/mayorista, normalización del RIF, creación atómica de dirección inicial, evento `creado`, duplicados y rollback cuando la dirección o los datos sean inválidos.

### Implementación de la historia 2

- [X] T018 [P] [US2] Implementar `crearClienteAdministrativo` en `lib/actions/admin-clients.ts` con `requireAdmin`, esquema Zod, normalización de campos, reglas de RIF/tipo, conflictos de teléfono/correo/RIF, transacción cliente-dirección-historial y `revalidatePath` de las superficies administrativas indicadas en el contrato.
- [X] T019 [P] [US2] Crear `components/admin/clientes/clientCreateModal.tsx` con selección Consumidor/Mayorista, campos obligatorios y opcionales, dirección inicial, errores por campo, conservación de valores ante error, confirmación de cierre con cambios pendientes y estado de envío accesible.
- [X] T020 [US2] Conectar `clientCreateModal.tsx` al botón “Nuevo cliente” de `components/admin/clientes/clientsTable.tsx`, cerrar y limpiar solo después de un resultado exitoso, mostrar el mensaje de éxito y refrescar la tabla conservando filtros cuando sea posible.

**Punto de control**: el alta administrativa crea una sola identidad y, si corresponde, una dirección y un evento de historial dentro de la misma transacción.

---

## Fase 5: Historia de usuario 3 - Editar clientes de forma masiva (Prioridad: P1)

**Objetivo**: Editar en línea hasta 100 clientes cargados, validar el conjunto completo y guardar todos los cambios o ninguno con control optimista de concurrencia.

**Prueba independiente**: Modificar varias filas y guardar; después repetir con un formato inválido, identificador duplicado, fila inexistente o `updatedAt` obsoleto y comprobar rollback total con cambios locales conservados.

### Pruebas de la historia 3

- [X] T021 [US3] Añadir en `tests/admin/admin-clients.integration.test.ts` escenarios de edición válida de varias filas, cambio de tipo, duplicados internos/externos, máximo de 100 filas, cliente inexistente, conflicto de `updatedAt`, rollback total y un evento `actualizado` por fila modificada.

### Implementación de la historia 3

- [X] T022 [US3] Implementar `guardarEdicionMasivaClientes` en `lib/actions/admin-clients.ts` con Zod, límite de 100, detección de IDs repetidos, carga/verificación de existencia y versión, merge de filas completas, duplicados finales de RIF/teléfono/correo, actualización de `nombreBusqueda`, transacción atómica, historial por fila y revalidación.
- [X] T023 [P] [US3] Crear `components/admin/clientes/bulkClientsEditor.tsx` con edición inline de tipo/nombre/apellido/RIF/teléfono/correo, indicador de filas pendientes, payload `{id, updatedAt, changes}`, botones Guardar/Descartar, errores por fila/campo y preservación de cambios cuando el servidor rechace la tanda.
- [X] T024 [US3] Integrar `bulkClientsEditor.tsx` en `components/admin/clientes/clientsTable.tsx` para editar solo las filas cargadas, bloquear acciones incompatibles durante el guardado, confirmar descarte/cambio de filtro con pendientes y reflejar el resultado exitoso sin perder paginación ni filtros.

**Punto de control**: una tanda válida modifica todas las filas solicitadas; cualquier error o concurrencia obsoleta deja intactos todos los registros y permite corregir el borrador local.

---

## Fase 6: Historia de usuario 4 - Mantener datos protegidos y trazables (Prioridad: P2)

**Objetivo**: Garantizar autorización administrativa, proyección mínima de datos y conservación de relaciones históricas con trazabilidad de actor, fecha y campos modificados.

**Prueba independiente**: Verificar que la página/acciones están detrás de autorización administrativa y que después de editar datos o tipo permanecen intactas las relaciones de transacciones, notas, direcciones y los importes históricos.

### Pruebas de la historia 4

- [X] T025 [US4] Completar en `tests/admin/admin-clients.integration.test.ts` las aserciones de historial con actor/fecha/campos, conservación de IDs de transacciones/notas/direcciones y ausencia de snapshots o detalles de pagos en `ClientRow`; documentar los escenarios de autorización que requieran una sesión administrativa real.

### Implementación de la historia 4

- [X] T026 [US4] Revisar y endurecer `app/admin/clients/page.tsx` y `lib/actions/admin-clients.ts` para que toda lectura/escritura quede cubierta por el límite administrativo existente, los resultados no incluyan pagos ni líneas de pedidos y los errores de autorización/conflicto no filtren datos sensibles.
- [X] T027 [US4] Verificar en `lib/actions/admin-clients.ts` y `prisma/schema.prisma` que los cambios de perfil/tipo no reasignen ni reescriban relaciones históricas, que cada alta/actualización escriba su historial en la misma transacción y que los eventos identifiquen al actor disponible.

**Punto de control**: la gestión de clientes mantiene el significado histórico de ventas y documentos, y cada cambio administrativo queda identificable sin crear una pantalla de auditoría fuera del alcance.

---

## Fase 7: Pulido y validación transversal

**Propósito**: Cerrar accesibilidad, responsive, documentación y comprobaciones de entrega sin añadir alcance nuevo.

- [X] T028 [P] Revisar en `components/admin/clientes/clientsFilters.tsx`, `components/admin/clientes/clientsTable.tsx`, `components/admin/clientes/clientCreateModal.tsx` y `components/admin/clientes/bulkClientsEditor.tsx` el uso móvil desde 360 px, navegación por teclado, foco de modal, etiquetas de campos, estados sin hover y prevención de pérdida de cambios.
- [X] T029 [P] Actualizar `specs/003-gestion-clientes/contracts/admin-clients.md` y `specs/003-gestion-clientes/quickstart.md` para reflejar cualquier nombre final de acción, mensaje, comando o escenario de validación que haya cambiado durante la implementación.
- [ ] T030 [P] Ensayar en una base aislada la migración `prisma/migrations/20261014000000_gestion_clientes/migration.sql` con clientes acentuados, ambos tipos, RIF/correo nulos, direcciones, transacciones y notas; registrar en `specs/003-gestion-clientes/quickstart.md` cualquier escenario omitido.
- [ ] T031 Validar `prisma/schema.prisma` y la migración con `npx.cmd prisma validate`, `npx.cmd prisma migrate status` y `npx.cmd prisma generate` contra una base no productiva; resolver diferencias antes de continuar.
- [X] T032 Ejecutar `npm.cmd run test:admin` sobre `tests/admin/client-rules.test.ts` y `tests/admin/admin-clients.integration.test.ts`, habilitando `RUN_ADMIN_INTEGRATION=1` solo con `ADMIN_TEST_DATABASE_URL` aislada, y conservar evidencia de pruebas omitidas o fallidas.
- [X] T033 Ejecutar `npm.cmd run lint`, `npx.cmd tsc --noEmit` y `npm.cmd run build` sobre las rutas/archivos de la feature; corregir errores propios sin modificar superficies no relacionadas.
- [X] T034 Ejecutar `git diff --check` y revisar el diff final de `prisma/schema.prisma`, `prisma/migrations/`, `lib/`, `app/admin/clients/`, `components/admin/clientes/`, `components/admin/sidebar.tsx`, `components/admin/header.tsx` y `tests/admin/` contra `specs/003-gestion-clientes/spec.md` antes de cerrar la feature.

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación**: T001 no depende de código nuevo y puede ejecutarse de inmediato.
- **Fundamentos**: T002-T008 dependen de T001; T004 depende de T003; T006 depende de T003; T007 depende de T002/T003; T008 depende de T002. Esta fase bloquea todas las historias.
- **US1**: T009-T016 dependen de T002-T008. T011 depende de T010; T015 depende de T011-T014; T016 depende de T009 y T015.
- **US2**: T017-T020 dependen de US1 y de los fundamentos. T018 y T019 pueden avanzar en paralelo; T020 depende de T018-T019 y T015.
- **US3**: T021-T024 dependen de US1 y US2. T022 y T023 pueden avanzar en paralelo; T024 depende de T022-T023 y T020.
- **US4**: T025-T027 dependen de las acciones y pruebas de US2/US3; T026-T027 pueden revisarse en paralelo cuando T025 esté definido.
- **Pulido**: T028-T034 dependen de las historias que se hayan implementado; T031-T034 son el cierre técnico y deben ejecutarse antes de dar la feature por terminada.

### Oportunidades de paralelismo

- Tras T001: T002, T003, T005 y T008 pueden distribuirse respetando que T008 espere la interfaz de T002 si se ejecuta en paralelo.
- En US1: T009, T010, T012, T013 y T014 trabajan en archivos distintos; T011 y T015 integran sus resultados.
- En US2: T017 puede escribirse junto con T018 y T019; la integración queda en T020.
- En US3: T021, T022 y T023 pueden prepararse en paralelo; T024 es la integración única de la tabla.
- En pulido: T028, T029 y T030 son independientes; la validación T031-T034 se ejecuta después de resolver sus hallazgos.

## Estrategia de entrega incremental

### MVP recomendado

1. Completar T001-T008.
2. Completar US1 (T009-T016).
3. Validar de forma independiente consulta, filtros, paginación, datos de perfil y estado vacío.
4. Detenerse para una demostración del listado antes de incorporar altas o edición masiva.

### Entrega completa

1. Añadir US2 y validar altas atómicas con dirección/historial.
2. Añadir US3 y validar edición masiva atómica con conflictos de concurrencia.
3. Cerrar US4 y ejecutar el pulido transversal.
4. Completar T031-T034 antes de declarar la feature lista.

## Criterios de cierre por historia

- **US1**: La tabla muestra consumidores y mayoristas, filtra por nombre/RIF/tipo, pagina 50 filas, mantiene una fila por cliente y ofrece estado vacío útil.
- **US2**: La modal crea ambos tipos, exige RIF válido al mayorista, evita duplicados, crea dirección opcional e historial atómicamente y conserva errores en pantalla.
- **US3**: El editor admite hasta 100 filas cargadas, conserva borradores, detecta errores/duplicados/stale `updatedAt` y guarda todo o nada con historial.
- **US4**: Lecturas/escrituras están protegidas por administración, la proyección no expone pagos y las relaciones históricas permanecen vinculadas al mismo cliente.
