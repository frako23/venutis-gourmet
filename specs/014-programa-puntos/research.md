# Investigación: programa de puntos (panel, "Mis puntos", delivery gratis y bono)

**Fecha**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

La especificación no dejó ningún `NEEDS CLARIFICATION`. Lo que sigue son las decisiones técnicas que salieron de leer el código actual; todas quedan resueltas aquí.

## Punto de partida: lo que ya existe

| Pieza | Dónde | Estado |
|---|---|---|
| Movimientos de puntos (`Fidelidad`, con signo) | `prisma/schema.prisma`, `lib/fidelidad.ts` | Completo. Tipos: `acumulacion`, `redencion`, `devolucion`, `reversion`, `ajuste`. |
| Premios (`Premio`: `descuento` o `producto`) | `lib/actions/admin-fidelidad.ts`, `/admin/clients/rewards` | Completo. Falta el tipo delivery y la compra mínima. |
| Canje en la tienda | `registrarCompraWeb` (`lib/checkout-core.ts`), `BeneficiosCliente` | Completo para los dos tipos actuales. |
| Canje en el panel | `canjearPremioEnPedido` (`lib/admin/canje-pedido.ts`) y venta manual (`lib/admin/manual-sale.ts`) | Completo para los dos tipos actuales. |
| Devolución de puntos al cancelar | `revertirPuntosDePedido` | Completo; devuelve cualquier `redencion` del pedido, así que sirve tal cual para el delivery gratis. |
| Puntos en "Mi cuenta" | `obtenerResumenCuenta`, `ResumenCuentaVista` | Muestra saldo, premios y movimientos mezclados con deuda y saldo a favor. |
| Puntos en el panel | Solo en la ficha de cada cliente (`FichaPuntos`) | No hay vista de todos los clientes. |

Tres hechos del código condicionan el diseño:

1. **El total de un pedido es** `subtotal + delivery − descuento − descuentoPuntos`, y `montoDescuentoPuntos` se trata en todas partes como un descuento **sobre productos**: `calculateSaleTotals` exige que no supere el subtotal y `calcularPuntosGanados` lo resta de la base de puntos.
2. **Las ventas manuales del panel no tienen delivery**: `registrarVentaManualEnTx` no escribe `montoDelivery`. Los únicos pedidos con costo de envío son los de la tienda.
3. **Una cuenta queda vinculada en tres lugares**: el vínculo automático por correo verificado (`obtenerSesionCliente`), el registro (`completarRegistroCliente`) y la confirmación de la administradora (`confirmarVinculacionCuenta`).

## Decisión 1: el delivery cubierto por un premio se guarda en una columna propia

**Decisión**: se agrega `Transaccion.montoDescuentoDelivery` (USD, por defecto 0). El total pasa a ser `subtotal + delivery − descuento − descuentoPuntos − descuentoDelivery`. `montoDelivery` conserva el costo real del envío.

**Motivo**:

- FR-018 pide conservar el costo del delivery y mostrar el descuento por separado.
- FR-021 pide que el delivery gratis no cambie los puntos ganados. Si el monto fuera a `montoDescuentoPuntos`, `calcularPuntosGanados` lo restaría de los productos y el cliente ganaría menos puntos; además `calculateSaleTotals` lo rechazaría en un pedido de USD 5 con delivery de USD 6.
- Con una columna aparte, `calcularPuntosGanados` y `calculateSaleTotals` no se tocan.

**Alternativas descartadas**:

- **Poner `montoDelivery` en 0**: se pierde cuánto cuesta el envío, que la dueña sigue pagando al repartidor.
- **Sumarlo a `montoDescuentoPuntos` y deducirlo de los movimientos**: obliga a que cada regla de puntos y de total consulte los canjes del pedido para saber qué parte es de delivery.

**Consecuencia**: `recalcularTotalPedido` (la regla única del total de un pedido existente) recibe un parámetro obligatorio nuevo, `descuentoDeliveryUsd`. Al ser obligatorio, el compilador señala sus tres llamadas (edición del pedido, editor de descuento y edición masiva), de modo que ninguna pueda olvidarlo.

## Decisión 2: "delivery gratis" es un tercer valor de `TipoPremio`

**Decisión**: `TipoPremio` gana el valor `delivery`. Un premio de ese tipo no usa `montoDescuentoUsd`, `productoId` ni `cantidad`: el monto que descuenta se decide al canjear y es el delivery del pedido.

