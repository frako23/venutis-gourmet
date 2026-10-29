# Implementation Plan: Cancelación de pedidos y cambio de estado desde la tabla

**Branch**: `007-cancelacion-pedidos` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-cancelacion-pedidos/spec.md`

## Summary

"Cancelado" pasa a ser un estado operativo final para los pedidos aún no cobrados ("Por cobrar" y "En pedido"). Al cancelar, una modal pide una razón opcional. Al confirmar, una sola transacción cambia el estado, devuelve al inventario las cantidades del pedido y registra el cambio con la razón en el historial. Además, cada fila y cada tarjeta móvil de "Ventas y pedidos" tienen un control de estado propio: los cambios simples se guardan al seleccionarlos, y "Pagado" y "Cancelado" piden confirmación en una modal, sin entrar al editor masivo.

El enfoque técnico reutiliza todo lo que ya existe. La Server Action `actualizarEstadoPedido` se amplía (no se crea otra), el enum y el historial ya admiten `cancelado` y `motivo` (no hay migración), y la modal sigue el patrón de `clientCreateModal.tsx` con sonner para el resultado. El mismo control reemplaza al formulario del detalle, que hoy no notifica. Una escritura condicionada al estado leído garantiza que el inventario se devuelva una sola vez.

## Technical Context

**Language/Version**: TypeScript estricto, React 19.1 y Next.js 15.5 (App Router).

**Primary Dependencies**: Prisma 6, Zod 4, sonner, lucide-react y `useOptimistic`/`useTransition` de React 19. **Sin dependencias nuevas.**

**Storage**: PostgreSQL con Prisma. **Sin cambios de esquema**: el enum `EstadoTransaccion` ya incluye `cancelado` y `EstadoTransaccionHistorial.motivo` ya existe. Se escriben `Transaccion.estado`, `Producto.inventario` (con `increment`) y `EstadoTransaccionHistorial` (solo inserción).

**Testing**: `node:test` con `npm.cmd run test:admin`: unitarias sobre `lib/admin/status.ts` e integración (`RUN_ADMIN_INTEGRATION=1` y `ADMIN_TEST_DATABASE_URL`) sobre el núcleo transaccional. Además `npm.cmd run lint`, `npm.cmd run build` y la validación manual de [quickstart.md](./quickstart.md) en escritorio y móvil.

**Target Platform**: Panel administrativo en navegadores modernos de escritorio y de teléfono.

**Project Type**: Aplicación web monolítica Next.js (Server Components, Server Actions y componentes cliente).

**Performance Goals**: Un cambio de estado se guarda y se confirma en pocos segundos en condiciones normales. La persona actualiza 10 pedidos seguidos desde la tabla en menos de 2 minutos (SC-006). La devolución de inventario recorre solo las líneas de un pedido (pocas filas).

**Constraints**:

- Una sola transacción para el estado, el historial y el inventario.
- Validación contra el estado vigente (escritura condicionada).
- Razón de hasta 240 caracteres.
- Notificaciones solo con sonner; UI en español; colores del panel ya usados para los estados.
- Ningún camino reabre un pedido cancelado.

**Scale/Scope**: Tabla paginada de 20 pedidos por página, un control por fila y un solo pedido por cambio. Sin cambios en la tienda, la venta rápida ni la cotización rápida.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la Constitución v2.0.0.

- [x] **I. Simplicidad ante todo (puerta de simplicidad)**:
  - **Alternativa más simple**: ampliar la acción de estado existente y usar un `<select>` nativo por fila, con una modal solo para los dos cambios que necesitan confirmación.
  - **Qué se reutiliza**: `actualizarEstadoPedido`, `requireAdmin`, Zod, `EstadoTransaccionHistorial`, las reglas de `lib/admin/status.ts`, el patrón de `clientCreateModal.tsx`, sonner y las clases `admin-*`.
  - **Qué se añade**: un componente (`orderStateSelect.tsx`), que reemplaza dos archivos que se eliminan (`orderStatusForm.tsx` y `orderStatusControl.tsx`), y un módulo pequeño (`lib/admin/order-state-change.ts`), justificado en *Complexity Tracking*.
  - Sin dependencias, capas ni superficies nuevas.
- [x] **II. Una sola fuente de verdad**:
  - El cambio de estado sigue pasando solo por `admin-orders.ts`, con historial append-only.
  - El servidor decide si el cambio es válido según el estado leído.
  - La cancelación y la devolución de inventario ocurren en una sola transacción Prisma.
  - No se toca `prisma/schema.prisma`.
- [x] **III. Superficies con límites claros**: solo se toca el **Panel administrativo**. La tienda, `/venta-rapida` y `/cotizacion-rapida` no cambian, y no se crean rutas.
- [x] **IV. Seguridad del lado del servidor**:
  - `requireAdmin()` se ejecuta en cada cambio.
  - Las reglas ("pagado no se cancela", "cancelado es final", "el editor masivo no cancela") se validan en el servidor, no solo en la interfaz.
  - La modal muestra solo la orden, el cliente y el total.
- [x] **V. Pruebas proporcionales al riesgo**:
  - Pruebas unitarias para las reglas puras de estado y devolución.
  - Integración sobre la transacción real, en una base aislada.
  - Sin frameworks ni mocks nuevos.

**Resultado de la puerta previa**: APROBADA. Sin violaciones; la única adición estructural se registra en *Complexity Tracking*.

## Design Decisions

El detalle y las alternativas descartadas están en [research.md](./research.md); el contrato, en [contracts/order-state.md](./contracts/order-state.md).

### Flujo de una cancelación

1. La persona elige "Cancelado" en `OrderStateSelect` (fila, tarjeta o detalle).
2. Se abre la modal de cancelación con la orden, el cliente, el aviso de pagos si los hay y la razón opcional. Si se cierra con "Volver", Escape o un clic fuera, no se envía nada.
3. Al confirmar, el control pasa a un estado optimista deshabilitado y envía `FormData` a `actualizarEstadoPedido`.
4. La acción ejecuta `requireAdmin` y Zod, y luego `prisma.$transaction(tx => aplicarCambioEstadoPedido(tx, input, actor))`. El núcleo:
   1. lee el pedido con sus líneas y pagos;
   2. valida (existe, no está cancelado, se puede cancelar y no trae pago);
   3. ejecuta `updateMany({ where: { id, estado: leido } })` y exige `count === 1`;
   4. incrementa el inventario de cada producto con la suma de sus líneas;
   5. inserta el historial con la razón normalizada.
5. La acción revalida `/admin`, `/admin/transactions`, el detalle y `/admin/inventory`.
6. El cliente muestra `toast.success` o `toast.error` y llama a `router.refresh()`. Si hubo error, el control vuelve al estado guardado.

Los cambios simples siguen el mismo camino sin modal. "Pagado" abre la modal de cobro y envía `confirmacionPago = "true"` con la nota opcional como `motivo`.

### Cambios por archivo

| Archivo | Cambio |
|---|---|
| `lib/admin/status.ts` | Añade las reglas de estados siguientes, de qué estados se pueden cancelar, de normalización de la razón y de cantidades a devolver. Amplía `requiresExplicitPaymentConfirmation` a `pendiente`. Elimina `canSelectOrderState`, que solo usaba un test. |
| `lib/admin/order-state-change.ts` (**nuevo**) | `aplicarCambioEstadoPedido(tx, input, actor)`: el cuerpo transaccional actual de la acción más la rama de cancelación. Sin `server-only` ni `@/`; importa `./status.ts`. |
| `lib/actions/admin-orders.ts` | El Zod acepta `cancelado`; la acción delega en el núcleo, añade el mensaje de éxito de la cancelación y revalida `/admin/inventory` al cancelar. |
| `lib/actions/admin-sales.ts` | `guardarEdicionMasivaVentas` rechaza las filas existentes que pasan a `cancelado`. |
| `components/admin/ventas/orderStateSelect.tsx` (**nuevo**) | El control de estado, las dos modales (cancelación y cobro) y la insignia de estado (movida desde `salesTable.tsx`). |
| `components/admin/ventas/salesTable.tsx` | Usa `OrderStateSelect` en la fila de escritorio y en `SalesCard`; elimina `StatusBadge`. |
| `components/admin/ventas/bulkSalesEditor.tsx` | El aviso superior indica que la cancelación se hace desde el control de la tabla. |
| `app/admin/transactions/[id]/page.tsx` | El panel "Seguimiento" usa `OrderStateSelect` en lugar de `OrderStatusForm`. |
| `components/admin/ventas/orderStatusForm.tsx`, `orderStatusControl.tsx` | Se **eliminan**. |
| `tests/admin/order-status.test.ts` | Se actualiza la prueba de estados seleccionables y se añaden pruebas de las reglas nuevas. |
| `tests/admin/order-status.integration.test.ts` | Se añade la prueba de cancelación: devuelve el inventario, no se repite y rechaza los pedidos pagados. |
| `CLAUDE.md`, `docs/descripcion-tecnica.md`, `DESIGN.md` | `cancelado` deja de describirse como estado solo histórico. |

### Decisiones de interfaz

- El `<select>` nativo es accesible por teclado, abre el selector del sistema en móvil y no requiere dependencias.
- Dentro de la modal de cancelación no hay ningún botón llamado "Cancelar": las acciones son "Volver" y "Confirmar cancelación".
- La insignia de estado de la cabecera del detalle se conserva; el control vive en el panel "Seguimiento".
- El formulario del detalle permitía un motivo opcional en cualquier cambio. Con el control nuevo, el motivo se conserva donde aporta valor: la razón al cancelar y la nota al confirmar el cobro. Los cambios inmediatos quedan en el historial sin motivo (confirmado por la persona usuaria el 2026-10-29).

## Project Structure

### Documentation (this feature)

```text
specs/007-cancelacion-pedidos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── order-state.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera $speckit-tasks
```

### Source Code (repository root)

```text
app/admin/transactions/
└── [id]/page.tsx                     # Usa OrderStateSelect en "Seguimiento"

