# Research: Perfil del cliente, crédito, saldo a favor y fidelización

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-29

Cada decisión indica qué se eligió, por qué y qué se descartó. Todas parten del código actual. Sus puntos de partida:

- `lib/admin/abonos.ts`: `calcularSaldo`, `registrarAbonoEnPedido` y `anularAbonoEnPedido`.
- `lib/admin/order-state-change.ts`: la cancelación devuelve el inventario.
- `lib/actions/checkout.ts`: hoy acredita `floor(montoTotal)` puntos al crear el pedido.
- `lib/actions/admin-sales.ts`: venta manual y editor masivo.
- `lib/admin/auth.ts`: `requireAdmin`.
- `stack/server.tsx`: Stack Auth con cookie de Next.

---

## R1. Identidad de los clientes y protección del panel

**Decisión**:

- Los clientes usan la **misma instancia de Stack Auth** que el panel.
- El acceso al panel pasa a depender **solo** de la lista `ALLOWED_EMAILS`, que ahora falla cerrada: en producción, una lista vacía o ausente niega el acceso a todos.
- La regla vive en una función pura nueva, `esCorreoAdministrador(email, lista)` en `lib/admin/auth-rules.ts`. La usan `requireAdmin` y `app/admin-login/page.tsx`, que hoy evalúa la lista por su cuenta y de forma distinta.
- El atajo de desarrollo de `requireAdmin` (`NODE_ENV === "development"`) se mantiene.

**Rationale**:

- Hoy `requireAdmin` deja pasar a **cualquier usuario autenticado** si `ALLOWED_EMAILS` está vacía. Mientras solo el equipo tenía cuentas, el riesgo era bajo; al abrir el registro a clientes, ese fallo daría el panel completo a cualquier cliente. FR-042 exige que eso no ocurra "sin depender de que la lista esté configurada", y fallar cerrado es la forma más simple de cumplirlo.
- Una sola instancia evita un segundo proveedor de identidad. La constitución (IV) no lo permite sin decisión documentada, y esta spec documenta solo el registro público, no un proveedor nuevo.

**Alternatives considered**:

- *Equipos o permisos de Stack Auth para distinguir administradoras*: añade configuración en el dashboard y una segunda fuente de verdad sobre quién es admin. La lista ya existe.
- *Segundo proyecto de Stack Auth para clientes*: dos `StackServerApp`, dos juegos de cookies y de variables. Es más complejo y no aporta nada.
- *Marcar a los clientes con metadatos y negar el panel a quien los tenga*: falla abierta. Una cuenta sin marca seguiría entrando.

**Adopción**: el despliegue DEBE definir `ALLOWED_EMAILS` antes de activar el registro. Hay que dejarlo en el README y en el quickstart.

---

## R2. Vinculación entre cuenta y cliente

**Decisión**:

- Se crea un modelo `CuentaCliente` que relaciona un usuario de Stack (`stackUserId`, único) con **un** `Cliente` (`clienteId`, único) y tiene un estado, `vinculada` o `pendiente`.
- `resolverVinculacion` (pura, en `lib/cuenta-cliente-rules.ts`) decide el resultado:
  1. **Correo no verificado** (`primaryEmailVerified = false`): no hay vinculación. "Mi cuenta" pide verificar el correo.
  2. **El correo verificado coincide** con `Cliente.email` (sin distinguir mayúsculas) y ese cliente no tiene cuenta: `vinculada`.
  3. **No coincide el correo**: la persona completa nombre, apellido y teléfono.
     - Si el teléfono coincide con un cliente sin cuenta: `pendiente` con ese `clienteId`.
     - Si no coincide con nadie: se crea un `Cliente` `detal` y la cuenta queda `vinculada`.
  4. **El cliente encontrado ya tiene otra cuenta**: se rechaza con un mensaje para escribir por WhatsApp. Lo resuelve la administradora.
- La administradora confirma una vinculación `pendiente` (pasa a `vinculada`, con quién y cuándo) o desvincula una cuenta (borra la fila). Una cuenta desvinculada vuelve al paso 3 en su próxima visita.

