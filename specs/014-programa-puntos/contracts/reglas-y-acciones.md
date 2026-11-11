# Contrato: reglas puras, núcleos transaccionales y acciones

**Feature**: `014-programa-puntos` | **Datos**: [data-model.md](../data-model.md) | **Interfaz**: [ui.md](./ui.md)

Amplía el contrato de la spec 010 ([fidelidad.md](../../010-cuenta-cliente-fidelizacion/contracts/fidelidad.md)). Lo que no aparece aquí no cambia.

## 1. Reglas puras de `lib/fidelidad.ts`

Sin `@/` ni `server-only`: se prueban con `node:test` y `BeneficiosCliente` las usa en el navegador.

### `validarCanjes` (ampliada)

```ts
validarCanjes({ premios, puntosDisponibles, subtotalUsd, descuentoUsd, montoDeliveryUsd })
  → { descuentoPuntosUsd, descuentoDeliveryUsd, costoTotal, lineasGratis }
```

`montoDeliveryUsd` es el delivery del pedido que **aún no cubre** ningún premio (0 en retiro en tienda y en ventas manuales).

Comprobaciones, en este orden. La primera que falla lanza un `Error` con el mensaje indicado:

| # | Regla | Mensaje |
|---|---|---|
| 1 | Cada premio está `activo`. | `El premio {nombre} no está disponible.` (sin cambios) |
| 2 | La suma acumulada de `costoPuntos` ≤ `puntosDisponibles`. | `No tienes puntos suficientes para {nombre}.` (sin cambios) |
| 3 | Como máximo un premio de tipo `delivery`. | `Un pedido admite un solo premio de delivery gratis.` |
| 4 | Un premio `delivery` exige `montoDeliveryUsd > 0`. | `{nombre} solo aplica a pedidos con delivery.` |
| 5 | Σ `montoDescuentoUsd` ≤ `subtotalUsd − descuentoUsd`. | `El descuento del premio supera el monto del pedido.` (sin cambios) |
| 6 | Para cada premio con `compraMinimaUsd`: `subtotalUsd − descuentoUsd − descuentoPuntosUsd ≥ compraMinimaUsd`, comparado en centavos. | `Agrega USD {faltante} más en productos para usar {nombre}.` (`faltante` con coma y 2 decimales) |

Resultado:

- `descuentoPuntosUsd`: Σ de los premios `descuento` (sin cambios).
- `descuentoDeliveryUsd`: `roundMoney(montoDeliveryUsd)` si hay un premio `delivery`; si no, 0.
- `costoTotal` y `lineasGratis`: sin cambios.

Casos de prueba (`tests/admin/fidelidad.test.ts`):

| # | Entrada | Esperado |
|---|---|---|
| V1 | Delivery (100 pts), 120 puntos, subtotal 20, delivery 4 | `descuentoDeliveryUsd: 4`, `descuentoPuntosUsd: 0`, `costoTotal: 100` |
| V2 | Igual, con `montoDeliveryUsd: 0` | Error 4 |
| V3 | Dos premios de delivery, puntos de sobra | Error 3 |
| V4 | Delivery con compra mínima 15, subtotal 12 | Error 6 con `USD 3,00` |
| V5 | Compra mínima 15, subtotal 15 exacto | Válido |
| V6 | Delivery con compra mínima 15, subtotal 18 y un premio de descuento de USD 5 | Error 6 con `USD 2,00` (la base ya descuenta el otro premio), sin importar el orden de `premios` |
| V7 | Producto con compra mínima 10, subtotal 12, `descuentoUsd: 3` | Error 6 con `USD 1,00` |
| V8 | Delivery + descuento USD 5 + producto, subtotal 30, delivery 6, puntos de sobra | `descuentoPuntosUsd: 5`, `descuentoDeliveryUsd: 6`, una línea gratis |
| V9 | Los casos existentes con `montoDeliveryUsd: 0` | Sin cambios |

### `filtrarCanjesValidos` (nueva)

```ts
filtrarCanjesValidos(premiosElegidos, contexto) → PremioParaCanje[]
```

Recorre `premiosElegidos` en orden y conserva cada premio solo si el conjunto conservado más ese premio pasa `validarCanjes` con `contexto` (los mismos datos menos `premios`). No lanza.