components/admin/ventas/
├── orderStateSelect.tsx              # NUEVO: control + modales + insignia
├── salesTable.tsx                    # Control por fila y por tarjeta
├── bulkSalesEditor.tsx               # Solo texto del aviso
├── orderStatusForm.tsx               # SE ELIMINA
└── orderStatusControl.tsx            # SE ELIMINA

lib/
├── admin/
│   ├── status.ts                     # Reglas puras de estado y devolución
│   └── order-state-change.ts         # NUEVO: núcleo transaccional (recibe tx)
└── actions/
    ├── admin-orders.ts               # Acción ampliada a "cancelado"
    └── admin-sales.ts                # Guarda del editor masivo

tests/admin/
├── order-status.test.ts              # Unitarias
└── order-status.integration.test.ts  # Integración de la cancelación
```

**Structure Decision**: Se mantiene el monolito Next.js y se trabaja solo en el módulo de ventas del panel. La escritura sigue en `lib/actions/admin-orders.ts`, las reglas puras en `lib/admin/status.ts` y el cuerpo transaccional se extrae a `lib/admin/order-state-change.ts`, siguiendo el precedente de `lib/order-number.ts`. Se crea un componente y se eliminan dos; no se agregan modelos, rutas ni dependencias.

## Phase 1 Implementation Boundaries

- No se modifica `prisma/schema.prisma` ni se crean migraciones.
- No cambian el checkout, la venta rápida, la cotización rápida ni la idempotencia del checkout: un reintento sobre un pedido cancelado sigue respondiendo "La confirmación del pedido ya fue procesada".
- No se revierten pagos ni puntos de fidelidad y no se borran ni ocultan notas de entrega.
- Los pedidos cancelados antes de esta feature no se recalculan.
- El editor masivo conserva su funcionamiento; solo gana la guarda del servidor y el texto del aviso.
- La validación manual debe cubrir un viewport estrecho y uno de escritorio; una compilación exitosa no la sustituye.

## Constitution Check (post-diseño)

- [x] **I**: el diseño final añade un componente y un módulo, elimina dos archivos y no introduce dependencias. El control se extrae porque tiene tres usos reales (fila, tarjeta y detalle). La modal vive junto a su único consumidor, sin abstracción compartida.
- [x] **II**: un solo camino de escritura para los cambios de estado, la transacción es atómica, la validación usa el estado leído y el historial es append-only. El editor masivo no abre un segundo camino de cancelación.
- [x] **III**: solo el Panel administrativo.
- [x] **IV**: la autorización y todas las reglas de transición se verifican en el servidor en cada petición.
- [x] **V**: pruebas unitarias de las reglas y de integración de la transacción real, con `node:test`. La verificación manual de interfaz está documentada en el quickstart.

**Resultado**: APROBADA.

## Complexity Tracking

| Cambio | Motivo | Alternativa más simple descartada |
|---|---|---|
| Nuevo `lib/admin/order-state-change.ts` con `aplicarCambioEstadoPedido(tx, …)` | La cancelación toca inventario y estados, así que el Principio V exige probar la transacción real. La acción importa `requireAdmin` (`server-only`, Stack Auth) y no puede cargarse en `node:test`. | Dejar el cuerpo dentro de la acción y replicarlo en el test, como hace hoy la integración de estados: no verificaría la devolución de inventario ni la escritura condicionada reales. |
