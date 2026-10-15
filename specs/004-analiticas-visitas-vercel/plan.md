# Implementation Plan: Analíticas de visitas con Vercel

**Branch**: `004-analiticas-visitas-vercel` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-analiticas-visitas-vercel/spec.md`

## Summary

Se añadirá un bloque de visitas del sitio dentro de la página administrativa existente
`/admin/analytics`, manteniendo separadas las cifras comerciales. El servidor consultará
la Web Analytics API de Vercel para producción, usando un conteo para los totales y
consultas agregadas limitadas para rutas, referentes, países y dispositivos. El resultado
se normalizará a un contrato interno, se sanitizará antes de llegar a la interfaz y no se
persistirá en PostgreSQL.

## Technical Context

**Language/Version**: TypeScript estricto 5.9, Node.js compatible con Next.js 15.5.9

**Primary Dependencies**: Next.js App Router, React 19, Prisma existente para las
analíticas comerciales, `fetch` nativo del servidor y `zod` existente para validar
entradas. No se añadirá un SDK de Vercel ni otra dependencia de analítica.

**Storage**: PostgreSQL/Prisma continúa siendo la fuente de verdad comercial. Las
visitas son de solo lectura desde Vercel y no requieren tabla, migración ni caché local.

**Testing**: `node:test` mediante `npm.cmd run test:admin`, pruebas unitarias con
respuestas de Vercel simuladas, `npx.cmd tsc --noEmit`, ESLint y compilación de Next.js.

**Target Platform**: Aplicación web Next.js desplegada en Vercel; consultas a Vercel se
ejecutan únicamente en el servidor y la vista se renderiza dentro del panel protegido.

**Project Type**: Aplicación web full-stack con panel administrativo interno.

**Performance Goals**: La primera carga debe permitir identificar el resumen en menos de
10 segundos en una conexión normal. Las cinco lecturas máximas de Vercel —un conteo y
cuatro desgloses— se ejecutarán en paralelo, con timeout y sin bloquear las analíticas
comerciales si fallan.

**Constraints**: Token, proyecto y equipo de Vercel solo en variables de entorno del
servidor; producción como entorno único de esta versión; máximo 10 filas por desglose;
sin datos de visitantes individuales, query strings, eventos personalizados, Speed
Insights, Drains ni almacenamiento histórico local.

**Scale/Scope**: Una página administrativa, cuatro desgloses y hasta cinco solicitudes
de lectura por consulta de periodo. El cambio afecta el panel administrativo, sus
pruebas y la documentación de configuración; no afecta e-commerce, `/venta-rapida`,
checkout, ventas, inventario ni el esquema de Prisma.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*GATE: PASS*

- **I. Separación de superficies**: PASS. El cambio se limita al panel administrativo y
  no convierte `/venta-rapida` ni el e-commerce en consumidores de la integración.
- **II. Fuente única y consistencia**: PASS. No escribe ventas, inventario ni clientes;
  PostgreSQL sigue gobernando el dominio comercial y Vercel solo entrega lecturas
  agregadas de visitas.
- **III. Seguridad y privacidad**: PASS. `requireAdmin` protege la página, el acceso a
  Vercel será server-only, los secretos no llegan al navegador y se expone únicamente
  una proyección agregada sanitizada.
- **IV. Calidad verificable**: PASS. Se probarán parser de periodos, construcción de
  consultas, normalización, errores y regresión de las analíticas comerciales; además se
  ejecutarán lint, tipos y build.
- **V. Simplicidad y experiencia móvil**: PASS. Se reutilizan la página, componentes y
  estilos administrativos existentes; no se incorpora una base de datos de analítica,
  un webhook, una cola ni una biblioteca nueva.

## Project Structure

### Documentation (this feature)

```text
specs/004-analiticas-visitas-vercel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/vercel-web-analytics.md
└── tasks.md              # Fase posterior: $speckit-tasks
```

### Source Code (repository root)

```text
app/admin/analytics/page.tsx                           # Modificar: coordina ventas y visitas
components/admin/analiticas/analyticsFilters.tsx       # Mantener: filtros comerciales
components/admin/analiticas/analyticsDashboard.tsx    # Mantener: ventas y predictor
components/admin/analiticas/websiteVisitsFilters.tsx   # Añadir: periodo de visitas
components/admin/analiticas/websiteVisitsDashboard.tsx  # Añadir: resumen y desgloses
lib/admin/types.ts                                     # Añadir tipos de la proyección
lib/admin/visit-periods.ts                             # Añadir presets y fechas válidas
lib/admin/vercel-web-analytics.ts                      # Añadir cliente server-only y normalizador
lib/admin/website-visits.ts                            # Añadir orquestación y estados
tests/admin/website-visits.test.ts                     # Añadir pruebas sin base real ni Vercel
README.md                                              # Documentar variables y activación
```

**Structure Decision**: Se mantiene el monolito Next.js existente. La página de servidor
seguirá usando `Promise.all` para cargar productos y ventas, y añadirá una consulta de
visitas que captura sus propios errores. No se crea una ruta pública `/api`, porque el
formulario de periodo puede volver a renderizar la página protegida y así el token nunca
se expone al cliente.

## Design Flow

1. `app/admin/layout.tsx` conserva `requireAdmin`; la página de analíticas no introduce
   una segunda identidad ni un permiso nuevo.
2. `app/admin/analytics/page.tsx` separa los parámetros comerciales de los parámetros de
   visitas (`visitasPeriodo`, `visitasDesde`, `visitasHasta`) y resuelve ambos periodos.
3. `lib/admin/website-visits.ts` valida el intervalo, comprueba la configuración segura
   y ejecuta en paralelo el conteo y los cuatro agregados mediante
   `lib/admin/vercel-web-analytics.ts`.
4. El adaptador limita campos, normaliza números y rutas, elimina identificadores y
   convierte los errores externos al estado definido en `data-model.md`.
5. La página combina el resultado comercial existente con el resultado de visitas. Un
   fallo externo produce un estado local del bloque de visitas y no rechaza la página.
6. Los componentes nuevos reutilizan `admin-panel`, `admin-field`, `admin-table` y los
   patrones responsive actuales. El reintento conserva el intervalo mediante un GET del
   formulario.

## Constitution Check (post-design)

*GATE: PASS*

- No hay escritura persistente ni migración de datos comerciales.
- La autorización se mantiene del lado servidor y el token no cruza la frontera hacia
  componentes cliente.
- La superficie nueva es una lectura acotada, sin dependencia adicional, sin eventos
  personalizados y sin infraestructura auxiliar.
- La validación automatizada cubre estados válidos y fallidos, privacidad, periodos y
  regresión de las analíticas comerciales.

## Complexity Tracking

No aplica: no se introduce una violación constitucional ni un proyecto adicional. La
integración de solo lectura puede vivir en el panel y reutilizar la autenticación existente.
