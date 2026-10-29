# Contrato: cambio de estado y cancelación de pedidos

**Feature**: `007-cancelacion-pedidos`
**Superficie**: Panel administrativo (`/admin/transactions` y `/admin/transactions/[id]`).

## 1. Server Action `actualizarEstadoPedido(formData)`

Ubicación: `lib/actions/admin-orders.ts`; se reexporta sin cambios desde `lib/actions/order-status.ts`. Sigue siendo el único camino para cambiar el estado de un pedido individual.

### Entrada (`FormData`)

| Campo | Tipo | Regla |
|---|---|---|
| `transaccionId` | entero positivo | Obligatorio. |
| `estadoNuevo` | `por_cobrar \| en_pedido \| pagado \| cancelado` | Obligatorio. **`cancelado` es nuevo.** |
| `motivo` | texto | Opcional, hasta 240 caracteres. Se recorta y queda en `null` si está vacío. En una cancelación es la razón; al confirmar el cobro es la nota. |
| `confirmacionPago` | `"true"` | Obligatorio al pasar a `pagado` desde `por_cobrar`, `en_pedido` o `pendiente`. |
| `pago` | JSON | Opcional, como hoy. Se rechaza si `estadoNuevo` es `cancelado`. |

### Orden de evaluación

1. `requireAdmin()`: redirige si no hay sesión o si el correo no está autorizado.
2. Zod. Si falla: `{ success: false, message: "El cambio de estado no es válido." }`.
3. `prisma.$transaction(tx => aplicarCambioEstadoPedido(tx, input, actor))`.
4. Si todo sale bien: `revalidatePath("/admin")`, `"/admin/transactions"`, `"/admin/transactions/{id}"` y, si se canceló, `"/admin/inventory"`.

### Resultado

Se conserva la forma actual:

```ts
| { success: true; transactionId: number; estadoAnterior: EstadoTransaccion; estadoNuevo: EstadoTransaccion; changedAt: Date; message: string }
| { success: false; message: string }
```

| Caso | `success` | `message` |
|---|---|---|
| Cancelación aplicada | `true` | `Pedido {numeroOrden} cancelado. El inventario se actualizó.` |
| Otro cambio aplicado | `true` | `Estado actualizado correctamente.` (actual) |
| Mismo estado sin pago | `true` | `Estado actualizado correctamente.`, sin historial nuevo (comportamiento actual) |
| Datos inválidos | `false` | `El cambio de estado no es válido.` |
| Pedido inexistente | `false` | `La venta no existe.` |
| El pedido ya estaba cancelado | `false` | `El pedido ya está cancelado y no admite cambios.` |
| Cancelar un pedido pagado | `false` | `Solo se pueden cancelar pedidos por cobrar o en pedido.` |
| Pasar a pagado sin confirmación | `false` | `Confirma explícitamente el cobro antes de marcar la venta como pagada.` (actual) |
| Pago enviado junto a una cancelación | `false` | `No se puede registrar un pago al cancelar un pedido.` |
| Cambio concurrente (ningún registro afectado) | `false` | `El pedido cambió mientras lo editabas. Revisa su estado actual.` |
| Error inesperado | `false` | `No se pudo actualizar el estado.` (actual) |

## 2. Núcleo transaccional `aplicarCambioEstadoPedido(tx, input, actor)`

Ubicación: `lib/admin/order-state-change.ts`. No importa `server-only`, `@/` ni `prisma`: recibe la transacción, igual que `nextOrderNumber(tx)`. Importa `./status.ts` con la extensión explícita para que `node:test` lo cargue.

```ts
aplicarCambioEstadoPedido(
  tx: Prisma.TransactionClient,
  input: { transaccionId: number; estadoNuevo: "por_cobrar" | "en_pedido" | "pagado" | "cancelado"; motivo: string | null; confirmacionPago: boolean; pago: PagoInput | null },
  actor: { id: string; email: string | null },
): Promise<{ previous: EstadoTransaccion; current: EstadoTransaccion; changedAt: Date; numeroOrden: string }>
```

- Lee el pedido con `detalles` (`productoId`, `cantidad`) y `pagos`.
- Lanza `Error` con los mensajes de la tabla anterior. La acción los convierte en `{ success: false, message }`.
- Escribe el estado con `updateMany({ where: { id, estado: leido } })` y exige `count === 1`.
- Si el nuevo estado es `cancelado`, aplica `producto.update({ data: { inventario: { increment } } })` por cada producto devuelto por la regla de cantidades a devolver.
- Inserta la entrada de `EstadoTransaccionHistorial` con `estadoAnterior = leido` y `motivo` ya normalizado.

