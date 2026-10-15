# Implementation Plan: Gestión administrativa de clientes

**Branch**: `003-gestion-clientes` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-gestion-clientes/spec.md`

## Summary

Se añadirá una sección protegida `/admin/clients` con una tabla paginada de consumidores y mayoristas, búsqueda por nombre o RIF, filtro por tipo, alta desde una modal y edición masiva tipo hoja de cálculo. El modelo de cliente incorporará un RIF normalizado y un texto derivado para búsquedas sin acentos; los datos históricos sin RIF seguirán siendo válidos. Las escrituras administrativas se concentrarán en acciones de servidor validadas con Zod, con creación de dirección inicial dentro de la misma transacción y actualización masiva atómica con control de concurrencia. Los cambios administrativos quedarán registrados en un historial mínimo con actor, fecha y campos modificados.

## Technical Context

**Language/Version**: TypeScript estricto sobre Node.js, Next.js 15.5.9 y React 19.1

**Primary Dependencies**: Next.js App Router, Prisma 6.17.1, PostgreSQL, Zod 4.1.12, Stack Auth existente, `lucide-react`, `sonner`; no se añade ninguna dependencia

**Storage**: PostgreSQL mediante Prisma; migración aditiva para `Cliente.rif`, texto derivado de búsqueda e historial administrativo

**Testing**: `node:test` mediante `npm.cmd run test:admin`, pruebas unitarias puras para normalización/reglas y pruebas de integración opcionales con `RUN_ADMIN_INTEGRATION=1` y una base aislada en `ADMIN_TEST_DATABASE_URL`

**Target Platform**: Panel administrativo web interno, escritorio y pantallas móviles desde 360 px

**Project Type**: Aplicación web Next.js con App Router y Server Actions

**Performance Goals**: La tabla debe mostrar la primera página y actualizar filtros en menos de 1 segundo en una base operativa normal; las consultas siempre deben limitarse a una página y devolver el total de resultados; la edición masiva debe aceptar hasta 100 filas por operación

**Constraints**: Requerir autorización del servidor; no exponer clientes en superficies públicas; preservar ventas, pagos, notas y direcciones existentes; no bloquear históricos sin RIF; evitar búsquedas sensibles a acentos; no usar datos reales para pruebas de migración; no añadir API externa, pasarela de pago ni biblioteca nueva

**Scale/Scope**: Una tabla administrativa de todos los registros `Cliente`, con páginas de 50 filas y edición masiva sobre las filas cargadas; creación de un cliente con una dirección inicial opcional; sin eliminación, fusión, importación ni exportación

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Evaluación | Estado |
|------|------------|--------|
| I. Separación de superficies | La nueva ruta, navegación, acciones y componentes viven en el panel administrativo. No se modifica `/venta-rapida`, WhatsApp ni el checkout público salvo para mantener el campo derivado de búsqueda en altas existentes. | PASS |
| II. Fuente única y consistencia | `Cliente` y sus direcciones siguen en PostgreSQL/Prisma; las altas con dirección y las tandas masivas usan una única transacción; la migración es aditiva y revisable. | PASS |
| III. Seguridad y privacidad | La página y las acciones llaman a `requireAdmin`; el servidor valida, normaliza y comprueba duplicados; la tabla no devuelve pagos ni el detalle completo de pedidos. | PASS |
| IV. Calidad y trazabilidad | Se añaden pruebas de reglas, integración para persistencia/rollback y una entidad de historial con actor, fecha y campos modificados; se validará con lint, TypeScript, build y pruebas administrativas. | PASS |
| V. Simplicidad y móvil | Se reutilizan componentes, estilos y patrones existentes; no se añade una capa de servicio externa; la tabla tendrá una presentación móvil apilada o desplazable de forma controlada y las acciones principales seguirán accesibles. | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/003-gestion-clientes/
├── plan.md                         # Este plan
├── research.md                     # Decisiones y alternativas resueltas
├── data-model.md                   # Modelo, migración e invariantes
├── quickstart.md                   # Validación automatizada y manual
├── contracts/
│   └── admin-clients.md            # Contrato de consulta, modal y edición masiva
└── tasks.md                        # Se generará después con $speckit-tasks
```

### Source Code (repository root)

