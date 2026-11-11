# Data Model: programa de puntos

**Fecha**: 2026-11-11 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Cambios de esquema

Dos valores de enum y dos columnas. Ninguna tabla nueva.

| Modelo o enum | Cambio | Notas |
|---|---|---|
| `enum TipoPremio` | + `delivery` | Queda `descuento`, `producto`, `delivery`. |
| `enum TipoMovimiento` | + `bono` | Queda `acumulacion`, `redencion`, `devolucion`, `reversion`, `ajuste`, `bono`. |
| `Premio` | + `compraMinimaUsd Float?` | `null` = sin compra mínima. Mayor que 0, 2 decimales. |
| `Transaccion` | + `montoDescuentoDelivery Float @default(0)` | Delivery cubierto por un premio. Entre 0 y `montoDelivery`. |

### Migraciones

1. **`programa_puntos`** (esquema): la genera `npx prisma migrate dev --name programa_puntos`. Las filas existentes quedan con `compraMinimaUsd = null` y `montoDescuentoDelivery = 0`, así que ningún total ni premio cambia (FR-035).
2. **`bono_bienvenida_inicial`** (datos): se crea con `npx prisma migrate dev --create-only --name bono_bienvenida_inicial` y contiene solo esto:

   ```sql
   -- Bono de bienvenida para los consumidores que ya tenían su cuenta vinculada (spec 014, FR-034).
   INSERT INTO "Fidelidad" ("clienteId", "tipoMovimiento", "puntos", "descripcion")
   SELECT c."id", 'bono'::"TipoMovimiento", 25, 'Bono de bienvenida'
   FROM "Cliente" c
   JOIN "CuentaCliente" cc ON cc."clienteId" = c."id"
   WHERE c."tipoCliente" = 'detal'
     AND cc."estado" = 'vinculada'
     AND NOT EXISTS (
       SELECT 1 FROM "Fidelidad" f WHERE f."clienteId" = c."id" AND f."tipoMovimiento" = 'bono'
     );
   ```

   Va aparte porque PostgreSQL no deja usar un valor de enum en la misma transacción que lo crea ([research.md](./research.md), Decisión 5).

Después: `npx prisma generate`.

## Entidades y reglas

### `Premio`

| Campo | `descuento` | `producto` | `delivery` |
|---|---|---|---|
| `nombre`, `descripcion`, `costoPuntos`, `activo` | sí | sí | sí |
| `montoDescuentoUsd` | obligatorio (> 0) | `null` | `null` |
| `productoId`, `cantidad` | `null` | obligatorios | `null` |
| `compraMinimaUsd` | opcional | opcional | opcional (sugerido: 15) |

- El monto de un premio `delivery` no se guarda en el premio: es el delivery del pedido en el que se canjea.
- Cambiar el costo, la compra mínima o el estado de un premio no altera los canjes ya hechos (FR-030, US4-4).

### `Transaccion`

Regla del total, única para todo pedido:

```text
montoTotal = montoSubtotal + montoDelivery − montoDescuento − montoDescuentoPuntos − montoDescuentoDelivery
```

| Campo | Qué guarda | Quién lo escribe |
|---|---|---|
| `montoDelivery` | Costo real del envío (copia de `ZonaDelivery.costoUsd` al comprar). | Checkout. No cambia con el canje. |
| `montoDescuentoPuntos` | Descuento sobre productos por premios de descuento. | Checkout, venta manual y canje en el pedido. Sin cambios. |
| `montoDescuentoDelivery` (**nuevo**) | Delivery cubierto por un premio. `0` o igual a `montoDelivery`. | Checkout y canje en el pedido. |

Invariantes:

- `0 ≤ montoDescuentoDelivery ≤ montoDelivery`.
- `montoDescuentoDelivery > 0` solo si el pedido tiene un movimiento `redencion` de un premio `delivery`.
- Los puntos que gana el pedido no dependen de `montoDescuentoDelivery`: `calcularPuntosGanados` sigue usando `montoSubtotal − montoDescuento − montoDescuentoPuntos` (FR-021).
- Editar el pedido (spec 012) no toca `montoDelivery`, `montoDescuentoPuntos` ni `montoDescuentoDelivery`; `recalcularTotalPedido` los incluye en el total nuevo.
- Cancelar el pedido no modifica estos montos; los puntos del canje vuelven con un movimiento `devolucion` (FR-023).

### `Fidelidad` (movimiento de puntos)

Sin columnas nuevas. Movimientos que crea esta función:

