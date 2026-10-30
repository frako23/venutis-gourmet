# Feature Specification: Perfil del cliente, crédito, saldo a favor y fidelización

**Feature Branch**: `010-cuenta-cliente-fidelizacion`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "vamos a crearle a los clientes un registro dentro de nuestra base de datos, no solo queremos guardar sus datos de contacto y lo que han comprado, tambien queremos tener un perfil completo del cliente, ya que por ejemplo podriamos darle credito al cliente así que el cliente podría debernos, también quiero aprovechar esta funcionalidad para poder implementar la funcionalidad de fidelizacion, en la que el cliente vaya acumulando puntos que luego pueda redimir por descuentos o premios como productos gratis, también quiero que el cliente apenas se registre en la página pueda ver sus puntos de fidelización y su saldo en caso de deber o puede tambien darse el caso que el cliente pague demás y se le abone a su favor para una próxima compra"

## Clarifications

### Session 2026-10-29

- Q: ¿Qué hace el sistema cuando una venta sin cobrar supera el crédito disponible o el cliente no tiene crédito? → A: La permite solo si la administradora la confirma explícitamente, y queda registrado quién la autorizó (FR-011).
- Q: ¿Quién acumula puntos y con qué ventas? → A: Solo los consumidores, con los pedidos de la tienda y las ventas manuales del panel. Los mayoristas no acumulan y las cargas de Excel no tocan puntos (FR-019).
- Q: ¿Dónde se canjean los puntos y se usa el saldo a favor? → A: Lo hace la administradora desde el panel y también el cliente al finalizar su compra en la tienda (FR-030 a FR-035, US7).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el perfil completo de un cliente (Priority: P1)

Como administradora, quiero abrir la ficha de un cliente y ver en un solo lugar sus datos, lo que ha comprado, cuánto nos debe, cuánto tiene a favor y cuántos puntos tiene, para atenderlo y cobrarle sin tener que reconstruir su historia a partir de pedidos sueltos.

**Why this priority**: Es la base de todo lo demás: el crédito, el saldo a favor y los puntos solo son útiles si alguien los puede consultar. Además, hoy la información del cliente está repartida entre la lista de clientes, los pedidos y las cuentas por cobrar.

**Independent Test**: Elegir un cliente con pedidos pagados, por cobrar y cancelados, abrir su ficha y comprobar que los datos, el historial, los indicadores y la deuda coinciden con los pedidos registrados.

**Acceptance Scenarios**:

1. **Given** un cliente con pedidos registrados, **When** la administradora abre su ficha desde la sección Clientes, **Then** ve sus datos de contacto, tipo, RIF, direcciones, fecha de alta y el estado de su cuenta web (vinculada, pendiente o sin cuenta).
2. **Given** el cliente tiene pedidos en distintos estados, **When** consulta el historial de compras de la ficha, **Then** ve cada pedido con número, fecha, total, estado y saldo pendiente, y puede abrir el detalle del pedido.
3. **Given** el cliente tiene pedidos cancelados, **When** se calculan los indicadores de la ficha (total comprado, número de pedidos, ticket promedio, última compra y productos más comprados), **Then** los cancelados no cuentan.
4. **Given** la ficha está abierta, **When** la administradora revisa el resumen financiero, **Then** ve juntos la deuda total, el saldo a favor, el crédito (habilitado, límite y disponible) y los puntos disponibles.
5. **Given** la administradora escribe notas internas sobre el cliente, **When** las guarda, **Then** quedan en la ficha y nunca se muestran al cliente.

---

### User Story 2 - Dar crédito y controlar lo que el cliente debe (Priority: P1)

Como administradora, quiero habilitar crédito a un cliente de confianza con un límite en dólares, para poder venderle sin cobrar en el momento y saber en todo momento cuánto nos debe y cuánto crédito le queda.

**Why this priority**: Vender fiado ya ocurre en la práctica (pedidos por cobrar), pero sin límite ni visibilidad por cliente. Controlarlo protege directamente el flujo de caja del negocio.

**Independent Test**: Habilitar crédito con un límite a un cliente, registrarle ventas sin cobrar hasta acercarse al límite, registrar abonos y comprobar que la deuda y el crédito disponible se actualizan correctamente; luego intentar superar el límite.

**Acceptance Scenarios**:

1. **Given** un cliente sin crédito, **When** la administradora lo habilita con un límite de USD 100, **Then** la ficha muestra crédito habilitado, límite USD 100 y disponible igual al límite menos su deuda actual.
2. **Given** el cliente tiene dos pedidos por cobrar con saldos de USD 30 y USD 20, **When** se consulta su deuda, **Then** es USD 50, coincide con lo que muestran las cuentas por cobrar y el disponible es USD 50.
3. **Given** el cliente debe USD 50, **When** se registra un abono de USD 20 a uno de sus pedidos, **Then** la deuda baja a USD 30 y el disponible sube en la misma cantidad.
4. **Given** una venta dejaría al cliente por encima de su límite o el cliente no tiene crédito habilitado, **When** la administradora intenta registrarla sin cobrar, **Then** el sistema le pide una confirmación explícita que muestra la deuda, el límite y el exceso; si confirma, la venta se registra con su nombre como autorizante, y si no, la venta no se registra.
5. **Given** se cambia el límite o se deshabilita el crédito, **When** se guarda el cambio, **Then** queda registrado quién lo hizo, cuándo y el valor anterior y nuevo, y la deuda existente no se modifica.

---

### User Story 3 - Guardar a favor lo que el cliente paga de más (Priority: P1)

Como administradora, quiero que cuando un cliente pague más de lo que debe, o adelante dinero sin tener un pedido, el excedente le quede a favor para usarlo en su próxima compra, para no tener que devolver dinero ni llevar esa cuenta por fuera del sistema.

**Why this priority**: Hoy el sistema rechaza un abono mayor que el saldo del pedido, así que los sobrepagos se llevan a mano. Es dinero del cliente y debe quedar registrado con exactitud.

**Independent Test**: Registrar un abono mayor que el saldo de un pedido, comprobar que el pedido queda pagado y que el excedente aparece como saldo a favor; luego aplicar ese saldo a un pedido nuevo y verificar ambos saldos.

**Acceptance Scenarios**:

1. **Given** un pedido con saldo de USD 18, **When** se registra un abono de USD 20, **Then** el sistema muestra antes de confirmar que USD 18 saldan el pedido y USD 2 quedan a favor; al confirmar, el pedido pasa a pagado y el cliente tiene USD 2 a favor.
2. **Given** un cliente sin pedidos pendientes, **When** la administradora registra un pago a cuenta de USD 50, **Then** el cliente tiene USD 50 a favor con el método de pago, la referencia y la fecha registrados.
3. **Given** un cliente con USD 50 a favor y un pedido nuevo de USD 35, **When** la administradora aplica el saldo a favor al pedido, **Then** el pedido queda pagado y al cliente le quedan USD 15 a favor.
4. **Given** un pedido por cobrar con abonos de USD 10 que se cancela, **When** se confirma la cancelación, **Then** los USD 10 pasan al saldo a favor del cliente en la misma operación.
5. **Given** cualquier cambio del saldo a favor, **When** la administradora revisa los movimientos en la ficha, **Then** ve fecha, monto, origen (sobrepago, pago a cuenta, pedido cancelado, aplicación a pedido o ajuste), pedido relacionado, quién lo registró y motivo; los movimientos no se editan ni se borran, se corrigen con un movimiento contrario.

---

### User Story 4 - Acumular puntos con cada compra (Priority: P2)

Como clienta frecuente, quiero ganar puntos con mis compras, y como administradora quiero que se sumen solos, para premiar la fidelidad sin llevar la cuenta a mano.

**Why this priority**: Es el primer paso del programa de fidelización y ya existe una acumulación parcial que hay que ordenar (hoy se suman puntos al crear el pedido web, aunque no se cobre ni se cancele después).

**Independent Test**: Crear una venta participante, cobrarla por completo y comprobar que el cliente recibe los puntos una sola vez; cancelar otra venta que ya había sumado puntos y comprobar que se descuentan.

**Acceptance Scenarios**:

1. **Given** una venta participante con USD 25,80 en productos tras descuentos y USD 3 de delivery, **When** el pedido queda pagado, **Then** el cliente recibe 25 puntos y el movimiento queda ligado al pedido.
2. **Given** un pedido que ya generó puntos, **When** vuelve a guardarse, se edita o cambia de estado, **Then** no vuelve a generar puntos.
3. **Given** un pedido por cobrar que ya sumó puntos al crearse (regla anterior), **When** se cancela, **Then** esos puntos se descuentan en la misma operación.
4. **Given** la administradora necesita corregir puntos, **When** registra un ajuste manual con motivo, **Then** el saldo cambia, el motivo y su autora quedan registrados y el saldo de puntos nunca queda negativo.

