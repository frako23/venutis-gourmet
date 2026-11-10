# Contrato: Server Actions y reglas puras

**Feature**: 012-formulario-venta-pedidos | **Data model**: [../data-model.md](../data-model.md)

Todas las acciones:

- son `"use server"` en `lib/actions/*`;
- ejecutan `requireAdmin()` antes de leer el formulario (FR-022);
- validan con Zod;
- devuelven mensajes en español, que la interfaz muestra con `toast` de sonner (FR-023).

## 1. `editarVentaManual` (nueva)

**Archivo**: `lib/actions/admin-sales.ts` · **Firma**: `(previo: EdicionVentaState, formData: FormData) => Promise<EdicionVentaState>` (compatible con `useActionState`)

**Campos del `FormData`**:

| Campo | Formato |
|---|---|
| `transaccionId`, `version`, `clienteId`, `numeroOrden`, `tipodeRetiro`, `tasaCambio` | Texto |
| `fechaCompra`, `fechaOriginal` | `YYYY-MM-DDTHH:mm`, en hora de Caracas |
| `lineas` | JSON: `Array<{ productoId, cantidad, precioUnitarioUsd, tipoPrecio }>` |
| `descuento` | JSON o vacío |
| `confirmarCobroDiferencia`, `autorizarCredito` | `"true"` / `"false"` |

**Respuesta**:

```ts
type EdicionVentaState =
  | { success: true; message: string; transactionId: number; numeroOrden: string; totalUsd: number }
  | { success: false; message: string; issues?: ValidationIssue[]; requiereAutorizacion?: InfoCredito; requiereConfirmarDiferencia?: { diferenciaUsd: number } };
```

