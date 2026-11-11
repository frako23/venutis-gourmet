# Contrato de interfaz: programa de puntos

**Feature**: `014-programa-puntos` | **Reglas y acciones**: [reglas-y-acciones.md](./reglas-y-acciones.md) | **Datos**: [data-model.md](../data-model.md)

Textos en español. Panel: clases `admin-*` y colores existentes. Tienda: tokens de `DESIGN.md`, móvil primero. Avisos solo con `toast` de sonner. Fechas con `formatFecha` y `formatFechaHora` (hora de Caracas).

## 1. Panel: sección "Puntos" (`/admin/points`, nueva)

### Navegación

- `components/admin/sidebar.tsx`: entrada `{ icon: Gift, label: "Puntos", link: "/admin/points" }` después de "Clientes". El menú móvil la toma de la misma lista.
- `components/admin/header.tsx`: título `"/admin/points": "Puntos"`.

### Página (`app/admin/points/page.tsx`, servidor)

`requireAdmin()`, lee `searchParams` (`q`, `orden`) y llama a `consultarPuntosClientes`.

| Zona | Contenido |
|---|---|
| Cabecera | Antetítulo "Fidelización", título "Puntos", subtítulo "Lo que cada cliente ha ganado, canjeado y tiene disponible." A la derecha, botón secundario "Premios" → `/admin/clients/rewards`. |
| Indicadores | Cuatro `DashboardCard` (ver abajo). |
| Filtros | `PointsFilters`. |
| Tabla | `PointsTable`. |

Indicadores (`DashboardCard` de `components/admin/dashboard/`):

| Etiqueta | Valor | Texto de ayuda |
|---|---|---|
| Puntos en circulación | `enCirculacion` | "Disponibles entre todos los clientes" |
| Clientes con puntos | `clientesConPuntos` | "Con saldo mayor que cero" |
| Ya pueden canjear | `puedenCanjear` | "Alcanzan el premio más barato" o, sin premios activos, "No hay premios activos" |
| Puntos del mes | `+{ganadosMes}` | "{canjeadosMes} canjeados · mes en curso" |

Los puntos se muestran con `toLocaleString("es-VE")`.

### `PointsFilters` (`components/admin/puntos/pointsFilters.tsx`, servidor)

Formulario `method="get"` hacia `/admin/points`, sin JavaScript:

- campo de texto `q`, etiqueta "Buscar cliente", `placeholder` "Nombre o teléfono", con su valor actual;
- selector `orden`, etiqueta "Ordenar por": "Puntos disponibles" (`disponibles`), "Puntos ganados" (`ganados`), "Puntos canjeados" (`canjeados`), "Último movimiento" (`reciente`);
- botón "Aplicar" y enlace "Limpiar" (→ `/admin/points`) cuando hay `q` u `orden` distinto del inicial.

### `PointsTable` (`components/admin/puntos/pointsTable.tsx`, servidor)

Dentro de `admin-panel`, con `overflow-x-auto` y `admin-table`.

| Columna | Contenido |
|---|---|
| Cliente | Nombre en negrita, enlazado a `/admin/clients/{id}`; debajo, el celular si existe. |
| Tipo | "Consumidor" o "Mayorista" (misma etiqueta que la tabla de clientes). |
| Ganados | Número, `admin-mono`, a la derecha. |
| Canjeados | Igual. |
| Ajustes | Con signo (`formatPuntosConSigno`); "—" si es 0. |
| Disponibles | En negrita. |
| Último movimiento | `formatFecha`. |

Estados:

| Situación | Texto |
|---|---|
| Ningún cliente tiene movimientos | "Todavía no hay movimientos de puntos. Aparecerán cuando un pedido de un consumidor quede pagado." |
| La búsqueda no encuentra nada | "No hay clientes con puntos que coincidan con «{q}»." |
| Hay resultados | Pie: "{n} de {total} clientes con movimientos de puntos". |

La fila no tiene acciones: el ajuste manual sigue en la ficha (FR-007).

## 2. Panel: premios (`/admin/clients/rewards`)

### `RewardForm`

| Campo | Cambio |
|---|---|
| Tipo | Tercera opción: "Delivery gratis" (`delivery`). |
| Bloque según el tipo | `descuento`: monto en USD (igual). `producto`: producto y cantidad (igual). `delivery`: sin campos; nota "Cubre el delivery completo del pedido, a cualquier zona activa." |
| Compra mínima (USD) | **Nuevo**, para los tres tipos. `type="number"`, `min="0.01"`, `step="0.01"`, opcional. Ayuda: "Opcional. Monto mínimo en productos para poder canjearlo." |
| Costo en puntos | Pasa a ser un campo controlado, con una línea de ayuda debajo (ver sugerencias). |