---

### User Story 5 - Canjear puntos por descuentos o productos gratis (Priority: P2)

Como clienta, quiero cambiar mis puntos por un descuento o un producto gratis, y como administradora quiero definir qué premios existen y cuántos puntos cuesta cada uno.

**Why this priority**: Sin canje los puntos no tienen valor para el cliente. Depende de que exista la acumulación (US4).

**Independent Test**: Crear un premio de descuento y otro de producto gratis, canjear cada uno en un pedido de un cliente con puntos suficientes y verificar el total del pedido, el inventario y el saldo de puntos; cancelar el pedido y verificar que los puntos vuelven.

**Acceptance Scenarios**:

1. **Given** la administradora crea el premio "USD 5 de descuento" por 200 puntos, **When** lo activa, **Then** aparece entre los premios disponibles para canjear.
2. **Given** un cliente con 250 puntos y un pedido de USD 30 en productos, **When** canjea "USD 5 de descuento", **Then** el pedido baja a USD 25 y al cliente le quedan 50 puntos.
3. **Given** un premio "1 frasco de salsa gratis" por 150 puntos y el producto con existencia, **When** el cliente lo canjea en un pedido, **Then** el producto se agrega al pedido sin costo, descuenta inventario como cualquier venta y se descuentan 150 puntos.
4. **Given** el cliente no tiene puntos suficientes, el premio está inactivo o el producto del premio no tiene existencia, **When** intenta canjearlo, **Then** el canje se rechaza con un mensaje claro y no se descuentan puntos.
5. **Given** un pedido con un premio canjeado se cancela, **When** se confirma la cancelación, **Then** el cliente recupera los puntos del canje.

---

### User Story 6 - Registrarme en la tienda y ver mis puntos y mi saldo (Priority: P2)

Como cliente, quiero crear mi cuenta en la página y, apenas entre, ver mis puntos, lo que debo o lo que tengo a favor y mis pedidos, para saber dónde estoy parado sin preguntar por WhatsApp.

**Why this priority**: Es lo que hace visible el programa para el cliente y reduce consultas por WhatsApp. Necesita que el perfil, los saldos y los puntos existan (US1–US4).

**Independent Test**: Registrar una cuenta con el correo de un cliente existente que tiene deuda y puntos, entrar a "Mi cuenta" y comprobar que muestra exactamente los mismos valores que su ficha en el panel; registrar otra cuenta con un correo nuevo y comprobar que empieza con saldo y puntos en cero.

**Acceptance Scenarios**:

1. **Given** un cliente registrado en el sistema con correo, **When** crea su cuenta con ese correo y lo verifica, **Then** su cuenta queda vinculada a su registro y en "Mi cuenta" ve sus puntos, su deuda o saldo a favor y sus pedidos anteriores.
2. **Given** una persona cuyo correo no está registrado, **When** crea su cuenta y completa nombre y teléfono, **Then** se crea su registro de cliente consumidor vinculado a la cuenta y ve sus puntos y saldo en cero.
3. **Given** la persona indica un teléfono que ya pertenece a un cliente existente sin correo, **When** termina el registro, **Then** la vinculación queda pendiente hasta que la administradora la confirme, y mientras tanto no ve datos de ese cliente.
4. **Given** un cliente con sesión iniciada, **When** abre "Mi cuenta", **Then** ve: puntos disponibles y sus movimientos, premios disponibles y cuántos puntos le faltan para cada uno, deuda total con los pedidos pendientes y su saldo, saldo a favor con sus movimientos e historial de pedidos.
5. **Given** un cliente con sesión iniciada hace una compra en la tienda, **When** el pedido se registra, **Then** queda asociado a su registro de cliente y aparece en su historial.
6. **Given** una cuenta de cliente, **When** intenta entrar al panel administrativo o ver datos de otro cliente, **Then** el acceso se niega siempre, aunque la lista de correos autorizados del panel no esté configurada.

---

### User Story 7 - Usar mis puntos y mi saldo a favor al comprar en la tienda (Priority: P3)

Como cliente con cuenta, quiero canjear premios y usar mi saldo a favor yo mismo al finalizar una compra en la página, para no tener que pedirlo por WhatsApp.

**Why this priority**: La administradora ya puede canjear y aplicar saldo desde el panel (US3 y US5), así que el valor no se pierde si esta historia llega después. Es la parte que más cambia la compra en la tienda, y depende de la cuenta del cliente (US6).

