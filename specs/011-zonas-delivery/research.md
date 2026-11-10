# Research: Zonas de delivery administrables y delivery en la venta rápida

**Feature**: `011-zonas-delivery`
**Fecha**: 2026-11-10

El Technical Context no dejó incógnitas abiertas: la spec y sus aclaraciones fijaron el alcance:

- una sola lista de zonas, que se desactivan y no se borran;
- las zonas del panel reemplazan la lista fija en toda la tienda;
- en la venta rápida, el delivery solo acompaña el mensaje de WhatsApp.

Esta investigación fija las decisiones de diseño a partir del código existente.

## Hallazgos del código actual

- **Lista fija**: las zonas viven en `DELIVERY_ZONES` (`lib/constants/constants.ts`). Son 90 zonas: 64 a $3, 16 a $4, 6 a $5 y 4 a $6. La consultan siete lugares:
  - `lib/checkout-core.ts`: cobra el delivery con `DELIVERY_ZONES.find(name === address.urbanizacion)` dentro de la transacción.
  - `lib/actions/address.ts`: el `refine` de Zod rechaza un sector que no está en la lista.
  - `components/finalizar-compra/addressManager.tsx`: calcula `deliveryPrice` en tres lugares para mostrar el total.
  - `components/finalizar-compra/zoneSelector.tsx`: combobox con buscador y grupos fijos `[3, 4, 5, 6]`. El filtro distingue acentos, así que "hipico" no encuentra "Club Hípico".
  - `components/cotizacion-rapida/quickQuote.tsx`: `<select>` agrupado por precio, con `QuoteDelivery { zona, precioUsd }` ya soportado en `lib/cotizacion-rapida.ts`.
  - `tests/checkout/checkout.integration.test.ts`: usa "Altamira" a $3 (paga 13 = 10 + 3).
  - `tests/checkout/delivery-rules.test.ts`: solo prueba `validateDeliveryInput`, que no depende de la lista.
- **Direcciones**: `Direccion.urbanizacion` es texto libre, sin relación con la zona. Lo escriben `addAddress`/`editAddress` (validado contra la lista) y el modal de clientes del panel (`lib/actions/admin-clients.ts`, texto libre de hasta 120 caracteres, sin validar). Lo muestran la ficha del cliente, la tabla de clientes y el checkout.
- **Pedidos**: `Transaccion.zonaEntrega` y `Transaccion.montoDelivery` ya guardan una copia de la zona y del costo cobrado. La venta manual del panel y la carga de Excel no usan zonas (`montoDelivery: 0`).
- **Pago declarado**: `validatePaymentInput` (`lib/checkout-rules.ts`) rechaza el pedido si `pago.montoUsd` difiere en más de 0,02 del total calculado en el servidor. `validateDeliveryInput` ya exige que un delivery tenga costo mayor que cero.
- **Venta rápida**:
  - `app/venta-rapida/page.tsx` es un Server Component dinámico (usa `searchParams`) y le pasa los productos a `PuntoDeVenta`.
  - El mensaje lo arma `mensajeWhatsapp` (`lib/pos.ts`) y termina en `*NO INCLUYE DELIVERY*`; lo prueba `tests/checkout/quick-sale-channel.test.ts`.
  - El resumen es un `Sheet` cuyo estado vive en `PuntoDeVenta`. "Vaciar" pone el carrito en `{}`.
- **Cotización rápida**: `app/cotizacion-rapida/page.tsx` no usa APIs dinámicas, así que Next puede prerenderizarla. `guardarOrdenProductos` ya resuelve esto con `revalidatePath("/", "layout")`.
- **Checkout**: `app/finalizar-compra/page.tsx` es un componente cliente. `AddressManager` obtiene las direcciones con la Server Action `getAddressesByClient`, y el total que se muestra suma `appStore.deliveryPrice`.
- **Panel**:
  - `requireAdmin()` (`lib/admin/auth.ts`) autoriza las acciones.
  - Las tablas usan `admin-table`, `admin-sheet` y `admin-sheet-input`, con desplazamiento horizontal en el teléfono (`BulkInventoryEditor`).
  - Los títulos van en `components/admin/header.tsx` y la navegación en `adminNavigation` (`components/admin/sidebar.tsx`).
  - `isActive` no confunde `/admin/delivery` con `/admin/delivery-notes`, porque compara contra `link + "/"`.
