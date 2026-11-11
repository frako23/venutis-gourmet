# Implementation Plan: Programa de puntos: consulta en el panel, "Mis puntos" y canje por productos o delivery gratis

**Branch**: `014-programa-puntos` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-programa-puntos/spec.md`

## Summary

El programa de fidelización de la spec 010 ya acumula puntos, tiene premios de descuento y de producto, y canjea en la tienda y en el panel. Esta función agrega lo que falta:

- **Sección "Puntos" del panel** (`/admin/points`): una tabla con lo ganado, canjeado, ajustado y disponible de cada cliente, con buscador, orden e indicadores.
- **Vista "Mis puntos" del cliente** (`/mi-cuenta/puntos`): saldo, premio más cercano, catálogo con el estado de cada premio, explicación del programa e historial.
- **Premio "Delivery gratis"**, con compra mínima opcional para cualquier premio.
- **Costos propuestos** al crear un premio, según la tabla de puntos.
- **Bono de bienvenida** de 25 puntos, una vez por cliente consumidor.

Enfoque técnico:

- El delivery cubierto por un premio se guarda en una columna nueva de `Transaccion`, separada del descuento sobre productos, para que ni la base de puntos ni la regla del descuento cambien. `recalcularTotalPedido` recibe ese monto como parámetro obligatorio.
- Las condiciones nuevas (un delivery por pedido, pedido con delivery, compra mínima) entran en `validarCanjes`, la regla pura que ya valida los canjes. El paso de pago pasa a usar esa misma función en el navegador, en vez de repetir condiciones.
- Las dos vistas nuevas son de solo lectura. La del panel se calcula con un `groupBy` de los movimientos y un módulo puro nuevo; nada se guarda.
- El bono es un tipo de movimiento nuevo, acreditado dentro de la transacción de los tres lugares donde una cuenta queda vinculada.

Hay cambio de esquema (dos valores de enum y dos columnas) con dos migraciones. No hay dependencias nuevas ni Server Actions nuevas.

## Technical Context

**Language/Version**: TypeScript estricto, React 19.1 y Next.js 16.4.3 (App Router). Componentes de servidor para las dos vistas nuevas; los componentes de cliente que cambian ya existen.

**Primary Dependencies**: Prisma 6.17, Zod 4, Stack Auth, sonner, lucide-react y Tailwind 4, todas ya instaladas. **Sin dependencias nuevas.**

**Storage**: PostgreSQL con Prisma. Cambios en [data-model.md](./data-model.md):

- `TipoPremio` + `delivery`; `TipoMovimiento` + `bono`;
- `Premio.compraMinimaUsd` (opcional) y `Transaccion.montoDescuentoDelivery` (por defecto 0);
- dos migraciones: `programa_puntos` (esquema) y `bono_bienvenida_inicial` (datos).

**Testing**: `node:test` con `npm.cmd run test:admin` y `npm.cmd run test:checkout`.

- **Pruebas puras**: `tests/admin/points-core.test.ts` (nuevo, 17 casos) y casos añadidos a `fidelidad.test.ts` (canjes, costo sugerido, estado del premio) y `sales-calculations.test.ts` (total con delivery cubierto).
- **Pruebas de integración** (base aislada): 15 casos añadidos a las suites de checkout, fidelidad, edición de pedidos y clientes.
- Además `npm.cmd run lint`, `npm.cmd run build` y el [quickstart.md](./quickstart.md) manual en escritorio y a 360 px.

Los casos están numerados en [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md).

**Target Platform**: navegadores modernos. La tienda se diseña móvil primero; el panel se usa en escritorio y en teléfono.

**Project Type**: aplicación web monolítica Next.js.

**Performance Goals**:

- **`/admin/points`**: tres lecturas agregadas en paralelo y una de clientes. El `groupBy` recorre los movimientos de puntos (unos pocos miles) con el índice `[clienteId, fecha]`. Objetivo: menos de 300 ms en el servidor.
- **`/mi-cuenta/puntos`**: cuatro lecturas en paralelo, las mismas que "Mi cuenta" ya hacía para puntos y premios.
- **Checkout**: sin consultas adicionales; el premio de delivery se lee en la misma consulta de premios.

**Constraints**:

- Toda operación de puntos bloquea primero el cliente y luego el pedido (`bloquearCliente`), como hoy.
- El `clienteId` de la tienda sale siempre de la sesión; "Mis puntos" no expone autor ni motivo de los movimientos.
- La selección de beneficios sigue siendo estado local del paso de pago: no se amplía el estado duplicado del checkout.
- Fechas en `ZONA_HORARIA`; el "mes en curso" de los indicadores se corta en hora de Caracas.
- Avisos solo con `toast` de sonner; UI en español; colores y clases existentes.
- Sin desplazamiento horizontal a 360 px en "Mis puntos" (SC-004).

**Scale/Scope**: dos rutas nuevas, cientos de clientes con puntos, menos de diez premios activos.

- **Superficies**: panel administrativo y tienda pública.
- **Fuera de alcance**: vencimiento de puntos, niveles, referidos, combos, canjes sin pedido, tope de delivery por zona, delivery en la venta manual, filtro por período y exportación en la sección del panel, y avisos automáticos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la Constitución v2.1.0.

- [x] **I. Simplicidad ante todo (puerta de simplicidad)**:
  - **Alternativa más simple**:
    - **Delivery gratis**: un valor más en el enum de premios y una columna para el monto cubierto. Se descartó sumarlo al descuento por puntos, que parece más corto pero obliga a que cada regla de total y de puntos distinga qué parte es de delivery.
    - **Sección del panel**: una página de servidor con un formulario `GET`; sin componentes de cliente, sin paginación y sin SQL crudo.
    - **"Mis puntos"**: mover los bloques que "Mi cuenta" ya tenía, no duplicarlos. "Canjear" es un enlace al catálogo, sin preseleccionar el premio.
    - **Tabla de puntos**: una constante en código; sin tabla de configuración ni pantalla de ajustes.
    - **Bono inicial**: un `INSERT ... SELECT` en una migración; sin tarea programada ni escritura en una página de consulta.
  - **Qué se reutiliza**:
    - puntos y canjes: `validarCanjes`, `prepararCanjes`, `canjearPremios`, `canjearPremioEnPedido`, `revertirPuntosDePedido`, `bloquearCliente`, `puntosDisponiblesDelCliente`;
    - premios: la tabla, el formulario, las acciones y el esquema Zod de `admin-fidelidad.ts`;
    - cuenta: `obtenerSesionCliente`, `obtenerClienteDeSesion` y los tres puntos de vinculación existentes;
    - panel: `requireAdmin`, `DashboardCard`, las clases `admin-*`, `normalizeSearchName`;
    - fechas y formato: `ZONA_HORARIA`, `fechaHoraLocalCaracas`, `interpretarFechaHoraCaracas`, `formatFecha`, `formatPuntosConSigno`, `formatUsd`;
    - tienda: `Bloque` y `Vacio` de "Mi cuenta", `unidadesDisponibles`.
  - **Qué se añade y por qué**:
    - dos columnas y dos valores de enum ([research.md](./research.md), Decisiones 1 a 4);
    - `lib/admin/points-core.ts` (puro) y `lib/admin/points.ts` (lectura), según el patrón `*-core` de los Principios II y V;
    - dos rutas (`/admin/points` y `/mi-cuenta/puntos`), tres componentes y un layout para "Mi cuenta";
    - cinco funciones puras en `lib/fidelidad.ts` y una transaccional (`acreditarBonoBienvenida`);
    - `describirRecompensa`: una abstracción extraída con cuatro usos reales.

    No hay dependencias, capas, servicios externos ni Server Actions nuevas.
  - **Qué se elimina**: los bloques "Premios" y "Movimientos de puntos" de "Mi cuenta", los tres ternarios que describían la recompensa y las condiciones repetidas a mano en `BeneficiosCliente`.
- [x] **II. Una sola fuente de verdad**:
  - No hay escrituras nuevas fuera de las Server Actions y núcleos existentes; el esquema Zod de premios se amplía.
  - El total de un pedido sigue teniendo una regla: `recalcularTotalPedido` incorpora el delivery cubierto como parámetro obligatorio, y el checkout lo resta con `calculateCheckoutTotals`.
  - Las condiciones de un canje viven solo en `validarCanjes`; el navegador y el servidor llaman a la misma función y el servidor decide.
  - Los puntos por cliente no se guardan: se calculan de `Fidelidad`, de modo que el panel, la ficha y "Mis puntos" coinciden por construcción.
  - El costo del delivery se sigue leyendo de `ZonaDelivery` dentro de la transacción del checkout.
  - El cambio de `schema.prisma` va con sus migraciones y `prisma generate`.
- [x] **III. Superficies con límites claros**: cambian el **panel administrativo** (sección nueva, premios, detalle y edición del pedido) y la **tienda pública** ("Mi cuenta", "Mis puntos", paso de pago y confirmación). La venta rápida y la cotización rápida no se tocan. Las dos rutas nuevas quedan cubiertas por esta especificación, como exige el flujo de trabajo.
- [x] **IV. Seguridad del lado del servidor**:
  - `/admin/points` llama a `requireAdmin()` y vive bajo el layout del panel.
  - `/mi-cuenta/puntos` solo muestra datos con sesión `vinculada`; el cliente sale de la sesión y la ruta no acepta identificadores.
  - "Mis puntos" no expone `motivo`, `actorId` ni `actorEmail`.
  - El bono no tiene acción invocable desde el navegador.
  - No hay secretos, roles ni proveedores nuevos.
- [x] **V. Pruebas proporcionales al riesgo**: lo que toca dinero y puntos (total con delivery cubierto, condiciones de canje, bono único, edición y cancelación) lleva pruebas puras y de integración. Las dos vistas de lectura se prueban en su lógica pura y se validan con el quickstart.
- [x] **Restricciones: fechas y horas (v2.1.0)**: los indicadores "del mes" se cortan con `inicioMesCaracas`; las fechas se muestran con `formatFecha`.
- [x] **Restricciones: notificaciones, idioma y estilos**: `toast` de sonner, textos en español, clases y tokens existentes.

**Resultado de la puerta previa**: APROBADA, sin desviaciones.

**Re-evaluación tras la fase 1**: APROBADA. El diseño de [data-model.md](./data-model.md) y de los [contratos](./contracts/) no añadió dependencias ni superficies. Tres ajustes respecto de la idea inicial:

- el canje de delivery gratis en el panel se limita al detalle del pedido, porque la venta manual no tiene delivery (Decisión 9);
- el bono inicial se separó en una segunda migración, por la restricción de PostgreSQL sobre valores de enum nuevos (Decisión 5);
- el paso de pago reutiliza `validarCanjes` en lugar de sumar tres condiciones más a las dos que ya repetía (Decisión 8).

## Design Decisions

El detalle y las alternativas descartadas están en [research.md](./research.md). Las funciones, mensajes y casos de prueba están en [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md) y la interfaz en [contracts/ui.md](./contracts/ui.md).

### Regla del total con delivery gratis

```text
montoTotal = montoSubtotal + montoDelivery − montoDescuento − montoDescuentoPuntos − montoDescuentoDelivery
```

| Monto | Entra en la base de puntos | Entra en la base del descuento y de la compra mínima |
|---|---|---|
| `montoSubtotal` | Sí | Sí |
| `montoDescuento`, `montoDescuentoPuntos` | Sí (restan) | Sí (restan) |
| `montoDelivery`, `montoDescuentoDelivery` | No | No |

Por eso el delivery gratis no cambia los puntos que gana el pedido (FR-021) y un pedido pequeño con delivery caro no rompe la regla "el descuento no supera el subtotal".

### Flujo de un canje de delivery gratis en la tienda

1. El paso de pago carga los premios con `obtenerBeneficiosCheckout` y evalúa cada uno con `validarCanjes` (delivery del pedido, compra mínima, puntos).
2. La clienta marca "Delivery gratis"; el total a pagar baja en el costo del delivery.
3. Al confirmar, `registrarCompraWeb` bloquea al cliente, lee el costo vigente de la zona y vuelve a validar con `prepararCanjes`.
4. Crea el pedido con `montoDelivery` y `montoDescuentoDelivery` iguales, y `canjearPremios` registra la `redencion`.
5. Si algo dejó de cumplirse, la transacción se deshace entera y responde `BENEFITS_CHANGED`.

### Dónde se acredita el bono

| Momento | Función | Transacción |
|---|---|---|
| El correo verificado vincula la cuenta sola | `obtenerSesionCliente` | Nueva: cuenta y bono juntos |
| El registro vincula o crea el cliente | `completarRegistroCliente` | La existente |
| La administradora confirma un vínculo pendiente | `confirmarVinculacionCuenta` | La existente |
| Consumidores ya vinculados | Migración `bono_bienvenida_inicial` | Una vez |

### Reparto entre servidor y cliente

| Pieza | Dónde corre | Motivo |
|---|---|---|
| `/admin/points`: página, indicadores, filtros y tabla | Servidor | Formulario `GET`; sin interacción en el navegador. |
| `/mi-cuenta/puntos`: página y `MisPuntosVista` | Servidor | Solo lectura; "Canjear" es un enlace. |
| `RewardForm` | Cliente (ya lo es) | Sugerencia de costo mientras se elige producto y cantidad. |
| `BeneficiosCliente` | Cliente (ya lo es) | Selección local; valida con `validarCanjes`. |

### Antes de escribir código

`AGENTS.md` exige leer la guía de la versión instalada de Next.js. Para esta función:

- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` (el layout de "Mi cuenta", `searchParams` como promesa);
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (importar reglas puras desde un componente de cliente);
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md` y `revalidatePath.md`.

### Orden de entrega

Cada paso deja la aplicación funcionando y se puede entregar solo.

1. **Base**: migraciones, `PROGRAMA_PUNTOS`, `describirRecompensa` y la etiqueta `bono`.
2. **US1**: `points-core`, `points` y `/admin/points`.
3. **US2**: `obtenerMisPuntos`, layout de "Mi cuenta" y `/mi-cuenta/puntos`.
4. **US3**: `validarCanjes` ampliada, total con delivery cubierto, checkout, canje en el pedido, edición y pantallas de totales.
5. **US4**: formulario y tabla de premios con compra mínima y costos sugeridos.
6. **US5**: `acreditarBonoBienvenida` en los tres puntos de vinculación.

El paso 4 incluye el tipo `delivery` en el formulario de premios, sin el cual no se puede probar; el paso 5 añade solo las sugerencias.

### Cambios por archivo

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | `TipoPremio.delivery`, `TipoMovimiento.bono`, `Premio.compraMinimaUsd`, `Transaccion.montoDescuentoDelivery`. |
| `prisma/migrations/*_programa_puntos` (**nuevo**) | Esquema. |
| `prisma/migrations/*_bono_bienvenida_inicial` (**nuevo**) | Bono para los consumidores ya vinculados. |
| `lib/fidelidad.ts` | `PROGRAMA_PUNTOS`; `validarCanjes` ampliada; `filtrarCanjesValidos`, `costoSugeridoPremio`, `estadoPremio`, `premioMasCercano`, `describirRecompensa` y `acreditarBonoBienvenida` nuevas; `prepararCanjes` y `canjearPremios` reciben `montoDeliveryUsd`. |
| `lib/admin/points-core.ts` (**nuevo**) | Clasificación, filas, filtro, orden, indicadores e inicio de mes. Puro, sin `@/`. |
| `lib/admin/points.ts` (**nuevo**) | `consultarPuntosClientes`. |
| `lib/admin/sales-calculations.ts` | `recalcularTotalPedido` recibe `descuentoDeliveryUsd` (obligatorio). |
| `lib/checkout-core.ts` | Pasa el delivery a los canjes, lo resta del total y guarda `montoDescuentoDelivery`. |
| `lib/admin/canje-pedido.ts` | Delivery gratis en pedidos pendientes; rechaza un segundo. |
| `lib/admin/manual-sale.ts` | Pasa `montoDeliveryUsd: 0`. |
| `lib/admin/order-edit.ts`, `order-edit-rules.ts` | `PedidoEditable.descuentoDeliveryUsd`; el total editado lo incluye. |
| `lib/actions/admin-sales.ts` | Las dos llamadas a `recalcularTotalPedido` pasan el delivery cubierto. |
| `lib/actions/admin-fidelidad.ts` | Esquema de premios con `delivery` y `compraMinimaUsd`; revalida las dos rutas nuevas. |
| `lib/cuenta-cliente.ts` | `obtenerMisPuntos`; `obtenerResumenCuenta` sin premios ni movimientos de puntos; bono en el vínculo automático. |
| `lib/actions/cuenta-cliente.ts` | Bono en el registro; `obtenerBeneficiosCheckout` con `compraMinimaUsd` y el tipo `delivery`. |
| `lib/actions/admin-clients.ts` | Bono al confirmar una vinculación. |
| `lib/format.ts` | Etiqueta `bono`. |
| `app/admin/points/page.tsx` (**nuevo**) | Sección "Puntos". |
| `components/admin/puntos/pointsFilters.tsx`, `pointsTable.tsx` (**nuevos**) | Filtros y tabla. |
| `components/admin/sidebar.tsx`, `header.tsx` | Entrada y título "Puntos". |
| `app/admin/clients/rewards/page.tsx` | Productos con `precioDetal`; premios con `compraMinimaUsd`. |
| `components/admin/clientes/premios/rewardForm.tsx`, `rewardsTable.tsx` | Tipo delivery, compra mínima, costo sugerido y `describirRecompensa`. |
| `app/admin/transactions/[id]/page.tsx`, `components/admin/ventas/canjearPremioPanel.tsx` | Línea "Delivery gratis (premio)"; premios ofrecidos según el delivery del pedido. |
| `app/admin/add-transaction/page.tsx`, `components/admin/ventas/manualSaleForm.tsx` | Sin premios de delivery en la venta manual; total y resumen de la edición con el delivery cubierto. |
| `app/mi-cuenta/layout.tsx` (**nuevo**), `app/mi-cuenta/page.tsx` | El marco común sube al layout. |
| `app/mi-cuenta/puntos/page.tsx` (**nuevo**) | "Mis puntos". |
| `components/mi-cuenta/misPuntos.tsx` (**nuevo**), `resumenCuenta.tsx` | Vista nueva; "Mi cuenta" enlaza a ella y pierde dos bloques. |
| `components/finalizar-compra/beneficiosCliente.tsx`, `paymentInformation.tsx` | Validación con `validarCanjes`, delivery del pedido y `descuentoPremiosUsd`. |
| `app/confirmacion/page.tsx` | Línea "Delivery gratis (premio)". |
| `tests/admin/points-core.test.ts` (**nuevo**) | Casos P1 a P17. |
| `tests/admin/fidelidad.test.ts`, `sales-calculations.test.ts` | Casos V, F, C, E y T. |
| `tests/checkout/checkout.integration.test.ts`, `tests/admin/fidelidad.integration.test.ts`, `order-edit.integration.test.ts`, `admin-clients.integration.test.ts` | Casos I1 a I15. |
| `CLAUDE.md`, `docs/descripcion-tecnica.md` | Documentan la sección de puntos, "Mis puntos", el delivery gratis (columna y regla del total), la compra mínima y el bono. |

## Project Structure

### Documentation (this feature)

```text
specs/014-programa-puntos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── reglas-y-acciones.md
│   └── ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                         # 2 valores de enum, 2 columnas
└── migrations/
    ├── <fecha>_programa_puntos/          # nuevo
    └── <fecha>_bono_bienvenida_inicial/  # nuevo
app/
├── admin/
│   ├── points/page.tsx                   # nuevo
│   ├── clients/rewards/page.tsx
│   ├── transactions/[id]/page.tsx
│   └── add-transaction/page.tsx
├── mi-cuenta/
│   ├── layout.tsx                        # nuevo
│   ├── page.tsx
│   └── puntos/page.tsx                   # nuevo
└── confirmacion/page.tsx
components/
├── admin/
│   ├── puntos/
│   │   ├── pointsFilters.tsx             # nuevo
│   │   └── pointsTable.tsx               # nuevo
│   ├── clientes/premios/{rewardForm,rewardsTable}.tsx
│   ├── ventas/{canjearPremioPanel,manualSaleForm}.tsx
│   ├── sidebar.tsx
│   └── header.tsx
├── mi-cuenta/
│   ├── misPuntos.tsx                     # nuevo
│   └── resumenCuenta.tsx
└── finalizar-compra/{beneficiosCliente,paymentInformation}.tsx
lib/
├── fidelidad.ts                          # reglas, constantes y bono
├── checkout-core.ts
├── cuenta-cliente.ts                     # + obtenerMisPuntos
├── format.ts
├── actions/{admin-fidelidad,admin-sales,admin-clients,cuenta-cliente}.ts
└── admin/
    ├── points-core.ts                    # nuevo (puro)
    ├── points.ts                         # nuevo (lectura)
    ├── sales-calculations.ts
    ├── canje-pedido.ts
    ├── manual-sale.ts
    ├── order-edit.ts
    └── order-edit-rules.ts
tests/
├── admin/
│   ├── points-core.test.ts               # nuevo
│   ├── fidelidad.test.ts
│   ├── sales-calculations.test.ts
│   ├── fidelidad.integration.test.ts
│   ├── order-edit.integration.test.ts
│   └── admin-clients.integration.test.ts
└── checkout/checkout.integration.test.ts
```

**Structure Decision**: monolito Next.js existente. Las reglas de puntos siguen en `lib/fidelidad.ts`; la sección del panel sigue el par `points-core.ts` (puro) y `points.ts` (lectura) de `lib/admin/`, como `dashboard-core.ts` y `dashboard.ts`. Las rutas del panel conservan sus nombres en inglés (`/admin/points`, junto a `/admin/clients` y `/admin/delivery`) y las de la tienda en español (`/mi-cuenta/puntos`). Las pruebas van en las suites existentes, más un archivo nuevo para el módulo puro.

## Complexity Tracking

Sin violaciones que justificar. Las adiciones (dos columnas, dos valores de enum, un módulo puro con su lectura, dos rutas y una abstracción con cuatro usos) siguen patrones existentes y están explicadas en el *Constitution Check*.
