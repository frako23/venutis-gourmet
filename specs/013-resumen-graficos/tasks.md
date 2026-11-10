---

description: "Task list for the redesigned admin Summary tab with four main charts"
---

# Tasks: Rediseño de la pestaña Resumen con cuatro gráficos principales

**Input**: Design documents from `/specs/013-resumen-graficos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/datos.md](./contracts/datos.md), [contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen porque los gráficos reportan dinero (Constitución v2.1.0, Principio V). [contracts/datos.md](./contracts/datos.md) define los casos. Todas son **pruebas puras**, sin base de datos, en `npm.cmd run test:admin`:

- `tests/admin/dashboard-core.test.ts` (nuevo);
- `tests/admin/sales-calculations.test.ts`;
- `tests/admin/website-visits.test.ts`.

No hay pruebas de integración: la función solo lee. Los gráficos se validan a mano con [quickstart.md](./quickstart.md).

**Organization**: Las tareas se agrupan por historia de usuario de la spec:

- **US1 (P1)**: ventas por mes en columnas.
- **US2 (P2)**: los 5 productos más vendidos.
- **US3 (P2)**: ventas por tipo de cliente.
- **US4 (P3)**: visitas de la tienda.

**Convenciones que aplican a todas las tareas**:

- textos en español; clases `admin-*` y solo los colores de [research.md](./research.md), Decisión 7: `#a57c2f` (dorado), `#66735f` (oliva), `#587487` (azul), `#dedfd6` (líneas), `#707970` y `#18211d` (texto);
- las fechas de ventas se cortan siempre con `ZONA_HORARIA` (`lib/format.ts`), a partir de un único `ahora` por petición; nunca `setHours`, `getMonth` ni `toISOString().slice(...)` sobre un instante;
- los meses y los días se formatean con `Intl.DateTimeFormat("es-VE", { …, timeZone: "UTC" })` sobre fechas de calendario (`"2026-11-01T00:00:00Z"`), y se les quita el punto final que agrega `es-VE` ("nov." → "nov");
- montos con `formatUsd` de `lib/format.ts`;
- los módulos de `lib/admin/` que importan las pruebas no usan `@/`: los imports de valores van relativos con extensión `.ts` y los de tipos con `import type … from "./types.js"`, como `lib/admin/visit-periods.ts`;
- los componentes de Recharts llevan `"use client"`, `isAnimationActive={false}` y reciben datos ya calculados; no consultan nada;
- no hay acciones: no se usa `toast`, ni `localStorage`, ni el store de checkout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario de la tarea (US1, US2, US3, US4).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fijar la línea base y los datos de prueba. No hay dependencias nuevas ni migraciones.

- [X] T001 Preparar la línea base:
  - Crear la rama `013-resumen-graficos` desde `main`.
  - Confirmar que `DATABASE_URL` de `.env` apunta a una base de **desarrollo**, nunca a la de producción.
  - Ejecutar `npm.cmd run lint`, `npm.cmd run test:admin` y `npm.cmd run test:checkout`, y anotar el resultado base en este archivo, junto a esta tarea.
- [X] T002 [P] Leer las guías de la versión instalada de Next.js 16.4.3, como exige `AGENTS.md`:
  - `node_modules/next/dist/docs/01-app/02-guides/streaming.md` (sección "Granular streaming with `<Suspense>`");
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (límite servidor/cliente y props serializables).

  Anotar aquí cualquier diferencia con lo que asume [plan.md](./plan.md) ("Flujo de una petición a `/admin`"). Si la hay, detenerse y revisar el plan.
- [X] T003 [P] Crear en la base de desarrollo los datos del [quickstart](./quickstart.md), sección 2, usando "Registrar venta" (`/admin/add-transaction`) o un script desechable fuera del repo:
  - un cliente consumidor (`tipoCliente: "detal"`) y uno mayorista;
  - 6 productos con existencia;
  - ventas en al menos 3 meses distintos;
  - una venta el último día del mes pasado a las 21:00 de Caracas;
  - en los últimos 30 días: ventas a los dos tipos de cliente que incluyan los 6 productos con cantidades distintas, una venta al mayorista con líneas a precio detal y un pedido que luego se cancela.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Las ventanas de fechas en hora de Caracas, el cálculo por tipo de cliente (del que sale el indicador "Ventas acumuladas", FR-023), la lectura de datos, el marco común de las tarjetas y la nueva estructura de la página.

**⚠️ CRITICAL**: Ninguna historia empieza antes de completar esta fase.

