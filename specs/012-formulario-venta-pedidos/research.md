# Research: Formulario de venta con búsqueda y alta de clientes, edición y eliminación de pedidos

**Fecha**: 2026-11-10 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

La spec no dejó marcadores abiertos. Esta investigación resuelve las incógnitas técnicas del *Technical Context*. Cada decisión parte de lo que ya existe en el código.

## Hallazgos del código actual

1. **El selector de cliente** de `ManualSaleForm` es un `<select>` nativo con todos los clientes. La página `app/admin/add-transaction/page.tsx` ya los carga todos ordenados por nombre. `Cliente.nombreBusqueda` ya existe, normalizado con `normalizeSearchName` (`lib/client-rules.ts`: sin acentos, en minúsculas y con los signos convertidos en espacios).
2. **Ya existe un alta de clientes**: `ClientCreateModal` (`components/admin/clientes/clientCreateModal.tsx`) con `crearClienteAdministrativo`. La acción valida con Zod, revisa la unicidad de teléfono, correo y RIF, registra `HistorialCliente` y devuelve `clientId`. Hoy la modal solo hace `router.refresh()` y se cierra.
3. **Error de fecha en la venta manual**, en dos partes:
   - El formulario propone `new Date().toISOString().slice(0, 16)`, que es la hora UTC: a las 21:30 de Caracas muestra el día siguiente a la 01:30.
   - El servidor interpreta el texto de `datetime-local` con `z.coerce.date()`, en la zona del servidor (UTC). Una hora escrita a mano queda 4 horas corrida.

   Hoy los dos errores se compensan con el valor por defecto, pero no cuando se escribe la fecha. Ambos violan la constitución v2.1.0 ("Fechas y horas").
4. **Error en el total de los pedidos con delivery**: el checkout guarda `montoTotal = subtotal + delivery − descuentos`. Sin embargo, `actualizarDescuentoVenta` y `guardarEdicionMasivaVentas` (`lib/actions/admin-sales.ts`) recalculan con `calculateSaleTotals`, que no suma `montoDelivery`. Por eso, cambiar el descuento de un pedido web con delivery borra el costo del delivery de su total.
5. **El historial ya admite eventos sin cambio de estado**: `StatusHistory` muestra "Evento · {estado}" cuando `estadoAnterior === estadoNuevo`. `EstadoTransaccionHistorial` es de solo inserción y tiene `motivo` libre.
6. **No hay borrado en cascada desde `Transaccion`**, salvo en `EstadoTransaccionHistorial`. `DetalleCompra`, `Pago`, `Fidelidad`, `MovimientoSaldo`, `Resena` y `NotaEntrega` referencian el pedido sin cascada.
7. **Los bloqueos ya siguen un orden fijo**: primero `bloquearCliente` y luego `SELECT … FROM "Transaccion" … FOR UPDATE` (en `abonos.ts` y `canje-pedido.ts`). El inventario se mueve con `ajustarInventario`, que bloquea la fila del producto.
8. **Los puntos solo se reconocen por tipo de movimiento**: `revertirPuntosDePedido` calcula los ganados netos de un pedido como la suma de `acumulacion` y `reversion`. Un ajuste de puntos ligado al pedido debe usar esos dos tipos para que una cancelación posterior lo revierta bien.

## Decisión 1: Búsqueda de clientes en memoria, sobre `nombreBusqueda`

- **Decision**: Un combobox propio, `ClientSearch`, que filtra en el navegador la lista que la página ya carga. La regla pura `filtrarClientes(clientes, texto, limite)` vive en `lib/client-rules.ts`:
  - normaliza el texto con `normalizeSearchName`;
  - lo parte en palabras y exige que todas aparezcan en `nombreBusqueda`;
  - ordena primero los que empiezan por la primera palabra y luego por nombre;
  - devuelve como máximo 20 resultados.

  Cada resultado muestra el nombre, el tipo y el teléfono o el RIF. El componente se maneja con flechas, Enter y Escape, con `role="combobox"`/`listbox`.
