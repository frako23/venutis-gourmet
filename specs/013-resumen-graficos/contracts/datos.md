# Contrato de datos: pestaña Resumen

**Spec**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md) | **Decisiones**: [research.md](../research.md)

La función no expone Server Actions ni rutas nuevas. Este contrato describe las funciones de lectura que alimentan la página y la consulta externa de visitas.

## 1. Reglas puras: `lib/admin/dashboard-core.ts` (nuevo)

Sin `@/` ni acceso a datos, para probarlo con `node:test`. Importa de `../format.ts` y de `./visit-periods.ts`.

```ts
export type PedidoResumen = { fechaCompra: Date; montoTotal: number; tipoCliente: "detal" | "mayorista" };

export type VentanasResumen = {
  hoy: string;               // "YYYY-MM-DD" en Caracas
  meses: string[];           // 12 claves "YYYY-MM", de la más antigua al mes en curso
  desdeMeses: Date;          // 00:00 de Caracas del día 1 de meses[0]
  desde30Dias: Date;         // 00:00 de Caracas de hace 29 días
  hasta: Date;               // 00:00 de Caracas de mañana (excluido)
  periodo30Dias: VisitPeriod; // resolveVisitPeriod({ preset: "30d", reference: ahora })
};

export type VentasMes = { mes: string; etiqueta: string; etiquetaCorta: string; totalUsd: number; cantidadVentas: number; ticketPromedioUsd: number; enCurso: boolean };
export type VentasTipoCliente = { tipoCliente: "detal" | "mayorista"; etiqueta: "Consumidores" | "Mayoristas"; cantidadVentas: number; totalUsd: number; porcentajeDelMonto: number; porcentajeDeVentas: number };
export type ProductoTop = { productoId: number; nombre: string; cantidadVendida: number; totalUsd: number };

export function ventanasResumen(ahora: Date): VentanasResumen;
export function ventasPorMes(pedidos: PedidoResumen[], ventanas: VentanasResumen): VentasMes[];
export function ventasPorTipoCliente(pedidos: PedidoResumen[], ventanas: VentanasResumen): VentasTipoCliente[];
export function topProductos(porProducto: AnalyticsProductRow[], limite?: number): ProductoTop[]; // limite = 5
```

`ventasPorMes` y `ventasPorTipoCliente` reciben la misma lista (los pedidos de los 12 meses) y cada una aplica su ventana; no confían en que la lista venga filtrada.

### Casos que deben cubrir las pruebas (`tests/admin/dashboard-core.test.ts`)

| # | Función | Caso | Resultado esperado |
|---|---|---|---|
| 1 | `ventanasResumen` | `ahora` = 2026-11-10 15:00 de Caracas | `hoy` 2026-11-10; `meses` de 2025-12 a 2026-11; `periodo30Dias` del 2026-10-12 al 2026-11-10; `desde30Dias` = 2026-10-12T04:00Z; `hasta` = 2026-11-11T04:00Z |
| 2 | `ventanasResumen` | `ahora` = 2026-11-01T02:00Z (31 oct, 10:00 p. m. en Caracas) | `hoy` 2026-10-31; el último mes es 2026-10 |
| 3 | `ventanasResumen` | `ahora` en enero | Los 12 meses cruzan el año sin saltos ni repetidos |
| 4 | `ventasPorMes` | Pedido del 31 oct a las 9:00 p. m. de Caracas (2026-11-01T01:00Z) | Cuenta en 2026-10 (SC-003) |
| 5 | `ventasPorMes` | Un mes sin pedidos | Aparece con `totalUsd` 0, `cantidadVentas` 0 y `ticketPromedioUsd` 0 |
| 6 | `ventasPorMes` | 3 pedidos de 10, 20 y 30,50 en un mes | `totalUsd` 60,50; `cantidadVentas` 3; `ticketPromedioUsd` 20,17 |
| 7 | `ventasPorMes` | Lista vacía | 12 elementos en cero; solo el último con `enCurso` |
| 8 | `ventasPorMes` | Pedido con fecha de mañana, y otro anterior a `desdeMeses` | Ninguno cuenta |
| 9 | `ventasPorTipoCliente` | 7 ventas `detal` por 210 y 3 `mayorista` por 540, todas en los 30 días | Consumidores: 7, 210, 28 % del monto, 70 % de las ventas. Mayoristas: 3, 540, 72 %, 30 % |
| 10 | `ventasPorTipoCliente` | Solo ventas `detal` | Mayoristas aparece con ceros; consumidores con 100 % |
| 11 | `ventasPorTipoCliente` | Sin ventas en los 30 días (aunque haya de meses anteriores) | Dos grupos en cero; porcentajes en 0 |
| 12 | `ventasPorTipoCliente` | Pedido de hace 30 días (un día antes de `desde30Dias`) | No cuenta |
| 13 | Coherencia | Mismos pedidos en `ventasPorMes` y `ventasPorTipoCliente` | La suma de los grupos nunca supera la suma de los meses |
| 14 | `topProductos` | 6 productos con unidades distintas | Devuelve los 5 de más unidades, de mayor a menor |
| 15 | `topProductos` | Dos productos con las mismas unidades | Primero el de mayor `totalUsd` |
| 16 | `topProductos` | 3 productos; ninguno | Devuelve 3; devuelve lista vacía |
| 17 | `topProductos` | Producto con 2,5 unidades | Conserva los decimales |

