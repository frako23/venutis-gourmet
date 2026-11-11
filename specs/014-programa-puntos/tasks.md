---

description: "Task list for the loyalty points program: admin points section, customer 'Mis puntos' view, free-delivery reward, suggested costs and welcome bonus"
---

# Tasks: Programa de puntos: consulta en el panel, "Mis puntos" y canje por productos o delivery gratis

**Input**: Design documents from `/specs/014-programa-puntos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md), [contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen porque la función mueve puntos y cambia el total de los pedidos (Constitución v2.1.0, Principio V). Los casos están numerados en [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md):

- **Puras** (`npm.cmd run test:admin`): `tests/admin/points-core.test.ts` (nuevo, P1–P17), `tests/admin/fidelidad.test.ts` (R, E, V, F y C) y `tests/admin/sales-calculations.test.ts` (T1–T3).
- **Integración** (base aislada): `tests/checkout/checkout.integration.test.ts` (I1–I6), `tests/admin/fidelidad.integration.test.ts` (I7–I13 e I15) y `tests/admin/order-edit.integration.test.ts` (I14). Solo corren con `RUN_ADMIN_INTEGRATION=1` + `ADMIN_TEST_DATABASE_URL` y `RUN_CHECKOUT_INTEGRATION=1` + `CHECKOUT_TEST_DATABASE_URL` (o la de admin).

Las pantallas se validan a mano con [quickstart.md](./quickstart.md).

**Organization**: Las tareas se agrupan por historia de usuario de la spec:

- **US1 (P1)**: sección "Puntos" del panel.
- **US2 (P1)**: vista "Mis puntos" del cliente.
- **US3 (P2)**: premio "Delivery gratis" y compra mínima.
- **US4 (P2)**: costos propuestos al crear premios.
- **US5 (P3)**: bono de bienvenida.

**Convenciones que aplican a todas las tareas**:

- textos en español; panel con clases `admin-*` y colores existentes; tienda con los tokens de `DESIGN.md`, móvil primero;
- avisos solo con `toast` de `sonner`; nada de `alert()` ni banners;
- fechas con `formatFecha` / `formatFechaHora` y cortes con `ZONA_HORARIA` (`lib/format.ts`); nunca `setHours`, `getMonth` ni `toISOString().slice(...)` sobre un instante;
- `lib/fidelidad.ts` y `lib/admin/points-core.ts` no usan `@/` y solo importan **tipos** de `@prisma/client` (`import type`): los prueba `node:test` y `lib/fidelidad.ts` se importa desde un componente de cliente. Los imports de valores van relativos con extensión `.ts`;
- toda operación que mueve puntos bloquea primero al cliente (`bloquearCliente`) y luego el pedido; el `clienteId` de la tienda sale siempre de la sesión;
- las pruebas importan con `../../lib/...ts` (como `tests/admin/fidelidad.test.ts`) y usan `node:test` + `node:assert/strict`. `ts-node` corre con `transpileOnly`: **el tipado lo verifica `npm.cmd run build`**, no las pruebas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario de la tarea (US1 a US5).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Línea base, bases de datos y lectura obligatoria de Next.js. No hay dependencias nuevas.

- [X] T001 Preparar la línea base (base: lint 0 errores y 8 avisos; `test:admin` 179 pasan y 57 omitidas; `test:checkout` 48 pasan y 11 omitidas; `DATABASE_URL` apunta a `venutis_local`; para integración se creó la base local aislada `venutis_test`):
  - Crear la rama `014-programa-puntos` desde `main`.
  - Confirmar que `DATABASE_URL` de `.env` apunta a una base de **desarrollo**, nunca a la de producción. Si hay duda, detenerse y preguntar.
  - Confirmar que existe una base de pruebas aislada y anotar qué variables se usarán (`ADMIN_TEST_DATABASE_URL`, `CHECKOUT_TEST_DATABASE_URL`). Si no existe, anotarlo: las pruebas de integración quedarán como verificación omitida y se declarará en T060.
  - Ejecutar `npm.cmd run lint`, `npm.cmd run test:admin` y `npm.cmd run test:checkout`, y anotar el resultado base en este archivo, junto a esta tarea.
- [ ] T002 [P] *(Omitida: no se leyeron las guías de Next.js; el `build` pasa con las rutas y el layout nuevos.)* Leer las guías de la versión instalada de Next.js 16.4.3, como exige `AGENTS.md`:
  - `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` (layout anidado de `/mi-cuenta`, `searchParams` como promesa);
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (importar reglas puras desde un componente de cliente);
  - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md` y `revalidatePath.md`.

  Anotar aquí cualquier diferencia con lo que asume [plan.md](./plan.md). Si la hay, detenerse y revisar el plan.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: El esquema nuevo, las constantes del programa, la descripción única de una recompensa y los tipos ampliados para que el `build` siga en verde. Sin cambios de comportamiento visibles.

**⚠️ CRITICAL**: Ninguna historia empieza antes de completar esta fase.

