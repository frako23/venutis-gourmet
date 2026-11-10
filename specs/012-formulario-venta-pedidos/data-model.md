# Data Model: Formulario de venta con búsqueda y alta de clientes, edición y eliminación de pedidos

**Fecha**: 2026-11-10 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Cambios de esquema: ninguno

`prisma/schema.prisma` no cambia y no hay migración. La función trabaja con los modelos que ya existen. La concurrencia se resuelve con una huella calculada ([research.md](./research.md), Decisión 4) y el registro de ediciones con el historial existente (Decisión 11).

## Entidades existentes que se leen o escriben

| Entidad | Uso en esta función | Escritura |
|---|---|---|
| `Cliente` | Búsqueda (`nombre`, `apellido`, `nombreBusqueda`, `tipoCliente`, `celular`, `rif`) y alta desde la venta. | Alta: `crearClienteAdministrativo`, sin cambios en sus reglas. |
| `Transaccion` | Se edita en el mismo registro y se elimina. | `numeroOrden`, `clienteId`, `fechaCompra`, `tipodeRetiro`, `tasaCambio`, `tipoDescuento`, `valorDescuento`, `montoSubtotal`, `montoDescuento` y `montoTotal`. Se conservan `estado`, `montoDelivery`, `zonaEntrega`, `aliasEntrega`, `direccionEntrega`, `montoDescuentoPuntos`, `importada` y `claveIdempotencia`. |
| `DetalleCompra` | Líneas del pedido. | Edición: se reemplazan las líneas cobradas (`precioUnitario > 0`) y se conservan las de premio (`precioUnitario = 0`). Eliminación: se borran todas. |
| `Producto.inventario` | Existencia. | Solo con `ajustarInventario`: un delta por producto al editar y la devolución al eliminar. Nunca en pedidos importados. |
| `Pago` | Se lee para lo abonado (`esAbono`, `anuladoEn`) y para la huella. | Edición: no se toca. Eliminación: solo se borran los pagos declarados, porque con un abono el pedido no se puede eliminar. |
| `Fidelidad` | Se lee para la huella, la condición de eliminación y los ganados netos. | Edición de un pedido pagado: un movimiento `acumulacion` (+) o `reversion` (−) con `transaccionId`, actor y motivo. |
| `MovimientoSaldo` | Se lee para la huella, la condición de eliminación y el cambio de cliente. | No se escribe. |
| `NotaEntrega`, `Resena` | Solo se cuentan: impiden eliminar. | No se escriben. |
| `EstadoTransaccionHistorial` | Historial de solo inserción. | Edición: un evento con `estadoAnterior = estadoNuevo` y `motivo` "Pedido editado: …". Eliminación: se borra por cascada junto con el pedido. |

## Modelos de vista (TypeScript, sin persistencia)

### `ClienteBusqueda`

Es lo que la página entrega al formulario y a `ClientSearch`, y también lo que devuelve el alta.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | |
| `nombre`, `apellido` | `string` | |
| `tipoCliente` | `"detal" \| "mayorista"` | Decide el tipo de precio propuesto. |
| `nombreBusqueda` | `string` | Ya normalizado en la base de datos. |
| `celular`, `rif` | `string \| null` | Distinguen homónimos en la lista de resultados. |

### `PedidoEditable`

