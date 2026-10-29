# Contrato: abonos y cuentas por cobrar

**Feature**: `008-ventas-excel`
**Superficie**: Panel administrativo: detalle del pedido (`/admin/transactions/[id]`) y "Ventas y pedidos" (`/admin/transactions`).

## 1. Reglas puras (`lib/admin/abonos.ts`)

Sin `@/` ni `server-only`; las importan la interfaz, las consultas y las pruebas.

| Función | Contrato |
|---|---|
| `calcularAbonado(pagos)` | `roundMoney(Σ montoUsd)` de los pagos con `esAbono && !anuladoEn`. |
| `calcularSaldo({ estado, montoTotal, pagos })` | `0` si `estado === "pagado"`; si no, `max(0, roundMoney(montoTotal − abonado))`. |
| `puedeRecibirAbono(estado)` | `true` para `por_cobrar`, `pendiente` y `en_pedido`. |
| `puedeAnularAbono(estado)` | `true` si el estado no es `pagado` ni `cancelado`. |
| `convertirAbonoAUsd({ moneda, monto, tasaCambio })` | `usd` devuelve `roundMoney(monto)`; `bs` exige `tasaCambio > 0` y devuelve `roundMoney(monto / tasaCambio)`. |
| `validarMontoAbono(montoUsd, saldoUsd)` | Error si `montoUsd <= 0` o `montoUsd > saldoUsd`, comparando en centavos. |

## 2. Server Action `registrarAbono(formData)`

Ubicación: `lib/actions/admin-orders.ts`. El núcleo transaccional es `registrarAbonoEnPedido(tx, input, actor)`, en `lib/admin/abonos.ts`.

### Entrada (`FormData`)

| Campo | Tipo | Regla |
|---|---|---|
| `transaccionId` | entero positivo | Obligatorio. |
| `moneda` | `usd \| bs` | Obligatorio. |
| `monto` | número > 0 | Obligatorio, con 2 decimales como máximo. |
| `tasaCambio` | número > 0 | Obligatorio si `moneda = bs`. La interfaz lo rellena con la tasa del día (`hooks/useDolar.ts`) y se puede editar. |
| `metodoPago` | `MetodoPago` sin `NoEspecificado` | Obligatorio. |
| `referencia` | texto | Opcional, hasta 120 caracteres. |
| `fechaPago` | fecha | Obligatoria, no posterior a hoy. Por defecto, hoy. |

### Núcleo transaccional

1. `SELECT id FROM "Transaccion" WHERE id = $1 FOR UPDATE`.
2. Leer el pedido con sus pagos. Si no existe: `La venta no existe.`
3. Si `!puedeRecibirAbono(estado)`: `Solo se registran abonos en pedidos por cobrar o en pedido.`
4. Calcular `montoUsd` y `saldo`. Si `validarMontoAbono` falla: `El abono debe ser mayor que cero y no superar el saldo pendiente (USD {saldo}).`
5. `pago.create({ esAbono: true, montoUsd, montoBs, tasaCambio, metodoPago, referencia, fechaPago, actorId, actorEmail })`.
6. Si el saldo nuevo es 0: `transaccion.updateMany({ where: { id, estado: leído }, data: { estado: "pagado" } })` con `count === 1` (si no, `El pedido cambió mientras lo editabas. Revisa su estado actual.`), e historial `{ estadoAnterior: leído, estadoNuevo: "pagado", motivo: "Saldado con abonos" }`.

### Resultado

```ts
| { success: true; message: string; abonadoUsd: number; saldoUsd: number; estado: EstadoTransaccion }
| { success: false; message: string }
```

| Caso | `message` |
|---|---|
| Abono parcial | `Abono registrado. Saldo pendiente: USD {saldo}.` |
| Abono que salda | `Abono registrado. El pedido {numeroOrden} quedó pagado.` |
| Zod falla | `Revisa los datos del abono.` |

Revalida `/admin`, `/admin/transactions` y `/admin/transactions/{id}`.

## 3. Server Action `anularAbono(formData)`

### Entrada

| Campo | Tipo | Regla |
|---|---|---|
| `pagoId` | entero positivo | Obligatorio. |

### Núcleo transaccional (`anularAbonoEnPedido(tx, pagoId, actor)`)

1. Leer el pago. Si no existe, no es abono o ya está anulado: `El abono no existe o ya fue anulado.`
2. Bloquear la fila del pedido (`FOR UPDATE`) y leer su estado. Si `!puedeAnularAbono(estado)`: `No se puede anular un abono de un pedido pagado o cancelado. Si el cobro se revirtió, pasa el pedido a "Por cobrar" primero.`
3. `pago.updateMany({ where: { id, anuladoEn: null }, data: { anuladoEn: now } })` con `count === 1`.
4. Historial: `{ estadoAnterior: estado, estadoNuevo: estado, actorId, actorEmail, motivo: "Abono anulado: USD {monto} ({método})" }`.

### Resultado

`{ success: true; message: "Abono anulado. Saldo pendiente: USD {saldo}." }` o `{ success: false; message }`.

## 4. Interfaz

- **Detalle del pedido**: un panel "Abonos" (`components/admin/ventas/abonosPanel.tsx`) muestra el total, lo abonado y el saldo; la lista de abonos (fecha, monto USD, Bs y tasa si aplica, método, referencia, quién lo registró) con los anulados tachados y rotulados "Anulado"; el formulario de nuevo abono si `puedeRecibirAbono`; y el botón "Anular" en cada abono vigente si `puedeAnularAbono`, con confirmación en una modal. El panel "Pago declarado" existente sigue mostrando el último pago con `esAbono = false`. Todo resultado se notifica con sonner.
- **Tabla "Ventas y pedidos"**: columnas "Abonado" y "Saldo" en escritorio y ambos datos en la tarjeta móvil. El saldo mayor que cero se destaca con el color de "Por cobrar".
- **Filtro**: `SalesFilters` añade "Con saldo pendiente" (`saldo=pendiente`), que `buildSalesWhere` traduce a `estado in (por_cobrar, pendiente, en_pedido)` y que se combina con los demás filtros.
- **Resumen de cuentas por cobrar** (`components/admin/ventas/receivablesSummary.tsx`): se muestra sobre la tabla cuando `saldo=pendiente` está activo. Lo calcula `consultarCuentasPorCobrar()` en `lib/admin/sales-query.ts` (usa el singleton `@/lib/prisma`):

```ts
type CuentasPorCobrar = {
  totalUsd: number;
  clientes: Array<{ clienteId: number; cliente: string; deudaUsd: number; pedidos: number; desde: Date }>; // ordenados por deudaUsd desc
};
```

Consulta los pedidos abiertos con sus abonos, calcula el saldo de cada uno, descarta los de saldo 0 y agrupa por cliente. Cada cliente enlaza a `/admin/transactions?saldo=pendiente&cliente={nombre}`.

## 5. Ajuste en `actualizarDescuentoVenta`

Antes de guardar, si `totals.totalUsd < calcularAbonado(pagos)`, responde `{ success: false, message: "El descuento dejaría el total por debajo de lo ya abonado (USD {abonado})." }`.