| # | Entrada | Esperado |
|---|---|---|
| F1 | Selección válida | La misma lista |
| F2 | Delivery elegido y `montoDeliveryUsd` pasa a 0 | Sin el premio de delivery; los demás se conservan |
| F3 | Dos premios y los puntos solo alcanzan para el primero | Solo el primero |
| F4 | Lista vacía | Lista vacía |

### `costoSugeridoPremio` (nueva)

```ts
costoSugeridoPremio({ precioDetalUsd, cantidad }) → number
// max(10, Math.round((PROGRAMA_PUNTOS.puntosPorUsdDePremio * precioDetalUsd * cantidad) / 10) * 10)
```

| # | Entrada | Esperado |
|---|---|---|
| C1 | 7,00 × 1 | 140 |
| C2 | 6,50 × 2 | 260 |
| C3 | 12,00 × 1 | 240 |
| C4 | 7,25 × 1 (145) | 150 |
| C5 | 0,20 × 1 (4) | 10 |
| C6 | Precio 0, negativo o no finito | 10 |

### `estadoPremio` y `premioMasCercano` (nuevas)

```ts
estadoPremio({ costoPuntos, puntosDisponibles, sinExistencia })
  → { tipo: "sin_existencia" } | { tipo: "canjeable" } | { tipo: "faltan"; faltan: number }
premioMasCercano(premios: Array<{ nombre; costoPuntos }>, puntosDisponibles)
  → { nombre; faltan } | null
```

- `estadoPremio`: `sin_existencia` tiene prioridad; luego `canjeable` si `costoPuntos ≤ puntosDisponibles`; si no, `faltan`.
- `premioMasCercano`: el de menor `costoPuntos` entre los que cuestan más que `puntosDisponibles`; `null` si no hay ninguno. Quien la llama le pasa los premios activos que no están sin existencia.

| # | Entrada | Esperado |
|---|---|---|
| E1 | 160 puntos, costos 100, 140 y 240 | `canjeable`, `canjeable`, `faltan: 80`; el más cercano es el de 240 con `faltan: 80` |
| E2 | 25 puntos, costos 100 y 140 | El más cercano es el de 100, `faltan: 75` |
| E3 | 500 puntos, costos 100 y 140 | `premioMasCercano` → `null` |
| E4 | `sinExistencia: true` con puntos de sobra | `sin_existencia` |
| E5 | Sin premios | `null` |

### `describirRecompensa` (nueva)

```ts
describirRecompensa({ tipo, montoDescuentoUsd, cantidad, productoNombre }) → string
```

| Tipo | Texto |
|---|---|
| `descuento` | `USD 5,00 de descuento` |
| `producto` | `2 × Salsa pomodoro` (`producto` si falta el nombre) |
| `delivery` | `El delivery del pedido` |

Sustituye los ternarios de `rewardsTable.tsx`, `app/admin/transactions/[id]/page.tsx` y `beneficiosCliente.tsx`, y la usa "Mis puntos".

### `PROGRAMA_PUNTOS`

Ver [data-model.md](../data-model.md). Único origen de 25, 20, 100 y 15.

## 2. Reglas puras de `lib/admin/points-core.ts` (nuevo)

Sin `@/`. Importa `fechaHoraLocalCaracas` e `interpretarFechaHoraCaracas` de `../format.ts` y `normalizeSearchName` de `../client-rules.ts`.

```ts
type GrupoPuntos = { clienteId: number; tipoMovimiento: TipoMovimiento; puntos: number; ultimaFecha: Date };
type ClientePuntos = { id: number; nombre: string; apellido: string; tipoCliente: TipoCliente; celular: string | null; nombreBusqueda: string };
type OrdenPuntos = "disponibles" | "ganados" | "canjeados" | "reciente";

clasificarPuntos(grupos: Array<{ tipoMovimiento; puntos }>) → { ganados; canjeados; ajustes }
resumirPuntosPorCliente(grupos: GrupoPuntos[], clientes: ClientePuntos[]) → FilaPuntos[]
filtrarFilasPuntos(filas, texto) → FilaPuntos[]
ordenarFilasPuntos(filas, orden) → FilaPuntos[]
indicadoresPuntos({ filas, gruposDelMes, costoMinimoPremio }) → IndicadoresPuntos
inicioMesCaracas(ahora: Date) → Date
leerOrdenPuntos(valor: string | undefined) → OrdenPuntos
```

