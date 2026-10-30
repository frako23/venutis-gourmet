# Contrato: ficha del cliente, crédito y saldo a favor

**Feature**: `010-cuenta-cliente-fidelizacion`
**Superficie**: Panel administrativo: `/admin/clients/[id]` (nueva), `/admin/clients` (enlace a la ficha), detalle del pedido (`/admin/transactions/[id]`), venta manual (`/admin/add-transaction`) y editor masivo de ventas.

Todas las acciones ejecutan `requireAdmin()` y Zod antes de tocar la base. Cada núcleo transaccional bloquea primero al cliente (`bloquearCliente`) y después el pedido (R8).

## 1. Ficha: `getClientProfile(id)` (`lib/admin/client-profile.ts`)

```ts
type ClientProfile = {
  cliente: { id; tipoCliente; nombre; apellido; rif; celular; email; createdAt; updatedAt; notasInternas: string | null };
  direcciones: Array<{ id; urbanizacion; direccion; tipo }>;
  cuenta: { id: number; email: string; estado: "vinculada" | "pendiente"; confirmadaPorEmail: string | null; confirmadaEn: Date | null } | null;
  indicadores: { totalCompradoUsd: number; pedidos: number; ticketPromedioUsd: number; ultimaCompra: Date | null; topProductos: Array<{ productoId; nombre; cantidad: number }> }; // sin cancelados, top 5 por cantidad
  financiero: { deudaUsd: number; saldoAFavorUsd: number; puntos: number; credito: { habilitado: boolean; limiteUsd: number | null; disponibleUsd: number | null } };
  pedidos: Array<{ id; numeroOrden; fechaCompra; totalUsd; estado; saldoUsd: number }>;           // todos, más recientes primero
  movimientosSaldo: Array<{ id; createdAt; montoUsd; origen; numeroOrden: string | null; actorEmail: string | null; motivo: string | null; metodoPago: string | null; referencia: string | null }>;
  movimientosPuntos: Array<{ id; fecha; puntos; tipo; descripcion: string | null; numeroOrden: string | null; actorEmail: string | null; motivo: string | null }>;
  historial: Array<{ createdAt; actorEmail; accion; camposModificados: string[]; detalle: string | null }>;
};
```

- `deudaUsd` = `consultarDeudaCliente` (FR-007).
- `disponibleUsd` = `max(0, limite − deuda)` si hay crédito habilitado; si no, `null`.
- Si el id no existe: `notFound()`.

`app/admin/clients/[id]/page.tsx` la presenta en secciones (datos, resumen financiero, crédito, notas, cuenta web, pedidos, saldo a favor, puntos e historial), con los componentes de `components/admin/clientes/ficha/`. En `components/admin/clientes/clientsTable.tsx` el nombre enlaza a la ficha.

## 2. Acciones de perfil (`lib/actions/admin-clients.ts`)

| Acción | Entrada | Efecto | Mensaje de éxito |
|---|---|---|---|
| `guardarNotasCliente(formData)` | `clienteId` y `notasInternas` (hasta 2.000, se recorta) | Actualiza las notas. Escribe `HistorialCliente` con `camposModificados: ["notasInternas"]` y sin `detalle` (no se copia el texto). | `Notas guardadas.` |
| `actualizarCreditoCliente(formData)` | `clienteId`, `habilitado` y `limiteUsd` (≥ 0, 2 decimales, obligatorio si está habilitado) | Actualiza los campos. Escribe `HistorialCliente` con `detalle` `"Crédito: {antes} → {después}"` (FR-010). No toca la deuda. Un límite menor que la deuda está permitido (el disponible queda en 0). | `Crédito actualizado. Disponible: USD {x}.` |
| `confirmarVinculacionCuenta(formData)` | `cuentaId` | `pendiente` → `vinculada`, con `confirmadaPorEmail` y `confirmadaEn`. Escribe `HistorialCliente` con `detalle` `"Cuenta web vinculada ({email})"`. Si ya estaba vinculada: error. | `Cuenta vinculada.` |
| `desvincularCuenta(formData)` | `cuentaId` | Borra la `CuentaCliente`. Escribe `HistorialCliente` con `detalle` `"Cuenta web desvinculada ({email})"`. No toca pedidos, puntos ni saldos. | `Cuenta desvinculada.` |

Todas revalidan `/admin/clients`, `/admin/clients/{id}` y `/mi-cuenta`.

## 3. Saldo a favor (`lib/saldo-a-favor.ts` y `lib/actions/admin-cuenta-corriente.ts`)

### Reglas puras