**Comportamiento**: la secuencia completa está en [data-model.md](../data-model.md#edición-editarpedidoentx) y todo corre en un solo `prisma.$transaction` (FR-014).

| Caso | Resultado |
|---|---|
| Datos inválidos (Zod) | `success: false`, "Revisa los datos del pedido.", con `issues`. |
| Fecha con formato inválido | `success: false`, "La fecha no es válida." |
| El pedido no existe | "El pedido ya no existe." |
| Pedido cancelado | "Los pedidos cancelados no se pueden editar." |
| La versión no coincide | "El pedido cambió mientras lo editabas. Vuelve a abrirlo para ver los datos actuales." No escribe nada. |
| Cambia el cliente y hay puntos o saldo a favor | "Este pedido tiene puntos o saldo a favor del cliente actual y no puede cambiar de cliente." |
| Total nuevo menor que lo abonado | "El total quedaría por debajo de lo ya abonado (USD X)." |
| Pedido pagado, el total sube y no se confirmó el cobro | `requiereConfirmarDiferencia: { diferenciaUsd }`, "Confirma que cobraste la diferencia de USD X o pasa el pedido a Por cobrar." |
| Pedido no pagado que excede el crédito, sin autorización | `requiereAutorizacion: InfoCredito` (la misma modal de la venta manual). |
| Stock insuficiente para un aumento | El mensaje de `StockInsuficienteError`, que nombra el producto. Rollback total. |
| Número de orden duplicado | "Ya existe un pedido con el número X." |
| Sin cambios | "No hay cambios para guardar." No escribe. |
| Éxito | "Pedido X actualizado." `revalidatePath` de `/admin`, `/admin/transactions`, `/admin/transactions/{id}`, `/admin/inventory` y `/admin/clients/{clienteId}` (anterior y nuevo). |

## 2. `eliminarPedido` (nueva)

**Archivo**: `lib/actions/admin-orders.ts` · **Firma**: `(formData: FormData) => Promise<{ success: boolean; message: string }>`

**Campos**: `transaccionId`, `estadoEsperado`, `totalEsperadoUsd`.

| Caso | Resultado |
|---|---|
| El pedido no existe | "El pedido ya no existe." |
| El estado o el total cambiaron | "El pedido cambió mientras lo revisabas. Recarga la tabla." |
| `motivoNoEliminable` no es `null` | `success: false` con el motivo, por ejemplo: "Este pedido tiene abonos registrados. Cancélalo en lugar de eliminarlo." |
| Éxito | "Pedido X eliminado." Devuelve el inventario cuando corresponde y ejecuta `revalidatePath` de `/admin`, `/admin/transactions`, `/admin/inventory`, `/admin/analytics` y `/admin/clients/{clienteId}`. |

## 3. `crearClienteAdministrativo` (cambio compatible)

**Archivo**: `lib/actions/admin-clients.ts`

En caso de éxito añade `cliente: ClienteBusqueda` a la respuesta:

```ts
type ClientCreateState = ActionResult<{ clientId: number; cliente: ClienteBusqueda }>;
```

No cambian las validaciones, la unicidad, el historial ni las rutas que revalida.

## 4. `registrarVentaManual` (corrección de fecha)

**Archivo**: `lib/actions/admin-sales.ts`

`fechaCompra` deja de usar `z.coerce.date()`: se valida como `YYYY-MM-DDTHH:mm` y se interpreta con `interpretarFechaHoraCaracas`. Si viene vacía, se usa la hora actual. Nada más cambia.

## 5. `actualizarDescuentoVenta` y `guardarEdicionMasivaVentas` (corrección del total)

Recalculan con `recalcularTotalPedido(...)`, así que `montoTotal` conserva `montoDelivery` ([research.md](../research.md), Decisión 6). Sus entradas y mensajes no cambian.

## Reglas puras (contrato de pruebas)

Las reglas se definen en [data-model.md](../data-model.md#reglas-puras). Casos mínimos que deben cubrir las pruebas de `node:test`:

| Regla | Casos |
|---|---|
| `filtrarClientes` | "maria" encuentra a "María Pérez"; "mar pe" la encuentra y excluye a "Marcos Díaz"; los espacios de más se ignoran; el texto vacío devuelve los primeros N; respeta el límite. |
| `fechaHoraLocalCaracas` | `2026-11-11T01:30:00Z` → `"2026-11-10T21:30"`; `2026-11-10T04:00:00Z` → `"2026-11-10T00:00"`. |
| `interpretarFechaHoraCaracas` | `"2026-11-10T21:30"` → `2026-11-11T01:30:00.000Z`; `"2026-13-01T00:00"`, `""` y `"2026-11-10"` → `null`. Ida y vuelta con `fechaHoraLocalCaracas` sin pérdida. |
| `recalcularTotalPedido` | Subtotal 20 + delivery 3 − 10 % = 21; con descuento por puntos 2 → 19; el descuento por encima del subtotal lanza error; el delivery no entra en la base del porcentaje. |
| `diferenciasInventario` | Aumento (+2), reducción (−1), producto nuevo (+n), producto quitado (−n), el mismo producto en dos líneas se suma y los deltas en 0 se omiten. |
| `requiereConfirmarDiferencia` | Pagado, de 10 a 12 → `true`; pagado, de 10 a 9 → `false`; por cobrar, de 10 a 12 → `false`; diferencia menor a un centavo → `false`. |
| `ajustePuntosPorEdicion` | Ganados 10, esperados 15 → +5; ganados 10, esperados 4, disponibles 20 → −6; ganados 10, esperados 0, disponibles 3 → −3 (tope); iguales → 0. |
| `motivoNoEliminable` | Por cobrar sin movimientos → `null`; pagado → motivo; abono anulado → motivo; con puntos, saldo, nota o reseña → motivo; cancelado sin movimientos → `null`. |
| `versionPedido` | Determinista; cambia si cambia el estado, el total, un pago (incluida su anulación), una línea o el último evento del historial. |
| `resumirCambiosPedido` | Sin cambios → `""`; muestra la cantidad anterior → nueva y las líneas agregadas o quitadas; recorta a 500 caracteres con "…". |

## Pruebas de integración (base aislada, `RUN_ADMIN_INTEGRATION=1`)

Archivo: `tests/admin/order-edit.integration.test.ts`. Usa `editarPedidoEnTx` y `eliminarPedidoEnTx` directamente, sin `requireAdmin`, como las demás integraciones.

1. Editar de 3 a 5 unidades baja la existencia en 2. Editar de 5 a 1 la sube en 4. Agregar y quitar productos mueve solo esos productos.
2. Un aumento sin existencia suficiente se rechaza y no cambia ni el pedido, ni las líneas, ni el inventario, ni el historial.
3. Un pedido importado editado no mueve inventario.
4. Un pedido pagado con acumulación cuyo total sube, con la confirmación, acredita la diferencia de puntos. Cuando baja, revierte con tope.
5. Una versión distinta se rechaza sin escribir.
6. Eliminar un pedido por cobrar devuelve el inventario y borra el pedido, sus líneas, sus pagos declarados y su historial. Eliminar uno cancelado no vuelve a devolver inventario.
7. Eliminar un pedido con un abono (aunque esté anulado) se rechaza sin borrar nada.
8. Editar un pedido web con delivery conserva `montoDelivery` en `montoTotal`.