**Independent Test**: Con un cliente vinculado que tiene puntos y saldo a favor, armar un carrito, canjear un premio y aplicar parte del saldo al finalizar la compra, y comprobar el total, los puntos, el saldo y el inventario. Repetir con un saldo que cubre todo el pedido, y otra vez cambiando el saldo desde el panel justo antes de confirmar.

**Acceptance Scenarios**:

1. **Given** un cliente con sesión, 250 puntos y USD 10 a favor, **When** llega a finalizar su compra de USD 30 en productos, **Then** ve sus puntos, los premios que puede canjear y su saldo a favor, y puede elegir qué usar.
2. **Given** el cliente canjea "USD 5 de descuento" y aplica USD 10 de saldo a favor, **When** confirma la compra, **Then** el pedido queda con USD 15 por pagar, le quedan 50 puntos y USD 0 a favor, y declara el pago de los USD 15 como hoy.
3. **Given** un cliente con USD 40 a favor y un pedido de USD 30, **When** aplica USD 30 de su saldo y confirma, **Then** no declara ningún pago, el pedido queda pagado y le quedan USD 10 a favor.
4. **Given** mientras el cliente compraba la administradora aplicó su saldo a favor a otro pedido o el producto del premio se agotó, **When** el cliente confirma, **Then** la compra se rechaza con un mensaje que explica qué cambió, no se descuentan puntos ni saldo y el carrito se conserva.
5. **Given** un cliente sin sesión o con la vinculación pendiente, **When** finaliza una compra, **Then** compra como hoy y no ve opciones de puntos ni de saldo a favor.

---

### Edge Cases

- **Deuda y saldo a favor a la vez**: un cliente puede deber en un pedido y tener saldo a favor por otro motivo. Ambos se muestran por separado; el saldo a favor no se descuenta solo de la deuda, la administradora decide aplicarlo a un pedido pendiente.
- **Anular un abono cuyo excedente ya se usó**: si anular un abono dejaría el saldo a favor en negativo, la anulación se rechaza y se indica que primero hay que revertir la aplicación de ese saldo.
- **Aplicar más saldo del que hay o del que se debe**: la aplicación de saldo a favor no puede superar ni el saldo a favor disponible ni el saldo pendiente del pedido.
- **Operaciones simultáneas**: dos canjes o dos aplicaciones de saldo a favor al mismo tiempo nunca pueden dejar puntos o saldo a favor en negativo; la segunda se rechaza si ya no alcanza.
- **Descuento por puntos mayor que el pedido**: un descuento canjeado no puede dejar el total de productos por debajo de cero; si el pedido es menor que el descuento, el canje se rechaza.
- **Puntos ya acumulados con la regla anterior**: los pedidos que ya sumaron puntos al crearse no vuelven a sumarlos al quedar pagados; el historial de puntos existente se conserva.
- **Pedidos importados desde Excel**: sus saldos pendientes cuentan como deuda del cliente, igual que hoy en cuentas por cobrar. No generan ni descuentan puntos (FR-019) ni piden autorización de crédito (FR-011), porque registran ventas que ya ocurrieron.
- **Bajar el límite por debajo de la deuda**: está permitido; la deuda no cambia, el disponible queda en cero y no se permiten nuevas ventas a crédito hasta que la deuda baje.
- **Cambio de tipo de cliente**: pasar de consumidor a mayorista o al revés no borra puntos, saldo a favor ni deuda. Un consumidor que pasa a mayorista conserva sus puntos y puede canjearlos, pero deja de acumular; un mayorista que pasa a consumidor empieza a acumular con sus pedidos que queden pagados desde entonces.
- **Mayorista que compra al detal o consumidor que compra al mayor**: para los puntos cuenta el tipo del cliente, no el precio usado en el pedido.
- **Varias ventas sobre el crédito**: cada venta que excede el crédito pide su propia autorización; una autorización anterior no cubre las siguientes.
- **Saldo a favor mayor que el pedido en la tienda**: el cliente no puede aplicar más saldo que el total a pagar; el resto le sigue quedando a favor.
- **Canje y saldo en el mismo pedido**: primero se aplica el descuento del premio y luego el saldo a favor sobre lo que queda; el pedido nunca queda con total negativo.
- **Correo sin verificar**: una cuenta no se vincula a un cliente existente hasta que el correo esté verificado.
- **Teléfono ya usado**: el registro nunca se vincula solo por teléfono, porque el teléfono no se verifica; queda pendiente de confirmación de la administradora.
- **Un cliente, una cuenta**: un registro de cliente no puede quedar vinculado a dos cuentas; si se intenta, se rechaza y se avisa a la administradora.
- **Compra con vinculación pendiente**: si el cliente compra en la tienda mientras su vinculación está pendiente, el pedido se registra como hoy (identificando al cliente con los datos del checkout) y no se le muestran datos del cliente existente.
- **Cuenta desvinculada**: si la administradora desvincula una cuenta, esa cuenta deja de ver los datos del cliente de inmediato; los pedidos, puntos y saldos del cliente no cambian.
- **Montos en bolívares**: un abono o pago a cuenta recibido en bolívares se convierte a USD con la tasa del día del pago y el saldo a favor se guarda en USD; cambios posteriores de la tasa no lo alteran.
- **Premio desactivado o sin existencia**: si un premio se desactiva o su producto se agota después de que el cliente lo vio, el canje se rechaza al confirmar.