| Caso | `tipoMovimiento` | `puntos` | `transaccionId` | `premioId` | `descripcion` | Actor |
|---|---|---|---|---|---|---|
| Bono de bienvenida | `bono` | +25 | `null` | `null` | "Bono de bienvenida" | `null` |
| Canje de delivery gratis | `redencion` | −`costoPuntos` | el pedido | el premio | nombre del premio | `null` en la tienda; la administradora en el panel |

Invariantes:

- Como máximo un movimiento `bono` por cliente, para siempre (FR-033). Se garantiza comprobando bajo `bloquearCliente`.
- Solo los clientes `detal` reciben `bono` (FR-032, FR-034).
- El saldo (suma de `puntos`) nunca es negativo (FR-036); las reglas existentes ya lo garantizan.

## Modelos de vista (TypeScript, sin persistencia)

### `FilaPuntos` (`lib/admin/points-core.ts`)

Una fila de la sección "Puntos" del panel. Se calcula desde los movimientos; no se guarda.

| Campo | Tipo | Cálculo |
|---|---|---|
| `clienteId` | `number` | |
| `nombre` | `string` | `nombre apellido`. |
| `tipoCliente` | `"detal" \| "mayorista"` | Tipo actual del cliente. |
| `celular` | `string \| null` | Para la búsqueda. |
| `nombreBusqueda` | `string` | Ya normalizado en la base de datos. |
| `ganados` | `number` | Σ `acumulacion` + `bono` + `reversion`. |
| `canjeados` | `number` | −Σ (`redencion` + `devolucion`). |
| `ajustes` | `number` | Σ `ajuste`, con signo. |
| `disponibles` | `number` | `ganados − canjeados + ajustes` = Σ de todos los movimientos. |
| `ultimoMovimiento` | `Date` | Fecha máxima entre sus movimientos. |

### `IndicadoresPuntos` (`lib/admin/points-core.ts`)

| Campo | Cálculo |
|---|---|
| `enCirculacion` | Σ `disponibles` de todas las filas (sin filtrar por la búsqueda). |
| `clientesConPuntos` | Filas con `disponibles > 0`. |
| `puedenCanjear` | Filas con `disponibles ≥` costo del premio activo más barato; 0 si no hay premios activos. |
| `ganadosMes`, `canjeadosMes` | Misma clasificación que la tabla, solo con movimientos desde las 00:00 de Caracas del día 1 del mes en curso. |

### `MisPuntos` (`lib/cuenta-cliente.ts`)

Lo que recibe la vista "Mis puntos". Solo se construye con el `clienteId` de la sesión.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | `string` | |
| `mostrar` | `boolean` | `tipoCliente === "detal" \|\| disponibles > 0` (FR-015). |
| `acumula` | `boolean` | `tipoCliente === "detal"`. Si es `false`, la vista avisa que ya no suma puntos. |
| `disponibles` | `number` | |
| `proximo` | `{ nombre, faltan } \| null` | El premio activo más barato que aún no alcanza. |
| `premios` | `Array<{ id, nombre, descripcion, costoPuntos, recompensa, condiciones: string[], estado }>` | `estado`: `{ tipo: "canjeable" }`, `{ tipo: "faltan", faltan }` o `{ tipo: "sin_existencia" }`. Ordenados por costo. |
| `movimientos` | `Array<{ fecha, puntos, concepto, numeroOrden }>` | Los 50 más recientes. Sin autor ni motivo (FR-012). |

### `PremioParaCanje` (`lib/fidelidad.ts`, ampliado)

| Campo | Cambio |
|---|---|
| `tipo` | Acepta `delivery` (viene de `TipoPremio`). |
| `compraMinimaUsd` | **Nuevo**: `number \| null`. |

### `PedidoEditable` (`lib/admin/order-edit-rules.ts`, ampliado)

| Campo | Cambio |
|---|---|
| `descuentoDeliveryUsd` | **Nuevo**: `number`, solo lectura. El formulario lo resta en la vista previa del total y lo muestra como "Delivery gratis (premio)". |

### `SeleccionBeneficios` (`components/finalizar-compra/beneficiosCliente.tsx`)

| Campo | Cambio |
|---|---|
| `descuentoPuntosUsd` → `descuentoPremiosUsd` | Renombrado: ahora suma el descuento sobre productos y el delivery cubierto. |

## Constantes del programa (`lib/fidelidad.ts`)

```ts
export const PROGRAMA_PUNTOS = {
  puntosBienvenida: 25,
  puntosPorUsdDePremio: 20,
  costoDeliveryGratis: 100,
  compraMinimaDeliveryUsd: 15,
} as const;
```

Son los valores de la "Tabla de puntos" de la especificación. La acumulación (1 punto por USD) ya está en `calcularPuntosGanados` y no cambia (FR-027).