| Función | Contrato |
|---|---|
| `calcularSaldoAFavor(movimientos)` | `roundMoney(Σ montoUsd)`. |
| `dividirAbono(montoUsd, saldoUsd)` | `{ aplicadoUsd: min(monto, saldo), excedenteUsd: max(0, monto − saldo) }`, en centavos. |
| `repartirBs(montoBs, aplicadoUsd, montoUsd)` | `{ pagoBs: round(montoBs × aplicado / monto), excedenteBs: montoBs − pagoBs }`. |
| `validarAplicacionSaldo({ montoUsd, disponibleUsd, saldoPedidoUsd })` | Error si `monto ≤ 0`, si `monto > disponible` (`Solo tienes USD {d} a favor.`) o si `monto > saldo del pedido` (`El pedido solo debe USD {s}.`). |

### Núcleos transaccionales

| Función | Contrato |
|---|---|
| `bloquearCliente(tx, clienteId)` | `SELECT id FROM "Cliente" WHERE id = $1 FOR UPDATE`. Error si no existe. |
| `saldoAFavorDisponible(tx, clienteId)` | `aggregate _sum montoUsd`, redondeado. |
| `registrarPagoACuenta(tx, input, actor)` | Bloquea al cliente y crea un movimiento `pago_cuenta` (+) con método, referencia, fecha, `montoBs` y `tasaCambio`. |
| `aplicarSaldoAFavorEnPedido(tx, { transaccionId, montoUsd }, actor \| null)` | Bloquea al cliente del pedido y valida con `validarAplicacionSaldo`. Llama a `registrarAbonoEnPedido` con `metodoPago: "SaldoAFavor"` y `moneda: "usd"` (bloquea el pedido, crea el `Pago` y salda si corresponde). Después crea el movimiento `aplicacion_pedido` (−) enlazado al `pagoId`. Si el pedido quedó pagado, `acreditarPuntosPorPago`. |
| `ajustarSaldoAFavor(tx, { clienteId, montoUsd, motivo }, actor)` | Bloquea al cliente. Si el saldo resultante es menor que 0: `El ajuste dejaría el saldo a favor en negativo.` Si no, crea un movimiento `ajuste`. |
| `devolverAbonosDeCancelacion(tx, pedido, actor)` | `abonado = calcularAbonado(pedido.pagos)`. Si es mayor que 0, crea un movimiento `pedido_cancelado` (+) con `transaccionId`. Bloquea al cliente. |

### Server Actions

| Acción | Entrada | Mensaje de éxito |
|---|---|---|
| `registrarPagoACuenta(formData)` | `clienteId`, `moneda` (`usd`/`bs`), `monto` (> 0, 2 decimales), `tasaCambio` (si es `bs`), `metodoPago` (sin `NoEspecificado` ni `SaldoAFavor`), `referencia?` y `fechaPago` (≤ hoy) | `Pago a cuenta registrado. Saldo a favor: USD {x}.` |
| `aplicarSaldoAFavor(formData)` | `transaccionId` y `montoUsd` | `Saldo aplicado. Saldo pendiente: USD {s}.` o `Saldo aplicado. El pedido {n} quedó pagado.` |
| `ajustarSaldoAFavor(formData)` | `clienteId`, `montoUsd` (≠ 0, con signo) y `motivo` (3 a 240) | `Ajuste registrado. Saldo a favor: USD {x}.` |

Revalidan la ficha, `/admin/transactions/{id}` si aplica y `/mi-cuenta`.

## 4. Cambios en abonos (`lib/admin/abonos.ts`, `lib/actions/admin-orders.ts`)

- **`registrarAbono(formData)`** acepta `permitirExcedente` (`"true"`). El núcleo:
  1. lee el `clienteId` del pedido, llama a `bloquearCliente` y después bloquea el pedido como hoy;
  2. calcula `dividirAbono`;
  3. con excedente y sin `permitirExcedente`, mantiene el error actual;
  4. con permiso: crea el `Pago` por `aplicadoUsd` (y `pagoBs`) y el movimiento `sobrepago` por `excedenteUsd` (y `excedenteBs`) enlazado al `pagoId`.

  Al saldar, pasa el pedido a pagado y llama a `acreditarPuntosPorPago`. El resultado gana `excedenteUsd` y el mensaje pasa a ser `Abono registrado. El pedido {n} quedó pagado y USD {e} quedaron a favor del cliente.`