## 2. Regla extraída: `resumirPorProducto` en `lib/admin/sales-calculations.ts`

```ts
export function resumirPorProducto(
  lines: Array<{ productoId: number; nombre: string; cantidad: number; precioUnitario: number }>,
  totalUsd: number,
): AnalyticsProductRow[]; // ordenado por totalUsd descendente, como hoy
```

Es el cálculo que hoy está escrito dentro de `consultarAnaliticas` (`lib/admin/analytics.ts`), que pasa a llamarla. La tabla "Venta por producto" no cambia.

Casos nuevos en `tests/admin/sales-calculations.test.ts`:

- dos líneas del mismo producto se suman en unidades y en monto;
- una línea a precio 0 suma unidades y no suma monto;
- `porcentajeDelTotal` es 0 cuando `totalUsd` es 0;
- el orden es por `totalUsd` descendente.

## 3. Lectura con acceso a datos: `lib/admin/dashboard.ts`

```ts
export type ResumenPanel = {
  periodo30Dias: VisitPeriod;
  mesActual: string; // "YYYY-MM", para el enlace a las analíticas
  indicadores: { ventasUsd: number; ventasCantidad: number; pedidosAbiertos: number; alertasInventario: number; clientesMayoristas: number; notasEntrega: number };
  ventasPorMes: VentasMes[];
  ventasPorTipoCliente: VentasTipoCliente[];
  topProductos: ProductoTop[];
};

export async function consultarResumen(ventanas: VentanasResumen): Promise<ResumenPanel>;
```

Reemplaza a `getDashboardSummary` y a `DashboardSummary`, que solo usa `app/admin/page.tsx`.

Consultas, todas en un `Promise.all` con el singleton `lib/prisma.ts`:

| Consulta | Filtro | Campos |
|---|---|---|
| Pedidos de 12 meses | `fechaCompra ≥ desdeMeses`, `< hasta`, `estado ≠ cancelado` | `fechaCompra`, `montoTotal`, `cliente.tipoCliente` |
| Líneas de 30 días | pedido con `fechaCompra ≥ desde30Dias`, `< hasta`, `estado ≠ cancelado` | `productoId`, `cantidad`, `precioUnitario`, `producto.nombre` |
| Pedidos abiertos | `estado` en `por_cobrar`, `en_pedido`, `pendiente` | conteo (sin cambios) |
| Alertas de inventario | `inventario ≤ 5` | conteo (sin cambios) |
| Clientes mayoristas | `tipoCliente = mayorista` | conteo (sin cambios) |
| Notas de entrega | `fechaEntrega ≥ desde30Dias` | conteo |

`indicadores.ventasUsd` y `ventasCantidad` se calculan sumando los dos grupos de `ventasPorTipoCliente`; no hay una consulta aparte (FR-023).