## Requirements *(mandatory)*

### Functional Requirements

**Perfil del cliente (panel)**

- **FR-001**: La sección Clientes DEBE permitir abrir la ficha de cada cliente, disponible solo para administradoras autorizadas.
- **FR-002**: La ficha DEBE mostrar datos de contacto, tipo, RIF, direcciones, fecha de alta y estado de la cuenta web (vinculada, pendiente de confirmación o sin cuenta).
- **FR-003**: La ficha DEBE listar todos los pedidos del cliente con número, fecha, total, estado y saldo pendiente, con acceso al detalle de cada pedido.
- **FR-004**: La ficha DEBE mostrar total comprado, número de pedidos, ticket promedio, fecha de la última compra y productos más comprados, excluyendo pedidos cancelados.
- **FR-005**: La ficha DEBE mostrar juntos la deuda total, el saldo a favor, las condiciones de crédito con el disponible y los puntos disponibles.
- **FR-006**: La administradora DEBE poder escribir y editar notas internas del cliente; las notas NO DEBEN mostrarse al cliente.

**Deuda y crédito**

- **FR-007**: La deuda de un cliente DEBE ser la suma de los saldos pendientes de sus pedidos no cancelados, calculada con la misma regla que usan los pedidos y las cuentas por cobrar, de modo que ambos lugares muestren siempre el mismo valor.
- **FR-008**: La administradora DEBE poder habilitar o deshabilitar el crédito de un cliente y fijar su límite en USD; por defecto ningún cliente tiene crédito.
- **FR-009**: El crédito disponible DEBE ser el límite menos la deuda, sin bajar de cero.
- **FR-010**: Todo cambio de las condiciones de crédito DEBE registrar quién lo hizo, cuándo, el valor anterior y el nuevo, y NO DEBE modificar la deuda existente.
- **FR-011**: Cuando una venta deja un monto sin cobrar y el cliente no tiene crédito habilitado o ese monto supera su crédito disponible, el sistema DEBE pedir a la administradora una confirmación explícita que muestre la deuda actual, el límite y el monto en que se excede. Si confirma, la venta se registra y queda registrado en el pedido quién la autorizó, cuándo y por cuánto excedía el crédito; si no confirma, la venta no se registra. Esta regla aplica a las ventas registradas desde el panel; las cargas de Excel y los pedidos de la tienda con pago declarado no la piden.

**Saldo a favor**

- **FR-012**: El saldo a favor DEBE guardarse en USD como un registro de movimientos que no se editan ni se borran; cada movimiento DEBE indicar fecha, monto, origen (sobrepago, pago a cuenta, pedido cancelado, aplicación a pedido o ajuste manual), pedido relacionado si existe, quién lo registró y motivo. El saldo DEBE ser la suma de esos movimientos.
- **FR-013**: Al registrar un abono mayor que el saldo pendiente del pedido, el sistema DEBE mostrar cuánto salda el pedido y cuánto queda a favor antes de confirmar, y al confirmar DEBE saldar el pedido y acreditar el excedente en la misma operación.
- **FR-014**: La administradora DEBE poder registrar un pago a cuenta no ligado a un pedido, con monto, método de pago, referencia y fecha, que se acredita como saldo a favor.
- **FR-015**: La administradora DEBE poder aplicar saldo a favor, total o parcialmente, a un pedido pendiente del cliente; la aplicación cuenta como un abono, no puede superar el saldo a favor disponible ni el saldo pendiente del pedido, y si lo salda el pedido pasa a pagado.
- **FR-016**: Al cancelar un pedido con abonos o saldo a favor aplicado, esos montos DEBEN volver al saldo a favor del cliente en la misma operación que la cancelación.
- **FR-017**: El sistema DEBE rechazar la anulación de un abono si dejaría el saldo a favor del cliente en negativo.
- **FR-018**: La administradora DEBE poder registrar ajustes manuales del saldo a favor con motivo obligatorio.

