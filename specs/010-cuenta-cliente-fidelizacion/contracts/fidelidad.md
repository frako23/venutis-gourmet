# Contrato: puntos, premios y canjes

**Feature**: `010-cuenta-cliente-fidelizacion`
**Superficie**: Panel administrativo: `/admin/clients/rewards` (nueva), ficha del cliente, detalle del pedido y venta manual. La tienda solo lee y canjea en el checkout ([checkout-beneficios.md](./checkout-beneficios.md)).

## 1. Reglas puras (`lib/fidelidad.ts`)

Sin `@/` ni `server-only`, para que se puedan probar con `node:test`.

| Función | Contrato |
|---|---|
| `participaEnFidelidad({ tipoCliente, importada })` | `tipoCliente === "detal" && !importada` (FR-019). |
| `calcularPuntosGanados({ montoSubtotal, montoDescuento, montoDescuentoPuntos })` | `max(0, floor(roundMoney(subtotal − descuento − descuentoPuntos) + 1e-9))`. No incluye el delivery (FR-020). |
| `calcularPuntos(movimientos)` | `Σ puntos`. |
| `validarCanjes({ premios, puntosDisponibles, subtotalUsd, descuentoUsd })` | Cada premio debe estar `activo`. La suma de `costoPuntos` debe ser ≤ `puntosDisponibles` (`No tienes puntos suficientes para {nombre}.`). La suma de `montoDescuentoUsd` debe ser ≤ `subtotal − descuento` (`El descuento del premio supera el monto del pedido.`). Devuelve `{ descuentoPuntosUsd, costoTotal, lineasGratis: Array<{ productoId, cantidad, premioId }> }`. |
| `topeReversion({ ganadosNetos, devueltos, disponibles })` | `min(ganadosNetos, disponibles + devueltos)`: la reversión nunca deja el saldo negativo (R10). |

## 2. Premios: acciones (`lib/actions/admin-fidelidad.ts`) y página `/admin/clients/rewards`

| Acción | Entrada | Reglas | Mensaje de éxito |
|---|---|---|---|
| `crearPremio(prev, formData)` | `nombre` (3 a 80), `descripcion?` (≤ 240), `tipo`, `costoPuntos` (entero > 0); `montoDescuentoUsd` (> 0, 2 decimales) si es `descuento`; `productoId` existente y `cantidad` (entero > 0) si es `producto` | Zod con `superRefine` por tipo. | `Premio creado.` |
| `actualizarPremio(prev, formData)` | `premioId` y los mismos campos | Cambiar el costo o el monto no afecta los canjes ya hechos, porque el movimiento guarda su copia. | `Premio actualizado.` |
| `cambiarEstadoPremio(formData)` | `premioId` y `activo` | No hay borrado. | `Premio activado.` / `Premio desactivado.` |

**Página**: `app/admin/clients/rewards/page.tsx` lista los premios con nombre, tipo, costo, recompensa, estado y número de canjes, y tiene el formulario en una modal. Se llega con un botón "Premios" en la cabecera de `/admin/clients`. No hay entrada nueva en la barra lateral.

**Revalidación**: `/admin/clients/rewards` y `/mi-cuenta`.

## 3. Núcleos transaccionales

### `acreditarPuntosPorPago(tx, transaccionId)`

1. Lee el pedido (`estado`, `importada`, montos, `clienteId`) y el `tipoCliente` del cliente.
2. Si `estado !== "pagado"` o `!participaEnFidelidad`, termina sin hacer nada.
3. Si ya existe una `Fidelidad` `acumulacion` con ese `transaccionId`, termina sin hacer nada (FR-021, incluye los pedidos antiguos).
4. Si `puntos = calcularPuntosGanados(pedido)` es mayor que 0, crea `{ tipoMovimiento: "acumulacion", puntos, clienteId, transaccionId }`.

Devuelve los puntos acreditados (0 si no hubo). La llaman los seis caminos de pago de R10. **Nunca la llama** `aplicarCargaVentas`.

### `canjearPremios(tx, { clienteId, transaccionId, premioIds, subtotalUsd, descuentoUsd }, actor | null)`