**Motivo**: reutiliza la tabla, el formulario, la activación y el conteo de canjes de los premios existentes. El canje sigue siendo un movimiento `redencion` con `premioId`, así que la devolución al cancelar funciona sin cambios.

**Reglas nuevas en `validarCanjes`** (la regla pura que ya valida un conjunto de canjes):

- como máximo un premio de delivery por pedido (FR-020);
- el pedido debe tener delivery pendiente de cubrir mayor que 0 (FR-019);
- devuelve `descuentoDeliveryUsd`, igual al delivery pendiente, además de lo que ya devolvía.

La función recibe un dato nuevo, `montoDeliveryUsd`: el delivery del pedido que aún no cubre ningún premio.

**Alternativa descartada**: un descuento fijo en USD llamado "Delivery gratis". No cubriría las zonas de USD 4, 5 y 6, o regalaría de más en las de USD 3, y no impediría usarlo en un retiro en tienda.

## Decisión 3: la compra mínima es un campo opcional del premio

**Decisión**: `Premio.compraMinimaUsd` (opcional, 2 decimales). `validarCanjes` la compara con `subtotal − descuento − descuento por premios` (FR-025): productos después de todos los descuentos, sin delivery. Las líneas gratis de premios tienen precio 0 y nunca entran en el subtotal.

**Motivo**: es la protección que justifica la tabla de puntos (no regalar un envío de USD 6 en un pedido de USD 5) y vale para cualquier tipo de premio con un solo campo y una sola comprobación.

**Detalle**: si en el mismo pedido se eligen un premio de descuento y otro con compra mínima, la base ya descuenta el primero. La comprobación se hace al final, sobre el conjunto completo, para que el resultado no dependa del orden en que se eligieron.

## Decisión 4: el bono de bienvenida es un tipo de movimiento nuevo, `bono`

**Decisión**: `TipoMovimiento` gana el valor `bono`. Una función `acreditarBonoBienvenida(tx, clienteId)` en `lib/fidelidad.ts` bloquea al cliente, comprueba que sea consumidor y que no tenga ya un movimiento `bono`, y crea uno de 25 puntos con la descripción "Bono de bienvenida". Se llama dentro de la transacción de cada uno de los tres lugares donde una cuenta queda vinculada.

**Motivo**:

- "Una sola vez por cliente" (FR-033) necesita poder preguntar "¿ya lo recibió?" sin ambigüedad. Un tipo propio lo responde con una consulta por `clienteId` y `tipoMovimiento`, bajo el bloqueo del cliente, de modo que dos peticiones simultáneas no lo dupliquen.
- Como el movimiento pertenece al cliente y no a la cuenta, desvincular y volver a vincular no lo repite.
- En los resúmenes cuenta como puntos ganados, pero el historial lo distingue de una compra.

**Alternativas descartadas**:

- **Un `ajuste` o una `acumulacion` con un texto fijo**: la unicidad dependería de comparar cadenas.
- **Una columna `bonoBienvenidaEn` en `Cliente`**: duplica en otro lugar lo que el libro de puntos ya dice.

**El vínculo automático por correo** (`obtenerSesionCliente`) hoy crea la cuenta fuera de una transacción. Pasa a crear la cuenta y el bono en una sola transacción; si otra petición ganó la carrera (`P2002`), se deshace todo y se relee, como hoy.

## Decisión 5: los consumidores ya vinculados reciben el bono con una migración de datos aparte

**Decisión**: dos migraciones.

1. `programa_puntos`: los dos valores de enum y las dos columnas.
2. `bono_bienvenida_inicial`: un `INSERT ... SELECT` que da el bono a cada consumidor con cuenta `vinculada` que no tenga ya un movimiento `bono` (FR-034).

**Motivo**: PostgreSQL no permite usar un valor de enum recién agregado dentro de la misma transacción que lo agrega, y una migración se ejecuta como una sola unidad. Separar el dato del esquema lo evita. El `NOT EXISTS` hace que la segunda migración sea inofensiva en bases sin cuentas (las de prueba).

**Alternativa descartada**: acreditarlo la primera vez que el cliente abra "Mis puntos". Añade una escritura a una página de consulta y deja sin bono, hasta que entren, a clientes que la dueña ya vería en su sección de puntos.

## Decisión 6: la sección del panel es una ruta nueva, `/admin/points`, calculada con un `groupBy`