Reglas:

- **`clasificarPuntos`**: `ganados` = Σ `acumulacion` + `bono` + `reversion`; `canjeados` = −Σ (`redencion` + `devolucion`); `ajustes` = Σ `ajuste`. La usan la tabla y los indicadores del mes.
- **`resumirPuntosPorCliente`**: una fila por `clienteId` presente en `grupos`; `disponibles = ganados − canjeados + ajustes`; `ultimoMovimiento` = la mayor `ultimaFecha`. Un grupo cuyo cliente no está en `clientes` se omite.
- **`filtrarFilasPuntos`**: texto vacío devuelve todo. Si no, cada palabra de `normalizeSearchName(texto)` debe estar en `nombreBusqueda`; o bien, si el texto tiene 3 dígitos o más, sus dígitos deben estar contenidos en los dígitos de `celular`.
- **`ordenarFilasPuntos`**: descendente por la columna elegida (`reciente` = `ultimoMovimiento`); desempate por `nombre` ascendente. No modifica el arreglo recibido.
- **`indicadoresPuntos`**: ver [data-model.md](../data-model.md). Se calcula sobre todas las filas, antes de filtrar.
- **`inicioMesCaracas`**: las 00:00 de Caracas del día 1 del mes de `ahora`.
- **`leerOrdenPuntos`**: cualquier valor desconocido devuelve `"disponibles"`.

Casos de prueba (`tests/admin/points-core.test.ts`, nuevo):

| # | Caso | Esperado |
|---|---|---|
| P1 | `acumulacion` +320, `reversion` −20, `redencion` −150, `ajuste` +10 | Ganados 300, Canjeados 150, Ajustes 10, Disponibles 160 (US1-2) |
| P2 | `redencion` −150 y `devolucion` +150 | Canjeados 0 |
| P3 | `bono` +25 y `acumulacion` +30 | Ganados 55 |
| P4 | Varios clientes con tipos mezclados | En todas las filas `disponibles === ganados − canjeados + ajustes` |
| P5 | Movimientos que suman 0 | La fila aparece con Disponibles 0 |
| P6 | Grupo de un cliente ausente en `clientes` | Se omite sin error |
| P7 | `ultimoMovimiento` con tres fechas | La mayor |
| P8 | Buscar `maria perez` con el cliente "María Pérez" | Coincide |
| P9 | Buscar `555 12` y `999` contra el celular `0412-5551234` | El primero coincide (dígitos `55512`); el segundo no |
| P10 | Buscar `ab` (sin dígitos suficientes, sin nombre) | Sin resultados |
| P11 | Orden por cada columna, con empate | Descendente; el empate por nombre |
| P12 | Indicadores con premios desde 100: filas con 160, 99 y 0 | `enCirculacion: 259`, `clientesConPuntos: 2`, `puedenCanjear: 1` |
| P13 | Indicadores sin premios activos (`costoMinimoPremio: null`) | `puedenCanjear: 0` |
| P14 | Grupos del mes: `acumulacion` +80, `bono` +25, `redencion` −100, `devolucion` +100 | `ganadosMes: 105`, `canjeadosMes: 0` |
| P15 | `inicioMesCaracas` con `2026-11-01T02:00:00Z` (31 de octubre, 22:00 en Caracas) | `2026-10-01T04:00:00Z` |
| P16 | `inicioMesCaracas` con `2026-11-01T04:00:00Z` | `2026-11-01T04:00:00Z` |
| P17 | `leerOrdenPuntos("xyz")` y `undefined` | `"disponibles"` |

## 3. Regla del total: `recalcularTotalPedido` (`lib/admin/sales-calculations.ts`)

```ts
recalcularTotalPedido({ lineasCobradas, descuento, tasaCambio, descuentoPuntosUsd, montoDeliveryUsd, descuentoDeliveryUsd })
// totalUsd = roundMoney(base.totalUsd + montoDeliveryUsd − descuentoDeliveryUsd)
```

