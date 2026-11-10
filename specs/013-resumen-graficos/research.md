# Investigación: rediseño de la pestaña Resumen con cuatro gráficos

**Fecha**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

La especificación dejó un riesgo abierto (el dato de visitas por día) y varias decisiones técnicas. Todas quedan resueltas aquí; no queda ningún `NEEDS CLARIFICATION`.

## Decisión 1: las visitas por día salen de la misma API, con `by=day`

**Decisión**: el gráfico de visitas consulta `visits/aggregate` con `by=day` para la serie diaria y `visits/count` para los totales del período. Son dos lecturas en paralelo, no las cinco de la página de visitas.

**Motivo**: la documentación de Vercel confirma que `by` acepta una granularidad de tiempo (`hour`, `day`, `week`, `month`, `year`) y que cada fila trae `timestamp`, `pageviews` y `visitors`. El total de visitantes del período no se puede obtener sumando los días (una persona que entra dos días contaría dos veces), así que el total sigue saliendo de `visits/count`, como hoy.

**Alternativas descartadas**:

- 30 lecturas de `visits/count`, una por día: 30 peticiones por cada apertura del Resumen.
- Guardar un histórico propio de visitas: fuera de alcance en la spec 004 y en esta.

**Por confirmar contra la API real** (primer paso del [quickstart](./quickstart.md)): que `limit` no agrupe días en "Others". La consulta envía `limit=100` (el máximo) para cubrir los 30 días en cualquier caso, y la normalización descarta toda fila sin `timestamp` válido.

**Ventana de reportes**: el plan Hobby de Vercel garantiza 1 mes de datos en las consultas agregadas; 30 días caben en cualquier plan.

