# Data Model: Panel administrativo integral

## Criterio de modelado

La entidad existente `Transaccion` representa tanto pedidos del checkout como ventas
manuales. No se crea una tabla `Venta` paralela. Los importes comerciales se
conservan con un total canónico en USD, mientras que la información en bolívares y la
tasa de cambio se mantiene como contexto del cobro o de la operación.

## Entidades existentes que se reutilizan

### `Cliente`

Se reutiliza el cliente existente. `tipoCliente` determina si puede recibir una nota
de entrega (`mayorista`) o si la acción debe bloquearse (`detal`). Sus datos de
contacto y dirección se muestran solo en el contexto administrativo necesario.

### `Producto`

Se reutiliza el catálogo e inventario existentes. Las líneas de venta toman una
instantánea del precio aplicado en `DetalleCompra`; las líneas de una nota guardan
también el nombre y precio mostrados para que el documento histórico no dependa de
que el producto siga igual.

### `Transaccion`

Campos actuales conservados:

| Campo | Uso | Regla |
|---|---|---|
| `id` | Identificador | No cambia |
| `numeroOrden` | Referencia visible de la operación | Único |
| `clienteId` | Cliente de la venta/pedido | Obligatorio |
| `fechaCompra` | Fecha de la operación | Se usa para filtros y analíticas |
| `montoTotal` | Total canónico en USD | Nunca negativo; se conserva por compatibilidad |
| `estado` | Estado operativo o histórico | Se amplía sin eliminar valores históricos |
| `tipodeRetiro` | Envío o recogida | Se conserva |

Campos nuevos o formalizados:

| Campo | Tipo lógico | Regla |
|---|---|---|
| `montoSubtotal` | número monetario USD | Subtotal antes del descuento; para históricos se iguala a `montoTotal` |
| `tipoDescuento` | `porcentaje` o `usd`, opcional | Solo uno por operación |
| `valorDescuento` | número, opcional | Porcentaje 0–100 o valor introducido en USD |
| `montoDescuento` | número monetario USD | Equivalente calculado; por defecto 0 |
| `tasaCambio` | número, opcional | Tasa usada para presentar o convertir importes de la operación |

`montoTotal` se calcula como `montoSubtotal - montoDescuento`, redondeado a dos
decimales y nunca menor que cero. Cuando el descuento se expresa en USD y la
operación se presenta en bolívares, la conversión usa la `tasaCambio` de la
operación, no la tasa actual.

## Entidades nuevas

### `EstadoTransaccionHistorial`

Registra cada modificación de estado o el estado inicial de una venta manual.

| Campo | Tipo lógico | Regla |
|---|---|---|
| `id` | entero | Identificador |
| `transaccionId` | entero | Relación obligatoria con `Transaccion` |
| `estadoAnterior` | estado opcional | Nulo únicamente para el primer registro |
| `estadoNuevo` | estado | Estado después de la acción |
| `actorId` | texto opcional | Identificador disponible del usuario autenticado |
| `actorEmail` | texto opcional | Correo para auditoría legible |
| `motivo` | texto opcional | Nota de corrección o confirmación, si aplica |
| `createdAt` | fecha | Momento del cambio |

El historial es append-only para la aplicación administrativa: un cambio posterior
no borra ni sobrescribe las filas anteriores.

### `NotaEntrega`

Documento operativo para un cliente mayorista. Puede originarse desde una transacción
existente o desde una carga manual; no es una factura fiscal y no modifica inventario
ni pago automáticamente.

| Campo | Tipo lógico | Regla |
|---|---|---|
| `id` | entero | Identificador |
| `numeroNota` | texto | Único y visible en el PDF |
| `clienteId` | entero | Relación obligatoria; el cliente debe ser mayorista al crear |
| `transaccionId` | entero opcional | Relación con pedido/venta de origen cuando exista |
| `fechaEntrega` | fecha | Fecha mostrada en la nota |
| `direccionEntrega` | texto opcional | Dirección o referencia de entrega |
| `personaRecibe` | texto opcional | Persona que recibe el documento/productos |
| `observaciones` | texto opcional | Comentarios operativos |
| `creadoPorId` | texto opcional | Identidad del administrador creador |
| `creadoPorEmail` | texto opcional | Evidencia legible del creador |
| `createdAt` / `updatedAt` | fechas | Trazabilidad del documento |