`descuentoDeliveryUsd` es **obligatorio**. Las tres llamadas pasan `pedido.montoDescuentoDelivery`:

- `editarPedidoEnTx` (`lib/admin/order-edit.ts`);
- `actualizarDescuentoVenta` y `guardarEdicionMasivaVentas` (`lib/actions/admin-sales.ts`).

Casos añadidos a `tests/admin/sales-calculations.test.ts`:

| # | Caso | Esperado |
|---|---|---|
| T1 | Líneas por 20, delivery 4, `descuentoDeliveryUsd: 4` | Total 20 |
| T2 | Igual, con descuento del 10% | Total 18 (el descuento no toca el delivery) |
| T3 | `descuentoDeliveryUsd: 0` | Igual que hoy |

`calculateCheckoutTotals` (`lib/checkout-rules.ts`) no cambia: el checkout le pasa como descuento `descuentoPuntosUsd + descuentoDeliveryUsd`.

## 4. Núcleos transaccionales

### `prepararCanjes` y `canjearPremios` (`lib/fidelidad.ts`)

Ambas reciben `montoDeliveryUsd` en su entrada y lo pasan a `validarCanjes`. `prepararCanjes` devuelve además `descuentoDeliveryUsd`; `canjearPremios` devuelve `{ descuentoPuntosUsd, descuentoDeliveryUsd, costoTotal }`.

Un premio `delivery` solo crea su movimiento `redencion`: no agrega líneas ni toca inventario. Quien llama escribe `montoDescuentoDelivery` y el total.

### `acreditarBonoBienvenida(tx, clienteId)` (`lib/fidelidad.ts`, nueva)

1. `bloquearCliente(tx, clienteId)`.
2. Lee `tipoCliente`. Si no es `detal`, devuelve 0.
3. Si existe una `Fidelidad` con ese `clienteId` y `tipoMovimiento: "bono"`, devuelve 0.
4. Crea `{ clienteId, tipoMovimiento: "bono", puntos: PROGRAMA_PUNTOS.puntosBienvenida, descripcion: "Bono de bienvenida" }` y devuelve los puntos.

La llaman, dentro de su transacción y después de dejar la cuenta en `vinculada`:

| Lugar | Archivo | Cambio |
|---|---|---|
| Vínculo automático por correo verificado | `lib/cuenta-cliente.ts`, `obtenerSesionCliente` | La creación de `CuentaCliente` pasa a un `prisma.$transaction` junto con el bono. El `catch` de `P2002` y la relectura se conservan. |
| Registro que vincula o crea el cliente | `lib/actions/cuenta-cliente.ts`, `completarRegistroCliente` | Se llama cuando `estado` queda `vinculada`; no cuando queda `pendiente`. Mensaje de éxito: `¡Listo! Te regalamos 25 puntos de bienvenida.` si se acreditó; el actual si no. |
| Confirmación de la administradora | `lib/actions/admin-clients.ts`, `confirmarVinculacionCuenta` | Se llama tras el `update`. Mensaje: `Cuenta vinculada. Se acreditaron 25 puntos de bienvenida.` si se acreditó. |

`desvincularCuenta` no cambia: el bono es del cliente.

### `registrarCompraWeb` (`lib/checkout-core.ts`)

1. `prepararCanjes(tx, { ..., montoDeliveryUsd: montoDelivery })`.
2. `calculateCheckoutTotals(lineas, montoDelivery, canjes.descuentoPuntosUsd + canjes.descuentoDeliveryUsd)`.
3. `transaccion.create` añade `montoDescuentoDelivery: canjes.descuentoDeliveryUsd`.
4. `canjearPremios(...)` recibe el mismo `montoDeliveryUsd`.

Lo demás (bloqueos, saldo a favor, pago declarado, idempotencia, códigos de error) no cambia. Un canje que no cumple una condición sigue respondiendo `BENEFITS_CHANGED` con el mensaje genérico actual, y el paso de pago recarga los beneficios.

### `canjearPremioEnPedido` (`lib/admin/canje-pedido.ts`)

