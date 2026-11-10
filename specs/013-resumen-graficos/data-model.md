# Modelo de datos: rediseño de la pestaña Resumen

**Spec**: [spec.md](./spec.md) | **Contratos**: [datos](./contracts/datos.md) · [ui](./contracts/ui.md)

## Esquema

**Sin cambios.** No hay modelos, columnas, índices ni migraciones nuevas. La función solo lee.

## Entidades que se leen

| Entidad | Campos usados | Para qué |
|---|---|---|
| `Transaccion` | `fechaCompra`, `montoTotal`, `estado` | Ventas por mes, ventas por tipo de cliente e indicador de ventas. Filtro: `estado ≠ cancelado`. Índice existente: `[fechaCompra, estado]`. |
| `Cliente` | `tipoCliente` (`detal` / `mayorista`) | Clasifica cada venta. `detal` se muestra como "Consumidores". |
| `DetalleCompra` | `productoId`, `cantidad`, `precioUnitario` | Top 5 de productos (líneas de pedidos no cancelados de los últimos 30 días). |
| `Producto` | `nombre`; `inventario` (conteo de alertas, como hoy) | Nombre en el top 5. |
| `NotaEntrega` | `fechaEntrega` (conteo, como hoy) | Texto de apoyo del indicador de mayoristas. |
| Visitas (Vercel) | `timestamp`, `visitors`, `pageviews` por día; totales del período | Gráfico de visitas. No se guardan. |

## Modelos de lectura (derivados, no persistidos)

Los tipos exactos están en [contracts/datos.md](./contracts/datos.md).

### `VentasMes`: una barra del gráfico 1

| Campo | Regla |
|---|---|
| `mes` | Clave `YYYY-MM` del mes en hora de Caracas. |
| `etiqueta`, `etiquetaCorta` | "noviembre de 2026" y "nov". |
| `totalUsd` | Suma de `montoTotal` de las ventas del mes, redondeada a 2 decimales (FR-011). |
| `cantidadVentas` | Número de ventas del mes. |
| `ticketPromedioUsd` | `totalUsd ÷ cantidadVentas`; 0 si no hubo ventas (FR-012). |
| `enCurso` | `true` solo en el mes de hoy (FR-013). |

Siempre son 12 elementos en orden cronológico; un mes sin ventas aparece con ceros.

### `ProductoTop`: una fila del gráfico 2

| Campo | Regla |
|---|---|
| `productoId`, `nombre` | Del producto. |
| `cantidadVendida` | Suma de `cantidad` de sus líneas, redondeada a 2 decimales. |
| `totalUsd` | Suma de `precioUnitario × cantidad` de sus líneas (FR-015). |

Como máximo 5 elementos, ordenados por `cantidadVendida` descendente; ante un empate, por `totalUsd` descendente (FR-014). Una línea a precio 0 (premio) suma unidades y no suma monto.

### `VentasTipoCliente`: un grupo del gráfico 4

| Campo | Regla |
|---|---|
| `tipoCliente`, `etiqueta` | `detal` → "Consumidores"; `mayorista` → "Mayoristas". |
| `cantidadVentas`, `totalUsd` | Ventas del grupo en los últimos 30 días. |
| `porcentajeDelMonto` | Parte del monto total; 0 si el total es 0 (FR-021). |
| `porcentajeDeVentas` | Parte de la cantidad de ventas; 0 si no hubo ventas. |

Siempre son 2 elementos, en el orden consumidores y luego mayoristas, aunque un grupo esté en cero.

### `IndicadoresResumen`: las cuatro tarjetas

`ventasUsd` y `ventasCantidad` son la suma de los dos grupos de `VentasTipoCliente` (FR-023). `pedidosAbiertos`, `alertasInventario`, `clientesMayoristas` y `notasEntrega` conservan su regla actual; `notasEntrega` cuenta desde el inicio de los 30 días en hora de Caracas.

### `VisitasDiarias`: el gráfico 3

| Campo | Regla |
|---|---|
| `status` | `ready`, `no_data`, `not_configured`, `unavailable`, `unauthorized` o `invalid` (los estados de `WebsiteVisitsStatus`). |
| `summary` | Totales de visitantes y páginas vistas del período, de `visits/count`; `null` si la consulta falló. |
| `serie` | Un elemento por cada día del período: `fecha` (`YYYY-MM-DD`, día de la fuente en UTC), `visitors` y `pageviews`. Los días que la fuente no devuelve se completan con 0. Vacía si la consulta falló. |
| `period`, `queriedAt`, `message` | Como en `WebsiteVisitsResult`. |

## Reglas de fechas

Todas parten de un único instante `ahora`, tomado una vez por petición.

| Ventana | Desde (incluido) | Hasta (excluido) |
|---|---|---|
| Últimos 30 días | 00:00 de Caracas de hace 29 días | 00:00 de Caracas de mañana |
| Últimos 12 meses | 00:00 de Caracas del día 1 del mes de hace 11 meses | 00:00 de Caracas de mañana |

- Un pedido se ubica en el mes de su `fechaCompra` leída en hora de Caracas: uno del 31 de octubre a las 9:00 p. m. cuenta en octubre (SC-003).
- Un pedido con fecha posterior a hoy no cuenta hasta que llega su día.
- Las visitas usan las mismas fechas de calendario (`since` y `until`) que la ventana de 30 días, pero la fuente corta cada día en UTC ([research.md](./research.md), Decisión 2).

## Qué es una venta

Un pedido con `estado ≠ cancelado` (`pagado`, `por_cobrar`, `en_pedido` o el histórico `pendiente`), registrado por la tienda, la venta manual o la carga de Excel (FR-006). Es la misma regla de las analíticas de ventas.

## Transiciones de estado

No aplica: la función no escribe.
