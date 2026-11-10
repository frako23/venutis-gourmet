# Implementation Plan: Formulario de venta con búsqueda y alta de clientes, edición y eliminación de pedidos

**Branch**: `012-formulario-venta-pedidos` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-formulario-venta-pedidos/spec.md`

## Summary

El formulario de venta manual del panel (`/admin/add-transaction`) se corrige y se amplía:

- **Buscar al cliente por nombre**: un combobox propio filtra en memoria la lista que la página ya carga, con la normalización de `nombreBusqueda`.
- **Registrar un cliente nuevo** sin salir de la venta: se reutiliza `ClientCreateModal`, que ahora devuelve el cliente creado.
- **Fechas siempre en hora de Caracas**: tanto la fecha propuesta como la que se ingresa, según la constitución v2.1.0.

La tabla de "Ventas y pedidos" gana dos acciones:

- **Editar**: abre el mismo formulario con el pedido precargado (`?editar=<id>`). El pedido se actualiza en una sola transacción:
  - el inventario se ajusta por diferencia y se recalcula el total, con el delivery incluido;
  - se protege lo abonado;
  - en los pedidos pagados se exige confirmar el cobro de la diferencia y se ajustan los puntos;
  - la edición queda en el historial;
  - una huella del pedido rechaza las ediciones concurrentes.
- **Eliminar**: abre una modal de confirmación y borra el pedido de forma definitiva. Solo aplica a pedidos sin cobros, puntos, saldo a favor, notas de entrega ni reseñas, y devuelve el inventario cuando corresponde.

No hay cambios de esquema ni dependencias nuevas. Al extraer la regla única del total de un pedido existente se corrige un error actual: el editor de descuento y el editor masivo borraban el delivery del total.

## Technical Context

**Language/Version**: TypeScript estricto, React 19.1 y Next.js 16.4 (App Router). Usa Server Components, Server Actions, `useActionState` y `useTransition`.

**Primary Dependencies**: Prisma 6.17, Zod 4, sonner, lucide-react y Tailwind 4, todas ya instaladas. Se usa `node:crypto` (incluido en Node) para la huella. **Sin dependencias nuevas.**

**Storage**: PostgreSQL con Prisma. **Sin cambios de esquema ni migraciones** (ver [data-model.md](./data-model.md)).

**Testing**: `node:test`:

- **Pruebas puras**: `order-edit-rules`, `filtrarClientes`, las fechas de Caracas y `recalcularTotalPedido`, dentro de `npm.cmd run test:admin`.
- **Integración** (`tests/admin/order-edit.integration.test.ts`): contra una base aislada, con `RUN_ADMIN_INTEGRATION=1`.

Además `npm.cmd run lint`, `npm.cmd run build` y el [quickstart.md](./quickstart.md) manual en teléfono y escritorio.

**Target Platform**: Navegadores modernos. El panel se usa en escritorio y en teléfono.

**Project Type**: Aplicación web monolítica Next.js.

**Performance Goals**:

- **Buscador**: filtra en memoria al escribir, en menos de 50 ms con miles de clientes (SC-001: elegir un cliente en menos de 5 s).
- **Payload de clientes**: unos 6 campos por cliente, alrededor de 100 KB con 1.000 clientes.
- **Guardar una edición**: una transacción con un bloqueo por cliente, por pedido y por producto modificado, en menos de 1 segundo (SC-003: corregir un pedido en menos de 1 minuto).

**Constraints**:

- Todo o nada en editar y eliminar (FR-014).
- El inventario se mueve solo con `ajustarInventario`.
- Bloqueos en orden fijo: Cliente → Transaccion → Producto.
- `requireAdmin` en cada acción.
- Fechas en `ZONA_HORARIA`.
- Avisos solo con sonner, UI en español y clases `admin-*`.

**Scale/Scope**: cientos o pocos miles de clientes y 20 pedidos por página.

- **Superficie**: solo el panel.
- **Fuera de alcance**:
  - la tienda, la venta rápida y la cotización;
  - las fechas del editor masivo;
  - el buscador de productos;
  - cambiar el estado, los abonos, los canjes o el saldo a favor desde el formulario de edición.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la Constitución v2.1.0.

- [x] **I. Simplicidad ante todo (puerta de simplicidad)**:
  - **Alternativa más simple**:
    - **Edición**: el mismo formulario y la misma página con `?editar=<id>`, sin una ruta ni un formulario nuevos.
    - **Búsqueda**: filtro en memoria sobre datos que ya se cargan, sin una acción de búsqueda.
    - **Alta**: la modal existente con dos props opcionales.
    - **Concurrencia**: una huella calculada, sin columna ni migración.
    - **Registro de ediciones**: el historial existente, sin tabla de auditoría.
  - **Qué se reutiliza**:
    - las acciones y validaciones: `ClientCreateModal`, `crearClienteAdministrativo`, `normalizeSearchName` y `calculateSaleTotals`;
    - las reglas de inventario, crédito y abonos: `ajustarInventario`, `evaluarCredito`, `consultarDeudaCliente`, `validarTotalContraAbonado` y `calcularAbonado`;
    - las de bloqueo y puntos: `bloquearCliente`, `participaEnFidelidad`, `calcularPuntosGanados` y `topeReversion`;
    - las de presentación: `ZONA_HORARIA`/`formatFecha`, `StatusHistory` y la modal de crédito de `ManualSaleForm`.
  - **Qué se añade y por qué**:
    - `lib/admin/order-edit-rules.ts` (puro) y `lib/admin/order-edit.ts` (transacciones), según el patrón `*-core`/I/O exigido por los Principios II y V;
    - dos componentes, `ClientSearch` y `DeleteOrderDialog`;
    - una regla extraída, `recalcularTotalPedido`, con 3 usos reales y una regla de dinero que debe vivir en un solo lugar.

    No hay dependencias, capas, servicios ni superficies nuevas.
  - **Complejidad que crece**: `ManualSaleForm` gana un modo de edición. Se acepta frente a duplicar el formulario: la diferencia es la cabecera, los bloques ocultos o de solo lectura y la acción a la que envía.
- [x] **II. Una sola fuente de verdad**:
  - Las escrituras son Server Actions con Zod: `editarVentaManual` y `eliminarPedido`.
  - La edición y la eliminación corren cada una en un `prisma.$transaction` que revalida el precio (precio > 0), el stock y el total en el servidor. El navegador no decide los cargos.
  - La regla del total de un pedido existente queda en un solo lugar y corrige el delivery que se perdía.
  - El historial sigue siendo de solo inserción.
  - El estado duplicado del checkout no se toca.
- [x] **III. Superficies con límites claros**: solo cambia el **panel administrativo**. La tienda, la venta rápida y la cotización no cambian. Los pedidos de la tienda se pueden editar o eliminar desde el panel, que ya era su lugar de gestión.
- [x] **IV. Seguridad del lado del servidor**:
  - `requireAdmin()` corre en `editarVentaManual`, en `eliminarPedido` y en la acción de alta, que ya lo tenía.
  - Las rutas viven bajo el layout que exige sesión y un correo autorizado.
  - Las condiciones de edición y eliminación se revalidan dentro de la transacción, sin confiar en lo que mostró la interfaz.
  - El buscador expone teléfono y RIF solo en el panel, a quienes ya los ven en el listado de clientes.
- [x] **V. Pruebas proporcionales al riesgo**: la función toca dinero, inventario, puntos y el ciclo de vida del pedido, así que lleva:
  - pruebas puras de todas las reglas nuevas;
  - pruebas de integración de las transacciones de edición y eliminación contra una base aislada.

  Los cambios puramente visuales (buscador, modal) se validan con el quickstart.
- [x] **Restricciones: fechas y horas (v2.1.0)**:
  - el valor por defecto y la precarga usan `fechaHoraLocalCaracas`;
  - la entrada se interpreta con `interpretarFechaHoraCaracas`, que también corrige `registrarVentaManual`;
  - las fechas de la modal y del historial se formatean con `ZONA_HORARIA`.

**Resultado de la puerta previa**: APROBADA, sin violaciones.

**Re-evaluación tras la fase 1**: APROBADA. El diseño de [data-model.md](./data-model.md) y de los [contratos](./contracts/) no añadió esquema, dependencias ni superficies. Dos ajustes respecto de la idea inicial:

- la eliminación usa una verificación simple de estado y total en lugar de la huella, para no cargar relaciones por cada fila de la tabla ([research.md](./research.md), Decisión 4);
- la corrección del delivery en los dos editores existentes entra en el alcance porque comparte la regla extraída (Decisión 6).

## Design Decisions

El detalle y las alternativas descartadas están en [research.md](./research.md). Las acciones y las reglas están en [contracts/server-actions.md](./contracts/server-actions.md) y la interfaz en [contracts/ui.md](./contracts/ui.md).

### Flujo de una edición

1. En la tabla, "Editar" lleva a `/admin/add-transaction?editar=42`.
2. La página carga los clientes (`ClienteBusqueda`), los productos (los que tienen stock más los del pedido), los saldos, los puntos, los premios y el pedido. Con eso construye `PedidoEditable` con su `version` y su `fechaLocal`.
3. La usuaria cambia los datos y pulsa "Guardar cambios". El formulario envía a `editarVentaManual`.
4. La acción ejecuta `requireAdmin`, valida con Zod e interpreta la fecha. Luego llama a `prisma.$transaction(editarPedidoEnTx)`, que:
   1. bloquea los clientes y el pedido;
   2. compara la versión y las reglas;
   3. ajusta el inventario por diferencia;
   4. reemplaza las líneas cobradas;
   5. actualiza el pedido;
   6. ajusta los puntos si el pedido está pagado;
   7. registra el evento en el historial.
5. Responde `success` y la interfaz muestra el aviso y navega al detalle del pedido. Si la respuesta pide una autorización de crédito o la confirmación de la diferencia, el formulario la solicita y reenvía.

### Flujo de una eliminación

1. "Eliminar" en una fila con `eliminable` abre `DeleteOrderDialog`.
2. Al confirmar, se llama a `eliminarPedido` con el `estado` y el total mostrados. La acción ejecuta `eliminarPedidoEnTx`, que:
   1. bloquea al cliente y al pedido;
   2. compara el estado y el total y revalida `motivoNoEliminable`;
   3. devuelve el inventario si corresponde;
   4. borra los pagos declarados, las líneas y el pedido.
3. La interfaz muestra el aviso y ejecuta `router.refresh()`; si la página quedó vacía, navega a la anterior.

### Cambios por archivo

| Archivo | Cambio |
|---|---|
| `lib/format.ts` | `fechaHoraLocalCaracas` e `interpretarFechaHoraCaracas`. |
| `lib/client-rules.ts` | `filtrarClientes`. |
| `lib/admin/sales-calculations.ts` | `recalcularTotalPedido`, que incluye el delivery. |
| `lib/admin/order-edit-rules.ts` (**nuevo**) | `motivoNoEditable`, `motivoNoEliminable`, `diferenciasInventario`, `requiereConfirmarDiferencia`, `ajustePuntosPorEdicion`, `versionPedido` y `resumirCambiosPedido`, más los tipos `PedidoEditable` y `SnapshotPedido`. Sin `@/`. |
| `lib/admin/order-edit.ts` (**nuevo**) | `cargarPedidoEditable`, `editarPedidoEnTx` y `eliminarPedidoEnTx`. Sin `@/`, como `manual-sale.ts`. |
| `lib/admin/types.ts` | `EdicionVentaState`, `ClienteBusqueda`; `ClientCreateState` con `cliente`; `SalesRow` con `editable`, `eliminable` y `motivoNoEliminable`. |
| `lib/actions/admin-sales.ts` | `editarVentaManual` (nueva). `registrarVentaManual` interpreta la fecha en Caracas. `actualizarDescuentoVenta` y `guardarEdicionMasivaVentas` usan `recalcularTotalPedido`. |
| `lib/actions/admin-orders.ts` | `eliminarPedido` (nueva). |
| `lib/actions/admin-clients.ts` | `crearClienteAdministrativo` devuelve `cliente`. |
| `app/admin/add-transaction/page.tsx` | Modo `?editar=<id>`, clientes con `nombreBusqueda`/`celular`/`rif` y productos del pedido. |
| `app/admin/transactions/page.tsx` | `_count` y abonos para calcular `eliminable`; `editable` en cada fila. |
| `app/admin/transactions/[id]/page.tsx` | Botón "Editar" (si el pedido no está cancelado). |
| `components/admin/ventas/manualSaleForm.tsx` | `ClientSearch`, alta de cliente, fecha en Caracas y modo edición ([ui.md](./contracts/ui.md)). |
| `components/admin/ventas/clientSearch.tsx` (**nuevo**) | Combobox de clientes. |
| `components/admin/ventas/deleteOrderDialog.tsx` (**nuevo**) | Modal de confirmación de eliminación. |
| `components/admin/ventas/salesTable.tsx` | Columna "Acciones" y acciones en las tarjetas. |
| `components/admin/clientes/clientCreateModal.tsx` | Props `nombreInicial` y `onCreated`. |
| `tests/admin/order-edit-rules.test.ts` (**nuevo**) | Casos puros del contrato. |
| `tests/admin/client-rules.test.ts`, `tests/admin/sales-calculations.test.ts` | Casos de `filtrarClientes`, de las fechas de Caracas y de `recalcularTotalPedido`. |
| `tests/admin/order-edit.integration.test.ts` (**nuevo**) | Las 8 integraciones del contrato. |
| `CLAUDE.md`, `docs/descripcion-tecnica.md` | Documentan la edición y eliminación de pedidos, la regla del total con delivery y el alta desde la venta. |

## Project Structure

### Documentation (this feature)

```text
specs/012-formulario-venta-pedidos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── server-actions.md
│   └── ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera $speckit-tasks
```

### Source Code (repository root)

```text
app/admin/
├── add-transaction/page.tsx        # + modo ?editar=<id>
└── transactions/
    ├── page.tsx                    # + editable / eliminable por fila
    └── [id]/page.tsx               # + botón Editar