**Decisión**: una página de servidor con una entrada propia "Puntos" en la barra lateral. Los datos salen de:

- un `groupBy` de `Fidelidad` por `clienteId` y `tipoMovimiento`, con la suma de puntos y la fecha máxima;
- un `groupBy` por `tipoMovimiento` desde el inicio del mes de Caracas, para los indicadores del mes;
- el costo mínimo entre los premios activos, para "ya pueden canjear";
- los datos de los clientes que aparecen en el primer resultado.

Un módulo puro nuevo, `lib/admin/points-core.ts`, convierte esos grupos en filas (ganados, canjeados, ajustes, disponibles, último movimiento), filtra, ordena y calcula los indicadores. La lectura vive en `lib/admin/points.ts`.

**Motivo**:

- La dueña pidió una sección "exclusiva"; una entrada en la barra lateral es lo que la hace encontrable (SC-001). Los premios siguen en `/admin/clients/rewards`, enlazados desde la sección.
- Todas las cifras salen de las mismas filas, así que los indicadores siempre coinciden con la tabla, y "Disponibles = Ganados − Canjeados + Ajustes" se cumple por construcción (FR-003, SC-002).
- Sigue el patrón `*-core.ts` más su contraparte de lectura (Principios II y V), igual que `dashboard-core.ts` y `dashboard.ts`.

**Clasificación de los movimientos**:

| Columna | Tipos que suma |
|---|---|
| Ganados | `acumulacion` + `bono` + `reversion` (negativa) |
| Canjeados | −(`redencion` + `devolucion`) |
| Ajustes | `ajuste` |

**Búsqueda y orden**: llegan por la URL (`?q=` y `?orden=`) con un formulario `GET`, y se aplican en memoria sobre las filas ya calculadas. No hay paginación: la tabla solo lista clientes con movimientos de puntos, que son cientos como mucho.

**Alternativas descartadas**:

- **Una pestaña dentro de Clientes**: la tabla de clientes es un editor masivo paginado; añadirle columnas calculadas y otro orden la complica y no da una "sección".
- **SQL crudo con `CASE`**: el `groupBy` de Prisma devuelve lo mismo con unas pocas filas más.
- **Filtro por período y exportación**: fuera de alcance en la especificación.

**"Ya pueden canjear"** cuenta los clientes cuyos puntos disponibles alcanzan el premio activo más barato. No mira existencia ni compra mínima, que dependen del pedido; la tarjeta lo dice en su texto de ayuda.

## Decisión 7: "Mis puntos" es una ruta nueva, `/mi-cuenta/puntos`, y "Mi cuenta" deja de repetir esos bloques

**Decisión**:

- `app/mi-cuenta/puntos/page.tsx` muestra el saldo, el premio más cercano, el catálogo con el estado de cada premio, la explicación del programa y el historial.
- "Mi cuenta" conserva la tarjeta de puntos, que pasa a ser el enlace a "Mis puntos", y pierde los bloques "Premios" y "Movimientos de puntos".
- El marco común de las dos páginas (cabecera, pie y `Toaster`) sube a `app/mi-cuenta/layout.tsx`.
- Sin sesión, con el correo sin verificar, sin vínculo o con el vínculo pendiente, la página redirige a `/mi-cuenta`, que ya muestra qué hacer en cada caso (FR-014).

**Motivo**: FR-008 pide una vista dedicada accesible desde "Mi cuenta". Mover los bloques, en vez de copiarlos, deja una sola pantalla que explica los puntos y evita dos listas de premios que podrían divergir. La constitución exige una especificación para una ruta nueva: es esta.

**Datos**: `obtenerMisPuntos(clienteId)` en `lib/cuenta-cliente.ts`, con el `clienteId` de la sesión. `obtenerResumenCuenta` deja de leer premios y movimientos de puntos. Nunca se exponen el autor ni el motivo de un movimiento (FR-012).

**"Canjear"** (FR-013) es un enlace al catálogo. No se preselecciona el premio: hacerlo exigiría llevar esa elección entre páginas, es decir, ampliar el estado duplicado del checkout, que la constitución pide no ampliar. El premio se elige en el paso de pago, como hoy.

**Alternativa descartada**: una sección más dentro de la página actual. "Mi cuenta" ya tiene cinco bloques; el programa quedaría enterrado y no se podría enlazar.

## Decisión 8: el paso de pago valida la selección con la misma regla que el servidor