Lo construye `app/admin/add-transaction/page.tsx` cuando recibe `?editar=<id>`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | |
| `version` | `string` | `versionPedido(...)`: 16 caracteres hexadecimales. |
| `numeroOrden` | `string` | Editable; debe seguir siendo único. |
| `clienteId` | `number` | |
| `clienteBloqueado` | `boolean` | `true` si hay movimientos de puntos o de saldo a favor: el cliente no se puede cambiar. |
| `fechaLocal` | `string` | `fechaHoraLocalCaracas(fechaCompra)`. También viaja como `fechaOriginal`. |
| `estado` | `EstadoTransaccion` | Solo lectura en el formulario. |
| `importada` | `boolean` | Aviso: "Este pedido no mueve inventario ni puntos". |
| `tipodeRetiro` | `"envio" \| "recogida"` | |
| `tasaCambio` | `number \| null` | |
| `descuento` | `{ tipo, valor } \| null` | Desde `tipoDescuento` y `valorDescuento`. |
| `lineas` | `Array<{ productoId, cantidad, precioUnitarioUsd, tipoPrecio }>` | Solo las cobradas. Si `tipoPrecio` es `null` en pedidos antiguos, se propone `detal`. |
| `lineasPremio` | `Array<{ nombre, cantidad }>` | Solo lectura. |
| `descuentoPuntosUsd` | `number` | Solo lectura; entra en el total. |
| `montoDeliveryUsd` | `number` | Solo lectura; entra en el total. |
| `zonaEntrega` | `string \| null` | Solo lectura. |
| `abonadoUsd` | `number` | `calcularAbonado(pagos)`: límite inferior del total nuevo. |
| `totalAnteriorUsd` | `number` | Para mostrar la diferencia y decidir si hay que confirmar el cobro. |

### `SalesRow` (ampliado)

| Campo nuevo | Tipo | Origen |
|---|---|---|
| `editable` | `boolean` | `estado !== "cancelado"`. |
| `eliminable` | `boolean` | `motivoNoEliminable(...) === null`, con `_count` de `fidelidades`, `movimientosSaldo`, `notasEntrega` y `resenas`, y la existencia de algún pago con `esAbono`. |
| `motivoNoEliminable` | `string \| null` | Texto que explica por qué no se ofrece "Eliminar". |

## Entradas de las acciones

El detalle está en [contracts/server-actions.md](./contracts/server-actions.md).

### `EdicionVentaInput` (Zod en `editarVentaManual`)

| Campo | Regla |
|---|---|
| `transaccionId` | Entero positivo. |
| `version` | Cadena de 16 caracteres hexadecimales. |
| `clienteId` | Entero positivo. |
| `fechaCompra` | `YYYY-MM-DDTHH:mm`, interpretada con `interpretarFechaHoraCaracas`. |
| `fechaOriginal` | `YYYY-MM-DDTHH:mm`. Si es igual a `fechaCompra`, se conserva el instante guardado. |
| `numeroOrden` | Texto recortado, de 1 a 80 caracteres. |
| `tipodeRetiro` | `envio` \| `recogida`. |
| `tasaCambio` | Número positivo o `null`. |
| `lineas` | Mínimo 1. Igual que `lineSchema` de la venta manual: precio > 0, cantidad con 2 decimales como máximo. |
| `descuento` | `{ tipo: "porcentaje" \| "usd", valor ≥ 0 } \| null`. |
| `confirmarCobroDiferencia` | Booleano; solo se exige en pedidos pagados cuyo total sube. |
| `autorizarCredito` | Booleano. |

### `EliminacionPedidoInput` (Zod en `eliminarPedido`)

| Campo | Regla |
|---|---|
| `transaccionId` | Entero positivo. |
| `estadoEsperado` | Uno de los estados de `EstadoTransaccion`. |
| `totalEsperadoUsd` | Número finito; se compara en centavos. |

## Reglas puras

Viven en `lib/admin/order-edit-rules.ts`, salvo donde se indica otro archivo. Ninguna usa `@/`.

