# Implementation Plan: Rediseño de la pestaña Resumen con cuatro gráficos principales

**Branch**: `013-resumen-graficos` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-resumen-graficos/spec.md`

## Summary

La pestaña "Resumen" del panel (`/admin`) pasa a tener cuatro gráficos como contenido principal y conserva sus cuatro indicadores y los accesos rápidos:

- **Ventas por mes**: columnas de los últimos 12 meses, con un detalle por mes (monto, cantidad de ventas y ticket promedio).
- **Productos más vendidos**: los 5 con más unidades en los últimos 30 días, con unidades y monto.
- **Ventas por tipo de cliente**: consumidores frente a mayoristas en los últimos 30 días, por cantidad de ventas y por monto.
- **Visitas de la tienda**: visitantes por día de los últimos 30 días, con los totales del período.

Enfoque técnico:

- Las cifras de ventas salen de dos lecturas livianas y se agrupan en un módulo puro nuevo, con los cortes en hora de Caracas. El indicador "Ventas acumuladas" se calcula de las mismas filas, así que siempre coincide con el gráfico por tipo de cliente.
- Las visitas por día salen de la API de Vercel que ya se usa, con `by=day`; el riesgo que dejó abierto la especificación queda resuelto ([research.md](./research.md), Decisión 1). Llegan por streaming para no retrasar el resto de la página.
- Los dos gráficos con ejes usan Recharts, que ya está instalado; los otros dos son HTML y CSS.

No hay cambios de esquema, dependencias, rutas ni Server Actions. De paso se corrige el cálculo de "los últimos 30 días" del Resumen, que hoy usa la hora del servidor.

## Technical Context

**Language/Version**: TypeScript estricto, React 19.1 y Next.js 16.4.3 (App Router). Componentes de servidor, dos componentes de cliente y `<Suspense>` para el streaming.

**Primary Dependencies**: Prisma 6.17, Recharts 3.3.0, lucide-react y Tailwind 4, todas ya instaladas. Recharts estaba en `package.json` sin usarse. **Sin dependencias nuevas.**

**Storage**: PostgreSQL con Prisma, solo lectura. **Sin cambios de esquema ni migraciones** ([data-model.md](./data-model.md)). Las visitas se leen de la Web Analytics API de Vercel y no se guardan.

**Testing**: `node:test` con `npm.cmd run test:admin`:

- **Pruebas puras nuevas**: `tests/admin/dashboard-core.test.ts` (ventanas, meses, tipo de cliente y top 5).
- **Casos añadidos**: `resumirPorProducto` en `sales-calculations.test.ts` y la serie diaria en `website-visits.test.ts`, con `fetch` inyectado.
- **Sin pruebas de integración**: la función no escribe ni abre transacciones.

Además `npm.cmd run lint`, `npm.cmd run build` y el [quickstart.md](./quickstart.md) manual en escritorio y a 360 px.

**Target Platform**: navegadores modernos. El panel se usa en escritorio y en teléfono.

**Project Type**: aplicación web monolítica Next.js.

**Performance Goals**:

- **Ventas**: seis lecturas en paralelo; la mayor trae los pedidos de 12 meses con tres campos (unos pocos miles de filas) sobre el índice `[fechaCompra, estado]`. Objetivo: menos de 300 ms en el servidor.
- **Página**: indicadores y gráficos de ventas visibles en menos de 3 s, sin depender de Vercel (SC-004).
- **Visitas**: dos peticiones en paralelo con el límite existente de 8 s; solo afectan a su tarjeta.
- **JavaScript de cliente**: Recharts se carga únicamente en `/admin`.

**Constraints**:

- Solo lectura (FR-025); `requireAdmin` del layout en cada petición (FR-024).
- Cortes de ventas en `ZONA_HORARIA`, a partir de un único `ahora` por petición (FR-008).
- El token de Vercel no sale del servidor; los componentes de cliente reciben solo cifras agregadas.
- Colores, clases `admin-*` y fuentes existentes; UI en español; sin `toast` porque no hay acciones.
- Sin desplazamiento horizontal a 360 px (SC-006).

**Scale/Scope**: una página, cientos de pedidos al mes, 12 barras, 5 productos, 2 grupos y 30 días de visitas.

- **Superficie**: solo el panel administrativo.
- **Fuera de alcance**: selector de período, bolívares, exportación, cambios en `/admin/analytics/*` y la zona horaria de `lib/admin/periods.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la Constitución v2.1.0.

- [x] **I. Simplicidad ante todo (puerta de simplicidad)**:
  - **Alternativa más simple**:
    - **Gráficos**: la librería ya instalada para los dos que necesitan ejes y detalle accesible, y HTML con CSS para los dos que muestran todo a la vista.
    - **Datos**: una consulta de pedidos sirve a dos gráficos y a un indicador; se agrupa en memoria, sin SQL crudo.
    - **Períodos**: fijos, sin selector ni parámetros de URL.
    - **Visitas**: `<Suspense>` en la misma página, sin una ruta JSON ni lógica de carga en el navegador.
  - **Qué se reutiliza**:
    - fechas y períodos: `ZONA_HORARIA`, `fechaHoraLocalCaracas`, `interpretarFechaHoraCaracas` y `resolveVisitPeriod`;
    - visitas: `readVercelAnalyticsConfig`, `fetchVercelVisitCount`, el mapeo de errores, `messageForStatus` y `WebsiteVisitsStatus`;
    - ventas: `roundMoney`, `roundQuantity` y la regla de "Venta por producto";
    - presentación: `DashboardCard`, `formatUsd`, las clases `admin-*` y Recharts.
  - **Qué se añade y por qué**:
    - `lib/admin/dashboard-core.ts` (puro), según el patrón `*-core` con su contraparte de acceso a datos de los Principios II y V;
    - seis componentes en `components/admin/dashboard/`: un marco común con cuatro usos, cuatro gráficos y la sección asíncrona de visitas;
    - una regla extraída, `resumirPorProducto`: tiene dos usos, pero es una regla de negocio que debe vivir en un solo lugar;
    - tres funciones para la serie diaria en los módulos de visitas existentes.

    No hay dependencias, capas, servicios ni superficies nuevas.
  - **Qué se elimina**: `getDashboardSummary`, los dos paneles de enlaces y el indicador decorativo de la cabecera.
- [x] **II. Una sola fuente de verdad**:
  - No hay escrituras.
  - Las consultas viven en `lib/admin/dashboard.ts`, con el singleton `lib/prisma.ts`, y la lógica pura en `dashboard-core.ts`.
  - "Unidades y monto por producto" queda en una sola función para las analíticas y el Resumen.
  - El indicador de ventas y el gráfico por tipo de cliente salen del mismo cálculo.
  - `Transaccion.montoTotal` sigue siendo el monto canónico en USD.
- [x] **III. Superficies con límites claros**: solo cambia el **panel administrativo**. La tienda, la venta rápida y la cotización no se tocan, y nada cambia lo que una superficie persiste.
- [x] **IV. Seguridad del lado del servidor**:
  - La página vive bajo el layout que ejecuta `requireAdmin()`; no hay rutas, acciones ni descargas nuevas.
  - `VERCEL_ANALYTICS_TOKEN` se usa solo en módulos de servidor; los estados de error no muestran códigos ni cuerpos de respuesta.
  - Los gráficos reciben agregados: ni nombres, ni teléfonos, ni identificadores de visitantes.
- [x] **V. Pruebas proporcionales al riesgo**: son reportes de dinero, así que las reglas puras (cortes por mes, totales, porcentajes y ranking) llevan pruebas, igual que la normalización de la serie de visitas. Lo visual se valida con el quickstart.
- [ ] **Restricciones: fechas y horas (v2.1.0)**: se cumple en todas las cifras de ventas y se corrige el cálculo actual del Resumen. **Una desviación**: los días del gráfico de visitas los corta la fuente en UTC. Está justificada en *Complexity Tracking*.
- [x] **Restricciones: estilos**: solo colores, clases y fuentes existentes del panel ([research.md](./research.md), Decisión 7).

**Resultado de la puerta previa**: APROBADA, con una desviación justificada.

**Re-evaluación tras la fase 1**: APROBADA. El diseño de [data-model.md](./data-model.md) y de los [contratos](./contracts/) no añadió esquema, dependencias ni superficies. Tres ajustes respecto de la idea inicial:

- el top 5 y el gráfico por tipo de cliente dejaron de usar Recharts, porque todas sus cifras van a la vista (Decisión 3);
- los accesos rápidos pasan a la cabecera como botones, para que los gráficos queden a la vista (Decisión 9);
- los dos gráficos de Recharts llevan una tabla plegable con sus cifras, para que ningún valor dependa del detalle emergente (Decisión 8).

## Design Decisions

El detalle y las alternativas descartadas están en [research.md](./research.md). Las funciones y sus casos de prueba están en [contracts/datos.md](./contracts/datos.md) y la interfaz en [contracts/ui.md](./contracts/ui.md).

### Flujo de una petición a `/admin`

1. El layout ejecuta `requireAdmin()`.
2. La página toma `ahora` una sola vez y calcula `ventanasResumen(ahora)`: los 12 meses, los 30 días y el período de visitas.
3. Inicia `consultarVisitasDiarias({ period })` **sin esperarla** y guarda la promesa. La función nunca lanza.
4. Espera `consultarResumen(ventanas)`, que lee en paralelo los pedidos de 12 meses, las líneas de 30 días y los cuatro conteos, y los agrupa con las funciones puras.
5. Envía la cabecera, los indicadores y los tres gráficos de ventas. La tarjeta de visitas sale con su estado de carga.
6. Cuando la promesa de visitas se resuelve, `VisitsSection` llega por streaming con el gráfico o con el mensaje de su estado.

### Reparto entre servidor y cliente

| Pieza | Dónde corre | Motivo |
|---|---|---|
| Página, `ChartCard`, indicadores, accesos rápidos | Servidor | Sin interacción. |
| Top 5 y tipo de cliente | Servidor | Todas las cifras a la vista; no necesitan JavaScript. |
| Tablas "Ver cifras" | Servidor | HTML dentro de `<details>`. |
| `MonthlySalesChart` y `VisitsChart` | Cliente | Recharts mide el contenedor y maneja cursor, toque y teclado. |
| `VisitsSection` | Servidor, asíncrono | Espera a Vercel dentro de `<Suspense>`. |

Los componentes de cliente reciben arreglos serializables ya calculados (`VentasMes[]`, `VisitDay[]`) y no consultan nada.

### Antes de escribir código

`AGENTS.md` exige leer la guía de la versión instalada de Next.js. Para esta función:

- `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`

Y el paso 0 del [quickstart](./quickstart.md): confirmar la respuesta real de `by=day` antes de implementar el gráfico de visitas.

### Cambios por archivo

| Archivo | Cambio |
|---|---|
| `lib/admin/dashboard-core.ts` (**nuevo**) | `ventanasResumen`, `ventasPorMes`, `ventasPorTipoCliente` y `topProductos`, con sus tipos. Puro, sin `@/`. |
| `lib/admin/dashboard.ts` | `consultarResumen` y `ResumenPanel` reemplazan a `getDashboardSummary` y `DashboardSummary`. |
| `lib/admin/sales-calculations.ts` | `resumirPorProducto` (extraída de `analytics.ts`). |
| `lib/admin/analytics.ts` | `consultarAnaliticas` usa `resumirPorProducto`; sin cambio de comportamiento. |
| `lib/admin/vercel-web-analytics-core.ts` | `fetchVercelVisitSeries` y `normalizeVisitSeries`; `buildVercelAnalyticsUrl` acepta `day`. |
| `lib/admin/website-visits-core.ts` | `consultarVisitasDiarias` y `completarSerieDiaria`. |
| `lib/admin/types.ts` | `VisitDay` y `VisitasDiariasResult`. |
| `app/admin/page.tsx` | Nueva estructura: cabecera con accesos, indicadores, cuatro gráficos y `<Suspense>` para visitas. |
| `components/admin/dashboard/quickActions.tsx` | De panel con tarjetas a dos botones de cabecera. |
| `components/admin/dashboard/chartCard.tsx` (**nuevo**) | Marco común: encabezado, período, enlace y "Ver cifras". |
| `components/admin/dashboard/monthlySalesChart.tsx` (**nuevo**) | Columnas por mes con detalle (cliente, Recharts). |
| `components/admin/dashboard/topProductsChart.tsx` (**nuevo**) | Lista de hasta 5 productos con barra, unidades y monto. |
| `components/admin/dashboard/clientTypeChart.tsx` (**nuevo**) | Dos barras segmentadas y las cifras de cada grupo. |
| `components/admin/dashboard/visitsSection.tsx` (**nuevo**) | Espera las visitas y muestra el gráfico o el estado. |
| `components/admin/dashboard/visitsChart.tsx` (**nuevo**) | Área de visitantes por día con detalle (cliente, Recharts). |
| `tests/admin/dashboard-core.test.ts` (**nuevo**) | Los 17 casos del contrato de datos. |
| `tests/admin/sales-calculations.test.ts` | Casos de `resumirPorProducto`. |
| `tests/admin/website-visits.test.ts` | Los 8 casos de la serie diaria. |
| `CLAUDE.md`, `docs/descripcion-tecnica.md` | Documentan el Resumen: los cuatro gráficos, sus períodos, la regla compartida por producto y los días de visitas en UTC. |

## Project Structure

### Documentation (this feature)

```text
specs/013-resumen-graficos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── datos.md
│   └── ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
app/admin/
└── page.tsx                          # nueva estructura del Resumen
components/admin/dashboard/
├── dashboardCard.tsx                 # sin cambios
├── quickActions.tsx                  # botones de cabecera
├── chartCard.tsx                     # nuevo
├── monthlySalesChart.tsx             # nuevo (cliente)
├── topProductsChart.tsx              # nuevo
├── clientTypeChart.tsx               # nuevo
├── visitsSection.tsx                 # nuevo (servidor, asíncrono)
└── visitsChart.tsx                   # nuevo (cliente)
lib/admin/
├── dashboard-core.ts                 # nuevo (puro)
├── dashboard.ts                      # consultarResumen
├── sales-calculations.ts             # + resumirPorProducto
├── analytics.ts                      # usa resumirPorProducto
├── vercel-web-analytics-core.ts      # + serie diaria
├── website-visits-core.ts            # + consultarVisitasDiarias
└── types.ts                          # + VisitDay, VisitasDiariasResult
tests/admin/
├── dashboard-core.test.ts            # nuevo
├── sales-calculations.test.ts
└── website-visits.test.ts
```

**Structure Decision**: monolito Next.js existente. La lógica pura va en `lib/admin/dashboard-core.ts` y la lectura en `lib/admin/dashboard.ts`, como en `website-visits-core.ts` y `website-visits.ts`. Los componentes van en `components/admin/dashboard/`, que ya contiene los del Resumen, y las pruebas en `tests/admin/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Los días del gráfico de visitas se cortan en UTC y no en hora de Caracas (convención de fechas, v2.1.0). | Vercel agrupa por día en UTC y su API no admite zona horaria. El gráfico lo declara en una nota y formatea las etiquetas en UTC para no mostrar el día anterior. | Pedir el dato por hora y reagruparlo en días de Caracas da cifras incorrectas: los visitantes por hora no se pueden sumar para obtener visitantes por día. Además serían 720 filas frente a un máximo de 100 por consulta. |

Las demás adiciones (un módulo puro, seis componentes y una regla extraída) siguen patrones existentes y están explicadas en el *Constitution Check*.
