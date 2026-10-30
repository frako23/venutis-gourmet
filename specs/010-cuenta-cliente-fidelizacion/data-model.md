# Data Model: Perfil del cliente, crédito, saldo a favor y fidelización

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Todo cabe en una sola migración, `<timestamp>_cuenta_cliente_fidelizacion`, seguida de `npx prisma generate`. Los cambios son aditivos: ninguna columna existente cambia de tipo y los datos actuales conservan su significado.

## Cambios en modelos existentes

### `Cliente`

| Campo | Tipo | Regla |
|---|---|---|
| `notasInternas` | `String?` | Hasta 2.000 caracteres. Nunca se envía a la tienda (FR-006, FR-040). |
| `creditoHabilitado` | `Boolean @default(false)` | Por defecto ningún cliente tiene crédito (FR-008). |
| `limiteCreditoUsd` | `Float?` | Mayor o igual que 0 y con 2 decimales. Es obligatorio si `creditoHabilitado`; se conserva al deshabilitar. |
| `movimientosSaldo` | `MovimientoSaldo[]` | Relación. |
| `cuenta` | `CuentaCliente?` | Relación 1:0..1. |

**Derivados (no se guardan)**:

- `deudaUsd`: `consultarDeudaCliente`, la suma de `calcularSaldo` en `por_cobrar`, `pendiente` y `en_pedido`.
- `saldoAFavorUsd`: `SUM(MovimientoSaldo.montoUsd)`.
- `puntosDisponibles`: `SUM(Fidelidad.puntos)`.
- `creditoDisponibleUsd`: `max(0, limite − deuda)`.

### `HistorialCliente`

| Campo | Tipo | Regla |
|---|---|---|
| `detalle` | `String?` | Texto legible con el valor anterior y el nuevo de los cambios de crédito, notas o vinculación. Ejemplo: `"Crédito: deshabilitado → habilitado, límite USD 100,00"`. |

Las filas nuevas usan `accion: actualizado` y `camposModificados`, por ejemplo `["creditoHabilitado", "limiteCreditoUsd"]` o `["cuenta"]`.

### `Transaccion`

| Campo | Tipo | Regla |
|---|---|---|
| `montoDescuentoPuntos` | `Float @default(0)` | Suma de los descuentos de premios canjeados en el pedido. |
| `movimientosSaldo` | `MovimientoSaldo[]` | Relación. |

**Invariantes**:

- `montoTotal = montoSubtotal + montoDelivery − montoDescuento − montoDescuentoPuntos`, redondeado a 2 decimales.
- `montoDescuento + montoDescuentoPuntos ≤ montoSubtotal`.

### `MetodoPago` (enum)

Se añade `SaldoAFavor`. Solo lo usan los `Pago` con `esAbono = true` creados al aplicar saldo a favor. Su etiqueta en `getPaymentMethodLabel` es "Saldo a favor". No se ofrece en los selectores de cobro.

### `Fidelidad` (libro de puntos)

| Campo | Tipo | Regla |
|---|---|---|
| `puntos` | `Int` (ahora **con signo**) | Positivo: `acumulacion`, `devolucion` y `ajuste` positivo. Negativo: `redencion`, `reversion` y `ajuste` negativo. Los registros existentes son acumulaciones positivas. |
| `motivo` | `String?` | Obligatorio en `ajuste` (3 a 240 caracteres). |
| `actorId`, `actorEmail` | `String?` | Quién lo registró. Es nulo en las acumulaciones automáticas del checkout. |
| `premioId` | `Int?` → `Premio` | Solo en `redencion` y `devolucion`. |
| `descripcion` | `String?` | Copia del nombre del premio en el canje. |

`TipoMovimiento` pasa a tener: `acumulacion`, `redencion` (canje), `devolucion`, `reversion` y `ajuste`.

**Índices**: `@@index([clienteId, fecha])` y `@@index([transaccionId])`.

**Invariantes**:

- `SUM(puntos)` de un cliente ≥ 0 después de cada operación (bloqueo del cliente, R8).
- Cada `transaccionId` tiene como máximo una `acumulacion`.

## Modelos nuevos

### `CuentaCliente`

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | |
| `stackUserId` | `String @unique` | Usuario del proveedor de identidad. |
| `email` | `String` | Correo verificado en el momento de vincular, en minúsculas. Es informativo; no se usa para autorizar. |
| `clienteId` | `Int @unique` → `Cliente` (`onDelete: Cascade`) | Un cliente tiene como máximo una cuenta (FR-038). |
| `estado` | `EstadoCuentaCliente` | `vinculada` \| `pendiente`. |
| `confirmadaPorEmail` | `String?` | Administradora que confirmó una vinculación pendiente. |
| `confirmadaEn` | `DateTime?` | |
| `createdAt`, `updatedAt` | `DateTime` | |

**Transiciones**:

```text
(sin cuenta) ──correo coincide──────────────▶ vinculada
(sin cuenta) ──teléfono coincide────────────▶ pendiente ──admin confirma──▶ vinculada
(sin cuenta) ──sin coincidencias (crea Cliente detal)──▶ vinculada
pendiente | vinculada ──admin desvincula (borra la fila)──▶ (sin cuenta)
```