Relaciones: un cliente puede tener muchas notas; una transacción puede tener cero o
varias notas; una nota tiene una o varias líneas.

### `DetalleNotaEntrega`

Conserva las líneas que deben aparecer en el documento.

| Campo | Tipo lógico | Regla |
|---|---|---|
| `id` | entero | Identificador |
| `notaEntregaId` | entero | Relación obligatoria |
| `productoId` | entero opcional | Producto de origen, si aún existe |
| `productoNombre` | texto | Instantánea obligatoria para el documento |
| `cantidad` | entero positivo | Debe ser mayor que cero |
| `precioUnitarioUsd` | número opcional | Precio mostrado, si aplica |
| `subtotalUsd` | número opcional | Importe de línea snapshot |

La relación con `Producto` es opcional para que una nota histórica siga siendo
descargable aunque el producto se archive o elimine. Crear la nota nunca decrementa
`Producto.inventario`.

## Estados

El enum existente conserva `pagado`, `pendiente` y `cancelado`. Se añaden:

- `por_cobrar`: estado operativo seleccionable para una operación pendiente de cobro.
- `en_pedido`: estado operativo seleccionable para una operación en preparación o seguimiento.

La UI muestra “Por cobrar” para `por_cobrar` y para el legado `pendiente`; muestra
“En pedido” para `en_pedido`, “Pagado” para `pagado` y una etiqueta histórica para
`cancelado`. Los tres estados activos pueden corregirse administrativamente; cada
cambio genera historial. Marcar como `pagado` exige la confirmación y la información
mínima definida por la acción de cobro.

## Relaciones principales

```text
Cliente 1 ──── N Transaccion 1 ──── N DetalleCompra N ──── 1 Producto
                     │
                     ├──── N Pago
                     ├──── N EstadoTransaccionHistorial
                     └──── N NotaEntrega

Cliente 1 ──── N NotaEntrega 1 ──── N DetalleNotaEntrega N ──── 0..1 Producto
```

## Índices y consultas esperadas

- `Transaccion(fechaCompra, estado)` para filtros temporales y estados.
- `Transaccion(clienteId, fechaCompra)` para historial por cliente.
- `DetalleCompra(productoId, transaccionId)` para agregaciones por producto.
- `EstadoTransaccionHistorial(transaccionId, createdAt)` para el detalle de auditoría.
- `NotaEntrega(clienteId, fechaEntrega)` para consulta de documentos mayoristas.
- `NotaEntrega(numeroNota)` único para descargas y búsquedas.

Las consultas de la tabla, analíticas y notas deben seleccionar solo las columnas y
relaciones necesarias, paginar listados y evitar cargar todo el histórico en el
navegador.

## Invariantes de escritura

1. Una venta manual con líneas válidas, descuento y actualización de inventario se
   confirma completa o se revierte completa.
2. Todas las cantidades de venta son enteros positivos y el stock se valida dentro de
   la transacción de persistencia.
3. El descuento porcentual está entre 0 y 100; el descuento USD es no negativo y no
   supera el subtotal convertido a la moneda de comparación.
4. El total, subtotal y descuento se redondean a dos decimales en el límite de
   negocio y el total nunca es negativo.
5. Las analíticas excluyen `cancelado`, incluyen ventas confirmadas no canceladas y
   aplican el periodo solicitado antes de agregar.
6. El predictor no devuelve una cifra si no alcanza el mínimo histórico definido para
   su granularidad.
7. Una nota solo se crea para `Cliente.tipoCliente = mayorista`, tiene al menos una
   línea válida y guarda snapshots suficientes para volver a generar el PDF.
8. Todas las mutaciones requieren autenticación y autorización administrativa en el
   servidor.

## Migración y compatibilidad

1. Añadir los nuevos valores de estado sin eliminar los existentes.
2. Añadir campos de importe con valores seguros para históricos.
3. Rellenar `montoSubtotal` de registros existentes con su `montoTotal` y dejar
   `montoDescuento` en cero; no reescribir el significado de `cancelado`.
4. Crear las tablas de historial y notas, sus relaciones e índices.
5. Regenerar Prisma y validar la migración en una base PostgreSQL local aislada con
   datos representativos antes de considerar cualquier despliegue.
