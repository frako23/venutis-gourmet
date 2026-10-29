# Contrato: tipo de precio, cantidades con decimales y control de ventas

**Feature**: `008-ventas-excel`
**Superficies**:

- **Panel administrativo**: venta manual, editor masivo, detalle, analíticas, inventario y exportación.
- **Tienda**: el checkout guarda el tipo de precio y la tienda muestra unidades enteras.

## 1. Reglas de cantidad e inventario (`lib/inventory.ts`)

Sin `@/` ni `server-only`; el checkout, las acciones del panel y las pruebas las importan con ruta relativa.

| Función | Contrato |
|---|---|
| `isValidQuantity(x)` | `Number.isFinite(x) && x > 0 && |round(x·100) − x·100| < 1e-6` |
| `roundQuantity(x)` | `Math.round((x + Number.EPSILON) · 100) / 100` |
| `unidadesDisponibles(inventario)` | `Math.max(0, Math.floor(roundQuantity(inventario)))` |
| `ajustarInventario(tx, productoId, delta, { exigirStock })` | Bloquea la fila (`SELECT "inventario" FROM "Producto" WHERE id = $1 FOR UPDATE`). Si no existe, lanza `Uno de los productos seleccionados no existe.` Calcula `siguiente = roundQuantity(actual + delta)`. Si `exigirStock && siguiente < 0`, lanza `StockInsuficienteError(nombre)`. Escribe `inventario = siguiente`. |

Cada flujo agrupa las cantidades por producto y llama a `ajustarInventario` en orden ascendente de `productoId`:

| Flujo | `delta` | `exigirStock` |
|---|---|---|
| Checkout (`lib/actions/checkout.ts`) | `−cantidad` (entero) | sí. Se traduce a `STOCK_INSUFFICIENT` con el mensaje actual. |
| Venta manual (`registrarVentaManual`) | `−cantidad` | sí. `Stock insuficiente para {producto}.` |
| Filas nuevas del editor masivo | `−cantidad` | sí. El mismo mensaje. |
| Cancelación (`aplicarCambioEstadoPedido`) de un pedido **no** importado | `+cantidad` | no |
| Cancelación de un pedido importado | — | No se ajusta. |
| Carga de Excel | — | No se ajusta. |

`calculateSubtotal` (`lib/admin/sales-calculations.ts`) acepta cualquier cantidad que cumpla `isValidQuantity`. Mensaje: `La cantidad debe ser mayor que cero y tener como máximo 2 decimales`.

La edición de inventario (`lib/actions/products.ts`: crear, editar y editor masivo) acepta `inventario ≥ 0` con 2 decimales y guarda `roundQuantity`. Los campos usan `step="0.01"`.

## 2. Entradas que cambian

### `registrarVentaManual(formData)`: `lineas` (JSON)

```ts
Array<{
  productoId: number;
  cantidad: number;           // isValidQuantity (antes: entero)
  precioUnitarioUsd: number;  // > 0
  tipoPrecio: "detal" | "mayor" | "promo";   // NUEVO, obligatorio
}>
```

### `guardarEdicionMasivaVentas(formData)`: filas `nuevas`

Se añaden `tipoPrecio: "detal" | "mayor" | "promo"` (obligatorio) y `cantidad: number` (con `isValidQuantity`, antes entero). Las filas `existentes` no cambian.

### Checkout (`procesarCompra`)

La entrada no cambia. Cada línea se guarda con `tipoPrecio = contexto === "mayorista" ? "mayor" : "detal"`, a partir de `normalizePurchaseContext(datos.contexto)`. El carrito sigue exigiendo cantidades enteras.

### Interfaz de venta manual y del editor masivo

- Cada línea tiene un `<select>` "Tipo" con las opciones Detal, Mayor y Promo. Al elegir el cliente o agregar una línea, se propone `mayor` si `cliente.tipoCliente === "mayorista"` y `detal` si no, y el precio toma el valor de catálogo correspondiente.
- Al cambiar a Detal o Mayor, el precio pasa al de catálogo. Al cambiar a Promo, el precio queda vacío, con el texto de ayuda "Precio de promoción". La venta no se puede guardar mientras haya un precio vacío.
- El campo de cantidad usa `step="0.01"` y `min="0.01"`.

## 3. Lecturas que cambian

