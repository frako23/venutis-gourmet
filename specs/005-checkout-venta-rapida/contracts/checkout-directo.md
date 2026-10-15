# Contrato interno: Checkout directo

Este documento describe el contrato de la acción que confirma un pedido originado en
`/venta-rapida`. No es una API pública ni permite omitir el checkout visual.

## Entrada normalizada

```text
clienteId: entero positivo
contexto: consumidor | mayorista (en venta rápida se envía consumidor)
tipodeRetiro: envio | recogida
direccionId: entero positivo si tipodeRetiro = envio
claveIdempotencia: cadena única del intento de confirmación
carrito:
  - productoId: entero positivo
    cantidad: entero positivo
    precio: precio mostrado, solo como referencia para detectar cambios
pago:
  metodoPago: PagoMovil | Zelle | TransferenciaBs | EfectivoUsd
  montoUsd: número no negativo
  montoBs: número no negativo
  tasaCambio: número positivo
  fechaPago: fecha válida o nula para efectivo
  referencia: cadena o nula para efectivo
```

## Reglas de confianza

- `clienteId` debe existir.
- `direccionId` debe pertenecer al cliente cuando se solicita delivery.
- Producto, inventario y precio se vuelven a consultar en la base de datos.
- El cargo de delivery se deriva de la zona almacenada en la dirección.
- Subtotal, total, estado inicial y puntos se calculan en servidor.
- El servidor no acepta un estado `pagado` como entrada.
- La referencia es obligatoria para los métodos digitales de esta versión y no se
  exige para efectivo.
- La tasa y los importes se validan frente al total recalculado con una tolerancia
  monetaria explícita.

## Respuesta exitosa

```text
success: true
transactionId: entero
numeroOrden: cadena
estado: por_cobrar | en_pedido
message: texto apto para el cliente
```

Una repetición con la misma `claveIdempotencia` devuelve el mismo resultado exitoso
de la venta existente.

## Respuesta de rechazo

```text
success: false
code: EMPTY_CART | INVALID_CLIENT | INVALID_ADDRESS | INVALID_PAYMENT |
      PRICE_CHANGED | STOCK_INSUFFICIENT | RATE_UNAVAILABLE |
      DUPLICATE_CONFIRMATION | PERSISTENCE_ERROR
message: texto comprensible y sin detalles internos
```

Un rechazo no debe dejar venta, pago, historial o movimiento parcial de inventario.
El carrito permanece disponible para corregir el problema cuando sea seguro.

## Efectos comprometidos

En una única operación consistente se crean o actualizan:

1. la venta con snapshot de importes y entrega;
2. sus líneas con precios vigentes;
3. el pago declarado;
4. el historial de estado inicial;
5. el movimiento de inventario;
6. los puntos de fidelidad, si el flujo existente los concede.

WhatsApp usa un contrato separado de mensaje y no ejecuta estos efectos.