**Fidelización: acumulación**

- **FR-019**: Acumulan puntos solo los clientes consumidores, por sus pedidos de la tienda (incluidos los pedidos directos de la venta rápida, que pasan por el checkout) y por las ventas manuales registradas desde el panel. Los mayoristas no acumulan puntos, y las cargas de Excel no generan ni descuentan puntos. Cuenta el tipo que tiene el cliente cuando el pedido queda pagado.
- **FR-020**: Una venta participante DEBE dar 1 punto por cada dólar entero del monto de productos efectivamente cobrado, después de descuentos y sin contar el delivery, en el momento en que el pedido queda pagado. El pago con saldo a favor cuenta como cobrado; el descuento obtenido con puntos no.
- **FR-021**: Cada pedido DEBE generar puntos como máximo una vez, incluidos los pedidos que ya sumaron puntos con la regla anterior.
- **FR-022**: Si se cancela un pedido que generó puntos (solo posible en pedidos que los sumaron con la regla anterior, porque un pedido pagado no se cancela), esos puntos DEBEN descontarse en la misma operación que la cancelación.
- **FR-023**: Los puntos DEBEN llevarse como movimientos (acumulación, canje, devolución de un canje, reversión de puntos ganados y ajuste) con fecha, pedido relacionado y autor; el saldo de puntos DEBE ser la suma de los movimientos y nunca puede quedar negativo.
- **FR-024**: La administradora DEBE poder registrar ajustes manuales de puntos con motivo obligatorio.
- **FR-025**: Los puntos NO vencen en esta versión.

**Fidelización: premios y canje**

- **FR-026**: La administradora DEBE poder crear, editar, activar y desactivar premios con nombre, descripción, costo en puntos y tipo: descuento fijo en USD sobre un pedido, o producto gratis con su cantidad.
- **FR-027**: Un canje DEBE descontar los puntos y aplicar el premio al pedido en la misma operación: un descuento reduce el total sin dejar el monto de productos por debajo de cero; un producto gratis se agrega al pedido sin costo y descuenta inventario como cualquier venta, por lo que exige existencia.
- **FR-028**: El sistema DEBE rechazar el canje si el cliente no tiene puntos suficientes, el premio está inactivo o el producto no tiene existencia, sin descontar puntos.
- **FR-029**: Al cancelar un pedido con premios canjeados, el cliente DEBE recuperar los puntos del canje en la misma operación.
- **FR-030**: El canje de puntos y la aplicación de saldo a favor DEBEN poder hacerlos la administradora desde el panel (en ventas manuales y en pedidos pendientes) y también el propio cliente al finalizar una compra en la tienda (FR-032 a FR-035).
- **FR-031**: Cualquier cliente con puntos disponibles DEBE poder canjearlos, aunque ya no acumule (por ejemplo, un consumidor que pasó a mayorista).

**Puntos y saldo a favor al comprar en la tienda**

- **FR-032**: Un cliente con sesión iniciada y vinculación confirmada DEBE ver, antes de confirmar su compra, sus puntos disponibles, los premios que puede canjear y su saldo a favor, y elegir qué premios canjear y cuánto saldo a favor aplicar, sin superar el total del pedido.
- **FR-033**: Al confirmar la compra, el sistema DEBE volver a validar los puntos, el saldo a favor, el estado de los premios y la existencia de los productos, y registrar el pedido, los canjes y la aplicación del saldo a favor en una sola operación. Si algo ya no alcanza o cambió, la compra se rechaza sin aplicar ningún cambio, con un mensaje claro y conservando el carrito.
- **FR-034**: Si el saldo a favor cubre todo el pedido, el cliente no declara ningún pago y el pedido queda pagado. Si lo cubre en parte, el resto se paga y se declara como hoy.
- **FR-035**: Un cliente sin sesión, o con la vinculación pendiente, compra como hoy y no ve ni puede usar puntos ni saldo a favor.

**Cuenta del cliente en la tienda**