| Lugar | Cambio |
|---|---|
| Detalle del pedido (`app/admin/transactions/[id]/page.tsx`) | Cada línea muestra Tipo ("Detal", "Mayor", "Promo" o "Sin especificar"), cantidad (con hasta 2 decimales), precio unitario e importe. |
| Tabla de ventas y exportación de pedidos | La cantidad se formatea con hasta 2 decimales (`16,5`, no `16.500`). |
| `consultarAnaliticas` (`lib/admin/analytics.ts`) | `AnalyticsResult` añade `porTipoPrecio: Array<{ tipoPrecio: "detal" \| "mayor" \| "promo" \| null; etiqueta: string; cantidadVendida: number; totalUsd: number; porcentajeDelTotal: number }>`, que excluye cancelados y respeta el filtro de producto. `cantidadVendida` se redondea con `roundQuantity`, también en `porProducto`. |
| `AnalyticsDashboard` | Muestra el desglose por tipo de precio como una tabla corta (tipo, unidades, USD y %) sin gráfico nuevo. |
| Tienda, venta rápida y cotización rápida | Las consultas exponen `inventario: unidadesDisponibles(p.inventario)`: `app/productos/consumidores/page.tsx`, `app/productos/consumidores/[id]/page.tsx`, `app/venta-rapida/page.tsx`, `app/cotizacion-rapida/page.tsx` y `lib/actions/cotizacion-rapida.ts` (también en la comparación del snapshot). |
| Inventario del panel | Muestra el valor con hasta 2 decimales; las alertas de "≤ 5" no cambian. |

## 4. Exportación del control de ventas

**Ruta**: `GET /admin/transactions/export?formato=control&desde=AAAA-MM-DD&hasta=AAAA-MM-DD`. Es la ruta existente, que ya ejecuta `requireAdmin()` en cada petición. Sin `formato`, la exportación de pedidos actual no cambia.

**Consulta**: líneas (`DetalleCompra`) de pedidos con `estado != cancelado` y `fechaCompra` en el rango, ordenadas por fecha, número de pedido e `id` de línea. Incluye el cliente, el producto con su equivalencia más reciente, la categoría y los abonos del pedido.

**Archivo**: `control-ventas-{desde}-{hasta}.xlsx`, generado por `buildSalesControlWorkbook(lines)` en `lib/admin/sales-export.ts`.

| Fila | Contenido |
|---|---|
| 1 | `CONTROL DE VENTAS` en B1 |
| 2 | Encabezados en B2:Q2: `FECHA`, `NOTA DE ENTREGA`, `ORDEN CODIGO`, `CLIENTE`, `GRUPO`, `PRODUCTO`, `SABOR`, `CANT X PAQ.`, `TIPO`, `GR`, `PVP UND`, `VENTA`, `PAGADO`, `ABONO`, `DEUDA`, `X COBRAR` |
| 3… | Una fila por línea |

| Columna | Valor |
|---|---|
| FECHA | Serial de Excel con formato de fecha `dd/mm/yyyy`, en el día de Caracas. |
| NOTA DE ENTREGA | `numeroOrden` (número si es numérico; texto si no). |
| ORDEN CODIGO | Vacío. |
| CLIENTE | `nombre apellido`, recortado. |
| GRUPO, PRODUCTO, SABOR, GR | De la equivalencia más reciente del producto. Si no hay, GRUPO = categoría, PRODUCTO = nombre del catálogo, y SABOR y GR vacíos. |
| CANT X PAQ. | `cantidad`. |
| TIPO | `DETAL`, `MAYOR`, `PROMO` o vacío si es `null`. |
| PVP UND | `precioUnitario`. |
| VENTA | `roundMoney(cantidad × precioUnitario)`. |
| DEUDA | La deuda de la nota es `min(saldo del pedido, Σ VENTA)`; un pedido `pagado` tiene deuda 0. Se reparte **desde la última línea hacia la primera**: cada línea recibe `min(VENTA, deuda restante)`. |
| ABONO | `roundMoney(VENTA − DEUDA)`. |
| PAGADO | `SI` si DEUDA = 0; si no, `NO`. |
| X COBRAR | `x` si DEUDA > 0; si no, `-`. |

En pedidos sin descuento ni delivery (todos los importados), repartir la deuda desde el final da el mismo resultado que repartir lo abonado desde el principio, como pide FR-040. Con descuento o delivery, el formato del Excel no tiene columnas para esos importes: repartir la deuda mantiene Σ DEUDA igual al saldo, y el descuento queda absorbido en ABONO.

**Propiedades verificables**: Σ VENTA = Σ (`montoSubtotal` o, si es 0, `montoTotal`) de los pedidos exportados; Σ DEUDA = Σ saldo, salvo la parte del saldo que corresponde al delivery; volver a cargar el archivo marca todas sus notas como "Ya registrada".

**Interfaz**: junto al botón de exportación actual de "Ventas y pedidos" se añade "Descargar control de ventas", que usa el rango `desde`/`hasta` de los filtros vigentes. Si el rango está vacío, usa el mes en curso.