| Regla | Entrada → salida | Requisito |
|---|---|---|
| `filtrarClientes` (`lib/client-rules.ts`) | `(clientes, texto, limite = 20)` → clientes cuyo `nombreBusqueda` contiene todas las palabras normalizadas del texto. Primero los que empiezan por la primera palabra, luego por nombre. | FR-001, FR-002 |
| `fechaHoraLocalCaracas` (`lib/format.ts`) | `Date` → `"YYYY-MM-DDTHH:mm"` en `ZONA_HORARIA`. | FR-010 |
| `interpretarFechaHoraCaracas` (`lib/format.ts`) | `"YYYY-MM-DDTHH:mm"` → `Date` (desfase `-04:00`), o `null` si el formato es inválido. | FR-010 |
| `recalcularTotalPedido` (`lib/admin/sales-calculations.ts`) | `{ lineasCobradas, descuento, tasaCambio, descuentoPuntosUsd, montoDeliveryUsd }` → `SaleTotals` con `totalUsd` que incluye el delivery. | FR-016 |
| `motivoNoEditable` | `{ estado }` → texto o `null` (solo bloquea `cancelado`). | FR-012 |
| `motivoNoEliminable` | `{ estado, tieneAbonos, movimientosPuntos, movimientosSaldo, notasEntrega, resenas }` → el primer motivo que aplica, o `null`. | FR-018 |
| `diferenciasInventario` | `(anteriores, nuevas)` → `Array<{ productoId, delta }>` ordenado por `productoId`, sin deltas en 0 y redondeado a 2 decimales. | FR-015, SC-004 |
| `requiereConfirmarDiferencia` | `{ estado, totalAnteriorUsd, totalNuevoUsd }` → `true` si el estado es `pagado` y el total nuevo es mayor en centavos. | FR-012 |
| `ajustePuntosPorEdicion` | `{ ganadosNetos, esperados, disponibles, devueltos }` → puntos con signo. Si es positivo, se acredita; si es negativo, se revierte, limitado por `topeReversion`. 0 = sin movimiento. | FR-012, SC-009 |
| `versionPedido` | snapshot → huella SHA-256 truncada a 16 caracteres hexadecimales. | FR-024 |
| `resumirCambiosPedido` | `(antes, despues)` → texto de 500 caracteres como máximo, o `""` si no hay cambios. | FR-017 |

## Permisos por estado

| Estado | Editar | Eliminar (si no tiene abonos, puntos, saldo, notas ni reseñas) | Inventario al eliminar |
|---|---|---|---|
| `por_cobrar` / `pendiente` | Sí | Sí | Se devuelve, salvo en pedidos importados. |
| `en_pedido` | Sí | Sí | Se devuelve, salvo en pedidos importados. |
| `pagado` | Sí. Si el total sube, hay que confirmar el cobro de la diferencia y se ajustan los puntos. | No: se cancela después de pasarlo a "Por cobrar". | — |
| `cancelado` | No (estado final) | Sí | No se devuelve; ya se devolvió al cancelar. |

## Secuencia de bloqueo y escritura

### Edición (`editarPedidoEnTx`)

1. Se lee el `clienteId` actual. Se bloquean los clientes `{actual, nuevo}` en orden ascendente y luego `Transaccion FOR UPDATE`.
2. Se carga el pedido con sus líneas, pagos, ids de movimientos de puntos y de saldo y el último evento del historial. Se comparan `versionPedido` y `motivoNoEditable`.
3. Si cambia el cliente, se verifica que no haya movimientos de puntos ni de saldo.
4. Con `recalcularTotalPedido` sobre las líneas nuevas se valida el total contra lo abonado, se pide la confirmación de la diferencia si el pedido está pagado y se evalúa el crédito si no lo está.
5. Si el pedido no es importado, se aplica `diferenciasInventario` con `ajustarInventario` en orden de `productoId`.
6. Se borran las líneas cobradas anteriores, se insertan las nuevas y se actualiza `Transaccion`. Un número de orden duplicado (P2002) se traduce a "Ya existe un pedido con el número …".
7. En un pedido pagado y no importado con acumulación previa, se aplica `ajustePuntosPorEdicion`.
8. Se inserta un evento en el historial con el resumen y, si corresponde, la autorización de crédito.

### Eliminación (`eliminarPedidoEnTx`)

1. Se bloquea al cliente y luego `Transaccion FOR UPDATE`.
2. Se comparan `estadoEsperado` y `totalEsperadoUsd`, y se vuelve a evaluar `motivoNoEliminable` con los conteos.
3. Si el pedido no es importado ni está cancelado, se devuelven las cantidades con `ajustarInventario(..., { exigirStock: false })` en orden de `productoId`.
4. Se borran los `Pago` y las `DetalleCompra` con `deleteMany` y luego el `Transaccion`; el historial se borra por cascada.