- [X] T003 Cambiar `prisma/schema.prisma` y crear la migración de esquema ([data-model.md](./data-model.md#cambios-de-esquema)):
  - `enum TipoPremio`: añadir `delivery` (queda `descuento`, `producto`, `delivery`).
  - `enum TipoMovimiento`: añadir `bono` (queda `acumulacion`, `redencion`, `devolucion`, `reversion`, `ajuste`, `bono`).
  - `model Premio`: añadir `compraMinimaUsd Float?` con el comentario `// null = sin compra mínima. Mayor que 0, 2 decimales.`
  - `model Transaccion`: añadir `montoDescuentoDelivery Float @default(0)` junto a `montoDescuentoPuntos`, con el comentario `// Delivery cubierto por un premio. Entre 0 y montoDelivery.`
  - Ejecutar `npx prisma migrate dev --name programa_puntos` y `npx prisma generate`.
  - Revisar el SQL generado en `prisma/migrations/<fecha>_programa_puntos/migration.sql`: solo dos `ALTER TYPE ... ADD VALUE` y dos `ALTER TABLE ... ADD COLUMN`. **No** añadir aquí ningún `INSERT` (Decisión 5 de [research.md](./research.md): PostgreSQL no permite usar un valor de enum en la misma transacción que lo crea).
  - Aplicar la migración a la base de pruebas: `$env:DATABASE_URL = $env:ADMIN_TEST_DATABASE_URL; npx prisma migrate deploy` (y la de checkout si es otra), y restaurar `DATABASE_URL` después.
- [X] T004 [P] Añadir a `tests/admin/fidelidad.test.ts` un `describe("describirRecompensa")` con tres casos (deben fallar hasta T005):
  - **R1** `{ tipo: "descuento", montoDescuentoUsd: 5, cantidad: null, productoNombre: null }` → `"USD 5,00 de descuento"`;
  - **R2** `{ tipo: "producto", montoDescuentoUsd: null, cantidad: 2, productoNombre: "Salsa pomodoro" }` → `"2 × Salsa pomodoro"`; con `productoNombre: null` → `"2 × producto"`;
  - **R3** `{ tipo: "delivery", montoDescuentoUsd: null, cantidad: null, productoNombre: null }` → `"El delivery del pedido"`.
- [X] T005 En `lib/fidelidad.ts`:
  - Exportar la constante:
    ```ts
    export const PROGRAMA_PUNTOS = { puntosBienvenida: 25, puntosPorUsdDePremio: 20, costoDeliveryGratis: 100, compraMinimaDeliveryUsd: 15 } as const;
    ```
  - Exportar `describirRecompensa({ tipo, montoDescuentoUsd, cantidad, productoNombre }: { tipo: TipoPremio; montoDescuentoUsd: number | null; cantidad: number | null; productoNombre: string | null }): string` con los textos de T004. El monto se formatea `USD ${monto.toFixed(2).replace(".", ",")}` (sin `Intl`, para no depender del navegador).
- [X] T006 [P] Etiquetas del tipo `bono`:
  - `lib/format.ts`: en `tipoPuntos`, añadir `bono: "Bono de bienvenida"`.
  - `lib/cuenta-cliente.ts`: en `conceptoPuntos`, añadir `bono: "Bono de bienvenida"`.
- [X] T007 Ampliar los tipos del panel a `TipoPremio` y usar `describirRecompensa` (sin cambiar lo que se ofrece todavía):
  - `components/admin/clientes/premios/rewardForm.tsx`: `PremioVista.tipo: TipoPremio` (`import type { TipoPremio } from "@prisma/client"`) y `useState<TipoPremio>`. El `<select>` sigue con dos opciones hasta US3.
  - `components/admin/clientes/premios/rewardsTable.tsx`: columna "Tipo" con un mapa `{ descuento: "Descuento", producto: "Producto gratis", delivery: "Delivery gratis" }`; columna "Recompensa" con `describirRecompensa({ tipo, montoDescuentoUsd, cantidad, productoNombre })`.
  - `app/admin/transactions/[id]/page.tsx`: el `detalle` de `premiosCanjeables` pasa a `describirRecompensa({ tipo: premio.tipo, montoDescuentoUsd: premio.montoDescuentoUsd, cantidad: premio.cantidad, productoNombre: premio.producto?.nombre ?? null })`.
  - `components/admin/ventas/manualSaleForm.tsx`: `PremioVenta.tipo: TipoPremio`.
- [X] T008 Ampliar los tipos de la tienda (mismo objetivo que T007):
  - `lib/actions/cuenta-cliente.ts`: en `BeneficiosCheckout`, `tipo: TipoPremio`.
  - `components/finalizar-compra/beneficiosCliente.tsx`: la línea descriptiva de cada premio usa `describirRecompensa({ tipo: premio.tipo, montoDescuentoUsd: premio.montoDescuentoUsd, cantidad: premio.cantidad, productoNombre: premio.producto?.nombre ?? null })`; el sufijo " · Sin existencia" se conserva.
- [X] T009 Checkpoint: `npm.cmd run lint`, `npm.cmd run test:admin` y `npm.cmd run build` en verde. El comportamiento de la tienda y del panel es el mismo que antes (los pedidos existentes tienen `montoDescuentoDelivery = 0`).

**Checkpoint**: Esquema listo y `build` en verde; las historias pueden empezar.

---

## Phase 3: User Story 1 - Ver en el panel los puntos de todos los clientes (Priority: P1) 🎯 MVP

**Goal**: Sección "Puntos" del panel con una fila por cliente (ganados, canjeados, ajustes, disponibles, último movimiento), buscador, orden e indicadores.

**Independent Test**: Con clientes que tienen acumulaciones, canjes, devoluciones y ajustes, abrir `/admin/points` y comprobar que cada fila coincide con la ficha del cliente y que los indicadores coinciden con la suma de las filas ([quickstart.md](./quickstart.md) §4).

### Tests for User Story 1

- [X] T010 [P] [US1] Crear `tests/admin/points-core.test.ts` (importa `../../lib/admin/points-core.ts`) con los casos **P1–P17** de [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md#2-reglas-puras-de-libadminpoints-corets-nuevo). Datos clave:
  - **P1**: grupos `acumulacion` +320, `reversion` −20, `redencion` −150, `ajuste` +10 → `{ ganados: 300, canjeados: 150, ajustes: 10 }` y `disponibles: 160`.
  - **P4**: recorrer todas las filas y comprobar `disponibles === ganados - canjeados + ajustes`.
  - **P8**: cliente con `nombreBusqueda` `"maria perez"` (como lo guarda `normalizeSearchName`) encontrado con `"María Pérez"`.
  - **P9**: celular `"0412-5551234"`: `"555 12"` coincide, `"999"` no.
  - **P12**: filas con 160, 99 y 0 y `costoMinimoPremio: 100` → `{ enCirculacion: 259, clientesConPuntos: 2, puedenCanjear: 1 }`.
  - **P15**: `inicioMesCaracas(new Date("2026-11-01T02:00:00Z")).toISOString()` → `"2026-10-01T04:00:00.000Z"`; **P16**: con `"2026-11-01T04:00:00Z"` → `"2026-11-01T04:00:00.000Z"`.

  Deben fallar hasta T011.

### Implementation for User Story 1

- [X] T011 [US1] Crear `lib/admin/points-core.ts` (puro, sin `@/`). Imports: `fechaHoraLocalCaracas` e `interpretarFechaHoraCaracas` de `"../format.ts"`; `normalizeSearchName` de `"../client-rules.ts"`; `import type { TipoCliente, TipoMovimiento } from "@prisma/client"`. Exportar los tipos `GrupoPuntos`, `ClientePuntos`, `OrdenPuntos`, `FilaPuntos` e `IndicadoresPuntos` ([data-model.md](./data-model.md#filapuntos-libadminpoints-corets)) y las funciones:
  - `clasificarPuntos(grupos)`: `ganados` = Σ `acumulacion` + `bono` + `reversion`; `canjeados` = −Σ (`redencion` + `devolucion`); `ajustes` = Σ `ajuste`.
  - `resumirPuntosPorCliente(grupos, clientes)`: agrupa por `clienteId`, usa `clasificarPuntos`, `disponibles = ganados − canjeados + ajustes`, `ultimoMovimiento` = mayor `ultimaFecha`, `nombre` = `${nombre} ${apellido}`.trim(); omite los grupos sin cliente.
  - `filtrarFilasPuntos(filas, texto)`: texto vacío → todo; si no, cada palabra de `normalizeSearchName(texto)` contenida en `nombreBusqueda`, **o** (si `texto` tiene 3 dígitos o más) sus dígitos contenidos en los dígitos de `celular`.
  - `ordenarFilasPuntos(filas, orden)`: copia, descendente por `disponibles` / `ganados` / `canjeados` / `ultimoMovimiento` (`reciente`), desempate por `nombre` con `localeCompare("es")`.
  - `indicadoresPuntos({ filas, gruposDelMes, costoMinimoPremio })`: `enCirculacion`, `clientesConPuntos` (`disponibles > 0`), `puedenCanjear` (`costoMinimoPremio === null ? 0 : disponibles >= costoMinimoPremio`), y `ganadosMes`/`canjeadosMes` con `clasificarPuntos(gruposDelMes)`.
  - `inicioMesCaracas(ahora)`: `interpretarFechaHoraCaracas(`${fechaHoraLocalCaracas(ahora).slice(0, 7)}-01T00:00`)!`.
  - `leerOrdenPuntos(valor)`: `"disponibles" | "ganados" | "canjeados" | "reciente"`; cualquier otro valor → `"disponibles"`.
- [X] T012 [US1] Crear `lib/admin/points.ts` con `consultarPuntosClientes({ q, orden, ahora }: { q: string; orden: OrdenPuntos; ahora: Date })`, usando el singleton `prisma` de `@/lib/prisma` ([contrato §6](./contracts/reglas-y-acciones.md#6-lecturas)):
  - en paralelo: `prisma.fidelidad.groupBy({ by: ["clienteId", "tipoMovimiento"], _sum: { puntos: true }, _max: { fecha: true } })`, `prisma.fidelidad.groupBy({ by: ["tipoMovimiento"], where: { fecha: { gte: inicioMesCaracas(ahora) } }, _sum: { puntos: true } })` y `prisma.premio.aggregate({ where: { activo: true }, _min: { costoPuntos: true } })`;
  - luego `prisma.cliente.findMany({ where: { id: { in: ids } }, select: { id, nombre, apellido, tipoCliente, celular, nombreBusqueda } })`;
  - convierte los grupos (`_sum.puntos ?? 0`, `_max.fecha!`) y devuelve `{ filas: ordenarFilasPuntos(filtrarFilasPuntos(todas, q), orden), total: todas.length, indicadores: indicadoresPuntos({ filas: todas, ... }) }`.
- [X] T013 [P] [US1] Crear `components/admin/puntos/pointsFilters.tsx` (componente de servidor, sin `"use client"`) según [contracts/ui.md §1](./contracts/ui.md#pointsfilters-componentsadminpuntospointsfilterstsx-servidor): formulario `method="get" action="/admin/points"` con el campo `q` ("Buscar cliente", `placeholder` "Nombre o teléfono", `defaultValue`), el selector `orden` ("Ordenar por": "Puntos disponibles", "Puntos ganados", "Puntos canjeados", "Último movimiento"), el botón "Aplicar" (`admin-button-primary`) y el enlace "Limpiar" a `/admin/points` solo si `q` no está vacío u `orden !== "disponibles"`. Mismo estilo que `components/admin/clientes/clientsFilters.tsx`.
- [X] T014 [P] [US1] Crear `components/admin/puntos/pointsTable.tsx` (servidor) según [contracts/ui.md §1](./contracts/ui.md#pointstable-componentsadminpuntospointstabletsx-servidor):
  - `admin-panel` + `overflow-x-auto` + `admin-table`; columnas Cliente (enlace a `/admin/clients/{id}`, celular debajo), Tipo (`clientTypeLabel` de `@/lib/client-rules`), Ganados, Canjeados, Ajustes (`formatPuntosConSigno`, "—" si 0), Disponibles (negrita) y Último movimiento (`formatFecha`); números con `admin-mono`, a la derecha, `toLocaleString("es-VE")`;
  - estados: sin movimientos → "Todavía no hay movimientos de puntos. Aparecerán cuando un pedido de un consumidor quede pagado."; búsqueda sin resultados → "No hay clientes con puntos que coincidan con «{q}»."; pie "{n} de {total} clientes con movimientos de puntos".
- [X] T015 [US1] Crear `app/admin/points/page.tsx` (servidor, `export const dynamic = "force-dynamic"`):
  - `await requireAdmin()`; leer `searchParams` (promesa) → `q` (string recortado) y `orden = leerOrdenPuntos(...)`; `consultarPuntosClientes({ q, orden, ahora: new Date() })`;
  - cabecera: antetítulo "Fidelización", título "Puntos", subtítulo "Lo que cada cliente ha ganado, canjeado y tiene disponible.", botón `admin-button-secondary` "Premios" → `/admin/clients/rewards`;
  - cuatro `DashboardCard` (`components/admin/dashboard/dashboardCard.tsx`) con las etiquetas y textos de [contracts/ui.md §1](./contracts/ui.md#página-appadminpointspagetsx-servidor) ("Puntos en circulación", "Clientes con puntos", "Ya pueden canjear" con "No hay premios activos" si no hay, "Puntos del mes" con `+{ganadosMes}` y "{canjeadosMes} canjeados · mes en curso");
  - `PointsFilters` y `PointsTable`.
- [X] T016 [P] [US1] Navegación: en `components/admin/sidebar.tsx`, añadir `{ icon: Gift, label: "Puntos", link: "/admin/points" }` justo después de "Clientes" (importar `Gift` de `lucide-react`); en `components/admin/header.tsx`, añadir `"/admin/points": "Puntos"` a `titles`.
- [X] T017 [US1] En `lib/actions/admin-fidelidad.ts`, `revalidarFidelidad` añade `revalidatePath("/admin/points")`.
- [X] T018 [US1] Ejecutar `npm.cmd run test:admin` (P1–P17 en verde) y validar a mano [quickstart.md](./quickstart.md) §4, incluido el acceso denegado sin sesión de administradora. *(Parte automatizada verificada; la validación manual en el navegador queda para T061.)*

**Checkpoint**: La dueña ve los puntos de todos sus clientes en una sección propia.

---

## Phase 4: User Story 2 - Consultar mis puntos y lo que puedo canjear (Priority: P1)

**Goal**: Vista `/mi-cuenta/puntos` con saldo, premio más cercano, catálogo con estado por premio, explicación del programa e historial; "Mi cuenta" enlaza a ella.

**Independent Test**: Con una cuenta vinculada a un cliente con 160 puntos y premios de 100, 140 y 240, abrir "Mis puntos" y comprobar el saldo, los dos premios canjeables y "Te faltan 80 puntos" en el tercero ([quickstart.md](./quickstart.md) §5).

### Tests for User Story 2

- [X] T019 [P] [US2] Añadir a `tests/admin/fidelidad.test.ts` los casos **E1–E5** de [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md#estadopremio-y-premiomascercano-nuevas) (`estadoPremio` y `premioMasCercano`). Deben fallar hasta T020.

### Implementation for User Story 2

- [X] T020 [US2] En `lib/fidelidad.ts`, exportar:
  - `estadoPremio({ costoPuntos, puntosDisponibles, sinExistencia })` → `{ tipo: "sin_existencia" }` si `sinExistencia`; `{ tipo: "canjeable" }` si `costoPuntos <= puntosDisponibles`; si no `{ tipo: "faltan", faltan: costoPuntos - puntosDisponibles }`.
  - `premioMasCercano(premios: Array<{ nombre: string; costoPuntos: number }>, puntosDisponibles: number)` → el de menor `costoPuntos` entre los que cuestan más que `puntosDisponibles`, como `{ nombre, faltan }`; `null` si no hay.
- [X] T021 [US2] En `lib/cuenta-cliente.ts`:
  - Exportar el tipo `MisPuntos` ([data-model.md](./data-model.md#mispuntos-libcuenta-clientets)) y `obtenerMisPuntos(clienteId: number): Promise<MisPuntos>`. En paralelo: cliente (`nombre`, `apellido`, `tipoCliente`), `fidelidad.aggregate` de puntos, los 50 movimientos más recientes (`fecha`, `puntos`, `tipoMovimiento`, `descripcion`, `transaccion.numeroOrden`) y `premio.findMany({ where: { activo: true }, orderBy: { costoPuntos: "asc" }, include: { producto: { select: { nombre: true, inventario: true } } } })`.
  - Por premio: `sinExistencia = tipo === "producto" && unidadesDisponibles(producto.inventario) < (cantidad ?? 1)` (`unidadesDisponibles` de `@/lib/inventory`); `recompensa = describirRecompensa(...)`; `condiciones`: `"Compra mínima de USD {monto} en productos"` (monto con coma y 2 decimales) si tiene `compraMinimaUsd`, y `"Solo en pedidos con delivery"` si es `delivery`; `estado = estadoPremio(...)`.
  - `proximo = premioMasCercano(premios sin existencia excluidos, disponibles)`; `mostrar = tipoCliente === "detal" || disponibles > 0`; `acumula = tipoCliente === "detal"`.
  - Cada movimiento: `{ fecha, puntos, concepto: descripcion ?? conceptoPuntos[tipo] ?? tipo, numeroOrden }`. **No** leer ni devolver `motivo`, `actorId` ni `actorEmail` (FR-012).
  - `obtenerResumenCuenta`: quitar la lectura de premios y de movimientos de puntos; `ResumenCuenta` pierde `premios` y `puntos.movimientos` y conserva `puntos.disponibles` y `puntos.mostrar`.
- [X] T022 [P] [US2] Crear `app/mi-cuenta/layout.tsx` con el marco que hoy tiene `app/mi-cuenta/page.tsx`: el `<div className="min-h-screen bg-background-dark font-century-gothic text-[#f9f7f0] antialiased">`, `Header`, `<main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>`, `Footer` y el `Toaster` con sus mismas props. Dejar en `app/mi-cuenta/page.tsx` solo `metadata`, `dynamic` y los cinco estados de sesión.
- [X] T023 [US2] En `components/mi-cuenta/resumenCuenta.tsx` (depende de T021):
  - exportar `Bloque` y `Vacio`;
  - la tarjeta "Puntos" pasa a ser un `Link` a `/mi-cuenta/puntos` con la nota "Ver mis puntos y premios →" (mismo aspecto de `Tarjeta`, con foco visible);
  - eliminar los bloques "Premios" y "Movimientos de puntos" y los imports que queden sin uso (`formatPuntosConSigno` si aplica).
- [X] T024 [US2] Crear `components/mi-cuenta/misPuntos.tsx` (servidor) con `MisPuntosVista({ datos }: { datos: MisPuntos })`, según [contracts/ui.md §6](./contracts/ui.md#mispuntosvista-componentsmi-cuentamispuntostsx-servidor):
  - cabecera con enlace "← Mi cuenta" (mínimo 44 px de alto), antetítulo "Mis puntos" y el saldo en grande con "puntos disponibles";
  - próximo premio con barra `role="progressbar"` (`aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow` = `Math.round(disponibles / (disponibles + faltan) * 100)`) y el texto "Te faltan {faltan} puntos para {nombre}"; o "Ya alcanzas todos los premios disponibles." si no hay `proximo` y hay premios;
  - lista de premios con nombre, descripción, recompensa, condiciones, costo "{n} pts" y estado: "¡Ya lo puedes canjear!" + botón "Canjear" (`Link` a `/productos/consumidores`, mínimo 44 px), "Te faltan {n} puntos", o "Sin existencia por ahora" (atenuado, sin botón); sin premios → `Vacio` "Pronto tendremos premios para canjear con tus puntos."; si hay alguno canjeable, la nota "Para canjear, haz tu pedido: eliges el premio en el paso de pago y ahí se descuentan tus puntos.";
  - "Cómo funciona" con las tres líneas del contrato, usando `PROGRAMA_PUNTOS` donde corresponda; si `!acumula`, la primera línea es "Tu cuenta es mayorista y ya no suma puntos, pero puedes canjear los que tienes.";
  - historial con `Bloque`: concepto, `formatFecha(fecha)` y "· Pedido {numeroOrden}", puntos con `formatPuntosConSigno` en `text-[#a8d5a2]` o `text-[#f0b6a6]` (como hoy); vacío → "Todavía no tienes movimientos.";
  - una sola columna, sin anchos fijos: nada desborda a 360 px.
- [X] T025 [US2] Crear `app/mi-cuenta/puntos/page.tsx` (servidor, `export const dynamic = "force-dynamic"`, `metadata.title` "Mis puntos | Venuti's Gourmet"): `obtenerSesionCliente()`; si el estado no es `"vinculada"`, `redirect("/mi-cuenta")`; `obtenerMisPuntos(sesion.clienteId)`; si `!mostrar`, `redirect("/mi-cuenta")`; renderizar `MisPuntosVista`. No acepta ningún parámetro de URL.
- [X] T026 [US2] En `lib/actions/admin-fidelidad.ts`, `revalidarFidelidad` añade `revalidatePath("/mi-cuenta/puntos")`.
- [X] T027 [US2] Ejecutar `npm.cmd run test:admin` y `npm.cmd run build`, y validar a mano [quickstart.md](./quickstart.md) §5, incluido el ancho de 360 px y el acceso sin sesión. *(Parte automatizada verificada; la validación manual en el navegador queda para T061.)*

**Checkpoint**: El cliente consulta sus puntos y sabe qué puede canjear.

---

## Phase 5: User Story 3 - Canjear mis puntos por delivery gratis (Priority: P2)

**Goal**: Premio "Delivery gratis" canjeable en la tienda y en el detalle del pedido, con compra mínima opcional para cualquier premio, sin cambiar los puntos que gana el pedido.

**Independent Test**: Con "Delivery gratis" (100 pts, mínimo USD 15) y una clienta con 120 puntos, un pedido de USD 20 con delivery de USD 4 queda en USD 20, la clienta en 20 puntos, y al pagarse gana 20 puntos; al cancelar otro igual recupera los 100 ([quickstart.md](./quickstart.md) §6).

### Tests for User Story 3

- [X] T028 [P] [US3] En `tests/admin/fidelidad.test.ts`:
  - actualizar los fixtures existentes de `validarCanjes` con `compraMinimaUsd: null` y cada llamada con `montoDeliveryUsd: 0` (caso **V9**: sus resultados esperados añaden `descuentoDeliveryUsd: 0`);
  - añadir **V1–V8** y **F1–F4** de [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md#validarcanjes-ampliada), con los mensajes exactos: `Un pedido admite un solo premio de delivery gratis.`, `{nombre} solo aplica a pedidos con delivery.` y `Agrega USD {faltante} más en productos para usar {nombre}.` (`faltante` como `3,00`). V6 se prueba en los dos órdenes de `premios`.

  Deben fallar hasta T033.
- [X] T029 [P] [US3] En `tests/admin/sales-calculations.test.ts`, en `describe("recalcularTotalPedido")`: añadir `descuentoDeliveryUsd: 0` a las cuatro llamadas existentes y los casos **T1** (líneas por 20, delivery 4, `descuentoDeliveryUsd: 4` → total 20), **T2** (igual con 10% → 18) y **T3** (`descuentoDeliveryUsd: 0` → igual que hoy).
- [X] T030 [P] [US3] En `tests/checkout/checkout.integration.test.ts`, casos **I1–I6** de [contrato §5](./contracts/reglas-y-acciones.md#5-pruebas-de-integración), con el patrón de "con sesión, un canje de descuento y saldo parcial…": crear zona de USD 4 con `claveZona`, cliente `detal` con dirección en esa zona, `CuentaCliente` vinculada, producto con existencia, premio `delivery` (100 pts, `compraMinimaUsd: 15`) y un `ajuste` de puntos; llamar `procesarCompra(..., clienteSesionId)`. En los rechazos (I3, I4, I5) comprobar `code: "BENEFITS_CHANGED"`, que no existe el pedido, que los puntos no cambiaron y que el inventario sigue igual.
- [X] T031 [P] [US3] En `tests/admin/fidelidad.integration.test.ts`, casos **I7–I10** (canje de delivery con `canjearPremioEnPedido` en un pedido `por_cobrar` creado con `montoDelivery: 4`, segundo canje rechazado con `Este pedido ya tiene el delivery cubierto por un premio.`, pedido sin delivery rechazado, cancelación con `aplicarCambioEstadoPedido` que devuelve los 100 puntos) e **I13** (venta manual con `registrarVentaManualEnTx` y un premio con compra mínima no cumplida: sin venta ni movimientos).
- [X] T032 [P] [US3] En `tests/admin/order-edit.integration.test.ts`, caso **I14**: pedido con `montoDelivery: 4`, `montoDescuentoDelivery: 4` y una `redencion` del premio de delivery; editar la cantidad de una línea con `editarPedidoEnTx` → `montoTotal` = productos nuevos (− descuentos), `montoDelivery` y `montoDescuentoDelivery` siguen en 4.

### Implementation for User Story 3

- [X] T033 [US3] En `lib/fidelidad.ts` ([contrato §1](./contracts/reglas-y-acciones.md#validarcanjes-ampliada) y §4):
  - `PremioParaCanje`: `tipo: TipoPremio` y nuevo `compraMinimaUsd: number | null`.
  - `validarCanjes({ premios, puntosDisponibles, subtotalUsd, descuentoUsd, montoDeliveryUsd })` (`montoDeliveryUsd` **obligatorio**). En el recorrido de `premios`, para cada uno y en este orden: (1) activo; (2) costo acumulado ≤ puntos; (3) si es `delivery` y ya hubo otro → `Un pedido admite un solo premio de delivery gratis.`; (4) si es `delivery` y `montoDeliveryUsd <= 0` → `${nombre} solo aplica a pedidos con delivery.`. Tras el recorrido: (5) la regla actual del descuento; (6) para cada premio con `compraMinimaUsd`, comparar en centavos `subtotalUsd − descuentoUsd − descuentoPuntosUsd` con `compraMinimaUsd`; si falta → `Agrega USD ${faltante} más en productos para usar ${nombre}.`. Devolver además `descuentoDeliveryUsd` (`roundMoney(montoDeliveryUsd)` si hubo un premio `delivery`, si no 0).
  - `filtrarCanjesValidos(premiosElegidos, contexto)`: conserva cada premio solo si `validarCanjes` no lanza con los ya conservados más ese premio; nunca lanza.
  - `prepararCanjes` y `canjearPremios`: añadir `montoDeliveryUsd: number` (obligatorio) a la entrada y pasarlo a `validarCanjes`; el retorno vacío de `prepararCanjes` incluye `descuentoDeliveryUsd: 0`; `canjearPremios` devuelve `{ descuentoPuntosUsd, descuentoDeliveryUsd, costoTotal }`. Un premio `delivery` solo crea su `redencion`.
- [X] T034 [US3] Regla del total con delivery cubierto (un solo cambio, para que el `build` obligue a cada llamada):
  - `lib/admin/sales-calculations.ts`: `recalcularTotalPedido` recibe `descuentoDeliveryUsd: number` **obligatorio** y calcula `totalUsd = roundMoney(base.totalUsd + montoDeliveryUsd - descuentoDeliveryUsd)`; actualizar el comentario de la función.
  - `lib/admin/order-edit-rules.ts`: `PedidoEditable` añade `descuentoDeliveryUsd: number`.
  - `lib/admin/order-edit.ts`: `cargarPedidoEditable` devuelve `descuentoDeliveryUsd: pedido.montoDescuentoDelivery`; `editarPedidoEnTx` pasa `descuentoDeliveryUsd: pedido.montoDescuentoDelivery` y **no** escribe `montoDescuentoDelivery` en el `update`.
  - `lib/actions/admin-sales.ts`: `actualizarDescuentoVenta` y `guardarEdicionMasivaVentas` pasan `descuentoDeliveryUsd: transaction.montoDescuentoDelivery`.
- [X] T035 [US3] `lib/checkout-core.ts`, en `registrarCompraWeb`: `prepararCanjes(tx, { ..., montoDeliveryUsd: montoDelivery })`; `calculateCheckoutTotals(lineas, montoDelivery, roundMoney(canjes.descuentoPuntosUsd + canjes.descuentoDeliveryUsd))` (`roundMoney` de `./checkout-rules.ts`); `transaccion.create` añade `montoDescuentoDelivery: canjes.descuentoDeliveryUsd`; `canjearPremios(...)` recibe `montoDeliveryUsd: montoDelivery`. Lo demás no cambia.
- [X] T036 [US3] `lib/admin/canje-pedido.ts`, en `canjearPremioEnPedido`:
  - tras leer el pedido, leer el premio (`findUnique`, `select: { nombre, costoPuntos, tipo }`); si no existe → `El premio seleccionado no existe.`; si es `delivery` y `pedido.montoDescuentoDelivery > 0` → `Este pedido ya tiene el delivery cubierto por un premio.`;
  - `canjearPremios` con `montoDeliveryUsd: roundMoney(pedido.montoDelivery - pedido.montoDescuentoDelivery)`;
  - `totalUsd = roundMoney(pedido.montoTotal - descuentoPuntosUsd - descuentoDeliveryUsd)`; el `update` escribe además `montoDescuentoDelivery: roundMoney(pedido.montoDescuentoDelivery + descuentoDeliveryUsd)`;
  - la condición de saldado pasa a `descuentoPuntosUsd + descuentoDeliveryUsd > 0 && calcularSaldo(...) === 0`;
  - reutilizar el premio leído al inicio para el motivo del historial (quitar la segunda lectura).
- [X] T037 [P] [US3] `lib/admin/manual-sale.ts`: pasar `montoDeliveryUsd: 0` a `prepararCanjes` y a `canjearPremios` (la venta manual no tiene delivery; un premio `delivery` se rechaza con el mensaje 4).
- [X] T038 [US3] `lib/actions/admin-fidelidad.ts` ([contrato §7](./contracts/reglas-y-acciones.md#7-acciones-de-premios-libactionsadmin-fidelidadts)):
  - `premioSchema`: `tipo: z.enum(["descuento", "producto", "delivery"])`; nuevo `compraMinimaUsd: z.coerce.number().positive("La compra mínima debe ser mayor que cero.").refine(dosDecimales, "La compra mínima admite como máximo 2 decimales.").optional()`;
  - `leerPremio` lee `compraMinimaUsd: texto("compraMinimaUsd")` (vacío = sin compra mínima);
  - `datosDelPremio`: `descuento` guarda `montoDescuentoUsd`; `producto` guarda `productoId` y `cantidad`; `delivery` deja los tres en `null`; todos guardan `compraMinimaUsd: valor.compraMinimaUsd ?? null`.
- [X] T039 [US3] `lib/actions/cuenta-cliente.ts`, `obtenerBeneficiosCheckout`: cada premio añade `productoId`, `compraMinimaUsd` y `activo: true`, de modo que el arreglo sirve como `PremioParaCanje[]`; actualizar `BeneficiosCheckout` en consecuencia.
- [X] T040 [US3] Premios en el panel ([contracts/ui.md §2](./contracts/ui.md#2-panel-premios-adminclientsrewards)):
  - `components/admin/clientes/premios/rewardForm.tsx`: tercera opción "Delivery gratis" (`delivery`); con ese tipo, sin campos de monto ni producto y la nota "Cubre el delivery completo del pedido, a cualquier zona activa."; campo nuevo "Compra mínima (USD)" para los tres tipos (`name="compraMinimaUsd"`, `type="number"`, `min="0.01"`, `step="0.01"`, opcional, `defaultValue={premio?.compraMinimaUsd ?? ""}`, ayuda "Opcional. Monto mínimo en productos para poder canjearlo."); `PremioVista` añade `compraMinimaUsd: number | null`.
  - `components/admin/clientes/premios/rewardsTable.tsx`: bajo la recompensa, "Compra mínima USD {monto}" si la tiene; subtítulo "Los clientes los canjean con sus puntos por un descuento, un producto gratis o el delivery de su pedido."
  - `app/admin/clients/rewards/page.tsx`: incluir `compraMinimaUsd` en el mapeo de premios.
- [X] T041 [US3] Detalle del pedido ([contracts/ui.md §3](./contracts/ui.md#3-panel-detalle-del-pedido-admintransactionsid)):
  - `app/admin/transactions/[id]/page.tsx`: tras "Descuento por puntos", la línea "Delivery gratis (premio)" con `-${montoDescuentoDelivery.toFixed(2)}` cuando sea > 0; excluir de `premiosCanjeables` los premios `delivery` si `montoDelivery - montoDescuentoDelivery <= 0`; pasar `descuentoPuntosUsd={montoDescuentoPuntos + montoDescuentoDelivery}`.
  - `components/admin/ventas/canjearPremioPanel.tsx`: el texto pasa a "Descuento por premios aplicado: {monto}".
- [X] T042 [US3] Venta manual y edición ([contracts/ui.md §4](./contracts/ui.md#4-panel-formulario-de-venta-y-edición-adminadd-transaction)):
  - `app/admin/add-transaction/page.tsx`: `premiosRaw` con `where: { activo: true, tipo: { not: "delivery" } }`.
  - `components/admin/ventas/manualSaleForm.tsx`: `totalFinalUsd = totales.totalUsd + (pedido?.montoDeliveryUsd ?? 0) - (pedido?.descuentoDeliveryUsd ?? 0)` (redondeado a centavos); en el resumen de solo lectura de la edición, la línea "Delivery gratis (premio): {formatUsd(...)}" cuando `pedido.descuentoDeliveryUsd > 0`.
- [X] T043 [US3] Paso de pago ([contracts/ui.md §7](./contracts/ui.md#7-tienda-paso-de-pago-finalizar-compra)):
  - `components/finalizar-compra/beneficiosCliente.tsx`: nueva prop `montoDeliveryUsd`; convertir los premios del servidor a `PremioParaCanje`; `contexto = { puntosDisponibles: datos.puntos, subtotalUsd, descuentoUsd: 0, montoDeliveryUsd }`; selección efectiva `filtrarCanjesValidos(elegidos, contexto)`; un premio no elegido se deshabilita si no tiene existencia o si `validarCanjes({ ...contexto, premios: [...efectivos, premio] })` lanza, y muestra bajo su nombre "Sin existencia" o el `message` del error; eliminar `excedePuntos` y `excedeCompra`; `descuentoPremiosUsd = descuentoPuntosUsd + descuentoDeliveryUsd` de `validarCanjes` sobre la selección efectiva; el saldo máximo usa `totalUsd − descuentoPremiosUsd`; `SeleccionBeneficios` y `SIN_BENEFICIOS` renombran `descuentoPuntosUsd` → `descuentoPremiosUsd`; `onChange` envía los `premioIds` efectivos.
  - `components/finalizar-compra/paymentInformation.tsx`: pasar `montoDeliveryUsd={deliveryMethod === "envio" ? deliveryPrice : 0}` y calcular `finalTotalUSD` con `beneficios.descuentoPremiosUsd`.
- [X] T044 [P] [US3] `app/confirmacion/page.tsx`: entre "Delivery" y "Total", la línea "Delivery gratis (premio)" con `-$${orden.montoDescuentoDelivery.toFixed(2)}` cuando sea > 0.
- [X] T045 [US3] Ejecutar `npm.cmd run test:admin`, `npm.cmd run test:checkout` (con las variables de integración) y `npm.cmd run build` (confirma que `lib/fidelidad.ts` se importa en el navegador); validar a mano [quickstart.md](./quickstart.md) §6 completo. *(Parte automatizada verificada; la validación manual en el navegador queda para T061.)*

**Checkpoint**: El delivery gratis funciona en la tienda y en el panel, y la compra mínima protege a la dueña.

---

## Phase 6: User Story 4 - Armar el catálogo de premios con una regla clara de costos (Priority: P2)

**Goal**: El formulario de premios propone el costo en puntos (20 por USD de precio al detal) y los valores del delivery gratis (100 puntos, USD 15), sin imponerlos.

**Independent Test**: Premio de producto de USD 7 → propone 140; escribir 150 y guardar → queda 150. Premio de delivery → propone 100 y USD 15 ([quickstart.md](./quickstart.md) §3).

### Tests for User Story 4

- [X] T046 [P] [US4] Añadir a `tests/admin/fidelidad.test.ts` los casos **C1–C6** de [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md#costosugeridopremio-nueva). Deben fallar hasta T047.

### Implementation for User Story 4

- [X] T047 [US4] En `lib/fidelidad.ts`, exportar `costoSugeridoPremio({ precioDetalUsd, cantidad })`: si `precioDetalUsd` o `cantidad` no son finitos o no son positivos → 10; si no, `Math.max(10, Math.round((PROGRAMA_PUNTOS.puntosPorUsdDePremio * precioDetalUsd * cantidad) / 10) * 10)`.
- [X] T048 [US4] `app/admin/clients/rewards/page.tsx`: la consulta de productos selecciona también `precioDetal`; en `components/admin/clientes/premios/rewardForm.tsx`, `ProductoOpcion` añade `precioDetal: number`.
- [X] T049 [US4] Sugerencias en `components/admin/clientes/premios/rewardForm.tsx` ([contracts/ui.md §2](./contracts/ui.md#rewardform)):
  - "Costo en puntos" y "Compra mínima (USD)" pasan a campos controlados; estado `costoEditado` y `compraEditada` (se marcan al escribir en el campo);
  - controlar también el producto y la cantidad para calcular `costoSugeridoPremio({ precioDetalUsd: producto.precioDetal, cantidad })`;
  - **premio nuevo**: con tipo `producto` y producto elegido, el costo toma la sugerencia mientras `!costoEditado`; con tipo `delivery`, el costo toma `PROGRAMA_PUNTOS.costoDeliveryGratis` y la compra mínima `PROGRAMA_PUNTOS.compraMinimaDeliveryUsd` mientras no se hayan editado; con `descuento`, sin sugerencia;
  - **edición**: los campos parten de lo guardado y nunca cambian solos;
  - ayuda bajo el costo: "Sugerido: {n} puntos (20 por cada USD de su precio al detal)." para `producto` y "Sugerido: 100 puntos con compra mínima de USD 15." para `delivery`, tomando los números de `PROGRAMA_PUNTOS`.
- [X] T050 [US4] Ejecutar `npm.cmd run test:admin` y `npm.cmd run build`, y validar a mano [quickstart.md](./quickstart.md) §3. *(Parte automatizada verificada; la validación manual en el navegador queda para T061.)*

**Checkpoint**: La dueña arma el catálogo con costos coherentes en menos de un minuto por premio.

---

## Phase 7: User Story 5 - Recibir puntos de bienvenida al crear mi cuenta (Priority: P3)

**Goal**: 25 puntos, una sola vez por cliente consumidor, cuando su cuenta queda vinculada; también para los ya vinculados al activar la función.

**Independent Test**: Crear una cuenta nueva de consumidor → movimiento "Bono de bienvenida" de 25; desvincular y volver a vincular → no se repite ([quickstart.md](./quickstart.md) §7).

### Tests for User Story 5

- [X] T051 [P] [US5] En `tests/admin/fidelidad.integration.test.ts`, casos **I11** (dos llamadas a `acreditarBonoBienvenida` para un consumidor → 25 y 0; un solo movimiento `bono`), **I12** (mayorista → 0, sin movimiento) e **I15** (cuenta `pendiente` → `update` a `vinculada` + `acreditarBonoBienvenida`; `delete` de la cuenta; nueva `CuentaCliente` vinculada + `acreditarBonoBienvenida` → un solo `bono`). I15 va en esta suite y no en `admin-clients.integration.test.ts` porque `confirmarVinculacionCuenta` depende de `requireAdmin` ([contrato §5](./contracts/reglas-y-acciones.md#5-pruebas-de-integración)).

### Implementation for User Story 5

- [X] T052 [US5] En `lib/fidelidad.ts`, exportar `acreditarBonoBienvenida(tx: Prisma.TransactionClient, clienteId: number): Promise<number>`: `await bloquearCliente(tx, clienteId)`; leer `tipoCliente` (si no existe o no es `"detal"` → 0); si existe una `fidelidad` con `{ clienteId, tipoMovimiento: "bono" }` → 0; si no, crear `{ clienteId, tipoMovimiento: "bono", puntos: PROGRAMA_PUNTOS.puntosBienvenida, descripcion: "Bono de bienvenida" }` y devolver los puntos.
- [X] T053 [US5] Crear la migración de datos: `npx prisma migrate dev --create-only --name bono_bienvenida_inicial` y poner en su `migration.sql` **exactamente** el SQL de [data-model.md](./data-model.md#migraciones) (el `INSERT ... SELECT` con `'bono'::"TipoMovimiento"`, 25, `'Bono de bienvenida'`, consumidores `detal` con cuenta `vinculada` y `NOT EXISTS` de un `bono` previo). Aplicarla con `npx prisma migrate dev` en desarrollo y con `npx prisma migrate deploy` en la base de pruebas.
- [X] T054 [P] [US5] `lib/cuenta-cliente.ts`, `obtenerSesionCliente`: en la rama `resolucion.accion === "vincular"`, reemplazar el `prisma.cuentaCliente.create` suelto por `prisma.$transaction(async (tx) => { await tx.cuentaCliente.create({...}); await acreditarBonoBienvenida(tx, resolucion.clienteId); })`; conservar el `catch` de `P2002` y la relectura con `cuentaDe()`.
- [X] T055 [P] [US5] `lib/actions/cuenta-cliente.ts`, `completarRegistroCliente`: cuando `estado` queda `"vinculada"` (rama `vincular` y rama `crear_cliente`), llamar `acreditarBonoBienvenida(tx, clienteId)` dentro de la misma transacción y devolver los puntos acreditados; no llamarla cuando queda `"pendiente"`. Mensaje de éxito: `¡Listo! Te regalamos ${PROGRAMA_PUNTOS.puntosBienvenida} puntos de bienvenida.` si se acreditaron; si no, el actual.
- [X] T056 [P] [US5] `lib/actions/admin-clients.ts`, `confirmarVinculacionCuenta`: tras el `update` a `"vinculada"`, `const bono = await acreditarBonoBienvenida(tx, cuenta.clienteId)` dentro de la misma transacción; devolver `Cuenta vinculada. Se acreditaron ${bono} puntos de bienvenida.` si `bono > 0`, si no `Cuenta vinculada.`; añadir `revalidatePath("/admin/points")`. `desvincularCuenta` no cambia.
- [X] T057 [US5] Ejecutar `npm.cmd run test:admin` (con integración) y `npm.cmd run build`; validar a mano [quickstart.md](./quickstart.md) §0 (bono inicial) y §7. *(Parte automatizada verificada; la validación manual en el navegador queda para T061.)*

**Checkpoint**: Cada consumidor registrado recibe su bono una sola vez.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, revisión del diff, verificación completa y validación manual.

- [X] T058 [P] Actualizar la documentación:
  - **`CLAUDE.md`**, en "Cuenta del cliente, saldo a favor y fidelización": la sección `/admin/points` (solo lectura, calculada de `Fidelidad`, reglas puras en `lib/admin/points-core.ts`); la vista `/mi-cuenta/puntos`; el premio `delivery` con `Transaccion.montoDescuentoDelivery` (separado de `montoDescuentoPuntos`, no entra en la base de puntos ni en la del descuento) y la regla del total `subtotal + delivery − descuento − descuentoPuntos − descuentoDelivery`, que `recalcularTotalPedido` aplica con el delivery cubierto; `Premio.compraMinimaUsd`; las condiciones de canje en un solo lugar (`validarCanjes`, también en el paso de pago); el bono de bienvenida (`bono`, una vez por cliente consumidor, en los tres puntos de vinculación); `PROGRAMA_PUNTOS`.
  - **`docs/descripcion-tecnica.md`**: añadir `/admin/points` y `/mi-cuenta/puntos`, y el delivery gratis entre los premios.
- [X] T059 Revisar el diff completo (`git diff main`) en busca de:
  - cambios fuera de alcance, código muerto o imports sin uso (`excedePuntos`, `excedeCompra`, los bloques retirados de "Mi cuenta", la segunda lectura del premio en `canje-pedido.ts`);
  - imports con `@/` o imports de **valores** de `@prisma/client` en `lib/fidelidad.ts` y `lib/admin/points-core.ts`;
  - `motivo`, `actorId` o `actorEmail` en `obtenerMisPuntos` o `MisPuntosVista`;
  - alguna llamada a `recalcularTotalPedido`, `prepararCanjes` o `canjearPremios` sin el delivery;
  - fechas cortadas con la zona del servidor o del navegador;
  - textos fuera de español o avisos fuera de `toast`.
- [X] T060 Ejecutar `npm.cmd run lint`, `npm.cmd run test:admin`, `npm.cmd run test:checkout` y `npm.cmd run build`, y compararlos con la línea base de T001. Declarar cualquier verificación omitida (por ejemplo, las pruebas de integración si no hubo base aislada).
- [ ] T061 Ejecutar a mano [quickstart.md](./quickstart.md) completo, incluida la regresión del §8 (pedido sin premios, premio de descuento, edición sin delivery gratis, editor de descuento, "Mi cuenta") y "Mis puntos" a 360 px. Se puede usar el navegador de Playwright para las capturas. Marcar en la spec cualquier desviación.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T002 en paralelo con T001 tras crear la rama.
- **Foundational (Phase 2)**: depende de Setup. **Bloquea todas las historias.** Orden: T003 → T005 → (T007, T008) → T009; T004 y T006 en paralelo con T005.
- **US1 (Phase 3)** y **US2 (Phase 4)**: solo dependen de Foundational; son independientes entre sí.
- **US3 (Phase 5)**: solo depende de Foundational.
- **US4 (Phase 6)**: la sugerencia para productos solo depende de Foundational; la del delivery necesita la opción "Delivery gratis" del formulario (T040, US3). Entregar US4 después de US3.
- **US5 (Phase 7)**: solo depende de Foundational (usa `PROGRAMA_PUNTOS` y el valor `bono`).
- **Polish (Phase 8)**: tras las historias que se entreguen.

### Archivos compartidos que obligan a trabajar en secuencia

- `lib/fidelidad.ts`: T005 → T020 (US2) → T033 (US3) → T047 (US4) → T052 (US5).
- `tests/admin/fidelidad.test.ts`: T004 → T019 (US2) → T028 (US3) → T046 (US4).
- `tests/admin/fidelidad.integration.test.ts`: T031 (US3) → T051 (US5).
- `lib/cuenta-cliente.ts`: T006 → T021 (US2) → T054 (US5).
- `lib/actions/cuenta-cliente.ts`: T008 → T039 (US3) → T055 (US5).
- `lib/actions/admin-fidelidad.ts`: T017 (US1) → T026 (US2) → T038 (US3).
- `components/admin/clientes/premios/rewardForm.tsx`: T007 → T040 (US3) → T048 → T049 (US4).
- `app/admin/clients/rewards/page.tsx`: T040 (US3) → T048 (US4).
- `app/admin/transactions/[id]/page.tsx`: T007 → T041 (US3).
- `components/admin/ventas/manualSaleForm.tsx`: T007 → T042 (US3).
- `components/finalizar-compra/beneficiosCliente.tsx`: T008 → T043 (US3).

### Within Each User Story

- Las pruebas (T010, T019, T028–T032, T046 y T051) se escriben primero y fallan hasta implementar la regla.
- Orden: regla pura → lectura o núcleo transaccional → acción → componente → página.
- En US3, T033 (reglas) y T034 (total) van antes que los núcleos (T035–T037), y estos antes que las pantallas (T040–T044).

### Parallel Opportunities

- **Foundational**: T004 y T006 en paralelo con T005; T007 y T008 en paralelo entre sí, después de T005 (usan `describirRecompensa`).
- **US1**: T010 en paralelo con todo; T013, T014 y T016 en paralelo entre sí una vez existan los tipos de T011.
- **US2**: T019 y T022 en paralelo; T024 tras T021.
- **US3**: T028–T032 en paralelo entre sí; T037 y T044 en paralelo con las demás tareas de implementación una vez hecha T033.
- **US5**: T051 en paralelo con T052; T054, T055 y T056 en paralelo tras T052.
- **Entre historias**: con Foundational terminada, US1 no comparte archivos de `lib/` con ninguna otra historia salvo `admin-fidelidad.ts` (una línea) y puede avanzar en paralelo con US2, US3 o US5.

---

## Parallel Example: User Story 1

```text
Task: "T010 [P] [US1] Crear tests/admin/points-core.test.ts con P1–P17"
# Tras T011:
Task: "T013 [P] [US1] Crear components/admin/puntos/pointsFilters.tsx"
Task: "T014 [P] [US1] Crear components/admin/puntos/pointsTable.tsx"
Task: "T016 [P] [US1] Entrada 'Puntos' en components/admin/sidebar.tsx y header.tsx"
```

## Parallel Example: User Story 3

```text
Task: "T028 [P] [US3] V1–V9 y F1–F4 en tests/admin/fidelidad.test.ts"
Task: "T029 [P] [US3] T1–T3 en tests/admin/sales-calculations.test.ts"
Task: "T030 [P] [US3] I1–I6 en tests/checkout/checkout.integration.test.ts"
Task: "T031 [P] [US3] I7–I10 e I13 en tests/admin/fidelidad.integration.test.ts"
Task: "T032 [P] [US3] I14 en tests/admin/order-edit.integration.test.ts"
```

## Parallel Example: User Story 5

```text
# Tras T052:
Task: "T054 [P] [US5] Bono en obtenerSesionCliente (lib/cuenta-cliente.ts)"
Task: "T055 [P] [US5] Bono en completarRegistroCliente (lib/actions/cuenta-cliente.ts)"
Task: "T056 [P] [US5] Bono en confirmarVinculacionCuenta (lib/actions/admin-clients.ts)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) y Phase 2 (Foundational): esquema, constantes y tipos ampliados, sin cambios visibles.
2. Phase 3 (US1): la sección "Puntos" del panel.
3. **Validar**: quickstart §4. Ya se puede entregar: es lo primero que pidió la dueña y solo lee datos existentes.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → sección "Puntos" del panel (MVP).
3. US2 → "Mis puntos" para los clientes; "Mi cuenta" enlaza a ella.
4. US3 → delivery gratis y compra mínima; es la historia que toca el total de los pedidos, así que se valida con la regresión del quickstart §8.
5. US4 → costos propuestos al crear premios.
6. US5 → bono de bienvenida, incluido el de los clientes ya vinculados.
7. Polish: documentación, verificación completa y quickstart.

Cada incremento deja `lint`, `test:admin` y `build` en verde.

---

## Notes

- Si una tarea parece requerir una dependencia nueva, otra columna o una acción invocable desde el navegador, detenerse y revisar [research.md](./research.md).
- La tabla de "Ventas y pedidos" (`components/admin/ventas/salesTable.tsx`) muestra subtotal, delivery, descuento y total, y ya hoy no muestra el descuento por puntos. El delivery gratis queda igual de fuera; cambiarla está fuera de alcance.
- La venta manual del panel no tiene delivery: el delivery gratis solo se canjea en la tienda y en el detalle de un pedido (Decisión 9).
- Commit por historia completada, con mensajes en español al estilo del repo (`feat(puntos): …`).
