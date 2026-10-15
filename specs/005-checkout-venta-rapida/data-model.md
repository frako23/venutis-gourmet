# Modelo de datos: Checkout directo desde Venta Rápida

## Entidades existentes y cambios requeridos

### Cliente

Representa a la persona que realiza el pedido.

Campos usados por el flujo:

- `id`: identificador estable.
- `tipoCliente`: el flujo de `/venta-rapida` usa el contexto detal actual.
- `nombre`, `apellido`, `celular`: datos obligatorios.
- `email`: opcional y validado cuando se proporciona.
- `direcciones`: direcciones guardadas del cliente.

Reglas:

- `celular` identifica al cliente existente; no se crea un duplicado.
- Un conflicto de correo no puede reemplazar o vaciar silenciosamente el cliente
  localizado por teléfono.
- La escritura del cliente se valida antes de iniciar la confirmación de la venta.

### Dirección

Representa una dirección reutilizable del cliente.

Campos usados:

- `id` y `clienteId`.
- `tipo`: alias legible, por ejemplo Casa.
- `urbanizacion`: zona configurada para calcular delivery.
- `direccion`: detalle libre de la entrega.

Reglas:

- La dirección seleccionada debe pertenecer al cliente confirmado.
- Delivery requiere una zona existente y una dirección detallada no vacía.
- La zona determina el cargo desde la lista autorizada; el precio enviado por el
  navegador no es una fuente de verdad.

### Transaccion / Pedido

Representa la venta directa confirmada.

Campos existentes que participan:

- `id`, `numeroOrden`, `clienteId`, `fechaCompra`.
- `montoSubtotal`, `montoTotal`, `tasaCambio`.
- `estado` y `tipodeRetiro`.

Campos que el diseño agrega o formaliza:

- `montoDelivery`: cargo de la zona; cero para retiro.
- `zonaEntrega`: zona usada cuando `tipodeRetiro = envio`.
- `aliasEntrega`: alias de la dirección usada, cuando aplique.
- `direccionEntrega`: detalle de dirección usado, cuando aplique.
- `claveIdempotencia`: clave única opcional por confirmación directa; evita efectos
  repetidos cuando llega el mismo intento más de una vez.

Reglas:

- `montoSubtotal` es la suma de líneas con precios vigentes.
- `montoTotal = montoSubtotal + montoDelivery - descuento`, y en esta versión no se
  agrega descuento desde `/venta-rapida`.
- `tipodeRetiro = envio` exige snapshot de entrega; `recogida` exige delivery cero.
- El pedido directo con `EfectivoUsd` inicia `por_cobrar`; los demás métodos
  habilitados inician `en_pedido` hasta confirmación operativa del cobro.
- La venta y su efecto de inventario se crean dentro de una única transacción.

### DetalleCompra

Captura el producto vendido, la cantidad y el precio unitario vigente.

Reglas:

- Cada producto se vuelve a consultar al confirmar.
- La cantidad es entera y positiva, y no puede superar el inventario disponible.
- `precioUnitario` queda como snapshot; cambios posteriores del catálogo no alteran
  la venta histórica.

### Pago declarado

Representa la información de pago que el cliente proporciona o el importe esperado.

Campos existentes:

- `metodoPago`.
- `montoUsd`, `montoBs`, `tasaCambio`.
- `fechaPago` y `referencia` cuando el método lo requiere.

Reglas:

- Los métodos de esta versión son Pago Móvil, Zelle, Transferencia Bs y Efectivo USD.
- El importe declarado debe corresponder al total final, incluido delivery, según la
  tasa asociada.
- Efectivo no requiere referencia; los métodos digitales deben solicitarla según la
  regla del formulario.
- El registro del pago no equivale a cobro confirmado.

### Historial de estado

Registra el estado inicial y las transiciones operativas de la venta.

Reglas:

- La creación del pedido debe registrar el estado inicial dentro de la misma operación.
- Las modificaciones posteriores continúan usando el flujo administrativo protegido.
- `pagado` requiere confirmación explícita según las reglas administrativas existentes.

## Relaciones

```text
Cliente 1 ─── N Dirección
Cliente 1 ─── N Transaccion
Transaccion 1 ─── N DetalleCompra ─── 1 Producto
Transaccion 1 ─── N Pago declarado
Transaccion 1 ─── N Historial de estado
Transaccion 1 ─── N Fidelidad
```

La dirección histórica no depende únicamente de la relación mutable `Cliente ->
Dirección`: sus valores usados para la entrega se copian en `Transaccion`.

## Flujo de estados

```text
confirmación directa
        │
        ├── Efectivo USD ───────> por_cobrar
        │
        └── método digital ─────> en_pedido

por_cobrar / en_pedido ── confirmación explícita del negocio ──> pagado
por_cobrar / en_pedido ── cancelación administrativa ──────────> cancelado
```

WhatsApp no entra en este modelo: prepara coordinación y no crea `Transaccion`,
`Pago`, historial ni movimientos de inventario.

## Invariantes de la operación

1. No hay venta directa sin cliente válido.
2. No hay delivery sin zona y snapshot de dirección.
3. No hay detalle con precio enviado por el cliente que difiera del precio vigente.
4. No hay descuento de inventario sin venta, detalles y pago declarado consistentes.
5. No hay dos efectos para la misma `claveIdempotencia`.
6. La tasa usada para el pago queda asociada al pedido o al pago.