- [X] T004 [P] Crear `tests/admin/dashboard-core.test.ts` (`node:test` + `node:assert/strict`, importando `../../lib/admin/dashboard-core.js`) con los casos 1, 2, 3, 9, 10, 11 y 12 de [contracts/datos.md](./contracts/datos.md#casos-que-deben-cubrir-las-pruebas-testsadmindashboard-coretestts):
  - **1**: `ventanasResumen(new Date("2026-11-10T19:00:00Z"))` → `hoy` `"2026-11-10"`; `meses` de `"2025-12"` a `"2026-11"` (12 claves); `periodo30Dias.since` `"2026-10-12"` y `.until` `"2026-11-10"`; `desde30Dias.toISOString()` `"2026-10-12T04:00:00.000Z"`; `hasta.toISOString()` `"2026-11-11T04:00:00.000Z"`; `desdeMeses.toISOString()` `"2025-12-01T04:00:00.000Z"`.
  - **2**: `ventanasResumen(new Date("2026-11-01T02:00:00Z"))` → `hoy` `"2026-10-31"` y `meses[11]` `"2026-10"`.
  - **3**: con `ahora` en enero de 2026, `meses` va de `"2025-02"` a `"2026-01"`, sin repetidos.
  - **9**: 7 pedidos `detal` que suman 210 y 3 `mayorista` que suman 540, todos dentro de los 30 días → `[{ tipoCliente: "detal", etiqueta: "Consumidores", cantidadVentas: 7, totalUsd: 210, porcentajeDelMonto: 28, porcentajeDeVentas: 70 }, { tipoCliente: "mayorista", etiqueta: "Mayoristas", cantidadVentas: 3, totalUsd: 540, porcentajeDelMonto: 72, porcentajeDeVentas: 30 }]`.
  - **10**: solo pedidos `detal` → mayoristas con ceros; consumidores con 100 y 100.
  - **11**: pedidos solo de hace 2 meses → los dos grupos en cero, porcentajes en 0.
  - **12**: un pedido en `desde30Dias − 1 ms` no cuenta; uno en `desde30Dias` sí; uno en `hasta` no.

  Deben fallar hasta completar T005.
- [X] T005 Crear `lib/admin/dashboard-core.ts` (puro, sin `@/`). Imports: `fechaHoraLocalCaracas` e `interpretarFechaHoraCaracas` de `"../format.ts"`; `resolveVisitPeriod` de `"./visit-periods.ts"`; `roundMoney` de `"./sales-calculations.ts"`; `import type { VisitPeriod } from "./types.js"`. Define los tipos `PedidoResumen`, `VentanasResumen` y `VentasTipoCliente` tal como están en [contracts/datos.md](./contracts/datos.md#1-reglas-puras-libadmindashboard-corets-nuevo), y dos funciones:
  - **`ventanasResumen(ahora: Date): VentanasResumen`**:
    - `hoy = fechaHoraLocalCaracas(ahora).slice(0, 10)`;
    - `periodo30Dias = resolveVisitPeriod({ preset: "30d", reference: ahora })`;
    - `desde30Dias = interpretarFechaHoraCaracas(`${periodo30Dias.since}T00:00`)`;
    - `hasta` = 00:00 de Caracas del día siguiente a `hoy` (calcular el día con `Date.UTC(año, mes - 1, día + 1)` y pasarlo por `interpretarFechaHoraCaracas`);
    - `meses`: para `i` de 11 a 0, `new Date(Date.UTC(año, mes - 1 - i, 1)).toISOString().slice(0, 7)`;
    - `desdeMeses = interpretarFechaHoraCaracas(`${meses[0]}-01T00:00`)`.

    Si alguna conversión devuelve `null`, lanzar un `Error` (no debería ocurrir con fechas válidas).
  - **`ventasPorTipoCliente(pedidos, ventanas): VentasTipoCliente[]`**: filtra `desde30Dias ≤ fechaCompra < hasta` (no confía en que la lista venga filtrada), cuenta y suma `montoTotal` por `tipoCliente`, redondea con `roundMoney` y calcula los porcentajes con un decimal: `Math.round((parte / total) * 1000) / 10`, o 0 si el total es 0. "Siempre son 2 elementos, en el orden consumidores y luego mayoristas, aunque un grupo esté en cero." (`detal` → "Consumidores"; `mayorista` → "Mayoristas").
- [X] T006 Reescribir `lib/admin/dashboard.ts`: reemplazar `getDashboardSummary` y `DashboardSummary` por `consultarResumen(ventanas: VentanasResumen): Promise<ResumenPanel>`, con el singleton `prisma` de `@/lib/prisma`. En esta fase `ResumenPanel` tiene `periodo30Dias`, `mesActual` (`ventanas.meses[11]`), `indicadores` y `ventasPorTipoCliente`; US1 y US2 le agregan `ventasPorMes` y `topProductos`. Un único `Promise.all` con:
  - **pedidos de 12 meses**: `prisma.transaccion.findMany({ where: { fechaCompra: { gte: desdeMeses, lt: hasta }, estado: { not: "cancelado" } }, select: { fechaCompra: true, montoTotal: true, cliente: { select: { tipoCliente: true } } } })`, convertidos a `PedidoResumen`;
  - **los conteos actuales, sin cambiar su regla**: pedidos abiertos (`estado` en `por_cobrar`, `en_pedido`, `pendiente`), alertas de inventario (`inventario ≤ 5`) y clientes mayoristas;
  - **notas de entrega** con `fechaEntrega ≥ desde30Dias` (antes usaba la hora del servidor).

  `indicadores.ventasUsd` y `ventasCantidad` son la suma de los dos grupos de `ventasPorTipoCliente` (FR-023), redondeada con `roundMoney`; no hay una consulta aparte.
- [X] T007 [P] Crear `components/admin/dashboard/chartCard.tsx` (componente de servidor) según [contracts/ui.md](./contracts/ui.md#chartcard):
  - props `eyebrow`, `titulo`, `periodo`, `enlace?: { href: string; texto: string }`, `children` y `cifras?: React.ReactNode`;
  - `<section className="admin-panel min-w-0 p-5" aria-labelledby={id}>`, con el `id` derivado del título (o con `useId`);
  - encabezado: `<p className="admin-eyebrow">`, `<h2 id={id} className="mt-1 text-lg font-bold text-[#18211d]">` y el período en `text-xs text-[#707970]`; el enlace (con `next/link`) va arriba a la derecha, en `text-sm font-bold text-[#66735f] hover:text-[#18211d]`, con "↗" `aria-hidden`;
  - si hay `cifras`, se muestran debajo dentro de `<details className="mt-4">` con `<summary>` "Ver cifras".
- [X] T008 [P] Reescribir `components/admin/dashboard/quickActions.tsx`: en lugar del panel con dos tarjetas, dos enlaces (`next/link`) en una fila con `flex flex-wrap gap-2`:
  - "Registrar venta" → `/admin/add-transaction`, clase `admin-button-primary`, icono `ReceiptText`;
  - "Agregar producto" → `/admin/add-product`, clase `admin-button-secondary`, icono `PackagePlus`.

  Iconos de 16 px con `aria-hidden`. Retirar `ArrowRight` y los textos de descripción.
- [X] T009 Reestructurar `app/admin/page.tsx` según [contracts/ui.md](./contracts/ui.md#1-estructura-de-la-página):
  - Tomar `const ahora = new Date()` una sola vez, calcular `ventanasResumen(ahora)` y esperar `consultarResumen(ventanas)`.
  - **Cabecera**: eyebrow "Visión general" (sin "· últimos 30 días"); se conservan el título "Control de operación" y el subtítulo; a la derecha va `<QuickActions />` en lugar del indicador "Datos del sistema actualizados", que se retira.
  - **Indicadores**: los cuatro `DashboardCard` actuales. "Ventas acumuladas" muestra `formatUsd(indicadores.ventasUsd)` con el texto de apoyo "`{ventasCantidad}` ventas · últimos 30 días"; los demás conservan sus textos.
  - Retirar la sección de los dos paneles "Analítica de ventas" y "Documentos mayoristas", y los imports que queden sin uso (`BarChart3`, `FileText`, `Link`).
  - Dejar debajo de los indicadores dos contenedores vacíos, listos para las historias: **Fila A** (`grid gap-4 xl:grid-cols-3`) y **Fila B** (`grid gap-4 lg:grid-cols-2`). Cada hijo de las filas lleva `min-w-0` para que los gráficos no desborden a 360 px.

  Depende de T005, T006 y T008.

**Checkpoint**: T004 en verde. `/admin` muestra la cabecera con los dos botones y los cuatro indicadores. "Ventas acumuladas" coincide con la suma a mano de los pedidos no cancelados de los últimos 30 días en hora de Caracas.

---

## Phase 3: User Story 1 - Ver las ventas de cada mes en un gráfico de barras (Priority: P1) 🎯 MVP

**Goal**: Columnas con lo vendido en cada uno de los últimos 12 meses, con un detalle por mes (monto, cantidad de ventas y ticket promedio) que se abre con cursor, toque o teclado.

**Independent Test**: Con pedidos en varios meses, el Resumen muestra 12 columnas; al señalar una aparecen el mes, el monto, la cantidad de ventas y el ticket promedio, y coinciden con los pedidos no cancelados de ese mes ([quickstart.md](./quickstart.md), Historia 1).

**Depends on**: Foundational.

### Tests for User Story 1

- [X] T010 [P] [US1] Agregar a `tests/admin/dashboard-core.test.ts` los casos 4 a 8 y 13 de [contracts/datos.md](./contracts/datos.md#casos-que-deben-cubrir-las-pruebas-testsadmindashboard-coretestts), con `ventanas = ventanasResumen(new Date("2026-11-10T19:00:00Z"))`:
  - **4**: un pedido en `2026-11-01T01:00:00Z` (31 de octubre, 9:00 p. m. en Caracas) cuenta en `"2026-10"`, no en `"2026-11"`;
  - **5**: un mes sin pedidos tiene `totalUsd` 0, `cantidadVentas` 0 y `ticketPromedioUsd` 0;
  - **6**: tres pedidos de 10, 20 y 30,50 en el mismo mes → `totalUsd` 60.5, `cantidadVentas` 3, `ticketPromedioUsd` 20.17;
  - **7**: lista vacía → 12 elementos en cero, en orden, solo el último con `enCurso: true`; `etiqueta` del último `"noviembre de 2026"` y `etiquetaCorta` `"nov"`;
  - **8**: un pedido en `hasta` y otro en `desdeMeses − 1 ms` no cuentan;
  - **13**: con los mismos pedidos, la suma de `ventasPorTipoCliente` nunca supera la de `ventasPorMes`.

  Deben fallar hasta completar T011.

### Implementation for User Story 1

- [X] T011 [US1] Agregar a `lib/admin/dashboard-core.ts` el tipo `VentasMes` y la función `ventasPorMes(pedidos, ventanas): VentasMes[]`:
  - filtra `desdeMeses ≤ fechaCompra < hasta`;
  - la clave del mes es `fechaHoraLocalCaracas(fechaCompra).slice(0, 7)`;
  - "Siempre son 12 elementos en orden cronológico; un mes sin ventas aparece con ceros." (uno por cada clave de `ventanas.meses`);
  - `totalUsd` con `roundMoney`; `ticketPromedioUsd` = "`totalUsd ÷ cantidadVentas`; 0 si no hubo ventas", redondeado con `roundMoney`;
  - `etiqueta`: `Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric", timeZone: "UTC" })` sobre `${mes}-01T00:00:00Z` ("noviembre de 2026");
  - `etiquetaCorta`: el mismo formateador con `{ month: "short", timeZone: "UTC" }`, sin el punto final ("nov");
  - `enCurso`: "`true` solo en el mes de hoy" (`mes === ventanas.meses[11]`).
- [X] T012 [US1] En `lib/admin/dashboard.ts`, agregar `ventasPorMes: VentasMes[]` a `ResumenPanel`, calculado con `ventasPorMes(pedidos, ventanas)` sobre la misma lista de pedidos de 12 meses (sin otra consulta). Depende de T011.
- [X] T013 [P] [US1] Crear `components/admin/dashboard/monthlySalesChart.tsx` (`"use client"`), con la prop `meses: VentasMes[]`, según [contracts/ui.md](./contracts/ui.md#4-gráfico-1-ventas-por-mes):
  - contenedor `<div className="h-[260px] w-full">` con `ResponsiveContainer width="100%" height="100%"` y un `BarChart` con `data={meses}` y márgenes chicos;
  - `CartesianGrid vertical={false} stroke="#dedfd6"`;
  - `XAxis dataKey="mes"` con `tickLine={false}`, `stroke="#dedfd6"`, ticks en `#707970` a 12 px y un `tickFormatter` que muestra `etiquetaCorta` y agrega el año con dos dígitos al primer mes y a cada enero ("ene 26");
  - `YAxis` con `axisLine={false}`, `tickLine={false}`, ancho de unos 52 px y `tickFormatter` `(v) => v.toLocaleString("es-VE", { maximumFractionDigits: 0 })`;
  - `Bar dataKey="totalUsd"` con `fill="#a57c2f"`, `maxBarSize={24}`, `radius={[4, 4, 0, 0]}` e `isAnimationActive={false}`; un `Cell` por mes con `fillOpacity={mes.enCurso ? 0.45 : 1}`;
  - **etiqueta directa**: solo la barra del mes con mayor `totalUsd` (si es mayor que 0) lleva su monto encima, con `LabelList` y un `content` que dibuja el texto solo en ese índice, en `#18211d` a 11 px;
  - **`Tooltip`** con `cursor={{ fill: "#f4f1e8" }}` y un `content` propio, tipado con `TooltipContentProps` de Recharts 3, que toma `payload[0].payload` como `VentasMes` y muestra, dentro de un recuadro `admin-panel` con `px-3 py-2 text-sm`:
    - "`{etiqueta}`" y, si `enCurso`, " · en curso", en `#707970`;
    - el monto con `formatUsd`, en negrita, en `admin-mono` y `#18211d`;
    - "`{cantidadVentas}` ventas · ticket promedio `{formatUsd(ticketPromedioUsd)}`", o "Sin ventas" si `cantidadVentas` es 0;
  - se deja activo `accessibilityLayer` (es el valor por defecto) para recorrer los meses con las flechas;
  - nota al pie en `text-xs text-[#707970]`: "La barra más clara es el mes en curso, con ventas hasta hoy.".

  Depende de T011 (tipo `VentasMes`).
- [X] T014 [US1] En `app/admin/page.tsx`, agregar a la **Fila A** (`xl:col-span-2`) un `ChartCard` con eyebrow "Evolución", título "Ventas por mes", período "Últimos 12 meses · montos en USD" y enlace "Ver analíticas" a `/admin/analytics/sales?mes=${resumen.mesActual}`:
  - si todos los meses tienen `cantidadVentas` 0, el contenido es el mensaje "Aún no hay ventas registradas en los últimos 12 meses." (en `rounded-lg border border-dashed border-[#dedfd6] p-8 text-center text-sm text-[#707970]`), sin gráfico ni `cifras`;
  - si no, el contenido es `<MonthlySalesChart meses={resumen.ventasPorMes} />`, y `cifras` es una tabla `admin-table` (función local de la página `TablaVentasMes`) con las columnas Mes, Monto, Ventas y Ticket promedio, los 12 meses y los números en `admin-mono`.

  Depende de T012 y T013.

**Checkpoint**: T010 en verde. Los pasos 1 a 8 de la Historia 1 del quickstart pasan, incluidos el pedido de las 21:00 del último día del mes y el recorrido con el teclado.

---

## Phase 4: User Story 2 - Conocer los 5 productos más vendidos (Priority: P2)

**Goal**: Los 5 productos con más unidades vendidas en los últimos 30 días, con sus unidades y su monto a la vista.

**Independent Test**: Con ventas de 6 productos en los últimos 30 días, el Resumen muestra exactamente los 5 de más unidades, de mayor a menor, cada uno con unidades y monto; el sexto no aparece ([quickstart.md](./quickstart.md), Historia 2).

**Depends on**: Foundational. Es independiente de US1, salvo por compartir archivos (ver "Dependencies & Execution Order").

### Tests for User Story 2

- [X] T015 [P] [US2] Agregar a `tests/admin/sales-calculations.test.ts` (importando `resumirPorProducto` de `../../lib/admin/sales-calculations.js`) los casos de [contracts/datos.md](./contracts/datos.md#2-regla-extraída-resumirporproducto-en-libadminsales-calculationsts):
  - dos líneas del mismo producto (2 × 5 y 1,5 × 5) dan `cantidadVendida` 3.5 y `totalUsd` 17.5;
  - una línea a precio 0 suma unidades y no suma monto;
  - `porcentajeDelTotal` es 0 cuando el `totalUsd` recibido es 0;
  - el resultado sale ordenado por `totalUsd` descendente.

  Deben fallar hasta completar T017.
- [X] T016 [P] [US2] Agregar a `tests/admin/dashboard-core.test.ts` los casos 14 a 17 de `topProductos`:
  - **14**: 6 productos con unidades distintas → los 5 de más unidades, de mayor a menor;
  - **15**: dos productos con las mismas unidades → primero el de mayor `totalUsd`;
  - **16**: 3 productos → 3 elementos; lista vacía → lista vacía;
  - **17**: un producto con 2,5 unidades conserva `cantidadVendida` 2.5.

  Deben fallar hasta completar T019.

### Implementation for User Story 2

- [X] T017 [US2] Agregar a `lib/admin/sales-calculations.ts`, junto a `resumirPorTipoPrecio`, la función `resumirPorProducto(lines: Array<{ productoId: number; nombre: string; cantidad: number; precioUnitario: number }>, totalUsd: number): AnalyticsProductRow[]` (`import type { AnalyticsProductRow } from "./types.js"`). Es el cálculo que hoy está dentro de `consultarAnaliticas`: agrupa por `productoId`, suma `cantidad` y `precioUnitario × cantidad`, redondea con `roundQuantity` y `roundMoney`, calcula `porcentajeDelTotal = totalUsd ? Math.round((totalProducto / totalUsd) * 10000) / 100 : 0` y ordena por `totalUsd` descendente.
- [X] T018 [US2] En `lib/admin/analytics.ts`, reemplazar el `Map` y el `.map(...).sort(...)` de `porProducto` por `resumirPorProducto(lines.map((line) => ({ productoId: line.productoId, nombre: line.producto.nombre, cantidad: line.cantidad, precioUnitario: line.precioUnitario })), totalUsd)`. Quitar los imports que queden sin uso. La tabla "Venta por producto" de `/admin/analytics/sales` no debe cambiar. Depende de T017.
- [X] T019 [US2] Agregar a `lib/admin/dashboard-core.ts` el tipo `ProductoTop` y la función `topProductos(porProducto: AnalyticsProductRow[], limite = 5): ProductoTop[]` (`import type` de `"./types.js"`): ordena una copia por `cantidadVendida` descendente y, ante un empate, por `totalUsd` descendente; toma los primeros `limite` y devuelve `{ productoId, nombre, cantidadVendida, totalUsd }`. "Como máximo 5 elementos, ordenados por `cantidadVendida` descendente; ante un empate, por `totalUsd` descendente."
- [X] T020 [US2] En `lib/admin/dashboard.ts`, agregar al `Promise.all` las líneas de los últimos 30 días: `prisma.detalleCompra.findMany({ where: { transaccion: { fechaCompra: { gte: desde30Dias, lt: hasta }, estado: { not: "cancelado" } } }, select: { productoId: true, cantidad: true, precioUnitario: true, producto: { select: { nombre: true } } } })`. Agregar `topProductos: ProductoTop[]` a `ResumenPanel`, calculado con `topProductos(resumirPorProducto(lineas, totalLineas))`, donde `totalLineas` es la suma de `precioUnitario × cantidad` redondeada con `roundMoney`. Depende de T017 y T019.
- [X] T021 [P] [US2] Crear `components/admin/dashboard/topProductsChart.tsx` (componente de servidor), con la prop `productos: ProductoTop[]`, según [contracts/ui.md](./contracts/ui.md#5-gráfico-2-productos-más-vendidos):
  - un `<ol className="space-y-4">` con una fila por producto;
  - en cada fila: la posición en `admin-mono text-[#707970]`; el nombre en `font-bold text-[#18211d]` con `line-clamp-2` y `title={nombre}`; a la derecha, las unidades en negrita (`cantidadVendida.toLocaleString("es-VE", { maximumFractionDigits: 2 })` + " uds") y debajo el monto con `formatUsd`, ambos en `admin-mono`;
  - debajo del nombre, una barra con fondo `bg-[#e8e4d9]`, de 10 px de alto y `rounded-full`, con un relleno `bg-[#a57c2f] rounded-full` de ancho `max(3, cantidadVendida / mayorCantidad × 100)` %;
  - si la lista está vacía, el mensaje "No hubo ventas de productos en este período." con el estilo de vacío de T014.

  Depende de T019 (tipo `ProductoTop`).
- [X] T022 [US2] En `app/admin/page.tsx`, agregar a la **Fila B** un `ChartCard` con eyebrow "Lo que más sale", título "Productos más vendidos", período `${resumen.periodo30Dias.label} · por unidades` y enlace "Ver todos los productos" a `/admin/analytics/sales`, con `<TopProductsChart productos={resumen.topProductos} />` y sin `cifras`. Depende de T020 y T021.

**Checkpoint**: T015 y T016 en verde. Los pasos 1 a 5 de la Historia 2 del quickstart pasan, y `/admin/analytics/sales` muestra las mismas cifras por producto que antes del cambio.

---

## Phase 5: User Story 3 - Comparar las ventas a consumidores y a mayoristas (Priority: P2)

**Goal**: Cuántas ventas y cuánto dinero aportó cada tipo de cliente en los últimos 30 días, con su porcentaje.

**Independent Test**: Con 7 ventas a consumidores por $210 y 3 a mayoristas por $540, el Resumen muestra "Consumidores: 7 ventas · USD 210,00 · 28 %" y "Mayoristas: 3 ventas · USD 540,00 · 72 %", y la suma coincide con "Ventas acumuladas" ([quickstart.md](./quickstart.md), Historia 3).

**Depends on**: Foundational (T004 y T005 ya prueban e implementan `ventasPorTipoCliente`). Es independiente de US1 y US2.

### Implementation for User Story 3

- [X] T023 [P] [US3] Crear `components/admin/dashboard/clientTypeChart.tsx` (componente de servidor), con la prop `grupos: VentasTipoCliente[]`, según [contracts/ui.md](./contracts/ui.md#7-gráfico-4-ventas-por-tipo-de-cliente):
  - **Colores fijos por grupo** (nunca por posición): `detal` → `#a57c2f`; `mayorista` → `#587487`.
  - **Dos barras segmentadas**, "Cantidad de ventas" (con `porcentajeDeVentas`) y "Monto vendido" (con `porcentajeDelMonto`):
    - cada una con su título en `text-xs font-bold text-[#707970]`;
    - un `div` de 8 px de alto, `flex gap-[2px]`, con un segmento por grupo de ancho igual a su porcentaje, `rounded-full` y el color del grupo; un segmento en 0 no se dibuja;
    - los dos porcentajes a la derecha;
    - `role="img"` y `aria-label`, por ejemplo "Monto vendido: consumidores 28 %, mayoristas 72 %".
  - **Una fila por grupo**, debajo: un cuadro de 10 px del color del grupo con `aria-hidden`; la etiqueta en `font-bold text-[#18211d]`; "`{cantidadVentas}` ventas", el monto con `formatUsd` y "`{porcentajeDelMonto}` % del monto". Los números en `admin-mono` y el texto siempre con los colores de texto del panel, nunca con el color del grupo.
  - Los porcentajes se escriben con `toLocaleString("es-VE", { maximumFractionDigits: 1 })` + " %".
  - Si los dos grupos tienen `cantidadVentas` 0, se muestra solo el mensaje "No hubo ventas en este período." con el estilo de vacío de T014.
- [X] T024 [US3] En `app/admin/page.tsx`, agregar a la **Fila A** (una columna, después de "Ventas por mes" si existe) un `ChartCard` con eyebrow "Origen del ingreso", título "Ventas por tipo de cliente", período `resumen.periodo30Dias.label`, sin enlace ni `cifras`, con `<ClientTypeChart grupos={resumen.ventasPorTipoCliente} />`. Depende de T023.

**Checkpoint**: Los pasos 1 a 4 de la Historia 3 del quickstart pasan; la suma de los dos grupos coincide con "Ventas acumuladas" (SC-007).

---

## Phase 6: User Story 4 - Ver cuánta gente visita la tienda (Priority: P3)

**Goal**: Visitantes por día de los últimos 30 días y totales del período, sin que una fuente lenta o caída afecte al resto del Resumen.

**Independent Test**: Con la conexión de Vercel configurada, el Resumen muestra la curva diaria y los totales de visitantes y páginas vistas; con la fuente caída, esa tarjeta muestra su mensaje y los indicadores y los demás gráficos siguen completos ([quickstart.md](./quickstart.md), Historia 4).

**Depends on**: Foundational. Es independiente de US1 a US3.

- [ ] T025 [US4] **Puerta de la historia**: ejecutar el paso 0 del [quickstart](./quickstart.md) con las variables `VERCEL_ANALYTICS_*` cargadas en la sesión (sin escribir el token en la terminal ni en archivos) y anotar aquí la forma real de una fila. Se espera `{ timestamp: "…T00:00:00.000Z", pageviews, visitors }` por día, sin fila "Others".
  - Si las credenciales no están disponibles, declararlo aquí y continuar con T026 a T032 contra el contrato documentado; la confirmación queda pendiente para T036.
  - Si la respuesta real no trae visitantes por día, **detener la historia** y revisar con la usuaria la Decisión 1 de [research.md](./research.md), como indica la spec.

### Tests for User Story 4

- [X] T026 [P] [US4] Agregar a `tests/admin/website-visits.test.ts` los casos 1 a 8 de [contracts/datos.md](./contracts/datos.md#casos-nuevos-en-testsadminwebsite-visitstestts), con `config` y un `fetch` simulado que responde según `url.pathname` (`/visits/count` o `/visits/aggregate`):
  - **1**: `buildVercelAnalyticsUrl({ period, config, dimension: "day" })` tiene la ruta `/visits/aggregate` y los parámetros `by=day`, `limit=100`, `filter=environment eq 'production'`, `since` y `until`;
  - **2**: con un período de 7 días (2026-10-01 al 2026-10-07) y una respuesta con 3 días, `consultarVisitasDiarias` devuelve `serie` de 7 elementos en orden, los 4 que faltan en 0, y `status` `"ready"`;
  - **3**: `normalizeVisitSeries` descarta, sin fallar, las filas sin `timestamp`, con `timestamp` inválido o con métricas negativas o no enteras, y devuelve `null` si `data` no es un arreglo;
  - **4**: totales en 0 → `status` `"no_data"`;
  - **5**: `config: null` → `"not_configured"`, sin llamar a `fetch`;
  - **6**: un 401 en cualquiera de las dos lecturas → `"unauthorized"`, `summary` `null` y `serie` `[]`;
  - **7**: un `fetch` que lanza (error de red) → `"unavailable"`, y la promesa se resuelve sin lanzar;
  - **8**: un período inválido (`until` anterior a `since`) → `"invalid"`, sin llamar a `fetch`.

  Deben fallar hasta completar T029.

### Implementation for User Story 4

- [X] T027 [P] [US4] Agregar a `lib/admin/types.ts`, junto a los tipos de visitas:
  - `export type VisitDay = VisitMetric & { fecha: string };` (comentario: "YYYY-MM-DD, día de la fuente en UTC");
  - `export type VisitasDiariasResult = { period: VisitPeriod; queriedAt: string; status: WebsiteVisitsStatus; summary: VisitMetric | null; serie: VisitDay[]; message: string };`.
- [X] T028 [US4] En `lib/admin/vercel-web-analytics-core.ts`:
  - agregar `export type VercelAnalyticsGrouping = VercelAnalyticsDimension | "day";` y usarlo en `FetchInput.dimension`, sin cambiar el tipo `VercelAnalyticsDimension` que usan los desgloses;
  - en `buildVercelAnalyticsUrl`, enviar `limit` `"100"` cuando `dimension === "day"` y `"10"` en los demás casos;
  - agregar `normalizeVisitSeries(data: unknown): VisitDay[] | null`: devuelve `null` si `data` no es un arreglo; acepta solo filas con `timestamp` string que `Date` interpreta como fecha válida y con `pageviews` y `visitors` enteros no negativos (`nonNegativeInteger`); toma `fecha = timestamp.slice(0, 10)` y la valida con `/^\d{4}-\d{2}-\d{2}$/`; no lee ningún otro campo;
  - agregar `fetchVercelVisitSeries(input: Omit<FetchInput, "dimension">): Promise<VisitDay[]>`, que llama a `requestVercelAnalytics({ ...input, dimension: "day" })` y lanza `analyticsError("invalid")` si la normalización devuelve `null`.

  Depende de T027.
- [X] T029 [US4] En `lib/admin/website-visits-core.ts`:
  - agregar `completarSerieDiaria(period: { since: string; until: string }, filas: VisitDay[]): VisitDay[]`: recorre los días de `since` a `until` con `Date.UTC` y devuelve uno por día, en orden; toma la fila de ese `fecha` (la primera, si hubiera dos) o `{ fecha, pageviews: 0, visitors: 0 }`, e ignora las filas fuera del rango;
  - agregar `consultarVisitasDiarias(input: { period: VisitPeriod; config?: VercelAnalyticsConfig | null; fetcher?: typeof fetch }): Promise<VisitasDiariasResult>`, con la misma estructura que `consultarAnaliticasVisitas`:
    - período inválido → `"invalid"`; sin configuración (`"config" in input ? input.config : readVercelAnalyticsConfig()`) → `"not_configured"`;
    - `Promise.all([fetchVercelVisitCount(...), fetchVercelVisitSeries(...)])`;
    - `status` `"no_data"` si los totales son 0 y 0, y `"ready"` en otro caso; `serie = completarSerieDiaria(period, filas)`;
    - en el `catch`, `errorStatus(error)` con `summary: null` y `serie: []`; **nunca lanza**;
    - `message` con `messageForStatus`.

  `lib/admin/website-visits.ts` ya reexporta este módulo con `server-only`; no hace falta tocarlo. Depende de T028.
- [X] T030 [P] [US4] Crear `components/admin/dashboard/visitsChart.tsx` (`"use client"`), con la prop `serie: VisitDay[]`, según [contracts/ui.md](./contracts/ui.md#6-gráfico-3-visitas-de-la-tienda):
  - contenedor `<div className="h-[200px] w-full">` con `ResponsiveContainer` y un `AreaChart data={serie}`;
  - `CartesianGrid vertical={false} stroke="#dedfd6"`;
  - `XAxis dataKey="fecha"` con `tickLine={false}`, `stroke="#dedfd6"`, `minTickGap={24}` y un `tickFormatter` que formatea `${fecha}T00:00:00Z` con `{ day: "numeric", month: "short", timeZone: "UTC" }`, sin el punto final ("12 oct");
  - `YAxis` con `allowDecimals={false}`, `axisLine={false}`, `tickLine={false}` y ancho de unos 40 px;
  - `Area type="monotone" dataKey="visitors"` con `stroke="#66735f"`, `strokeWidth={2}`, `fill="#66735f"`, `fillOpacity={0.1}`, `isAnimationActive={false}` y `activeDot={{ r: 4, stroke: "#fffdf8", strokeWidth: 2 }}`;
  - **`Tooltip`** con `cursor={{ stroke: "#dedfd6" }}` y un `content` propio (`TooltipContentProps`) que muestra la fecha con `{ weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }` sin el punto final ("mar, 3 nov"), "`{visitors}` visitantes" en negrita y "`{pageviews}` páginas vistas", con `toLocaleString("es-VE")`;
  - nota al pie en `text-xs text-[#707970]`: "Visitantes agregados por día según Vercel. Cada día se corta en hora universal (UTC).".

  Depende de T027 (tipo `VisitDay`).
- [X] T031 [US4] Crear `components/admin/dashboard/visitsSection.tsx` (componente de servidor) con dos exportaciones:
  - **`VisitsSectionFallback({ periodo }: { periodo: VisitPeriod })`**: el `ChartCard` de visitas (eyebrow "Tráfico de la tienda", título "Visitas de la tienda", período `periodo.label`, enlace "Ver visitas" a `/admin/analytics/visits?visitasPeriodo=30d`) con un bloque `h-[200px] animate-pulse rounded-lg bg-[#f4f1e8]` y el texto "Consultando visitas…".
  - **`async function VisitsSection({ visitas }: { visitas: Promise<VisitasDiariasResult> })`**: espera la promesa y renderiza el mismo `ChartCard`:
    - con `status === "ready"`: dos cifras en una fila, "Visitantes agregados" y "Páginas vistas" (`admin-eyebrow` + número en `admin-mono text-2xl font-black`, con `toLocaleString("es-VE")`); debajo `<VisitsChart serie={result.serie} />`; y como `cifras`, una tabla `admin-table` con las columnas Día, Visitantes y Páginas vistas (días formateados en UTC);
    - con cualquier otro estado: un bloque `role="status"` con el estilo del `StatusPanel` de `components/admin/analiticas/websiteVisitsDashboard.tsx` y el mensaje de la tabla de [contracts/ui.md](./contracts/ui.md#6-gráfico-3-visitas-de-la-tienda): `no_data` con el enlace "Ver visitas"; `unavailable` e `invalid` con el enlace "Reintentar" a `/admin` (`admin-button-secondary`); `not_configured` y `unauthorized` sin acción. Nunca se muestran cifras, ceros, códigos de error ni nombres de variables.

  Depende de T029 y T030.
- [X] T032 [US4] En `app/admin/page.tsx`:
  - antes de `await consultarResumen(...)`, iniciar **sin esperarla** `const visitas = consultarVisitasDiarias({ period: ventanas.periodo30Dias })`, importada de `@/lib/admin/website-visits`;
  - agregar a la **Fila B** `<Suspense fallback={<VisitsSectionFallback periodo={ventanas.periodo30Dias} />}><VisitsSection visitas={visitas} /></Suspense>` (`Suspense` de `react`).

  Depende de T031.

**Checkpoint**: T026 en verde. Los pasos 1 a 5 de la Historia 4 del quickstart pasan: los cuatro estados de error se ven dentro de la tarjeta y el resto de la página aparece primero con la red lenta.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, verificación completa y validación manual.

- [X] T033 [P] Actualizar la documentación:
  - **`CLAUDE.md`**: agregar en "Arquitectura" una viñeta **Resumen del panel** (`/admin`) con los cuatro gráficos y sus períodos (12 meses por mes; últimos 30 días para el resto, en hora de Caracas); la regla de venta (pedidos no cancelados, incluidos los importados); que "Ventas acumuladas" sale de la suma por tipo de cliente; que `resumirPorProducto` (`lib/admin/sales-calculations.ts`) es la regla única de unidades y monto por producto (analíticas y top 5); que las visitas llegan por streaming y sus días los corta Vercel en UTC; y que los gráficos con ejes usan Recharts.
  - **`docs/descripcion-tecnica.md`**: reemplazar la línea de `/admin` ("dashboard operativo con ventas del periodo, pedidos abiertos y alertas") por la descripción de los indicadores y los cuatro gráficos.
- [X] T034 Revisar el diff completo (`git diff main`) en busca de:
  - cambios fuera de alcance, código muerto o imports sin uso (`getDashboardSummary`, `BarChart3`, `FileText`, `ArrowRight`);
  - imports con `@/` en `lib/admin/dashboard-core.ts`, `lib/admin/sales-calculations.ts`, `lib/admin/website-visits-core.ts` o `lib/admin/vercel-web-analytics-core.ts`;
  - fechas cortadas con la zona del servidor o del navegador (`setHours`, `getMonth`, `getDate`, `toISOString().slice` sobre instantes de pedidos);
  - colores fuera de la lista de las convenciones;
  - el token de Vercel o cualquier secreto en componentes de cliente, mensajes o logs.
- [X] T035 Ejecutar `npm.cmd run lint`, `npm.cmd run test:admin`, `npm.cmd run test:checkout` y `npm.cmd run build`, y compararlos con la línea base de T001. Declarar cualquier verificación omitida.
- [ ] T036 Ejecutar a mano [quickstart.md](./quickstart.md) completo: el paso 0 si quedó pendiente en T025, las historias 1 a 4, la organización a 360 px de ancho, el acceso sin sesión y con un correo no autorizado, y la regresión de `/admin/analytics/sales` y `/admin/analytics/visits`. Se puede usar el navegador de Playwright para las capturas a 360 px. Marcar en la spec cualquier desviación.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T002 y T003 en paralelo, después de crear la rama en T001.
- **Foundational (Phase 2)**: depende de Setup. **Bloquea todas las historias.** Orden interno: T005 → T006 → T009; T004, T007 y T008 en paralelo con T005.
- **US1 (Phase 3)**, **US2 (Phase 4)**, **US3 (Phase 5)** y **US4 (Phase 6)**: cada una solo depende de Foundational y se puede entregar sola.
- **Polish (Phase 7)**: tras las historias que se entreguen.

### Archivos compartidos que obligan a trabajar en secuencia

- `app/admin/page.tsx`: T009 → T014 (US1) → T022 (US2) → T024 (US3) → T032 (US4). Si se omite una historia, su tarjeta simplemente no aparece; las filas de la cuadrícula siguen funcionando.
- `lib/admin/dashboard-core.ts`: T005 → T011 (US1) → T019 (US2).
- `lib/admin/dashboard.ts`: T006 → T012 (US1) → T020 (US2).
- `tests/admin/dashboard-core.test.ts`: T004 → T010 (US1) → T016 (US2).

### Within Each User Story

- Las pruebas (T004, T010, T015, T016 y T026) se escriben primero y fallan hasta implementar la regla.
- El orden es: regla pura → lectura (`lib/admin/dashboard.ts` o los módulos de visitas) → componente → página.
- En US4, T025 va primero: si la API real no trae visitas por día, la historia se detiene.

### Parallel Opportunities

- **Foundational**: T004, T007 y T008 en paralelo con T005.
- **US1**: T010 y, en cuanto exista el tipo `VentasMes` (T011), T013 en paralelo con T012.
- **US2**: T015 y T016 en paralelo; T021 en paralelo con T020.
- **US3**: T023 en paralelo con cualquier tarea de otra historia.
- **US4**: T026 y T027 en paralelo; T030 en paralelo con T028 y T029.
- **Entre historias**: con Foundational terminada, US3 y US4 no comparten ningún archivo de `lib/` con US1 ni US2, y pueden avanzar en paralelo. Solo hay que coordinar las ediciones de `app/admin/page.tsx`.

---

## Parallel Example: User Story 2

```text
Task: "T015 [P] [US2] Casos de resumirPorProducto en tests/admin/sales-calculations.test.ts"
Task: "T016 [P] [US2] Casos de topProductos en tests/admin/dashboard-core.test.ts"
# Luego, tras T019:
Task: "T021 [P] [US2] Crear components/admin/dashboard/topProductsChart.tsx"
```

## Parallel Example: User Story 4

```text
Task: "T026 [P] [US4] Casos de la serie diaria en tests/admin/website-visits.test.ts"
Task: "T027 [P] [US4] VisitDay y VisitasDiariasResult en lib/admin/types.ts"
# Luego, tras T027:
Task: "T030 [P] [US4] Crear components/admin/dashboard/visitsChart.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) y Phase 2 (Foundational): la nueva cabecera, los indicadores con los 30 días en hora de Caracas y los paneles de enlaces retirados.
2. Phase 3 (US1): el gráfico de ventas por mes.
3. **Validar**: Historia 1 del quickstart. Ya se puede entregar: es la lectura que hoy no existe en ningún lugar del panel.

### Incremental Delivery

1. Setup + Foundational → la página reestructurada, con el indicador de ventas corregido.
2. US1 → ventas por mes (MVP).
3. US2 → productos más vendidos; incluye la regla compartida con las analíticas, así que hay que validar que su tabla no cambió.
4. US3 → ventas por tipo de cliente (solo interfaz; el cálculo ya está en Foundational).
5. US4 → visitas, tras confirmar la API real en T025.
6. Polish: documentación, verificación completa y quickstart.

Cada incremento deja `lint`, `test:admin` y `build` en verde.

---

## Notes

- No hay migraciones ni dependencias nuevas: si una tarea parece requerirlas, detenerse y revisar [research.md](./research.md).
- `lib/admin/periods.ts` (períodos de las analíticas de ventas) sigue usando la hora del servidor: queda fuera de alcance como trabajo de adopción de la constitución.
- Commit por historia completada, con mensajes en español al estilo del repo (`feat(resumen): …`).