Una cuenta `pendiente` no da acceso a datos del cliente (FR-043), y en el checkout se comporta como si no hubiera sesión.

### `MovimientoSaldo` (libro del saldo a favor)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | |
| `clienteId` | `Int` → `Cliente` | |
| `montoUsd` | `Float` | Con signo, 2 decimales y distinto de 0. |
| `origen` | `OrigenMovimientoSaldo` | Ver la tabla de abajo. |
| `transaccionId` | `Int?` → `Transaccion` | Pedido relacionado. |
| `pagoId` | `Int? @unique` → `Pago` | Abono que originó el excedente o que representa la aplicación. |
| `metodoPago` | `MetodoPago?` | Solo cuando es dinero recibido (`sobrepago`, `pago_cuenta`). |
| `referencia` | `String?` | Hasta 120 caracteres. |
| `fechaPago` | `DateTime?` | |
| `montoBs`, `tasaCambio` | `Float?` | Si se recibió en bolívares. |
| `motivo` | `String?` | Obligatorio en `ajuste`. |
| `actorId`, `actorEmail` | `String?` | Es nulo cuando lo genera el cliente en la tienda. |
| `createdAt` | `DateTime @default(now())` | |

**Índices**: `@@index([clienteId, createdAt])` y `@@index([transaccionId])`.

| `origen` | Signo | Lo genera |
|---|---|---|
| `sobrepago` | + | Abono mayor que el saldo del pedido, con el excedente confirmado (R6). |
| `pago_cuenta` | + | Pago a cuenta sin pedido (FR-014). |
| `pedido_cancelado` | + | Cancelación de un pedido con abonos vigentes (R7). |
| `aplicacion_pedido` | − | Aplicación a un pedido, en el panel o en la tienda (R5, R12). |
| `anulacion` | ± | Anulación de un abono: devuelve una aplicación (+) o revierte un excedente (−). |
| `ajuste` | ± | Ajuste manual con motivo (FR-018). |

**Invariantes**:

- `SUM(montoUsd)` de un cliente ≥ 0 después de cada operación.
- Ningún movimiento se edita ni se borra.

### `Premio`

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | |
| `nombre` | `String` | De 3 a 80 caracteres. |
| `descripcion` | `String?` | Hasta 240 caracteres. |
| `tipo` | `TipoPremio` | `descuento` \| `producto`. |
| `costoPuntos` | `Int` | Mayor que 0. |
| `montoDescuentoUsd` | `Float?` | Obligatorio y mayor que 0 si `tipo = descuento`. |
| `productoId` | `Int?` → `Producto` | Obligatorio si `tipo = producto`. |
| `cantidad` | `Int?` | Entero mayor que 0, obligatorio si `tipo = producto`. |
| `activo` | `Boolean @default(true)` | Los premios se desactivan, no se borran. |
| `movimientos` | `Fidelidad[]` | Relación. |
| `createdAt`, `updatedAt` | `DateTime` | |

## Enums nuevos

```text
EstadoCuentaCliente   = vinculada | pendiente
OrigenMovimientoSaldo = sobrepago | pago_cuenta | pedido_cancelado | aplicacion_pedido | anulacion | ajuste
TipoPremio            = descuento | producto
TipoMovimiento        += devolucion | reversion | ajuste
MetodoPago            += SaldoAFavor
```

## Reglas puras y dónde viven

| Regla | Módulo | Requisitos |
|---|---|---|
| `esCorreoAdministrador(email, lista)`: falla cerrada | `lib/admin/auth-rules.ts` | FR-042 |
| `resolverVinculacion(...)` | `lib/cuenta-cliente-rules.ts` | FR-037, FR-038 |
| `consultarDeudaCliente`, `evaluarCredito` | `lib/admin/abonos.ts` | FR-007, FR-009, FR-011 |
| `dividirAbono`, `repartirBs`, `calcularSaldoAFavor`, `validarAplicacionSaldo` | `lib/saldo-a-favor.ts` | FR-012 a FR-018 |
| `participaEnFidelidad`, `calcularPuntosGanados`, `validarCanjes`, `topeReversion` | `lib/fidelidad.ts` | FR-019 a FR-031 |
| `calculateSaleTotals(…, descuentoPuntosUsd)` | `lib/admin/sales-calculations.ts` | FR-027 |

## Migración de datos existentes

- Las acumulaciones antiguas de `Fidelidad` se conservan tal cual. Son positivas, así que el saldo de puntos de cada cliente no cambia.
- Ningún cliente recibe crédito ni saldo a favor inicial. Si hay saldos a favor anteriores al sistema, la administradora los registra como `ajuste` o `pago_cuenta`.
- `montoDescuentoPuntos = 0` en todos los pedidos existentes, así que sus totales no cambian.
- La deuda de cada cliente ya coincide con las cuentas por cobrar desde el primer día, porque se calcula con la misma función (FR-046).