1. Exige `bloquearCliente` hecho por quien la llama.
2. Lee los premios (`activo`) y los puntos disponibles, y aplica `validarCanjes`.
3. Por cada premio crea `Fidelidad` `{ tipoMovimiento: "redencion", puntos: −costoPuntos, premioId, descripcion: nombre, transaccionId, actor }`.
4. Por cada línea gratis llama a `ajustarInventario(tx, productoId, −cantidad, { exigirStock: true })` y crea `DetalleCompra` `{ precioUnitario: 0, tipoPrecio: "promo", cantidad }`.
5. Devuelve `descuentoPuntosUsd`. Quien la llama lo suma a `montoDescuentoPuntos` y recalcula `montoTotal`.

Con `StockInsuficienteError` falla con `No hay existencia para el premio {nombre}.`

### `canjearPremioEnPedido(tx, { transaccionId, premioId }, actor)` (panel, pedido existente)

1. Lee el `clienteId`, llama a `bloquearCliente` y bloquea el pedido (`FOR UPDATE`).
2. Exige estado `por_cobrar`, `pendiente` o `en_pedido`.
3. Llama a `canjearPremios` con un solo premio.
4. Actualiza `montoDescuentoPuntos` y `montoTotal`, y comprueba `validarTotalContraAbonado(totalNuevo, abonado)`.
5. Si el saldo queda en 0, aplica la escritura condicionada a `pagado`, el historial "Saldado con canje de puntos" y `acreditarPuntosPorPago`.
6. Escribe un historial sin cambio de estado con el motivo `"Canje: {premio} (−{costo} puntos)"`.

### `revertirPuntosDePedido(tx, { transaccionId, clienteId }, actor)` (al cancelar)

1. Suma por tipo los movimientos del pedido: `ganadosNetos` (acumulación más reversiones previas) y `canjeados` (redenciones más devoluciones previas, en valor absoluto).
2. Si `canjeados > 0`, crea `devolucion` (+canjeados) con `premioId: null` y la descripción `"Devolución por cancelación del pedido {n}"`.
3. Si `ganadosNetos > 0`, aplica `tope = topeReversion(...)` y crea `reversion` (−tope). Si `tope < ganadosNetos`, el motivo es `"Reversión parcial: el cliente ya había usado {diferencia} puntos"`.

### `ajustarPuntos(tx, { clienteId, puntos, motivo }, actor)`

Bloquea al cliente. Si el saldo resultante es menor que 0: `El ajuste dejaría los puntos en negativo.` Si no, crea un movimiento `ajuste` con el motivo y el actor.

## 4. Acciones del panel

| Acción | Ubicación | Entrada | Mensaje de éxito |
|---|---|---|---|
| `ajustarPuntosCliente(formData)` | `lib/actions/admin-fidelidad.ts` | `clienteId`, `puntos` (entero ≠ 0) y `motivo` (3 a 240) | `Ajuste registrado. Puntos disponibles: {n}.` |
| `canjearPremio(formData)` | `lib/actions/admin-fidelidad.ts` | `transaccionId` y `premioId` | `Premio canjeado. Total del pedido: USD {t}.` |
| `registrarVentaManual` | `lib/actions/admin-sales.ts` | `canjes` (JSON `number[]`, opcional) | Los canjes se aplican después de `bloquearCliente` y antes de crear el pedido, para que el total ya incluya el descuento ([ficha-saldo-credito.md](./ficha-saldo-credito.md) §6). |

**Interfaz**:

- **Detalle del pedido**: un botón "Canjear premio" junto a los abonos lista los premios activos que el cliente puede pagar con sus puntos.
- **Venta manual**: una vez elegido el cliente, muestra sus puntos y premios y permite marcar canjes.
- **Ficha**: "Ajustar puntos" y la tabla de movimientos.

## 5. Cambio en el checkout existente

Se eliminan las líneas que hoy crean la `acumulacion` al registrar el pedido web (`lib/actions/checkout.ts`, antes de `return { success: true … }`). `components/finalizar-compra/orderSuccess.tsx` y `/confirmacion` muestran: "Ganarás {calcularPuntosGanados} puntos cuando confirmemos tu pago". Solo se muestra si el cliente participa y el pedido no está pagado; si está pagado, muestra "Ganaste {n} puntos".