- **Rationale**: La lista ya llega completa para el `<select>` actual, y con cientos o pocos miles de clientes filtrar en memoria es instantáneo (SC-001). La normalización ya existe y es la misma del listado de clientes.
- **Alternatives considered**:
  - Una Server Action de búsqueda con *debounce*: añade latencia y una acción nueva sin necesidad.
  - `<datalist>` nativo: no ignora acentos de forma uniforme entre navegadores, no permite mostrar el teléfono para distinguir homónimos y su comportamiento con el teclado no se controla.
  - Una librería de combobox (cmdk, Headless UI): es una dependencia nueva, prohibida por el Principio I si el stack lo resuelve.

## Decisión 2: El alta reutiliza `ClientCreateModal` y devuelve el cliente creado

- **Decision**:
  - `ClientCreateModal` acepta dos props opcionales: `nombreInicial` y `onCreated(cliente)`.
    - Con `nombreInicial`, la primera palabra se precarga como nombre y el resto como apellido.
    - Con `onCreated`, la modal entrega el cliente al formulario, que lo agrega a su lista local y lo selecciona.
    - Sin `onCreated`, se comporta como hoy.
  - `crearClienteAdministrativo` amplía su respuesta de éxito con `cliente: { id, nombre, apellido, tipoCliente, celular, rif, nombreBusqueda }`.
  - En el formulario de venta la modal se abre por encima sin desmontar nada, así que las líneas cargadas no se pierden.
- **Rationale**: Es el mismo alta, con las mismas validaciones (FR-007), sin duplicar código. Devolver el cliente evita esperar a `router.refresh()` para aplicar el tipo de precio.
- **Alternatives considered**:
  - Un formulario de alta reducido dentro de la venta: duplicaría validaciones y reglas de RIF y teléfono.
  - Navegar a `/admin/clients` y volver: se pierde lo cargado, que es justo el problema que reporta la usuaria.

## Decisión 3: La edición usa la misma página y el mismo formulario: `/admin/add-transaction?editar=<id>`

- **Decision**:
  - **Página**: `app/admin/add-transaction/page.tsx` lee `searchParams.editar`.
    - Si viene, carga el pedido y lo convierte en `PedidoEditable` (ver [data-model.md](./data-model.md)).
    - Si el pedido no existe o está cancelado, responde `notFound()`.
    - Cambia el título a "Editar pedido {numeroOrden}".
    - A la lista de productos (hoy solo los que tienen existencia mayor que 0) suma los productos que ya están en el pedido.
  - **Formulario**: `ManualSaleForm` recibe `pedido?: PedidoEditable`. Con él:
    - precarga el estado inicial;
    - oculta el estado inicial, la confirmación de cobro, los canjes y el saldo a favor;
    - muestra en solo lectura las líneas de premio, el descuento por puntos, el delivery y lo abonado;
    - en un pedido pagado, muestra la casilla "Confirmo que cobré la diferencia" cuando el total sube;
    - envía a `editarVentaManual`.
  - **Navegación**: al guardar, vuelve a `/admin/transactions/{id}`.
- **Rationale**: La usuaria pidió exactamente esto: ir "al formulario de crear orden ya con la data precargada". Se reutilizan la página, la carga de clientes, productos, saldos y puntos, y el formulario.
- **Alternatives considered**:
  - Una ruta `/admin/transactions/[id]/editar`: es otro archivo de página con la misma carga de datos.
  - Editar dentro de una modal en la tabla: el formulario es demasiado grande para una modal en el teléfono.
  - Ampliar el editor masivo: hoy no edita líneas y su modelo es de una línea por fila.

## Decisión 4: Concurrencia con una huella del pedido, sin cambiar el esquema

- **Decision**: La regla pura `versionPedido(snapshot)` calcula un SHA-256, truncado a 16 caracteres hexadecimales, de:
  - el estado, el total, el número de orden, el cliente y la fecha;
  - las líneas: id, producto, cantidad y precio;
  - los pagos: id y si están anulados;
  - los ids de los movimientos de puntos y de saldo a favor;
  - el id del último evento del historial.

  La página la entrega al formulario. `editarVentaManual` la vuelve a calcular **después** de bloquear al cliente y al pedido, y si no coincide rechaza con "El pedido cambió mientras lo editabas. Vuelve a abrirlo."

  Para eliminar basta una verificación más simple: la tabla envía el `estado` y el `montoTotal` que mostró, y dentro de la transacción se comparan y se revalidan las condiciones de FR-018.