## 4. Visitas por día

### Consulta externa

`GET https://api.vercel.com/v1/query/web-analytics/visits/aggregate`

| Parámetro | Valor |
|---|---|
| `projectId`, `teamId` o `slug` | Como en las consultas existentes |
| `since`, `until` | `periodo30Dias.since` y `.until` (`YYYY-MM-DD`) |
| `by` | `day` |
| `limit` | `100` |
| `filter` | `environment eq 'production'` |

Fila esperada:

```json
{ "timestamp": "2026-11-10T00:00:00.000Z", "pageviews": 245, "visitors": 201 }
```

Los totales del período salen de `visits/count`, con la función existente `fetchVercelVisitCount`.

### Funciones

```ts
// lib/admin/types.ts
export type VisitDay = VisitMetric & { fecha: string }; // "YYYY-MM-DD", día de la fuente (UTC)
export type VisitasDiariasResult = {
  period: VisitPeriod;
  queriedAt: string;
  status: WebsiteVisitsStatus;
  summary: VisitMetric | null;
  serie: VisitDay[];
  message: string;
};

// lib/admin/vercel-web-analytics-core.ts
export function normalizeVisitSeries(data: unknown): VisitDay[] | null;
export async function fetchVercelVisitSeries(input: { period; config; fetcher? }): Promise<VisitDay[]>;

// lib/admin/website-visits-core.ts
export function completarSerieDiaria(period: { since: string; until: string }, filas: VisitDay[]): VisitDay[];
export async function consultarVisitasDiarias(input: { period: VisitPeriod; config?: VercelAnalyticsConfig | null; fetcher?: typeof fetch }): Promise<VisitasDiariasResult>;
```

`buildVercelAnalyticsUrl` acepta `day` además de las cuatro dimensiones actuales; con `day` envía `limit=100`.

### Reglas

- `consultarVisitasDiarias` **nunca lanza**: todo error se traduce a un `status`, con el mismo mapeo y los mismos mensajes (`messageForStatus`) de `consultarAnaliticasVisitas`.
- Hace dos lecturas en paralelo (`count` y la serie). Si cualquiera falla, el resultado completo es el estado de error, con `summary` `null` y `serie` vacía.
- `status` es `no_data` cuando los totales son 0 visitantes y 0 páginas vistas.
- `normalizeVisitSeries` acepta solo filas con `timestamp` de fecha válida y con `pageviews` y `visitors` enteros no negativos; toma `fecha` de los 10 primeros caracteres del `timestamp` (UTC). Descarta las demás, incluida una posible fila "Others". No lee ningún otro campo.
- `completarSerieDiaria` devuelve un elemento por cada día entre `since` y `until`, en orden; los días sin fila quedan en 0 y las filas fuera del rango se ignoran.
- El token nunca sale del servidor: los componentes reciben solo `VisitasDiariasResult`.

### Casos nuevos en `tests/admin/website-visits.test.ts`

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | URL de la serie | Ruta `/visits/aggregate`, `by=day`, `limit=100`, filtro de producción, `since` y `until` del período |
| 2 | Respuesta con 3 días de un período de 7 | `serie` de 7 elementos en orden; los 4 que faltan en 0; `status` `ready` |
| 3 | Fila sin `timestamp`, con `timestamp` inválido o con métricas negativas | Se descarta sin fallar |
| 4 | Totales en cero | `status` `no_data` |
| 5 | Sin configuración | `status` `not_configured`; no se llama a `fetch` |
| 6 | 401 en cualquiera de las dos lecturas | `status` `unauthorized`; `summary` `null`; `serie` vacía |
| 7 | Error de red o tiempo agotado | `status` `unavailable`; la función no lanza |
| 8 | Período inválido | `status` `invalid`; no se llama a `fetch` |

## 5. Autorización

No hay puntos de entrada nuevos. `app/admin/page.tsx` vive bajo `app/admin/layout.tsx`, que ejecuta `requireAdmin()` en cada petición (FR-024). Los componentes de cliente reciben solo cifras agregadas: ni datos personales de clientes ni credenciales.