**Rationale**:

- El correo verificado es la única prueba de identidad que da el proveedor; el teléfono no se verifica, por eso nunca vincula solo (spec, casos borde).
- Con `clienteId` único, una cuenta pendiente "reserva" al cliente y nunca puede haber dos cuentas sobre el mismo registro.
- Se vincula por `stackUserId` y no por correo, así que si el cliente cambia su correo en el proveedor, el vínculo no se rompe.

**Alternatives considered**:

- *Columna `stackUserId` en `Cliente`*: no puede representar una cuenta pendiente cuando la persona aún no tiene cliente propio, ni guardar quién confirmó.
- *Verificación por SMS o WhatsApp*: requiere un servicio externo, y la constitución no permite añadirlo.
- *Fusionar clientes al vincular*: la spec 003 dejó la fusión fuera de alcance.

---

## R3. Rutas del cliente e inicio de sesión

**Decisión**:

- **Ruta**: una sola, `app/mi-cuenta/page.tsx` (Server Component), dentro de la **Tienda pública**. Según la sesión, muestra:
  - sin sesión: las acciones Ingresar y Crear cuenta;
  - correo sin verificar: el aviso para verificarlo;
  - sin vínculo: el formulario de registro;
  - vínculo pendiente: el aviso de confirmación pendiente;
  - vínculo confirmado: el resumen.
- **Inicio de sesión**: se reutilizan las páginas de Stack que ya existen en `/handler/[...stack]`, con `?after_auth_return_to=/mi-cuenta`. Stack admite ese parámetro (verificado en `@stackframe/stack`). No se cambian las `urls` globales de `StackServerApp`, para no alterar el flujo de `/admin-login`.
- **Botón "Ingresar" de la cabecera**: hoy `components/productos/loginButton.tsx` busca al cliente por teléfono sin autenticar y su "Regístrate aquí" no hace nada. Pasa a ser un enlace a `/mi-cuenta`, con el nombre del cliente si hay sesión vinculada.
- **Configuración fuera del repo**: los métodos de acceso de los clientes (Google y/o correo y contraseña con verificación) y el registro abierto se configuran en el dashboard de Stack Auth.

**Rationale**: una ruta y los componentes del proveedor bastan; no hace falta `middleware`/`proxy`, porque cada página y acción valida la sesión en el servidor, como ya hace el panel. Además, el botón actual simula una sesión que no existe, y mantener dos "ingresos" distintos confundiría al cliente.

**Alternatives considered**:

- *Varias rutas (`/mi-cuenta/puntos`, `/mi-cuenta/pedidos`…)*: la información cabe en una página móvil con secciones.
- *Componentes `<SignIn/>` embebidos en `/mi-cuenta`*: queda como alternativa si la redirección con `after_auth_return_to` no se comporta como se espera en el despliegue.

---

## R4. La deuda se deriva, no se guarda

**Decisión**:

- `consultarDeudaCliente(db, clienteId)` está en `lib/admin/abonos.ts`. Suma `calcularSaldo` de los pedidos del cliente en `por_cobrar`, `pendiente` o `en_pedido`, el mismo filtro de `consultarCuentasPorCobrar`.
- `evaluarCredito({ habilitado, limiteUsd, deudaUsd, montoSinCobrarUsd })` (pura) devuelve el disponible y si la venta requiere autorización.

**Rationale**: FR-007 exige que la ficha y las cuentas por cobrar coincidan siempre. Si ambas usan la misma función, la igualdad se cumple sola.

**Alternatives considered**: *guardar un saldo deudor en `Cliente`*: habría que mantenerlo en cada abono, cambio de estado, edición y carga, y es la duplicación que la constitución (II) prohíbe.

---

## R5. Saldo a favor: un libro de movimientos

**Decisión**:

- **Libro**: el modelo nuevo `MovimientoSaldo` tiene `montoUsd` con signo, un `origen` (`sobrepago`, `pago_cuenta`, `pedido_cancelado`, `aplicacion_pedido`, `anulacion`, `ajuste`), el pedido y el pago relacionados, los datos de cobro cuando es dinero recibido, el motivo y el actor. El saldo es `SUM(montoUsd)`.
- **Aplicar saldo a un pedido**: crea un `Pago` con `esAbono = true` y el método nuevo `MetodoPago.SaldoAFavor`, más un movimiento negativo enlazado a ese pago. La aplicación reutiliza `registrarAbonoEnPedido`, así que el pedido se salda y pasa a "Pagado" con la misma regla de siempre, y `calcularSaldo` no cambia.
- **Revertir una aplicación**: se anula ese abono. `anularAbonoEnPedido` devuelve el monto con un movimiento `anulacion` positivo.

**Rationale**:

- El saldo a favor no pertenece a ningún pedido, por eso necesita registro propio.
- Que los movimientos solo se inserten da la trazabilidad de FR-012.
- Tratar la aplicación como un abono evita una segunda forma de saldar pedidos.

**Alternatives considered**:

- *Columna `saldoAFavorUsd` en `Cliente`*: pierde el origen y el autor de cada cambio, y no es auditable (SC-004).
- *Aplicar el saldo como descuento del pedido*: cambiaría `montoTotal`, que es canónico, y mezclaría dinero del cliente con rebajas del negocio.

---

## R6. Sobrepago

**Decisión**:

- `dividirAbono(montoUsd, saldoUsd)` (pura) devuelve `{ aplicadoUsd, excedenteUsd }`.
- `registrarAbonoEnPedido` acepta `permitirExcedente`. Sin ese permiso, un abono mayor que el saldo se sigue rechazando con el mensaje actual. Con él:
  - se crea el `Pago` por lo **aplicado**;
  - se crea un `MovimientoSaldo` `sobrepago` por el excedente, enlazado a ese pago y con los mismos datos de cobro;
  - si el abono fue en Bs, el `montoBs` se reparte en proporción (`repartirBs`); el último centavo queda en el movimiento.
- La interfaz muestra el reparto con la misma función pura y envía `permitirExcedente` solo después de que la administradora confirma (FR-013).
- `anularAbonoEnPedido` también revierte el excedente enlazado con un movimiento `anulacion` negativo, y rechaza la anulación si eso deja el saldo a favor en negativo (FR-017).

**Rationale**: así lo abonado de un pedido nunca supera su total. Las vistas de abonos, el resumen de cuentas por cobrar y `validarTotalContraAbonado` siguen siendo correctos sin cambios, y el dinero recibido (pago más excedente) se puede rastrear.

**Alternatives considered**: *registrar el `Pago` por el monto completo y además el excedente*: el abonado superaría el total, y el excedente quedaría contado dos veces en cualquier suma de pagos.

---

## R7. La cancelación devuelve lo abonado

**Decisión**:

- En `aplicarCambioEstadoPedido`, al cancelar, se suma `calcularAbonado(pagos)` (los abonos vigentes, incluidas las aplicaciones de saldo a favor). Si es mayor que 0, se crea un `MovimientoSaldo` `pedido_cancelado` por ese total, en la misma transacción.
- Los `Pago` del pedido no se anulan: siguen siendo el registro del dinero recibido, y el movimiento apunta al pedido.
- Aplica también a los pedidos importados, porque sus abonos son dinero real.

**Rationale**: hoy la cancelación de un pedido con abonos deja ese dinero sin destino. FR-016 lo resuelve sin tocar la regla de inventario, que sigue omitiendo los importados.

---

## R8. Concurrencia: un bloqueo por cliente

**Decisión**:

- `bloquearCliente(tx, clienteId)` ejecuta `SELECT … FROM "Cliente" WHERE id = $1 FOR UPDATE`. Toda operación que lee y luego escribe saldo a favor, puntos o crédito lo llama **antes** de bloquear el pedido (`"Transaccion" FOR UPDATE`, como hoy en `registrarAbonoEnPedido`).
- El orden fijo es Cliente → Transaccion, para evitar interbloqueos entre operaciones del mismo cliente.
- `registrarAbonoEnPedido` lee el `clienteId` del pedido sin bloquear, bloquea al cliente y después bloquea el pedido.