- **Rationale**: Un abono, un canje o un cambio de estado no actualizan la fila `Transaccion` (los abonos insertan en `Pago`), así que una columna `updatedAt` no los detectaría. La huella sí, y no requiere migración.
- **Alternatives considered**:
  - `Transaccion.updatedAt` con `@updatedAt`: necesita una migración y no detecta las inserciones en tablas hijas.
  - No verificar: la última escritura gana y se pierde un abono o un canje (incumple FR-024).
  - Calcular la huella también en la tabla para eliminar: obligaría a cargar pagos, movimientos e historial de 20 filas por página solo para un caso raro.

## Decisión 5: Edición de líneas por reemplazo, con el inventario ajustado por diferencia

- **Decision**: Dentro de la transacción:
  1. Se separan las **líneas cobradas** (`precioUnitario > 0`) de las **líneas de premio** (`precioUnitario = 0`). Estas se conservan intactas.
  2. La regla pura `diferenciasInventario(anteriores, nuevas)` agrupa por producto y devuelve `{ productoId, delta }`, donde `delta = nueva − anterior` y no hay entradas con delta 0.
  3. Si el pedido no es importado, se aplica `ajustarInventario(tx, productoId, -delta, { exigirStock: delta > 0 })` en orden de `productoId`, para evitar interbloqueos.
  4. Se borran las líneas cobradas anteriores y se insertan las nuevas, con su `tipoPrecio`.

  El disponible para un aumento es la existencia actual más lo que el pedido ya tenía, porque solo se descuenta la diferencia.
- **Rationale**: Cumple FR-015 y SC-004 con el mismo mecanismo de inventario de ventas y cancelaciones. Reemplazar las líneas es más simple que emparejarlas una por una, y el historial guarda un resumen legible de los cambios.
- **Alternatives considered**:
  - Devolver todo y volver a descontar todo: hace lo mismo con más escrituras, y rechazaría un pedido sin cambios cuando el producto tiene la existencia en negativo.
  - Editar las líneas por id: complica el formulario sin beneficio para la usuaria.

## Decisión 6: Una sola regla para el total de un pedido existente, con delivery

- **Decision**: La regla pura `recalcularTotalPedido({ lineasCobradas, descuento, tasaCambio, descuentoPuntosUsd, montoDeliveryUsd })` (en `lib/admin/sales-calculations.ts`) usa `calculateSaleTotals` y suma `montoDelivery` al total. La usan tres lugares:
  - `editarPedidoEnTx`;
  - `actualizarDescuentoVenta`;
  - `guardarEdicionMasivaVentas` (filas existentes).

  En los dos últimos corrige el hallazgo 4: el delivery deja de desaparecer del total.
- **Rationale**: El Principio I permite extraer cuando hay tres usos reales, y el Principio II exige que la regla del total viva en un solo lugar. Sin esto, la edición sumaría el delivery y los otros dos editores lo seguirían borrando.
- **Alternatives considered**:
  - Sumar el delivery solo en la edición: deja dos reglas distintas para el mismo total y mantiene el error.
  - Corregir los editores en un cambio aparte: el error es de la misma regla que esta función introduce, así que se corrige al reutilizarla.

## Decisión 7: Pedidos pagados: confirmación de la diferencia y ajuste de puntos