## 3. Editor masivo `guardarEdicionMasivaVentas`

El esquema de entrada no cambia. Se añade una regla: si una fila existente llega con `estado = "cancelado"` y el estado guardado no es `cancelado`, la transacción aborta con:

`Cancela {numeroOrden} desde la tabla o el detalle para registrar la razón y devolver el inventario.`

El aviso superior del editor añade: "Para cancelar un pedido usa el control de estado de la tabla."

## 4. Componente `OrderStateSelect` (cliente)

Ubicación: `components/admin/ventas/orderStateSelect.tsx`. Reemplaza a `OrderStatusForm` y a `OrderStatusControl`, que se eliminan.

### Props

| Prop | Tipo | Uso |
|---|---|---|
| `transactionId` | `number` | Se envía a la acción. |
| `numeroOrden` | `string` | Se muestra en la modal y en las notificaciones. |
| `cliente` | `string` | Se muestra en la modal de cancelación. |
| `totalUsd` | `number` | Se muestra en la confirmación de cobro. |
| `estado` | `EstadoTransaccion` | Estado guardado. |
| `tienePagos` | `boolean` | Activa el aviso de pagos registrados en la modal de cancelación. |

### Comportamiento

| Situación | Resultado |
|---|---|
| No hay estados siguientes (cancelado) | Se muestra una insignia "Cancelado" con el tono de peligro; no hay control. |
| Se elige `por_cobrar` o `en_pedido`, o se sale de `pagado` | Se envía de inmediato. |
| Se elige `pagado` desde otro estado | Se abre la modal de cobro y solo se envía al confirmar, con `confirmacionPago = "true"`. |
| Se elige `cancelado` | Se abre la modal de cancelación y solo se envía al confirmar. |
| Mientras se guarda | El `<select>` se deshabilita y muestra el estado elegido (optimista). |
| Éxito | `toast.success(message)`, `router.refresh()`. |
| Error | `toast.error(message)`; el control vuelve al estado guardado y se llama a `router.refresh()`. |
| La modal se cierra sin confirmar (Volver, Escape o clic fuera) | No se envía nada y el control muestra el estado guardado. |

Las opciones se etiquetan con `getOrderStateLabel`. El `<select>` tiene `aria-label="Estado de la orden {numeroOrden}"` y su color sigue el tono del estado: peligro para cancelado, oliva para pagado y latón para pendiente de acción.

### Modal de cancelación

| Elemento | Contenido |
|---|---|
| Título | `Cancelar pedido {numeroOrden}` |
| Texto | `{cliente}. El pedido dejará de contar como venta y sus productos volverán al inventario. Esta acción no se puede deshacer.` |
| Aviso (solo si `tienePagos`) | `Este pedido tiene pagos registrados. Se conservarán; la devolución del dinero se gestiona fuera del sistema.` |
| Campo | `Razón de la cancelación (opcional)`: textarea con `maxLength=240`, foco al abrir y texto `Quedan {n} caracteres`. |
| Botones | `Volver` (secundario) y `Confirmar cancelación` (peligro; muestra `Cancelando...` mientras se guarda). |

### Modal de confirmación de cobro

| Elemento | Contenido |
|---|---|
| Título | `Confirmar cobro` |
| Texto | `¿Recibiste el pago de {numeroOrden} por ${totalUsd}?` |
| Campo | `Nota del cobro (opcional)`: textarea con `maxLength=240`, por ejemplo "Cliente confirmó la transferencia". |
| Botones | `Volver` (secundario) y `Marcar como pagado` (primario). |

Ambas modales siguen el patrón de `clientCreateModal.tsx`: overlay `fixed inset-0`, `role="dialog"`, `aria-modal="true"` y `aria-labelledby`. Se cierran con Escape y con un clic fuera.

### Ubicaciones

| Lugar | Cambio |
|---|---|
| `salesTable.tsx`, columna "Estado" de escritorio | `StatusBadge` se reemplaza por `OrderStateSelect`. |
| `salesTable.tsx`, cabecera de `SalesCard` (móvil) | `StatusBadge` se reemplaza por `OrderStateSelect`. |
| `app/admin/transactions/[id]/page.tsx`, panel "Seguimiento" | `OrderStatusForm` se reemplaza por `OrderStateSelect`. La insignia de estado de la cabecera se conserva. |
| Modo editor masivo | Sin controles por fila (no cambia). |