- **FR-036**: La tienda DEBE permitir que un cliente cree una cuenta e inicie sesión; la cuenta exige un correo verificado.
- **FR-037**: Al registrarse, si el correo verificado coincide con un cliente existente, la cuenta DEBE vincularse a ese cliente. Si no coincide, la persona DEBE completar nombre y teléfono: si el teléfono pertenece a un cliente existente, la vinculación queda pendiente hasta que la administradora la confirme; si no, se crea un cliente consumidor vinculado a la cuenta.
- **FR-038**: Un cliente DEBE tener como máximo una cuenta vinculada, y la administradora DEBE poder confirmar vinculaciones pendientes y desvincular cuentas desde la ficha.
- **FR-039**: "Mi cuenta" DEBE mostrar al cliente sus puntos disponibles y movimientos, los premios activos con los puntos que le faltan para cada uno, su deuda total con los pedidos pendientes y su saldo, su saldo a favor con sus movimientos y su historial de pedidos. La sección de puntos y premios se muestra a los consumidores y a cualquier cliente que tenga puntos disponibles.
- **FR-040**: Un cliente con sesión iniciada DEBE ver solo sus propios datos; NO DEBE ver notas internas, límite de crédito, datos de quién registró cada movimiento ni datos de otros clientes.
- **FR-041**: Las compras hechas en la tienda con sesión iniciada DEBEN quedar asociadas al cliente vinculado a la cuenta.
- **FR-042**: Una cuenta de cliente NUNCA DEBE dar acceso al panel administrativo ni a sus acciones, sin depender de que la lista de correos autorizados esté configurada.
- **FR-043**: Mientras una vinculación esté pendiente, la cuenta NO DEBE mostrar datos del cliente existente.

**Reglas generales**

- **FR-044**: Todos los montos de deuda, saldo a favor y crédito DEBEN manejarse en USD con dos decimales; cuando se muestren en bolívares DEBE indicarse la tasa usada.
- **FR-045**: Cada operación que mueva dinero o puntos DEBE completarse entera o no aplicarse, junto con el cambio del pedido que la origina.
- **FR-046**: Los pedidos, abonos, puntos y saldos existentes DEBEN conservarse al activar la función, y la deuda de cada cliente DEBE coincidir desde el primer día con las cuentas por cobrar.
- **FR-047**: Las pantallas y mensajes DEBEN estar en español, "Mi cuenta" DEBE poder usarse en un teléfono, y los avisos de éxito y error DEBEN usar el sistema de notificaciones existente de la app.

### Key Entities *(include if feature involves data)*

- **Cliente**: el registro que ya existe, ahora con perfil completo: datos de contacto, tipo, direcciones, notas internas, condiciones de crédito y relación con su cuenta web, pedidos, movimientos de saldo a favor y movimientos de puntos.
- **Cuenta del cliente**: el acceso del cliente a la tienda con su correo verificado; está vinculada como máximo a un cliente y su vinculación puede estar confirmada o pendiente. No da acceso al panel.
- **Condiciones de crédito**: si el crédito está habilitado y su límite en USD, con el historial de cambios (quién, cuándo, antes y después).
- **Autorización de venta sobre el crédito**: la confirmación que da la administradora para registrar una venta sin cobrar que excede el crédito disponible, con quién la dio, cuándo, el pedido y el monto excedido.
- **Movimiento de saldo a favor**: un crédito o débito en USD del saldo a favor del cliente, con origen, pedido relacionado, autor, motivo y fecha. No se edita ni se borra.
- **Movimiento de puntos**: una suma o resta de puntos del cliente (acumulación, canje, devolución, reversión o ajuste), con pedido relacionado, autor, motivo y fecha.
- **Premio**: algo que se puede canjear por puntos: un descuento fijo en USD o un producto gratis con su cantidad, con costo en puntos y estado activo/inactivo.
- **Canje**: el uso de un premio en un pedido concreto; descuenta puntos y se revierte si el pedido se cancela.
- **Pedido**: el pedido que ya existe; su saldo pendiente forma la deuda del cliente, y ahora puede recibir aplicaciones de saldo a favor y premios canjeados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una administradora puede encontrar la deuda, el saldo a favor y los puntos de un cliente conocido en menos de 30 segundos desde la sección Clientes.
- **SC-002**: En una muestra de al menos 20 clientes con pedidos en todos los estados, la deuda de la ficha coincide al centavo con la de las cuentas por cobrar en el 100% de los casos.
- **SC-003**: En el 100% de los sobrepagos de prueba, el saldo a favor generado es exactamente igual al excedente pagado, al centavo.
- **SC-004**: En una auditoría de clientes de prueba, el saldo a favor y los puntos de cada cliente son iguales a la suma de sus movimientos en el 100% de los casos, y ninguna prueba de operaciones simultáneas deja un saldo negativo.
- **SC-005**: En el 100% de las cancelaciones de prueba con abonos, saldo a favor aplicado, puntos ganados o premios canjeados, los puntos ganados se descuentan, los puntos canjeados vuelven y todo lo abonado o aplicado al pedido queda como saldo a favor, al centavo.
- **SC-006**: En el 100% de los pedidos de prueba que quedan pagados, los puntos se acreditan exactamente una vez.
- **SC-007**: Una persona nueva puede crear su cuenta y ver sus puntos y su saldo en menos de 3 minutos.
- **SC-008**: En las pruebas de acceso, el 0% de las cuentas de cliente logra entrar al panel o ver datos de otro cliente, con y sin lista de correos autorizados configurada.
- **SC-009**: En una pantalla de 360 píxeles de ancho, "Mi cuenta" muestra puntos, deuda y saldo a favor sin desplazamiento horizontal.
- **SC-010**: Un cliente con cuenta puede canjear un premio y aplicar su saldo a favor al finalizar una compra, sin ayuda, en menos de 1 minuto adicional al tiempo normal de compra.
- **SC-011**: En el 100% de las pruebas en que los puntos, el saldo a favor o la existencia cambian antes de confirmar una compra, la compra se rechaza sin descontar nada.
- **SC-012**: El 100% de las ventas registradas desde el panel que exceden el crédito disponible tiene una autorización registrada con su autora.
- **SC-013**: A los 3 meses de activar la función, al menos el 30% de los pedidos web los hacen clientes con sesión iniciada.