- **Decision**:
  - **Total**:
    - Si el total sube en un pedido pagado, `requiereConfirmarDiferencia({ estado, totalAnteriorUsd, totalNuevoUsd })` devuelve verdadero, y sin `confirmarCobroDiferencia = true` la acción rechaza.
    - El pedido sigue `pagado` y no se evalúa el crédito.
    - Si baja, se guarda, siempre que no quede por debajo de lo abonado (`validarTotalContraAbonado`).
  - **Puntos**: solo si `participaEnFidelidad` y el pedido ya tiene un movimiento de `acumulacion`:
    1. `ajustePuntosPorEdicion({ ganadosNetos, esperados, disponibles, devueltos })` compara los puntos esperados (`calcularPuntosGanados` con los nuevos montos) con los ganados netos del pedido.
    2. Si la diferencia es positiva, crea una `acumulacion` por esa diferencia.
    3. Si es negativa, crea una `reversion` limitada por `topeReversion`.

    El motivo es "Ajuste por edición del pedido {numeroOrden}".

    Los pedidos pagados antes de que existieran los puntos (sin acumulación) no reciben puntos retroactivos.
  - **Saldo en 0 sin pagar**: si una edición deja en 0 el saldo de un pedido no pagado, el pedido conserva su estado, como ya pasa con el editor de descuento; la usuaria lo marca como pagado con el control de estado.
- **Rationale**: Cumple FR-012 y SC-009. Usar `acumulacion` y `reversion` mantiene correcta la cancelación posterior (hallazgo 8). La confirmación de la diferencia sigue la regla de "Confirmo el cobro" que ya existe.
- **Alternatives considered**:
  - Movimiento de tipo `ajuste`: no lo ve `revertirPuntosDePedido` y dejaría puntos huérfanos si el pedido se cancela más adelante.
  - Pasar el pedido a pagado automáticamente cuando el saldo queda en 0: es otra regla de estado dentro de la edición y el editor de descuento no lo hace.

## Decisión 8: Crédito y cambio de cliente al editar

- **Decision**:
  - **Crédito**: en pedidos no pagados se evalúa `evaluarCredito` con `deudaUsd = consultarDeudaCliente(cliente)`, que ya incluye este pedido.
    - Si el cliente es el mismo, `montoSinCobrarUsd = max(0, totalNuevo − totalAnterior)`.
    - Si cambia, `montoSinCobrarUsd = max(0, totalNuevo − abonado)` para el cliente nuevo.

    Si se excede, se lanza `CreditoRequiereAutorizacion` y el formulario muestra la misma modal que hoy. La autorización queda en el motivo del evento de edición.
  - **Cambio de cliente**: se rechaza si el pedido tiene movimientos de puntos o de saldo a favor (misma regla que el editor masivo). Se bloquean ambos clientes en orden ascendente de id y luego el pedido.
- **Rationale**: Es la regla de crédito de la venta manual aplicada solo a lo que la edición añade, y el bloqueo mantiene el orden de `cliente-lock.ts`.
- **Alternatives considered**: Pedir autorización por todo el total en cada edición: pediría autorizar ventas que ya se autorizaron.

## Decisión 9: Fechas en hora de Caracas con dos utilidades puras

- **Decision**: En `lib/format.ts`, junto a `ZONA_HORARIA`:
  - `fechaHoraLocalCaracas(instante): string` devuelve `"YYYY-MM-DDTHH:mm"` con `Intl.DateTimeFormat(..., { timeZone: ZONA_HORARIA })`. Se usa para el valor por defecto y para precargar la edición.
  - `interpretarFechaHoraCaracas(texto): Date | null` valida el formato `YYYY-MM-DDTHH:mm` y crea el instante con el desfase fijo `-04:00`. Caracas no tiene horario de verano, como dice la constitución.

  Para que la fecha quede idéntica (FR-010), la acción recibe además `fechaOriginal` (el texto precargado). Si `fechaCompra === fechaOriginal`, conserva el instante guardado con sus segundos.

  La misma interpretación se aplica a `registrarVentaManual`, en lugar de `z.coerce.date()`.
- **Rationale**: Corrige el hallazgo 3 y cumple la constitución v2.1.0 sin dependencias. Reutiliza `ZONA_HORARIA` como única fuente.
- **Alternatives considered**:
  - Una librería de fechas (date-fns-tz, Luxon): es una dependencia innecesaria.
  - Enviar la fecha en ISO desde el navegador: depende de la zona del navegador, lo que la constitución prohíbe.