**Referencias** (consultadas el 2026-11-10): [Query Web Analytics with the API](https://vercel.com/docs/analytics/web-analytics-api), [Aggregates page views](https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views), [Pricing for Web Analytics](https://vercel.com/docs/analytics/limits-and-pricing).

## Decisión 2: los días de visitas son los de la fuente (UTC)

**Decisión**: cada punto del gráfico de visitas es un día tal como lo corta Vercel, en hora universal. Las etiquetas de esos días se formatean en UTC y el gráfico lo indica en una nota. Las ventas sí se cortan en hora de Caracas (Decisión 4).

**Motivo**: la API no tiene parámetro de zona horaria; los `timestamp` llegan como `2026-11-10T00:00:00.000Z`. Si esa marca se formateara en hora de Caracas mostraría el día anterior.

**Alternativa descartada**: pedir `by=hour` y reagrupar en días de Caracas. Los visitantes por hora no se pueden sumar para obtener visitantes por día (misma razón que en la Decisión 1), y serían 720 filas frente a un `limit` máximo de 100.

**Consecuencia**: entre las 8:00 p. m. y la medianoche de Caracas, las visitas ya pertenecen al día siguiente de la fuente y aparecen en el gráfico después de medianoche. Es una desviación de la convención de fechas de la constitución y queda registrada en *Complexity Tracking* del plan.

## Decisión 3: Recharts para los dos gráficos con ejes; HTML y CSS para los otros dos

**Decisión**:

- **Ventas por mes** y **visitas** usan Recharts 3.3.0, que ya está en `package.json` y hasta ahora no se usaba en ningún archivo.
- **Top 5 de productos** y **ventas por tipo de cliente** son componentes de servidor con HTML y CSS, sin JavaScript en el navegador.

**Motivo**:

- Los dos primeros necesitan ejes con marcas, y un detalle que se abra con cursor, toque y teclado (FR-004, FR-012). Recharts lo trae resuelto: maneja eventos táctiles y su `accessibilityLayer` (activo por defecto en v3) permite recorrer las barras con las flechas del teclado.
- Los otros dos muestran todas sus cifras a la vista (FR-015, FR-021): 5 filas y 2 grupos. Una barra por fila en CSS es el mismo patrón que ya usa la tabla "Venta por producto" de las analíticas.
- Para dos partes de un todo, una barra segmentada se lee mejor que una dona de dos porciones, y permite mostrar a la vez el reparto por cantidad de ventas y por monto.

**Alternativas descartadas**:

- Recharts para los cuatro: añade JavaScript de cliente donde no hay nada que explorar.
- SVG propio para los cuatro: habría que escribir a mano las escalas de los ejes y el detalle accesible, más código que usar la dependencia instalada.
- Otra librería de gráficos: una dependencia nueva sin necesidad (Principio I).

**Verificado en `node_modules/recharts` (3.3.0)**: exporta `BarChart`, `AreaChart`, `Bar`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Cell`, `LabelList` y `ResponsiveContainer`; `accessibilityLayer` es `true` por defecto; `Bar` acepta `maxBarSize`; es compatible con React 19.

## Decisión 4: agrupar las ventas en memoria con funciones puras, en hora de Caracas

**Decisión**: una sola consulta trae los pedidos no cancelados de los últimos 12 meses con tres campos (`fechaCompra`, `montoTotal` y el tipo del cliente). Un módulo puro nuevo, `lib/admin/dashboard-core.ts`, los agrupa por mes, por tipo de cliente y calcula los indicadores.

**Motivo**:

- La ventana de 12 meses contiene la de 30 días, así que el gráfico por mes, el de tipo de cliente y el indicador "Ventas acumuladas" salen de las mismas filas. FR-023 (la suma de los grupos coincide con el indicador) se cumple por construcción.
- La regla de corte por mes en hora de Caracas queda en una función pura, que se prueba sin base de datos (Principio V).
- El índice `@@index([fechaCompra, estado])` cubre el filtro. Con cientos de pedidos al mes, son unos pocos miles de filas livianas.

**Alternativa descartada**: SQL crudo con `date_trunc(... AT TIME ZONE 'America/Caracas')`. Agrupa en la base, pero saca la regla de fechas del código probado y añade la primera consulta cruda de `lib/admin`.

**Ventanas** (todas calculadas a partir de un único `ahora`):

- **30 días**: se reutiliza `resolveVisitPeriod({ preset: "30d" })`, que ya calcula hoy y los 29 días anteriores como fechas de Caracas y está probado. El mismo período alimenta los gráficos 2, 3 y 4, y su etiqueta.
- **12 meses**: del primer día del mes de hace 11 meses al final del día de hoy.
- Las fechas se convierten a instantes con `interpretarFechaHoraCaracas` y se leen con `fechaHoraLocalCaracas` (`lib/format.ts`).

**Corrección incluida**: `getDashboardSummary` calcula hoy los 30 días con la hora del servidor (`setHours(0, 0, 0, 0)`), contra la constitución v2.1.0. Se reemplaza por la ventana de Caracas (FR-008).

## Decisión 5: una sola regla para "unidades y monto por producto"

**Decisión**: la agregación por producto que hoy está escrita dentro de `consultarAnaliticas` se extrae a una función pura, `resumirPorProducto`, en `lib/admin/sales-calculations.ts`, junto a `resumirPorTipoPrecio`. La usan las analíticas de ventas y el top 5.

**Motivo**: FR-015 exige la misma regla que la tabla "Venta por producto". Con dos copias, tarde o temprano las cifras del Resumen y de las analíticas dejarían de coincidir. Es una regla de negocio que debe vivir en un solo lugar (Principios I y II), aunque tenga dos usos y no tres.

**Alternativa descartada**: llamar a `consultarAnaliticas` desde el Resumen. Exige un `AnalyticsPeriod` de tipo semana o mes, que "últimos 30 días" no es, y trae cada producto completo por cada línea.

**Efecto en las analíticas**: ninguno visible. El redondeo pasa de `Math.round(x * 100) / 100` a `roundMoney`, que es el que ya usa `resumirPorTipoPrecio`.

## Decisión 6: las visitas llegan por streaming y no bloquean el resto

**Decisión**: el gráfico de visitas es un componente de servidor asíncrono envuelto en `<Suspense>`. La página espera solo los datos de ventas; la consulta a Vercel se inicia antes, sin esperarla, y su resultado llega cuando esté listo.

**Motivo**: FR-020 y SC-004 piden que los indicadores y los tres gráficos de ventas se vean aunque la fuente de visitas tarde o falle. La consulta a Vercel tiene un límite de 8 segundos por petición; con `<Suspense>`, ese tiempo solo afecta a su tarjeta. `consultarVisitasDiarias` nunca lanza: devuelve un estado, como `consultarAnaliticasVisitas`.

**Alternativas descartadas**:

- Esperar todo en la página: una fuente lenta retrasa hasta 8 segundos el Resumen completo.
- Una ruta JSON consumida desde el navegador: añade una superficie que autorizar (descartada también en la spec 004).

**Referencia**: guía de streaming de la versión instalada, `node_modules/next/dist/docs/01-app/02-guides/streaming.md` (Next.js 16.4.3). `AGENTS.md` exige leer la guía correspondiente antes de escribir código.

## Decisión 7: colores del panel, validados

**Decisión**: los gráficos usan solo colores que ya existen en el panel.

| Uso | Color | Origen |
|---|---|---|
| Barras de ventas y del top 5; grupo "Consumidores" | `#a57c2f` | Dorado oscuro de las cifras del panel |
| Línea y área de visitas | `#66735f` | `--admin-olive` |
| Grupo "Mayoristas" | `#587487` | Azul de `DashboardCard` |
| Cuadrícula y ejes | `#dedfd6` | `--admin-line` |
| Texto de ejes y etiquetas | `#707970` y `#18211d` | `--admin-muted` y `--admin-ink` |

**Motivo y validación**:

- `--admin-brass` (`#c8a45d`) no sirve para las marcas: su contraste con el panel es 2,31:1, por debajo del mínimo de 3:1. `#a57c2f` da 3,73:1 y `#66735f` 4,93:1.
- El único gráfico con dos series es el de tipo de cliente. El par `#a57c2f` + `#587487` supera la separación para daltonismo (ΔE 14,2) y para visión normal (ΔE 16,3). El par dorado + oliva no: ΔE 11,7 en visión normal.
- El validador marca que el azul es poco saturado. Se acepta: la paleta del panel es apagada a propósito, la constitución no permite añadir colores, y la identidad nunca depende solo del color (cada grupo lleva su nombre y sus cifras al lado).

**Alternativa descartada**: una paleta nueva de gráficos, más saturada. Crea un sistema de color paralelo al de `DESIGN.md`.

## Decisión 8: las cifras nunca dependen solo del detalle emergente

**Decisión**: los dos gráficos de Recharts llevan debajo un bloque plegable "Ver cifras" con una tabla HTML de los mismos datos, generada en el servidor. Además, el mes con más ventas lleva su monto escrito sobre la barra.

**Motivo**: un detalle emergente no puede ser la única forma de leer un valor (lectores de pantalla, impresión, pantallas donde el toque es impreciso). La etiqueta del mes máximo responde SC-001 sin interactuar.

## Decisión 9: los accesos rápidos pasan a la cabecera

**Decisión**: "Registrar venta" y "Agregar producto" se convierten en dos botones en la cabecera de la pestaña, en el lugar del indicador decorativo "Datos del sistema actualizados", que se retira.

**Motivo**: FR-002 conserva los accesos rápidos y FR-001 pide que los gráficos sean el contenido principal. El panel de accesos actual ocupa unos 190 px entre los indicadores y los gráficos; como botones, los gráficos quedan a la vista sin desplazarse.

**Alternativa descartada**: dejar el panel de accesos debajo de los gráficos. Aleja una acción de uso diario.

## Lo que no cambia

- Sin cambios de esquema, migraciones, dependencias, rutas ni Server Actions.
- `/admin/analytics/sales` y `/admin/analytics/visits` conservan su comportamiento. Los períodos de las analíticas de ventas (`lib/admin/periods.ts`) siguen calculándose con la hora del servidor; corregirlos queda fuera del alcance de esta función.