1. Tras bloquear y leer el pedido, lee el premio. Si es `delivery` y `pedido.montoDescuentoDelivery > 0`: `Este pedido ya tiene el delivery cubierto por un premio.`
2. Llama a `canjearPremios` con `montoDeliveryUsd: roundMoney(pedido.montoDelivery − pedido.montoDescuentoDelivery)`.
3. `totalUsd = roundMoney(pedido.montoTotal − descuentoPuntosUsd − descuentoDeliveryUsd)`; `validarTotalContraAbonado` como hoy.
4. Actualiza `montoDescuentoPuntos`, `montoDescuentoDelivery` y `montoTotal`.
5. La condición de "queda saldado" pasa de `descuentoPuntosUsd > 0` a `descuentoPuntosUsd + descuentoDeliveryUsd > 0`.

### `registrarVentaManualEnTx` (`lib/admin/manual-sale.ts`)

Pasa `montoDeliveryUsd: 0` a `prepararCanjes` y `canjearPremios`. La compra mínima se valida ahí mismo; un premio `delivery` se rechaza con el mensaje 4.

### `cargarPedidoEditable` y `editarPedidoEnTx` (`lib/admin/order-edit.ts`)

- `PedidoEditable.descuentoDeliveryUsd = pedido.montoDescuentoDelivery`.
- `recalcularTotalPedido` recibe `descuentoDeliveryUsd: pedido.montoDescuentoDelivery`.
- `transaccion.update` no escribe `montoDescuentoDelivery` (igual que hoy no escribe `montoDelivery` ni `montoDescuentoPuntos`).

## 5. Pruebas de integración

En las suites existentes, contra la base aislada.

**`tests/checkout/checkout.integration.test.ts`**

| # | Caso | Esperado |
|---|---|---|
| I1 | Cliente con 120 puntos, carrito de USD 20, delivery a una zona de USD 4, canjea "Delivery gratis" (100 pts, mínimo 15) y declara un pago de USD 20 | Pedido con `montoDelivery: 4`, `montoDescuentoDelivery: 4`, `montoDescuentoPuntos: 0`, `montoTotal: 20`; una `redencion` de −100; saldo de puntos 20 |
| I2 | El pedido de I1 pasa a `pagado` | `acumulacion` de +20 (los productos) |
| I3 | Mismo canje con `tipodeRetiro: "recogida"` | `BENEFITS_CHANGED`; sin pedido, sin movimientos de puntos, inventario intacto |
| I4 | Carrito de USD 12 con el mismo premio | `BENEFITS_CHANGED`; nada escrito |
| I5 | Dos premios de delivery en `premioIds` | `BENEFITS_CHANGED`; nada escrito |
| I6 | Delivery gratis + premio de descuento de USD 5 + USD 3 de saldo a favor, carrito de USD 30, delivery de USD 4 | `montoTotal: 25`; queda por pagar 22; puntos y saldo descontados |

**`tests/admin/fidelidad.integration.test.ts`**

| # | Caso | Esperado |
|---|---|---|
| I7 | `canjearPremioEnPedido` con delivery gratis en un pedido `por_cobrar` con delivery de USD 4 | Total baja 4; `montoDescuentoDelivery: 4`; evento en el historial |
| I8 | Segundo canje de delivery en el mismo pedido | `Este pedido ya tiene el delivery cubierto por un premio.`; nada cambia |
| I9 | Canje de delivery en un pedido sin delivery | Error 4; nada cambia |
| I10 | Cancelar el pedido de I7 | `devolucion` de +100; el cliente recupera los puntos |
| I11 | `acreditarBonoBienvenida` dos veces para un consumidor | Primera: 25; segunda: 0; un solo movimiento `bono` |
| I12 | `acreditarBonoBienvenida` para un mayorista | 0; sin movimiento |
| I13 | Venta manual con un premio con compra mínima no cumplida | Error 6; sin venta ni movimientos |

**`tests/admin/order-edit.integration.test.ts`**

| # | Caso | Esperado |
|---|---|---|
| I14 | Editar la cantidad de una línea en un pedido con delivery gratis (delivery 4) | `montoTotal` = productos nuevos; `montoDelivery` y `montoDescuentoDelivery` siguen en 4 |

**`tests/admin/admin-clients.integration.test.ts`**