**Rationale**: una sola fila serializa todas las operaciones de dinero y puntos de un cliente, con el mismo mecanismo que ya usa `ajustarInventario`. Así se cumplen FR-045 y SC-004 (nunca hay saldos negativos con operaciones simultáneas).

**Alternatives considered**: *aislamiento `Serializable` con reintentos*: añade lógica de reintento en cada acción y cambia el comportamiento del resto de la transacción.

---

## R9. Crédito y autorización de ventas

**Decisión**:

- **Datos**: `Cliente` gana `creditoHabilitado` (por defecto `false`) y `limiteCreditoUsd`. Cada cambio escribe un `HistorialCliente` (`accion: actualizado`) con el campo nuevo `detalle`, por ejemplo `"Crédito: deshabilitado → habilitado, límite USD 100,00"` (FR-010).
- **Cuándo pide autorización**: al registrar una venta manual **sin cobro y sin pago declarado**. Es decir, `estadoInicial` distinto de `pagado` y sin `pago`, y `montoSinCobrar = total − saldo a favor aplicado`. Si `evaluarCredito` indica que hace falta:
  - sin `autorizarCredito` la acción devuelve `requiereAutorizacion` con la deuda, el límite, el disponible y el exceso;
  - la interfaz muestra la confirmación y reenvía con `autorizarCredito = true`.
- **Dónde queda registrada**: en el historial inicial del pedido (`EstadoTransaccionHistorial`, append-only, con actor), con el motivo `"Venta registrada manualmente · Autorizada sobre el crédito: excede USD X (deuda USD Y, límite USD Z)"`.
- **Editor masivo**: las filas nuevas siguen la misma regla. Una casilla "Autorizo las ventas que exceden el crédito" funciona igual que la `confirmarPagos` que ya existe. Si falta, el guardado se rechaza y el mensaje lista las filas afectadas.
- **Fuera de la regla**: cargas de Excel, pedidos de la tienda, agregar productos a un pedido existente y descuentos posteriores.

**Rationale**:

- Una venta con pago declarado no es fiado (spec, Assumptions). Pedir autorización ahí molestaría en cada venta por transferencia que aún no se verifica.
- El historial de estado ya registra quién y cuándo, sin columnas nuevas, y basta para SC-012.

**Alternatives considered**: *columnas `creditoAutorizadoPor`/`creditoExcedidoUsd` en `Transaccion`*: son más fáciles de consultar, pero añaden esquema para un dato que se lee caso por caso desde la ficha o el detalle del pedido.

---

## R10. Puntos: reutilizar `Fidelidad` con signo

**Decisión**:

- **Modelo**: `Fidelidad` sigue siendo el libro de puntos. `puntos` pasa a tener signo (los registros existentes son acumulaciones positivas, así que no cambian). Se amplía `TipoMovimiento` con `devolucion` (vuelven los puntos de un canje), `reversion` (se quitan puntos ganados) y `ajuste`, y se añaden `motivo`, `actorId`, `actorEmail`, `premioId` y `descripcion` (copia del nombre del premio). El saldo es `SUM(puntos)`.
- **Acreditación**: `acreditarPuntosPorPago(tx, transaccionId)` en `lib/fidelidad.ts` acredita si se cumplen todas estas condiciones:
  - el pedido está `pagado` y `importada = false`;
  - el cliente es `detal` en ese momento;
  - el pedido no tiene ya una `acumulacion`.

  El monto es `floor(montoSubtotal − montoDescuento − montoDescuentoPuntos)`, que no incluye el delivery. Se llama en los seis lugares donde un pedido pasa a pagado:
  1. `registrarAbonoEnPedido`, al saldar con abonos o con saldo a favor;
  2. `aplicarCambioEstadoPedido`, cuando el estado nuevo es `pagado`;
  3. `registrarVentaManual`, con `estadoInicial = pagado`;
  4. `guardarEdicionMasivaVentas`, en filas existentes o nuevas que quedan pagadas;
  5. el checkout, cuando el saldo a favor cubre todo el pedido;
  6. `canjearPremioEnPedido`, si el descuento deja el pedido pagado.