components/admin/
├── clientes/clientCreateModal.tsx  # + nombreInicial, onCreated
└── ventas/
    ├── manualSaleForm.tsx          # buscador, alta, fecha Caracas, modo edición
    ├── clientSearch.tsx            # nuevo
    ├── deleteOrderDialog.tsx       # nuevo
    └── salesTable.tsx              # + columna Acciones
lib/
├── format.ts                       # + fechas de Caracas
├── client-rules.ts                 # + filtrarClientes
├── actions/
│   ├── admin-sales.ts              # + editarVentaManual; fecha y total corregidos
│   ├── admin-orders.ts             # + eliminarPedido
│   └── admin-clients.ts            # alta devuelve el cliente
└── admin/
    ├── sales-calculations.ts       # + recalcularTotalPedido
    ├── order-edit-rules.ts         # nuevo (puro)
    ├── order-edit.ts               # nuevo (transacciones)
    └── types.ts
tests/admin/
├── order-edit-rules.test.ts        # nuevo
├── order-edit.integration.test.ts  # nuevo
├── client-rules.test.ts
└── sales-calculations.test.ts
```

**Structure Decision**: monolito Next.js existente. La lógica pura y la de transacciones se separan en `lib/admin/` como en `sales-import-core.ts`/`sales-import.ts`, las acciones van en `lib/actions/`, los componentes en `components/admin/ventas/` y las pruebas en `tests/admin/`.

## Complexity Tracking

Sin violaciones de la constitución que justificar. Las adiciones (dos módulos en `lib/admin`, dos componentes y una regla extraída) están dentro de los patrones existentes y se explican en el *Constitution Check*.