| # | Caso | Esperado |
|---|---|---|
| I15 | Confirmar una cuenta `pendiente` de un consumidor, desvincularla y repetir el ciclo con una cuenta nueva | Un solo movimiento `bono` |

Si la acción `confirmarVinculacionCuenta` no se puede invocar desde la suite por `requireAdmin`, I15 se prueba sobre la secuencia de escrituras con `acreditarBonoBienvenida`, como hacen hoy las pruebas de esa suite con otras acciones.

## 6. Lecturas

### `consultarPuntosClientes({ q, orden, ahora })` (`lib/admin/points.ts`, nuevo)

En paralelo:

1. `prisma.fidelidad.groupBy({ by: ["clienteId", "tipoMovimiento"], _sum: { puntos: true }, _max: { fecha: true } })`
2. `prisma.fidelidad.groupBy({ by: ["tipoMovimiento"], where: { fecha: { gte: inicioMesCaracas(ahora) } }, _sum: { puntos: true } })`
3. `prisma.premio.aggregate({ where: { activo: true }, _min: { costoPuntos: true } })`

Luego `prisma.cliente.findMany` con los `clienteId` del primer resultado (`id`, `nombre`, `apellido`, `tipoCliente`, `celular`, `nombreBusqueda`).

Devuelve `{ filas, total, indicadores }`: `indicadores` y `total` sobre todas las filas; `filas` ya filtradas y ordenadas.

### `obtenerMisPuntos(clienteId)` (`lib/cuenta-cliente.ts`)

En paralelo: cliente (`nombre`, `apellido`, `tipoCliente`), suma de puntos, los 50 movimientos más recientes (`fecha`, `puntos`, `tipoMovimiento`, `descripcion`, `transaccion.numeroOrden`) y los premios activos por costo con `producto { nombre, inventario }`.

- `sinExistencia` = el premio es `producto` y `unidadesDisponibles(inventario) < cantidad`.
- `condiciones`: `Compra mínima de USD 15,00 en productos` si tiene `compraMinimaUsd`; `Solo en pedidos con delivery` si es `delivery`.
- `concepto` de cada movimiento: `descripcion` si existe; si no, la etiqueta del tipo (`Puntos ganados`, `Canje`, `Devolución de puntos`, `Puntos revertidos`, `Ajuste`, `Bono de bienvenida`). Nunca `motivo`, `actorId` ni `actorEmail`.

`obtenerResumenCuenta` pierde `premios` y `puntos.movimientos`; conserva `puntos.disponibles` y `puntos.mostrar`.

### `obtenerBeneficiosCheckout()` (`lib/actions/cuenta-cliente.ts`)

Cada premio añade `compraMinimaUsd` y `activo: true`, y `tipo` admite `delivery`, de modo que el arreglo sirve directamente como `PremioParaCanje[]` para `validarCanjes`.

## 7. Acciones de premios (`lib/actions/admin-fidelidad.ts`)

`premioSchema`:

| Campo | Cambio |
|---|---|
| `tipo` | `z.enum(["descuento", "producto", "delivery"])` |
| `compraMinimaUsd` | **Nuevo**, opcional: `> 0`, máximo 2 decimales. Mensajes: `La compra mínima debe ser mayor que cero.` y `La compra mínima admite como máximo 2 decimales.` Vacío = sin compra mínima. |

`datosDelPremio` por tipo: `descuento` guarda `montoDescuentoUsd`; `producto` guarda `productoId` y `cantidad`; `delivery` deja los tres en `null`. Los tres guardan `compraMinimaUsd ?? null`.

`revalidarFidelidad` añade `/admin/points` y `/mi-cuenta/puntos`.

No hay acciones nuevas: la sección "Puntos" y "Mis puntos" son de solo lectura (FR-007).

## 8. Autorización

| Superficie | Regla |
|---|---|
| `/admin/points` | `requireAdmin()` en la página, además del layout del panel (FR-001, SC-010). |
| `/mi-cuenta/puntos` | `obtenerSesionCliente()`; solo `vinculada` ve datos, y el `clienteId` sale de la sesión (FR-014). No acepta ningún identificador por URL. |
| Bono | Solo se acredita desde código de servidor en los tres puntos de vinculación; no hay acción que el navegador pueda invocar para pedirlo. |