`ProductoOpcion` añade `precioDetal`; la página lo incluye en su consulta de productos.

Sugerencias (FR-028 a FR-030):

| Situación | Comportamiento |
|---|---|
| Premio **nuevo**, tipo `producto`, con producto y cantidad elegidos | Ayuda: "Sugerido: {n} puntos (20 por cada USD de su precio al detal)." Mientras la dueña no haya escrito en "Costo en puntos", el campo toma `{n}` y se actualiza si cambia el producto o la cantidad. |
| Premio **nuevo**, tipo `delivery` | Mientras no los haya escrito: costo 100 y compra mínima 15. Ayuda: "Sugerido: 100 puntos con compra mínima de USD 15." |
| Premio **nuevo**, tipo `descuento` | Sin sugerencia. |
| La dueña escribe en el campo | Deja de actualizarse solo. La ayuda sigue visible. |
| **Edición** de un premio | Los campos muestran lo guardado y nunca se cambian solos. La ayuda muestra la sugerencia como referencia. |

### `RewardsTable`

- Columna "Tipo": "Descuento", "Producto gratis" o "Delivery gratis".
- Columna "Recompensa": `describirRecompensa`; debajo, en texto pequeño, "Compra mínima USD 15,00" si la tiene.
- Subtítulo del panel: "Los clientes los canjean con sus puntos por un descuento, un producto gratis o el delivery de su pedido."
- `PremioVista.tipo` admite `delivery` y añade `compraMinimaUsd`.

## 3. Panel: detalle del pedido (`/admin/transactions/[id]`)

- **Totales**: tras "Descuento por puntos", una línea "Delivery gratis (premio)" con `-$X.XX` cuando `montoDescuentoDelivery > 0`.
- **`CanjearPremioPanel`**:
  - el `detalle` de cada premio usa `describirRecompensa`;
  - la página no ofrece premios `delivery` si el pedido no tiene delivery o ya lo tiene cubierto (`montoDelivery − montoDescuentoDelivery ≤ 0`);
  - la nota bajo los canjes pasa a "Descuento por premios aplicado: {monto}", con `montoDescuentoPuntos + montoDescuentoDelivery`;
  - los errores del servidor (compra mínima, delivery ya cubierto) se muestran con `toast.error`, como hoy.

## 4. Panel: formulario de venta y edición (`/admin/add-transaction`)

- La página excluye los premios `delivery` de la lista que pasa al formulario (la venta manual no tiene delivery).
- En modo edición, el resumen de solo lectura añade "Delivery gratis (premio): {monto}" cuando `pedido.descuentoDeliveryUsd > 0`, y la vista previa del total lo resta: `total = totales + montoDeliveryUsd − descuentoDeliveryUsd`.
- Un canje que no cumple la compra mínima se rechaza al guardar con el mensaje del servidor en `toast.error`.

## 5. Tienda: "Mi cuenta" (`/mi-cuenta`)

- **`app/mi-cuenta/layout.tsx`** (nuevo): cabecera, `<main>` con el ancho actual, pie y `Toaster`. `app/mi-cuenta/page.tsx` conserva `metadata`, `dynamic` y los cinco estados de sesión, sin el marco.
- **`ResumenCuentaVista`**:
  - la tarjeta "Puntos" pasa a ser un enlace a `/mi-cuenta/puntos`, con la nota "Ver mis puntos y premios →";
  - desaparecen los bloques "Premios" y "Movimientos de puntos";
  - `Bloque` y `Vacio` se exportan para reutilizarlos en "Mis puntos".

## 6. Tienda: "Mis puntos" (`/mi-cuenta/puntos`, nueva)

### Página (`app/mi-cuenta/puntos/page.tsx`, servidor, `dynamic = "force-dynamic"`)

1. `obtenerSesionCliente()`. Si el estado no es `vinculada`: `redirect("/mi-cuenta")`.
2. `obtenerMisPuntos(clienteId)`. Si `!mostrar`: `redirect("/mi-cuenta")`.
3. Renderiza `MisPuntosVista`.

`metadata`: título "Mis puntos | Venuti's Gourmet".

### `MisPuntosVista` (`components/mi-cuenta/misPuntos.tsx`, servidor)

De arriba abajo, en una sola columna (360 px sin desplazamiento horizontal, SC-004):