- **Checkout**: deja de acreditar al crear el pedido. La confirmación dice que los puntos se acreditan cuando se confirma el pago.
- **Reversión al cancelar**: `revertirPuntosDePedido` suma los movimientos del pedido. Revierte la acumulación neta con un `reversion` negativo y devuelve los canjes con un `devolucion` positivo. La reversión tiene un tope: el saldo disponible después de las devoluciones. Si el cliente ya gastó esos puntos, se revierte hasta dejarlo en 0 y el motivo registra la diferencia (FR-023: nunca negativo). Solo puede pasar con pedidos que acumularon con la regla anterior.

**Rationale**:

- La tabla y la relación ya existen. Basta ampliar el enum y las columnas, en lugar de crear un libro paralelo.
- Una sola función de acreditación con su propia guarda ("ya tiene acumulación") cumple FR-021 aunque se llame desde varios lugares, y cubre los pedidos antiguos que acumularon al crearse.

**Alternatives considered**:

- *Acreditar con un trigger de base de datos*: lleva una regla de negocio fuera de TypeScript, sin pruebas en `node:test`.
- *Bloquear la cancelación si dejaría puntos negativos*: frena una operación de inventario y dinero por un detalle de fidelidad heredado.

---

## R11. Premios y canjes

**Decisión**:

- **Modelo**: `Premio` tiene `tipo` (`descuento` | `producto`), `costoPuntos`, `montoDescuentoUsd` o `productoId` más `cantidad` (entera, porque la tienda vende unidades), y `activo`. Los premios se desactivan, nunca se borran.
- **Canje**: no tiene tabla propia. Es un movimiento `Fidelidad` `redencion` con `puntos` negativos, `premioId`, `transaccionId` y la `descripcion` copiada.
- **Descuento**: se suma en la columna nueva `Transaccion.montoDescuentoPuntos`. Total = `subtotal + delivery − montoDescuento − montoDescuentoPuntos`. El total de descuentos no puede superar el subtotal de productos.
- **Producto gratis**: es un `DetalleCompra` con `precioUnitario = 0` y `tipoPrecio = promo`, y descuenta inventario con `ajustarInventario(…, { exigirStock: true })`. La cancelación lo devuelve como cualquier línea.
- **Recálculo de totales**: `calculateSaleTotals` recibe `descuentoPuntosUsd` (por defecto 0) y `calculateCheckoutTotals` usa su parámetro `descuento`, que ya existe. `actualizarDescuentoVenta` y el editor masivo pasan el `montoDescuentoPuntos` del pedido, para no perder el descuento al recalcular.
- **Canje en un pedido existente**: `canjearPremioEnPedido` está permitido en `por_cobrar`, `pendiente` y `en_pedido`. Exige que el total nuevo no quede por debajo de lo abonado (`validarTotalContraAbonado`). Si el descuento deja el saldo en 0, el pedido pasa a pagado y acredita puntos.

**Rationale**: no hace falta una tabla de canjes, porque el movimiento ya relaciona cliente, premio, pedido y puntos. La línea a precio 0 reutiliza todo el flujo de inventario, notas y exportación.

**Alternatives considered**:

- *Tabla `Canje`*: duplica lo que ya guarda el movimiento.
- *Guardar el descuento del premio dentro de `montoDescuento`*: el editor de descuentos lo sobrescribiría y la base de los puntos no podría excluirlo.

---

## R12. Beneficios en el checkout de la tienda

**Decisión**:

- **Núcleo del checkout**: la transacción de `procesarCompra` se mueve a `lib/checkout-core.ts`, en la función `registrarCompraWeb(datos, { clienteSesionId })`, sin `"use server"` ni `server-only`. `lib/actions/checkout.ts` queda como envoltorio: resuelve la sesión (`obtenerClienteDeSesion`) y llama al núcleo. Las pruebas de integración importan el núcleo.
- **Cliente del pedido**:
  - con una sesión vinculada, el núcleo usa **siempre** el `clienteSesionId` e ignora el `clientId` que envía el navegador (FR-041);
  - sin sesión, el comportamiento no cambia.