- **Pruebas**: los módulos que cargan los tests usan imports relativos con extensión y nunca `@/`.
- **Normalización**: con "sin acentos, minúsculas y signos convertidos en espacio", las 90 zonas actuales dan 90 claves distintas (comprobado sobre la lista).

## Decisión 1: Las zonas pasan a una tabla propia

**Decisión**: nuevo modelo `ZonaDelivery` con `nombre`, `clave` (única), `costoUsd`, `activa` y marcas de tiempo. Es la única fuente de zonas y costos; `DELIVERY_ZONES` se elimina.

**Razonamiento**: la dueña tiene que editar zonas sin un desarrollador (FR-004, FR-005), y el checkout tiene que cobrar exactamente lo que ella ve (FR-011, Principio II). Una tabla de 90 filas leída con el singleton `prisma` es lo más simple que cumple ambas cosas.

**Alternativas descartadas**:

- *Mantener la constante y guardar "ajustes" en la base de datos*: dos fuentes que hay que fusionar en cada lectura.
- *Tabla genérica de configuración con un JSON*: sin unicidad ni validación en la base de datos, y cada edición reescribiría las 90 zonas.
- *`Decimal` para el costo*: el resto del dinero del proyecto (`montoDelivery`, `montoTotal`) es `Float` con `roundMoney`. Mezclar tipos complica las sumas sin ganar precisión real en montos de dos decimales.

## Decisión 2: Unicidad con una clave normalizada en la base de datos

**Decisión**: la columna `clave` guarda `claveZona(nombre)` y tiene `@unique`. `claveZona` quita los acentos (NFD), pasa a minúsculas, convierte cualquier signo en espacio y colapsa los espacios: "Av. Victoria (Presidente Medina)" da `av victoria presidente medina`. Un `P2002` en `clave` se traduce a "Ya existe una zona con ese nombre".

**Razonamiento**: la base de datos garantiza la regla incluso si dos personas crean "Chacaito" y "Chacaíto" a la vez (FR-006, Edge Cases). La misma función sirve para buscar (FR-018) y para resolver la zona de una dirección (Decisión 3).

**Alternativas descartadas**:

- *Comprobar solo en la aplicación*: tiene una carrera entre la consulta y la escritura.
- *Índice funcional con `unaccent`*: exige una extensión de PostgreSQL y Prisma no lo representa en el esquema, así que la migración y el esquema divergen.

## Decisión 3: Las direcciones siguen guardando el nombre del sector y se resuelven por clave

**Decisión**:

- `Direccion.urbanizacion` no cambia de tipo.
- El checkout busca la zona con `findUnique({ where: { clave: claveZona(address.urbanizacion) } })`.
- Al renombrar una zona, la misma transacción reescribe `urbanizacion` en las direcciones cuya clave coincide con la clave anterior (FR-014). Lee los valores distintos de `urbanizacion`, filtra en memoria por clave y hace un `updateMany` con `in`.
- `addAddress` y `editAddress` guardan el nombre canónico de la zona activa que coincide por clave.

**Razonamiento**:

- Es el cambio más pequeño que mantiene asociadas las direcciones: ni el modal de clientes, ni la ficha, ni la tabla, ni el checkout cambian su forma de leer la dirección.
- La búsqueda por clave tolera variantes de acento o mayúsculas en direcciones antiguas.
- Si el renombre solo cambia acentos o mayúsculas, la clave no cambia y la dirección sigue resolviendo aunque no se reescriba.

**Alternativas descartadas**:

- *Clave foránea `Direccion.zonaDeliveryId`*: obliga a rellenar el campo en la migración, a cambiar los formularios de dirección del checkout y del panel y a decidir qué hacer con el texto libre del modal de clientes. Es más superficie para el mismo resultado.
- *Reescribir solo las direcciones con el nombre anterior exacto*: dejaría huérfanas las variantes ("Chacaito" guardado cuando la zona era "Chacaíto").

## Decisión 4: Desactivar en lugar de eliminar

**Decisión**:

- `activa Boolean @default(true)`.
- Fuera del panel solo se listan las zonas activas: venta rápida, cotización rápida y selector de sector.
- El checkout rechaza con `INVALID_ADDRESS` una dirección cuya zona está inactiva o no existe, con el mensaje "Tu sector ya no tiene delivery. Elige otro sector o retira en tienda.".
- `addAddress` y `editAddress` rechazan las zonas inactivas.
- Las zonas no se eliminan.