| Bloque | Contenido |
|---|---|
| Cabecera | Enlace "← Mi cuenta", antetítulo "Mis puntos" y el saldo en grande con el texto "puntos disponibles". |
| Próximo premio | Si `proximo`: "Te faltan {faltan} puntos para {nombre}" con una barra de progreso (`disponibles / (disponibles + faltan)`, `role="progressbar"` con `aria-valuenow`). Si no hay `proximo` y hay premios: "Ya alcanzas todos los premios disponibles." |
| Premios | Lista de `premios` (ver abajo). Sin premios: "Pronto tendremos premios para canjear con tus puntos." |
| Cómo funciona | Tres líneas (ver abajo). |
| Historial | Lista de `movimientos`: concepto, fecha y, si existe, "Pedido {numeroOrden}"; a la derecha los puntos con signo, en verde o rojo como hoy. Vacío: "Todavía no tienes movimientos." |

Cada premio:

- nombre en negrita y `descripcion` si existe;
- `recompensa` y cada texto de `condiciones` en líneas pequeñas;
- a la derecha, el costo ("{n} pts") y su estado:

| `estado` | Presentación |
|---|---|
| `canjeable` | "¡Ya lo puedes canjear!" y el botón "Canjear" → `/productos/consumidores`. |
| `faltan` | "Te faltan {n} puntos". Sin botón. |
| `sin_existencia` | "Sin existencia por ahora". Sin botón, atenuado. |

Bajo la lista, si hay al menos un premio canjeable: "Para canjear, haz tu pedido: eliges el premio en el paso de pago y ahí se descuentan tus puntos."

"Cómo funciona" (los valores salen de `PROGRAMA_PUNTOS`):

1. "Ganas 1 punto por cada dólar en productos, cuando confirmamos el pago de tu pedido. El delivery no suma puntos."
2. "Canjeas tus puntos al hacer un pedido: el premio viaja con tu compra."
3. "Tus puntos no vencen."

Si `acumula` es `false` (mayorista con puntos), la primera línea se reemplaza por: "Tu cuenta es mayorista y ya no suma puntos, pero puedes canjear los que tienes."

## 7. Tienda: paso de pago (`/finalizar-compra`)

### `BeneficiosCliente`

Props: `subtotalUsd`, `totalUsd` y la nueva `montoDeliveryUsd`. `PaymentInformation` le pasa `deliveryMethod === "envio" ? deliveryPrice : 0`.

- La selección efectiva es `filtrarCanjesValidos(elegidos, contexto)`, con `contexto = { puntosDisponibles, subtotalUsd, descuentoUsd: 0, montoDeliveryUsd }`.
- Un premio no elegido está deshabilitado si no tiene existencia o si `validarCanjes([...efectivos, premio])` lanza. Bajo su nombre se muestra el motivo: "Sin existencia" o el mensaje del error (por ejemplo, "Agrega USD 3,00 más en productos para usar Delivery gratis." o "Delivery gratis solo aplica a pedidos con delivery.").
- La línea descriptiva de cada premio usa `describirRecompensa`.
- `descuentoPremiosUsd = descuentoPuntosUsd + descuentoDeliveryUsd` del resultado de `validarCanjes` sobre la selección efectiva.
- El saldo a favor máximo sigue siendo `min(saldo, totalUsd − descuentoPremiosUsd)`.
- `onChange` entrega `{ premioIds, saldoAFavorUsd, descuentoPremiosUsd }`.

### `PaymentInformation`

- `finalTotalUSD = max(0, totalPedidoUSD − beneficios.descuentoPremiosUsd − beneficios.saldoAFavorUsd)`.
- Lo demás no cambia: la selección sigue en estado local, se envía `premioIds` y, ante `BENEFITS_CHANGED`, se recargan los beneficios.

## 8. Tienda: confirmación (`/confirmacion`)

- Entre "Delivery" y "Total", una línea "Delivery gratis (premio)" con `-$X.XX` cuando `montoDescuentoDelivery > 0`.
- "Premios canjeados" y el mensaje de WhatsApp ya listan el premio por su nombre; no cambian.

## 9. Etiquetas compartidas

- `tipoPuntosLabel` (`lib/format.ts`): añade `bono: "Bono de bienvenida"`. La ficha del cliente lo muestra sin más cambios.

## 10. Accesibilidad y móvil

- "Mis puntos": objetivos táctiles de al menos 44 px en "Canjear" y "← Mi cuenta"; la barra de progreso tiene texto equivalente.
- Tabla del panel: encabezados `<th>`; el enlace del cliente es el único elemento interactivo de la fila.
- Los estados de los premios no dependen solo del color: siempre llevan texto.