- **`components/admin/ventas/abonosPanel.tsx`**:
  - si el monto supera el saldo, muestra el reparto (`dividirAbono`) y pide confirmar antes de enviar `permitirExcedente`;
  - añade "Usar saldo a favor" (con el saldo disponible del cliente) y llama a `aplicarSaldoAFavor`;
  - lista los abonos con método "Saldo a favor" igual que los demás.
- **`anularAbonoEnPedido`**:
  1. bloquea al cliente;
  2. si el pago es `SaldoAFavor`, crea un movimiento `anulacion` (+) por su monto;
  3. si tiene un `sobrepago` enlazado, crea un movimiento `anulacion` (−) por ese excedente, después de comprobar que el saldo no queda negativo. Si quedaría negativo: `No se puede anular: el excedente de este abono ya se usó. Revierte primero la aplicación de ese saldo.`

## 5. Cancelación (`lib/admin/order-state-change.ts`)

Al cancelar, además de lo que ya hace, dentro de la misma transacción:

1. `bloquearCliente(tx, pedido.clienteId)` antes de la escritura condicionada del estado;
2. `devolverAbonosDeCancelacion` (también en pedidos importados);
3. `revertirPuntosDePedido` ([fidelidad.md](./fidelidad.md) §4).

El mensaje de éxito añade `"USD {x} quedaron a favor del cliente."` si hubo devolución. Si el estado nuevo es `pagado`, llama a `acreditarPuntosPorPago`.

## 6. Crédito en la venta manual (`lib/actions/admin-sales.ts`)

`registrarVentaManual` gana tres campos de entrada:

- `autorizarCredito` (`"true"`);
- `canjes` (JSON con ids de premio, ver [fidelidad.md](./fidelidad.md) §3);
- `saldoAFavorUsd` (número ≥ 0).

**Pasos dentro de la transacción**:

1. `bloquearCliente`.
2. Totales con `calculateSaleTotals(lineas, descuento, tasa, descuentoPuntosUsd)`.
3. Canjes, si los hay.
4. Creación del pedido.
5. Saldo a favor: si `saldoAFavorUsd > 0`, `aplicarSaldoAFavorEnPedido`.
6. Si `estadoInicial !== "pagado"` y no hay `pago`:
   1. `montoSinCobrar = total − saldoAFavorUsd`;
   2. `evaluarCredito({ habilitado, limiteUsd, deudaUsd: consultarDeudaCliente(tx) antes de crear el pedido, montoSinCobrarUsd })`;
   3. si hace falta autorización y no hay `autorizarCredito`, lanza `CreditoRequiereAutorizacion` (revierte todo) y la acción devuelve:

   ```ts
   { success: false; requiereAutorizacion: { deudaUsd: number; limiteUsd: number | null; disponibleUsd: number; excesoUsd: number }; message: "Esta venta excede el crédito disponible del cliente." }
   ```

   Con autorización, el motivo del historial inicial es `"Venta registrada manualmente · Autorizada sobre el crédito: excede USD {exceso} (deuda USD {deuda}, límite USD {limite | sin crédito})"`, con el actor.
7. Si `estadoInicial === "pagado"`, `acreditarPuntosPorPago`.

**`evaluarCredito` (pura)**:

- `disponible = habilitado ? max(0, limite − deuda) : 0`;
- `requiereAutorizacion = montoSinCobrar > 0 && montoSinCobrar > disponible` (en centavos);
- `exceso = montoSinCobrar − disponible`.

**Interfaz** (`components/admin/ventas/manualSaleForm.tsx`): al recibir `requiereAutorizacion` abre una confirmación con la deuda, el límite y el exceso. Al confirmar, reenvía con `autorizarCredito = true`.

## 7. Editor masivo (`guardarEdicionMasivaVentas`)

- **Entrada**: gana `autorizarCredito`, igual que `confirmarPagos`. Las filas nuevas sin cobro siguen la regla de §6, acumulando la deuda por cliente dentro de la tanda. Si alguna requiere autorización y falta la casilla: `Las ventas {ordenes} exceden el crédito disponible. Marca "Autorizo las ventas que exceden el crédito" para guardarlas.`
- **Cambio de cliente**: en un pedido con movimientos de `Fidelidad` o de `MovimientoSaldo` se rechaza con `La venta {n} tiene puntos o saldo a favor asociados y no puede cambiar de cliente.`
- **Totales**: se recalculan con el `montoDescuentoPuntos` del pedido.
- **Puntos**: las filas que quedan `pagado` llaman a `acreditarPuntosPorPago`.

`actualizarDescuentoVenta` también pasa el `montoDescuentoPuntos` del pedido a `calculateSaleTotals`.