## Assumptions

- **Registro público de clientes**: la constitución del proyecto exige una decisión documentada para abrir registros públicos y añadir un tipo de usuario. Esta especificación es esa decisión: se agrega el tipo de usuario "cliente", que solo ve sus propios datos y nunca accede al panel. El plan debe registrarlo como excepción justificada.
- **Mi cuenta es parte de la tienda pública**, no una superficie nueva. La venta rápida y la cotización rápida no cambian.
- **Se reutiliza el proveedor de inicio de sesión que ya usa el panel**, con verificación de correo. No se añade verificación por SMS ni por WhatsApp, porque requeriría un servicio externo.
- **La regla de puntos es 1 punto por cada dólar entero**, la misma tasa que se usa hoy, pero se acreditan al quedar pagado el pedido y sobre el monto de productos sin delivery. Hoy se acreditan al crear el pedido web e incluyen el delivery.
- **La deuda no se guarda aparte**: es la suma de los saldos pendientes de los pedidos, la misma regla que hoy usan los abonos y las cuentas por cobrar. El saldo a favor sí se guarda como movimientos, porque no pertenece a ningún pedido.
- **El saldo a favor nunca se aplica automáticamente**: lo aplica la administradora a un pedido, o el cliente al comprar en la tienda. Así se evitan aplicaciones que el cliente no esperaba.
- **La tienda no ofrece comprar a crédito**: el crédito se usa en las ventas que registra la administradora. Un pedido web con pago declarado queda por cobrar mientras se verifica el pago, como hoy, y no se trata como venta a crédito.
- **Los puntos son para el consumidor final**: los mayoristas ya tienen su precio especial, por eso no acumulan. Las cargas de Excel siguen sin tocar la fidelidad, como hoy.
- **El cliente no paga su deuda en línea**: sigue pagando por los canales actuales y la administradora registra el abono. No se añaden pasarelas de pago.
- **El cliente no ve su límite de crédito** y no edita sus datos desde "Mi cuenta" en esta versión; los cambios de datos se piden por WhatsApp.
- **Los puntos no vencen** en esta versión.
- **Fuera de alcance**: niveles o categorías de cliente, puntos por cumpleaños o referidos, vencimiento de puntos, avisos por correo o WhatsApp sobre puntos o deuda, fusión de clientes duplicados, borrado de cuentas por el propio cliente, plazos o intereses de crédito.
- **Entrega por fases**: las historias están ordenadas para poder entregarse por partes (perfil, crédito y saldo a favor primero; luego puntos, premios y cuenta web; y al final el uso de puntos y saldo en la compra de la tienda) sin que una fase rompa lo anterior.