**Decisión**: `BeneficiosCliente` deja de reimplementar condiciones (`excedePuntos`, `excedeCompra`) y llama a `validarCanjes` para saber si un premio se puede añadir a los ya elegidos; el mensaje del error es el motivo que muestra bajo el premio deshabilitado. Una función pura nueva, `filtrarCanjesValidos`, descarta de la selección los premios que dejaron de cumplir (por ejemplo, si baja el subtotal).

**Motivo**: con el delivery, la compra mínima y el tope de un delivery por pedido, las condiciones pasan de dos a cinco. Mantenerlas dos veces es la forma más segura de que diverjan (Principio II). `lib/fidelidad.ts` solo importa tipos de Prisma, igual que `sales-calculations.ts`, que el formulario de venta manual ya usa en el navegador; el `build` lo confirma.

**Lo que no cambia**: la selección sigue siendo estado local del paso de pago, y el servidor vuelve a validar todo al confirmar (FR-026). La existencia del producto de un premio se sigue estimando en el navegador con `unidadesDisponibles` y se decide en el servidor.

**Nombre**: el campo `descuentoPuntosUsd` de la selección pasa a llamarse `descuentoPremiosUsd`, porque ahora suma el descuento sobre productos y el delivery cubierto.

## Decisión 9: en el panel, el delivery gratis se canjea en el detalle del pedido, no en la venta manual

**Decisión**:

- `canjearPremioEnPedido` acepta premios de delivery en pedidos pendientes con delivery sin cubrir. Si el pedido ya tiene un delivery cubierto, responde "Este pedido ya tiene el delivery cubierto por un premio."
- El formulario de venta manual no ofrece premios de delivery; si llegara uno, `validarCanjes` lo rechaza porque la venta manual no tiene delivery.

**Motivo**: es lo que cumple FR-022 con el modelo actual (hecho 2 del punto de partida). Darle delivery a la venta manual es otra función y no se pidió.

## Decisión 10: el costo sugerido se calcula en el formulario y nunca se impone

**Decisión**: una función pura, `costoSugeridoPremio({ precioDetalUsd, cantidad })`, devuelve `20 × precio × cantidad` redondeado a la decena más cercana, con un mínimo de 10. El formulario de premios:

- al **crear**, rellena el costo mientras la dueña no lo haya escrito a mano, y muestra de dónde sale ("Sugerido: 140 puntos, 20 por cada USD");
- al elegir el tipo delivery en un premio nuevo, propone 100 puntos y USD 15 de compra mínima;
- al **editar**, solo muestra la sugerencia como referencia, sin cambiar lo guardado (FR-030).

Los valores del programa (25, 20, 100 y 15) viven en una sola constante, `PROGRAMA_PUNTOS`, que también usa el texto de "Mis puntos" (FR-011).

**Motivo**: es una ayuda de captura; el valor que cuenta es el que la dueña guarda. No hay tabla de configuración: cambiar la regla del programa es una decisión rara que puede hacerse en código (YAGNI).

## Decisión 11: una sola función describe la recompensa de un premio

**Decisión**: `describirRecompensa(premio)` en `lib/fidelidad.ts` devuelve "USD 5,00 de descuento", "2 × Salsa pomodoro" o "El delivery de tu pedido".

**Motivo**: hoy ese texto se arma con un ternario (`descuento` o, si no, producto) en la tabla de premios, el detalle del pedido y el paso de pago. Con un tercer tipo los tres mostrarían "null × producto", y "Mis puntos" sería el cuarto uso. Cuatro usos justifican extraerlo (Principio I).

## Riesgos y cómo se cubren

| Riesgo | Cobertura |
|---|---|
| Un total mal calculado al editar un pedido con delivery gratis | Parámetro obligatorio en `recalcularTotalPedido` y casos de prueba pura y de integración. |
| Bono duplicado por peticiones simultáneas | `bloquearCliente` antes de comprobar; prueba de integración que llama dos veces. |
| El paso de pago y el servidor discrepan | Una sola regla (`validarCanjes`) en ambos lados; el servidor decide. |
| Lugares que asumían solo dos tipos de premio | `describirRecompensa` y el `build` de TypeScript sobre las uniones de tipos (`"descuento" \| "producto"`) que hoy están escritas a mano. |
| Next.js 16 difiere de lo conocido | `AGENTS.md`: leer las guías instaladas antes de escribir las dos rutas y el layout (ver el plan). |
