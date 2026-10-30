# Contrato: puntos y saldo a favor en el checkout de la tienda

**Feature**: `010-cuenta-cliente-fidelizacion` (US7, FR-032 a FR-035)
**Superficie**: Tienda pública: `/finalizar-compra`, paso de pago. También lo usan los pedidos directos de `/venta-rapida`, que delegan en el mismo checkout sin cambios propios.

## 1. División del checkout

| Archivo | Rol |
|---|---|
| `lib/checkout-core.ts` (**nuevo**) | `registrarCompraWeb(datos: CheckoutData, ctx: { clienteSesionId: number \| null })`. Es la transacción que hoy vive en `procesarCompra`, movida sin cambios de comportamiento y ampliada como se describe abajo. Sin `"use server"` ni `server-only`. La importan las pruebas de integración. |
| `lib/actions/checkout.ts` | `procesarCompra(prev, datos)` = `registrarCompraWeb(datos, { clienteSesionId: await obtenerClienteDeSesion() })`. Conserva su firma, los tipos `CheckoutData`, `CheckoutSuccess` y `CheckoutFailure` y los mensajes. |

## 2. Cambios en `CheckoutData`

```ts
interface CheckoutData {
  // …campos actuales
  beneficios?: { premioIds: number[]; saldoAFavorUsd: number };
  pago: { … } | null; // null solo si montoAPagar === 0
}
```

`CheckoutSuccess.estado` admite `"pagado"`. `CheckoutFailure.code` añade:

| Código | Mensaje |
|---|---|
| `BENEFITS_UNAVAILABLE` | `Inicia sesión con tu cuenta para usar tus puntos o tu saldo a favor.` |
| `BENEFITS_CHANGED` | `Tus puntos, tu saldo a favor o la existencia de un premio cambiaron. Revisa tus beneficios e inténtalo de nuevo.` |

## 3. Reglas del núcleo

### Cliente del pedido

- Si `ctx.clienteSesionId` no es nulo, `clientId = ctx.clienteSesionId` y se ignora `datos.clientId` (FR-041).
- Si es nulo y `beneficios` trae premios o saldo mayor que 0 → `BENEFITS_UNAVAILABLE`.
- Si es nulo y no hay beneficios, el comportamiento es el actual.

### Orden dentro de la transacción

1. Idempotencia. La reproducción acepta `previous.estado` en `por_cobrar`, `en_pedido` o `pagado`.
2. Si hay beneficios, `bloquearCliente(tx, clientId)`.
3. Dirección y entrega, como hoy.
4. Líneas del carrito validadas, como hoy.
5. Canjes: `validarCanjes` → `descuentoPuntosUsd`. Si falla → `BENEFITS_CHANGED`.
6. `totals = calculateCheckoutTotals(lineas, montoDelivery, descuentoPuntosUsd)`.
7. Saldo a favor:
   - `saldoAFavorUsd ≤ saldoAFavorDisponible(tx)` y `≤ totals.montoTotal`; si no → `BENEFITS_CHANGED`;
   - `montoAPagar = roundMoney(totals.montoTotal − saldoAFavorUsd)`.
8. Pago:
   - si `montoAPagar > 0`: `validatePaymentInput(datos.pago, montoAPagar)` y estado = `getInitialOrderState(método)`;
   - si `montoAPagar = 0`: exige `datos.pago === null` y el estado es `pagado`.
9. Crea la `Transaccion` con `montoDescuentoPuntos` y `montoTotal = totals.montoTotal`, y sus `DetalleCompra`.
10. Descuenta el inventario de las líneas, como hoy.
11. `canjearPremios(tx, …)`: movimientos de canje, líneas gratis e inventario. `STOCK_INSUFFICIENT` de un premio → `BENEFITS_CHANGED`.
12. Si `saldoAFavorUsd > 0`, `aplicarSaldoAFavorEnPedido(tx, { transaccionId, montoUsd: saldoAFavorUsd }, null)`.
13. Si `montoAPagar > 0`, crea el `Pago` declarado por `montoAPagar`, como hoy.
14. Historial inicial:
    - `"Pedido directo desde venta rápida"` (como hoy);
    - o `"Pagado con saldo a favor"` si nace pagado.
15. Si el estado es `pagado`, `acreditarPuntosPorPago(tx, transaccionId)`.

**Resultado**: si cualquier paso falla, no se escribe nada y el carrito se conserva (SC-011). Ya no se acreditan puntos al crear el pedido en ningún otro caso.

## 4. Acción de lectura `obtenerBeneficiosCheckout()`

Ubicación: `lib/actions/cuenta-cliente.ts`. Deriva el cliente **solo** de la sesión.

```ts
| { disponible: false }
| { disponible: true; puntos: number; saldoAFavorUsd: number;
    premios: Array<{ id: number; nombre: string; tipo: "descuento" | "producto"; costoPuntos: number; montoDescuentoUsd: number | null; producto: { id: number; nombre: string; unidadesDisponibles: number } | null }> }
```

- `disponible: false` si la sesión no es `vinculada`.
- Solo devuelve premios activos con `costoPuntos ≤ puntos`.
- Para los premios de producto incluye `unidadesDisponibles(inventario)`.

## 5. Interfaz

**`components/finalizar-compra/beneficiosCliente.tsx`** (**nuevo**, componente cliente):

- Llama a `obtenerBeneficiosCheckout()` al montar. Si `disponible: false`, no renderiza nada (FR-035).
- Muestra los puntos, los premios que se pueden canjear (casillas; el costo acumulado no puede superar los puntos) y el saldo a favor, con un campo "Usar USD" (tope: `min(saldo, total después de descuentos)`) y un botón "Usar todo".
- Avisa al padre con `onChange({ premioIds, saldoAFavorUsd, descuentoPuntosUsd })`.

**`components/finalizar-compra/paymentInformation.tsx`**:

- Guarda la selección en `useState` **local**. No escribe en `store/appStore.ts` ni en `context/checkoutContext.tsx`.
- `montoAPagar = finalTotalUSD − descuentoPuntosUsd − saldoAFavorUsd`. Reemplaza a `finalTotalUSD` en las instrucciones, en `createPaymentRecord` y en `validatePaymentInput`.
- Con `montoAPagar = 0` oculta los métodos de pago y envía `pago: null`. El botón dice "Confirmar pedido".
- Envía `beneficios` en `CheckoutData`.
- Ante `BENEFITS_CHANGED`, muestra `toast.error` y recarga los beneficios.

**`components/finalizar-compra/personalInformation.tsx`**: si la sesión está vinculada, el servidor pasa los datos del cliente. Los campos se rellenan, el teléfono queda bloqueado y se omite `getClientByPhone`. El `clientId` del contexto pasa a ser el de la sesión, aunque el servidor lo vuelve a imponer.

**`app/confirmacion/page.tsx`**: muestra el saldo a favor aplicado y los premios canjeados, a partir de los pagos `SaldoAFavor` y las líneas promo a precio 0 con su movimiento de canje. El mensaje de WhatsApp añade una línea `*BENEFICIOS:*` cuando los hay.