- **Datos de los beneficios**: `CheckoutData` gana `beneficios?: { premioIds: number[]; saldoAFavorUsd: number }`. Con beneficios y sin sesión vinculada → `BENEFITS_UNAVAILABLE`.
- **Validación**: dentro de la transacción se bloquea el cliente y se revalidan:
  - que los premios estén activos y los puntos alcancen;
  - la existencia de los productos de premio, sumada a la del carrito;
  - que el saldo a favor sea menor o igual que el disponible y que el total después del descuento.

  Si algo falla → `BENEFITS_CHANGED`, sin escribir nada.
- **Pago y estado del pedido**:
  - `montoAPagar = total − saldoAFavorUsd`, y el pago declarado se valida contra ese monto;
  - con `montoAPagar = 0` no hay pago declarado y el pedido nace `pagado`, con historial "Pagado con saldo a favor" y puntos acreditados;
  - la idempotencia acepta `pagado` al reproducir.
- **Interfaz**: un bloque nuevo, `components/finalizar-compra/beneficiosCliente.tsx`, dentro del paso de pago. Lee los beneficios con la acción `obtenerBeneficiosCheckout()`, que deriva el cliente de la sesión, y guarda la selección en **estado local** del paso. No se toca `store/appStore.ts` ni `context/checkoutContext.tsx`.
- **Paso de datos personales**: con sesión vinculada se rellena con el cliente de la sesión y se salta la búsqueda por teléfono.

**Rationale**:

- La constitución (I) prohíbe ampliar el estado duplicado del checkout; la selección de beneficios solo importa durante el paso de pago.
- Hoy el checkout confía en el `clientId` del navegador. Usar la sesión impide que alguien gaste puntos o saldo ajenos con solo conocer un id o un teléfono.
- Mover el núcleo es la forma más simple de probar la transacción, porque las acciones que leen la sesión importan `server-only`, que no se puede cargar en `node:test`.

**Alternatives considered**:

- *Guardar la selección en Zustand*: amplía la duplicación.
- *Importar la sesión de forma dinámica dentro de la acción*: igual rompería las pruebas, que llaman a la acción.

---

## R13. Editor masivo de ventas

**Decisión**:

- `guardarEdicionMasivaVentas` acredita puntos en las filas que quedan pagadas.
- Recalcula el total con `montoDescuentoPuntos`.
- **Rechaza el cambio de cliente** en un pedido que tenga movimientos de puntos o de saldo a favor, porque moverlo dejaría esos movimientos en otro cliente.

**Rationale**: es el único camino que hoy cambia `estado`, `clienteId` y totales sin pasar por los núcleos. Las tres guardas son de pocas líneas.

---

## R14. Riesgos existentes observados (fuera de alcance)

- **`getClientByPhone`** (`lib/actions/clients.ts`): es una acción pública que devuelve el registro completo (RIF, correo) a quien conozca un teléfono. Con R12, eso ya no basta para usar puntos o saldo. Se recomienda una corrección aparte que devuelva solo lo necesario.
- **`/confirmacion?id=`**: muestra cualquier pedido por su id, con nombre y teléfono. No muestra puntos ni saldos y esta feature no lo amplía.
- **Atajo de desarrollo de `requireAdmin`**: se conserva. "Mi cuenta" usa la sesión real también en desarrollo.

## R15. Actualización a Next.js 16 en curso

El árbol de trabajo tiene sin commit el cambio de `next` a `^16.4.3` y ajustes en `tsconfig.json`. El diseño no depende de `middleware` (renombrado a `proxy` en la v16) ni de APIs que cambien entre 15 y 16. Las páginas nuevas reciben `searchParams` como `Promise`, igual que `app/admin/clients/page.tsx`.
