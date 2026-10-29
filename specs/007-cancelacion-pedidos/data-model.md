# Data Model: Cancelación de pedidos y cambio de estado desde la tabla

**Feature**: `007-cancelacion-pedidos`
**Persistencia**: PostgreSQL con Prisma. **Sin cambios de esquema ni migraciones**: el enum `EstadoTransaccion` ya incluye `cancelado` y `EstadoTransaccionHistorial.motivo` ya existe.

## Transaccion (pedido): sin cambios de esquema

| Campo | Uso en esta feature |
|---|---|
| `id` | Identifica el pedido en el cambio de estado. |
| `numeroOrden`, `clienteId` | Se muestran en la modal para identificar el pedido. |
| `estado` | Pasa a admitir `cancelado` como estado operativo final. La escritura se condiciona al estado leído (ver invariantes). |
| `montoTotal` | Se muestra en la confirmación de cobro. No cambia al cancelar. |
| `detalles` | Fuente de las cantidades que vuelven al inventario. No se modifican. |
| `pagos` | Si hay pagos, la modal lo advierte. No se borran ni se revierten. |

## EstadoTransaccionHistorial: sin cambios de esquema, solo inserción

| Campo | Regla |
|---|---|
| `estadoAnterior` | Estado leído dentro de la transacción, no el que mostraba la pantalla. |
| `estadoNuevo` | `cancelado` en una cancelación. |
| `actorId`, `actorEmail` | Identidad devuelta por `requireAdmin`. |
| `motivo` | En una cancelación, la razón escrita después de recortar los espacios: `null` si queda vacía y 240 caracteres como máximo (validado con Zod). En la confirmación de cobro, la nota opcional con la misma regla. En los cambios inmediatos, `null`. |
| `createdAt` | Lo asigna la base de datos. |

## Producto: sin cambios de esquema

| Campo | Regla |
|---|---|
| `inventario` | Al cancelar, se incrementa en la suma de `DetalleCompra.cantidad` de ese producto dentro del pedido. Se usa `increment`, no un valor calculado en el cliente. Se aplica aunque el producto ya no se muestre en el catálogo. |

## Estados y transiciones

`pendiente` es un estado legado: se presenta como "Por cobrar" y sigue sus mismas transiciones.

| Desde \ Hacia | Por cobrar | En pedido | Pagado | Cancelado |
|---|---|---|---|---|
| **Por cobrar** (incl. `pendiente`) | — | Inmediato | Confirmación de cobro | Modal de razón + devolución de inventario |
| **En pedido** | Inmediato | — | Confirmación de cobro | Modal de razón + devolución de inventario |
| **Pagado** | Inmediato | Inmediato | — | **Prohibido** |
| **Cancelado** | **Prohibido** | **Prohibido** | **Prohibido** | — |

- "Inmediato": se guarda al seleccionar; el historial registra el cambio sin motivo.
- "Confirmación de cobro": la regla existente `requiresExplicitPaymentConfirmation` se amplía para que también cubra `pendiente`.
- Las transiciones que salen de "Pagado" son la corrección administrativa que ya existe hoy.

## Reglas puras (`lib/admin/status.ts`)

| Regla | Entrada | Salida |
|---|---|---|
| Estados siguientes | estado actual | Opciones del control: `[]` si está cancelado; `por_cobrar, en_pedido, pagado` si está pagado; los cuatro en cualquier otro caso. |
| Puede cancelarse | estado actual | `true` solo para `por_cobrar`, `en_pedido` y `pendiente`. |
| Normalizar razón | texto opcional | Texto recortado, o `null` si queda vacío. |
| Cantidades a devolver | líneas `{ productoId, cantidad }` | Una entrada por producto con la suma de sus cantidades; ignora las cantidades que no sean positivas. |

`canSelectOrderState` se elimina: solo la usaba un test y la sustituye la regla de estados siguientes.

## Invariantes

1. **Atomicidad**: el cambio a `cancelado`, la devolución del inventario y la entrada del historial ocurren en una sola transacción Prisma. O se aplican los tres, o ninguno.
2. **Una sola vez**: la escritura del estado usa `updateMany({ where: { id, estado: estadoLeido } })` y exige `count === 1`. Una segunda cancelación concurrente o repetida no afecta filas, aborta y no vuelve a devolver inventario.
3. **Final**: ningún camino del panel (control de estado, detalle ni editor masivo) cambia un pedido `cancelado` a otro estado.
4. **Solo no cobrados**: el servidor rechaza `cancelado` cuando el estado leído es `pagado`.
5. **Sin pago al cancelar**: una solicitud de cancelación no puede registrar un pago nuevo.
6. **Editor masivo**: `guardarEdicionMasivaVentas` rechaza las filas existentes que pasan a `cancelado` desde otro estado.
7. **Conservación**: cancelar no borra `DetalleCompra`, `Pago`, `NotaEntrega` ni `Fidelidad`, y no modifica los montos.
8. **Analíticas**: el panel principal, las analíticas y el pronóstico siguen excluyendo `cancelado`, como ya hacen.