- **Fuera de alcance**: el editor masivo también interpreta fechas con `z.coerce.date()`. Esta función no toca sus fechas; queda como trabajo de adopción de la constitución en un cambio aparte.

## Decisión 10: Eliminación definitiva con condiciones revalidadas

- **Decision**:
  - **Regla pura**: `motivoNoEliminable({ estado, pagos, movimientosPuntos, movimientosSaldo, notasEntrega, resenas })` devuelve el texto del motivo, o `null` si el pedido se puede eliminar. Bloquean la eliminación:
    - estar pagado;
    - tener cualquier pago con `esAbono`, aunque esté anulado;
    - tener movimientos de puntos o de saldo a favor;
    - tener notas de entrega o reseñas.
  - **La tabla** calcula `eliminable` con `_count` de esas relaciones y un `some` de abonos.
  - **`eliminarPedidoEnTx`** sigue estos pasos:
    1. bloquea al cliente y luego al pedido;
    2. compara el `estado` y el `montoTotal` esperados;
    3. vuelve a evaluar `motivoNoEliminable`;
    4. si el pedido no es importado ni está cancelado, devuelve el inventario de las líneas con `ajustarInventario(..., { exigirStock: false })`;
    5. borra los `Pago` (solo quedan los declarados), las `DetalleCompra`, el historial (por cascada) y el `Transaccion`.
- **Rationale**: Cumple FR-018 a FR-021 con la opción A elegida por la usuaria. Como ningún movimiento de dinero, puntos ni documento queda colgando, nada fuera del pedido se descuadra.
- **Alternatives considered**: Borrado lógico (`eliminadoEn`): la usuaria eligió el borrado definitivo, y el borrado lógico obligaría a filtrar todas las consultas.

## Decisión 11: Registro de la edición en el historial

- **Decision**:
  - Se inserta un `EstadoTransaccionHistorial` con `estadoAnterior = estadoNuevo = estado actual`, el actor y un `motivo` de hasta 500 caracteres, del tipo "Pedido editado: …".
  - El texto lo genera la regla pura `resumirCambiosPedido(antes, despues)`. Lista los cambios de número de orden, cliente, fecha, entrega, tasa y descuento, las líneas agregadas, quitadas y modificadas (producto y cantidad o precio), y los totales antes y después. Si el texto supera el límite, se recorta con "…".
  - Si la edición no cambia nada, la acción responde "No hay cambios para guardar." y no escribe.
- **Rationale**: Cumple FR-017 y SC-006 sin tablas nuevas: el historial ya es de solo inserción y ya muestra los "Evento".
- **Alternatives considered**: Una tabla de auditoría con un diff en JSON: requiere un esquema nuevo para un caso que el historial ya cubre.

## Decisión 12: Interfaz de las acciones en la tabla

- **Decision**:
  - **Tabla**: la columna final pasa de "Ver" a "Acciones", con "Ver", "Editar" (`Pencil`) y "Eliminar" (`Trash2`, en el tono de error del panel). "Editar" no aparece en pedidos cancelados, y "Eliminar" aparece solo si `eliminable`.
  - **Tarjetas**: muestran las mismas acciones al pie.
  - **Detalle del pedido**: gana un botón "Editar".
  - **Confirmación**: la modal de eliminación (`DeleteOrderDialog`) sigue el patrón de la modal de crédito del formulario:
    - `role="dialog"` y `aria-modal`;
    - se cierra con Escape y al pulsar fuera;
    - el foco inicial va a "Volver";
    - el botón "Eliminar pedido" se desactiva mientras se procesa.
  - **Paginación**: si se elimina la única fila de una página mayor que 1, se navega a la página anterior.
- **Rationale**: FR-011, FR-019 y los casos límite de doble clic y página vacía, con componentes y clases `admin-*` existentes.
- **Alternatives considered**: Un menú de acciones desplegable: es un componente nuevo para solo tres acciones.

## Verificación técnica pendiente: ninguna

No quedan marcadores *NEEDS CLARIFICATION* en el *Technical Context*.