**Razonamiento**: es lo que se aclaró con la dueña. Es reversible y no toca los pedidos, que guardan su propia copia de la zona y del costo (FR-013).

**Alternativas descartadas**: borrado con confirmación (irreversible y no pedido).

## Decisión 5: La migración carga las 90 zonas actuales

**Decisión**: la migración crea la tabla e inserta las 90 zonas con su costo actual, `activa = true` y la `clave` escrita como literal. Las claves se calculan con `claveZona` al escribir la migración, y la migración verifica que haya 90 filas.

**Razonamiento**:

- Producción aplica migraciones con `prisma migrate deploy` y no ejecuta *seeds*, así que la migración es el único camino garantizado (FR-003, SC-004).
- Las bases de prueba migradas tendrán "Altamira" a $3, de modo que la prueba de integración existente sigue pasando sin cambios.

**Alternativas descartadas**:

- *Script de seed*: no corre en producción.
- *Calcular la clave en SQL*: necesitaría `unaccent`.

## Decisión 6: Dónde se leen y se escriben las zonas

**Decisión**:

- `lib/delivery-zone-rules.ts`: módulo puro, sin `@/` ni `server-only`. Lo usan el checkout, las acciones, los tres selectores y las pruebas.
- `lib/delivery-zones.ts`: `listarZonasActivas()` (`server-only`). Es la regla "solo activas, en orden" para sus tres consumidores: las páginas de venta rápida y cotización rápida y la Server Action `getZonasDelivery` del checkout.
- `lib/actions/delivery-zones.ts`: solo escrituras del panel. `crearZonaDelivery` y `actualizarZonaDelivery` llaman a `requireAdmin` y validan con Zod.
- La página del panel consulta todas las zonas directamente.
- `getZonasDelivery` vive en `lib/actions/address.ts`, que es público. Así no se mezcla una lectura pública con acciones de administración.
- El orden se aplica con `ordenarZonas`, una sola función en memoria: costo y luego `localeCompare("es")`. No depende de la intercalación de la base de datos y la tabla del panel la reutiliza para reordenar tras guardar.

**Razonamiento**: la regla de zonas tiene más de tres usos reales y toca dinero, así que vive en un único lugar (Principio I). La separación entre lecturas públicas y escrituras con `requireAdmin` evita exponer una escritura por error (Principio IV).

**Alternativas descartadas**:

- *Repetir la consulta en cada página*: tres copias de una regla de negocio.
- *Ordenar en SQL*: la intercalación de PostgreSQL puede poner "Ávila" después de "Z".

## Decisión 7: Edición en la tabla, celda por celda

**Decisión**:

- La tabla muestra cada nombre y costo como un campo del estilo `admin-sheet-input`.
- Confirmar con Enter, o al salir del campo si el valor cambió, llama a `actualizarZonaDelivery` solo con ese cambio. Escape restaura el valor guardado.
- Si se rechaza, el borrador queda en el campo marcado como inválido, con `toast.error`.
- Si se acepta, la fila se actualiza con la zona devuelta y la tabla se reordena con `ordenarZonas`.
- "Agregar zona" abre una fila nueva al principio de la tabla. Se crea con Enter o con el botón Guardar, nunca al salir del campo, para no crear zonas a medio escribir. Escape o "Descartar" la quitan.
- Cada fila tiene un botón "Desactivar" o "Reactivar".

**Razonamiento**: es lo que pide la spec (FR-004, FR-005 y los escenarios de las Historias 1 y 2). Guardar celda por celda hace que "el último cambio prevalece" se aplique por campo y no sobrescriba la fila completa.

**Alternativas descartadas**:

- *Editor por lotes con un único "Guardar"* (como `BulkInventoryEditor`): la spec pide guardar al confirmar cada celda, y un lote pisaría cambios ajenos en otras zonas.
- *Modal de edición*: contradice "editar directo desde la tabla".

## Decisión 8: El checkout cobra la zona de la base de datos sin campos nuevos

**Decisión**:

- `registrarCompraWeb` resuelve la zona por clave dentro de la transacción y usa `zona.costoUsd` y `zona.nombre` como copia.
- Si el costo cambió mientras el cliente estaba en el checkout, `validatePaymentInput` ya rechaza el pago declarado ("El pago no coincide con el total final."). No se agrega un `montoDeliveryEsperado` a `CheckoutData`.
- `AddressManager` pide las zonas activas una vez (`getZonasDelivery`) y calcula el costo de cada dirección con `buscarZona(zonas, urbanizacion)`.
- Una dirección cuya zona ya no está activa se muestra como "Sin delivery en este sector" y no deja continuar.

**Razonamiento**:

- El navegador nunca decide el cargo (Principio II).
- El caso del cambio de costo a mitad del checkout es raro y ya termina en un rechazo seguro.
- Agregar un campo tocaría el estado duplicado del checkout (`appStore`/`checkoutContext`), que la constitución pide no ampliar.

**Alternativas descartadas**: enviar el costo esperado para dar un mensaje más específico. Amplía el contrato del checkout por un caso marginal.

## Decisión 9: Selector propio en la venta rápida que comparte reglas con el checkout

**Decisión**:

- Nuevo componente `components/venta-rapida/deliverySelector.tsx` con:
  - un interruptor "Agregar delivery";
  - un buscador y una lista agrupada por costo (`agruparPorCosto` y `filtrarZonas`);
  - al elegir una zona, solo la ficha de esa zona con "Cambiar";
  - el formulario de quien recibe.
- El estado (`entrega`) vive en `PuntoDeVenta`, así que sobrevive a cerrar el `Sheet`, y "Vaciar" lo reinicia.
- `ZoneSelector` del checkout pasa a recibir las zonas por props y a agrupar dinámicamente, en lugar de los grupos fijos `[3, 4, 5, 6]`. Así funciona con costos como $3,50.

**Razonamiento**: la interacción pedida (lista visible y luego solo la selección más el formulario) es distinta del combobox del checkout, que además tiene estilos oscuros propios. Lo que debe ser idéntico es la regla de búsqueda y agrupación, y eso se comparte.

**Alternativas descartadas**: generalizar `ZoneSelector` con modos. Acopla dos interfaces distintas por unas pocas líneas de marcado.

## Decisión 10: El mensaje de WhatsApp extiende `mensajeWhatsapp`

**Decisión**:

- `mensajeWhatsapp` recibe un `delivery` opcional con `zona`, `costoUsd` y `recibe: { nombre, telefono, direccion }`.
- Con delivery, añade un bloque "*Delivery*" y en "*Total a pagar*" muestra subtotal, delivery y total.
- Sin delivery, el texto es idéntico al actual, incluido `*NO INCLUYE DELIVERY*`.
- `validarDatosEntrega` valida el teléfono: entre 10 y 15 dígitos; solo admite dígitos, "+", espacios y guiones.

**Razonamiento**: un solo constructor del mensaje, ya probado (FR-020, FR-022).

**Alternativas descartadas**: reutilizar `buildQuoteWhatsAppText` de la cotización. Es otro texto ("cotización") con otras reglas.

## Decisión 11: Invalidación de páginas

**Decisión**: cada escritura de zonas exitosa ejecuta `revalidatePath("/", "layout")`.

**Razonamiento**: la cotización rápida puede estar prerenderizada, y las zonas aparecen en tres superficies (FR-015). Es el mismo mecanismo que `guardarOrdenProductos`.

## Decisión 12: Pruebas

**Decisión**:

- **Lógica pura** (`tests/checkout/delivery-zones.test.ts`): `claveZona`, `validarZona`, `filtrarZonas`, `agruparPorCosto`, `ordenarZonas`, `buscarZona` y `validarDatosEntrega`.
- **Mensaje** (`tests/checkout/quick-sale-channel.test.ts`): `mensajeWhatsapp` con y sin delivery.
- **Integración del checkout** (`tests/checkout/checkout.integration.test.ts`):
  - cobra el costo de una zona creada en la prueba ($4,50) y guarda su nombre canónico;
  - rechaza una zona inactiva sin crear el pedido ni tocar el inventario.
- **Manual** (con el [quickstart](./quickstart.md)): el renombre con direcciones y la interfaz.

**Razonamiento**: el cobro del delivery es dinero (Principio V) y vive en `checkout-core`, que ya es probable contra una base aislada. Las acciones del panel dependen de `requireAdmin` (`server-only`), igual que las demás acciones del panel, que no tienen pruebas directas. Su regla (`validarZona`) es pura y queda probada.