```text
app/admin/clients/page.tsx                         # Página server-rendered, filtros y paginación
components/admin/clientes/
├── clientsTable.tsx                               # Tabla, estado de edición y modal
├── clientsFilters.tsx                             # Búsqueda, tipo y limpieza de filtros
├── clientCreateModal.tsx                           # Alta de consumidor/mayorista
└── bulkClientsEditor.tsx                           # Edición tipo hoja de cálculo
components/admin/sidebar.tsx                        # Entrada Clientes en la navegación
components/admin/header.tsx                         # Título de la nueva ruta
lib/actions/admin-clients.ts                        # Server Actions protegidas de alta y edición
lib/actions/clients.ts                              # Compatibilidad de altas públicas con campos derivados
lib/client-rules.ts                                 # Normalización, RIF y texto de búsqueda compartidos
lib/admin/client-query.ts                           # Parámetros, filtros y consulta paginada
lib/admin/types.ts                                  # Tipos ClientRow y estados de acciones
prisma/schema.prisma                                # RIF, texto de búsqueda e historial
prisma/migrations/<timestamp>_gestion_clientes/
└── migration.sql                                   # Migración aditiva y backfill
tests/admin/client-rules.test.ts                    # Reglas puras de RIF y búsqueda
tests/admin/admin-clients.integration.test.ts       # Persistencia, rollback y relaciones históricas
```

**Structure Decision**: Se conserva la estructura única de la aplicación Next.js. La página server-rendered consulta el origen de datos y pasa un modelo reducido al componente cliente; los componentes de edición solo gestionan estado temporal y envían un payload validado a las Server Actions. Las reglas compartidas se mantienen fuera de los componentes para que el checkout existente y el panel calculen el mismo texto de búsqueda y normalicen RIF de la misma forma.

## Implementation Sequence

1. Implementar las reglas puras de normalización de nombre, RIF, etiquetas de tipo y payloads de edición; cubrirlas con `node:test`.
2. Añadir el modelo y la migración aditiva: RIF nullable/único, texto derivado de búsqueda con backfill y `HistorialCliente`; regenerar Prisma y verificar el esquema.
3. Actualizar las altas/ediciones públicas existentes para mantener el texto derivado sin exponer la gestión administrativa ni exigir RIF en checkout.
4. Implementar la consulta paginada y la Server Action de alta, incluyendo dirección inicial opcional, duplicados y registro de historial.
5. Implementar la Server Action de edición masiva con payload de parches, validación de filas completas, duplicados internos/externos, `updatedAt` esperado y transacción atómica.
6. Construir filtros, tabla, detalle de perfil, modal y editor masivo; conectar navegación, mensajes, estado vacío y prevención de pérdida de cambios.
7. Ejecutar pruebas unitarias e integración aislada, revisar migración, comprobar accesibilidad/móvil y cerrar con lint, TypeScript, build y `git diff --check`.

## Design Decisions

- El RIF se guarda compacto y en mayúsculas, por ejemplo `V099999991`; la interfaz puede mostrarlo como `V-09999999-1`. La búsqueda elimina espacios y guiones antes de consultar.
- La búsqueda por nombre usa un campo derivado `nombreBusqueda` con minúsculas y sin diacríticos. Esto evita depender de una extensión PostgreSQL o de filtrar todos los clientes en memoria.
- La etiqueta administrativa será “Consumidor”, pero el enum histórico `detal` se conserva para no romper checkout, ventas ni relaciones existentes.
- La edición masiva enviará parches con `id` y `updatedAt` esperado. El servidor combinará cada parche con el registro actual, validará la fila completa y solo después actualizará todas las filas dentro de una transacción.
- El historial registrará actor, correo, fecha, acción y nombres de campos modificados, sin guardar copias innecesarias de datos personales anteriores. No se añadirá una pantalla independiente de auditoría en esta feature.
- La dirección inicial se creará dentro de la transacción de alta. Las direcciones existentes se consultarán como parte del detalle, pero no se incluirán en la edición masiva de filas.

## Post-Design Constitution Check

| Gate | Verificación posterior al diseño | Estado |
|------|-----------------------------------|--------|
| I. Separación de superficies | La única nueva superficie es `/admin/clients`; las acciones públicas solo mantienen el dato derivado necesario y no adquieren permisos administrativos. | PASS |
| II. Fuente única y consistencia | La migración conserva históricos, la alta cliente/dirección es atómica y la tanda usa comparación de versión más transacción; no hay escrituras desde el navegador. | PASS |
| III. Seguridad y privacidad | La consulta y las dos escrituras administrativas se protegen con `requireAdmin`; el contrato excluye pagos y detalles de pedidos completos; los conflictos se informan sin filtrar secretos. | PASS |
| IV. Calidad y trazabilidad | Se definieron pruebas unitarias, integración con rollback/concurrencia, migración revisable y comandos de entrega. | PASS |
| V. Simplicidad y móvil | Se reutilizan estilos y patrones de edición masiva existentes, sin dependencias nuevas ni integraciones externas; la tabla tiene una estrategia responsive explícita. | PASS |

No hay violaciones constitucionales que requieran una excepción o una entrada en Complexity Tracking.
