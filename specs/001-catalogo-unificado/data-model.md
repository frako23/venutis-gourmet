# Modelo de datos y estado: Catálogo público unificado

**Feature**: `001-catalogo-unificado`

## Alcance de persistencia

No se requieren cambios en `prisma/schema.prisma` ni una migración de PostgreSQL. El modelo existente ya contiene los datos necesarios: `Producto.precioDetal`, `Producto.precioMayorista`, `Producto.inventario`, `Producto.categoria`, `Producto.descripcion` e `Imagen.url`.

## Entidades y proyecciones

### Contexto de compra

Preferencia temporal del visitante que orienta la vista pública y la selección de precio.

| Campo | Tipo | Regla |
|---|---|---|
| `valor` | `consumidor \| mayorista` | Es el único conjunto de valores válido. |
| `parametro` | `contexto` | Se transporta en enlaces públicos y consultas de catálogo. |
| `predeterminado` | `consumidor` | Se usa cuando el parámetro falta o no es válido. |
| `precioAplicable` | `precioDetal \| precioMayorista` | Se resuelve según `valor`, nunca desde una entrada arbitraria del navegador. |

El contexto no crea un registro de cliente, no concede permisos administrativos y no se guarda en PostgreSQL.

### Producto de catálogo

Proyección pública de `Producto` más sus imágenes:

| Campo | Fuente | Regla de presentación |
|---|---|---|
| `id`, `nombre`, `categoria`, `descripcion` | `Producto` | Se muestran en tarjeta y detalle. |
| `imagen` | Primera `Imagen.url` | Si no existe, se usa el recurso de respaldo existente. |
| `inventario` | `Producto.inventario` | `0` impide comprar y muestra estado agotado. |
| `precio` | `precioDetal` o `precioMayorista` | Se determina por el contexto normalizado. Debe ser válido y positivo para ofrecerse. |
| `esOfertaMayorista` | `precioMayorista` válido | Permite identificar la oferta mayorista sin una nueva columna en la base de datos. |

La consulta de catálogo debe traer los productos e imágenes en una sola operación y aplicar la categoría y el contexto sobre la proyección resultante.

### Elemento persistido del carrito

Extensión del `CartItem` actual de `store/appStore.ts`:

| Campo | Tipo | Regla |
|---|---|---|
| `id`, `nombre`, `imagen`, `cantidad` | Existentes | Se conservan. `cantidad` debe ser mayor que cero para permanecer en el carrito. |
| `precioDetal` | `number` | Precio detal recibido del catálogo. |
| `precioMayorista` | `number` | Precio mayorista recibido del catálogo. |
| `precio` | `number` | Precio derivado para el contexto activo. |
| `contexto` | `PurchaseContext` | Contexto con el que se calculó `precio`. |

La acción `setPurchaseContext` actualiza el contexto global, recalcula `precio` de cada línea y recalcula `totalUSD` sin borrar productos. La persistencia del store debe incrementar su versión; los elementos antiguos que no tengan ambos precios se conservarán con el precio histórico y se validarán de nuevo al confirmar.

### Datos de checkout

La entrada de `procesarCompra` incorporará el contexto normalizado y mantendrá el flujo de cliente, entrega y pago existente. Para cada línea, la acción server-side resolverá:

1. Producto existente.
2. Precio correspondiente al contexto.
3. Inventario suficiente.
4. Precio unitario que se guardará en `DetalleCompra`.

Si el precio enviado por el cliente no coincide con el precio vigente, la acción devolverá un error comprensible y no modificará inventario ni creará la transacción. La transacción Prisma seguirá siendo atómica.

## Invariantes

- Nunca se confirma una línea con precio `0`, negativo o perteneciente a otro contexto.
- Nunca se descuenta inventario si alguna línea falla validación.
- Cambiar de contexto no borra el carrito.
- Un producto agotado no puede añadirse ni confirmarse.
- La clasificación del cliente existente (`Cliente.tipoCliente`) no se cambia automáticamente por seleccionar un contexto; el contexto de esta feature es una preferencia de la compra pública.
- El panel administrativo y la vista rápida siguen leyendo y escribiendo el modelo existente sin adoptar el contexto público.
