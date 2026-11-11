# Feature Specification: Programa de puntos: consulta en el panel, "Mis puntos" y canje por productos o delivery gratis

**Feature Branch**: `014-programa-puntos`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "la usuaria quiere en el admin panel tener una seccion exclusiva para ver los puntos que cada cliente ha ganado, tambinén quiere tener una vista para que sus clientes al estar registrados en la app puedan consultar los puntos que tienen disponibles y que puedan canjearlos por productos o delivery gratis, crea tu una distribucion de puntos que sea atractiva tanto para los clientes como para la usuaria dueña del emprendimiento"

## Contexto: qué existe y qué agrega esta especificación

El programa de fidelización ya funciona desde la especificación `010-cuenta-cliente-fidelizacion`: los consumidores ganan 1 punto por cada dólar de productos cuando su pedido queda pagado, la dueña define premios (descuento en USD o producto gratis), y los puntos se canjean en las ventas del panel o al finalizar una compra en la tienda. "Mi cuenta" ya muestra el saldo de puntos junto con la deuda y el saldo a favor.

Lo que falta, y lo que cubre esta especificación:

1. **Una sección de puntos en el panel**: hoy los puntos solo se ven entrando a la ficha de cada cliente, uno por uno.
2. **Una vista "Mis puntos" para el cliente registrado**, dedicada al programa: cuántos puntos tiene, cómo se ganan, qué puede canjear y cuánto le falta.
3. **Un premio nuevo: delivery gratis.** Hoy solo existen el descuento y el producto gratis.
4. **La tabla de puntos** (cuánto cuesta cada premio), que hoy está vacía y sin criterio.

### Tabla de puntos propuesta

**Cómo se ganan**

| Acción | Puntos | Cuándo |
|--------|--------|--------|
| Comprar (consumidores) | 1 punto por cada USD entero de productos | Cuando el pedido queda pagado (regla vigente, no cambia) |
| Crear la cuenta en la tienda | 25 puntos de bienvenida | Una sola vez por cliente, al quedar vinculada la cuenta |

**Qué se puede canjear** (catálogo inicial sugerido; la dueña elige los productos y puede cambiar cada costo)

| Premio | Costo | Condición | Lo que recibe el cliente |
|--------|-------|-----------|--------------------------|
| Delivery gratis | 100 puntos | Pedido con delivery y al menos USD 15 en productos | El envío de ese pedido, a cualquier zona activa (USD 3 a 6) |
| Producto de entrada (p. ej. una salsa) | 20 puntos por cada USD de su precio al detal (un producto de USD 7 = 140 puntos) | Que haya existencia | El producto gratis dentro de su pedido |
| Producto intermedio (p. ej. una pasta) | Misma regla (USD 12 = 240 puntos) | Que haya existencia | El producto gratis dentro de su pedido |
| Producto estrella (p. ej. el más pedido, o 2 unidades) | Misma regla (USD 20 = 400 puntos) | Que haya existencia | El producto gratis dentro de su pedido |

**Por qué es atractiva para las dos partes**

- **Para el cliente**: la regla se explica en una frase ("1 punto por cada dólar; con 100 puntos tu delivery es gratis"). Con un pedido promedio de unos USD 25, el primer premio llega alrededor de la cuarta compra, y el bono de bienvenida lo acerca desde el primer día. Cada 100 puntos equivalen a unos USD 5 en productos: un retorno cercano al 5%, por encima de lo habitual en programas de este tipo.
- **Para la dueña**: los premios en producto le cuestan su costo, no su precio de venta, así que el 5% que percibe el cliente le cuesta bastante menos. El delivery gratis le cuesta en promedio USD 3,44 por cada 100 puntos (la mayoría de las zonas cuesta USD 3), es decir, cerca del 3,4% de lo vendido. Ningún premio se entrega suelto: todo canje viaja dentro de un pedido nuevo, así que cada premio trae al cliente de vuelta a comprar. La compra mínima del delivery gratis evita regalar un envío de USD 6 en un pedido de USD 5. Y la sección de puntos del panel le muestra en todo momento cuántos puntos hay en circulación.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver en el panel los puntos de todos los clientes (Priority: P1)

Como dueña, quiero una sección del panel dedicada a los puntos, donde vea de un vistazo cuántos puntos ha ganado, canjeado y tiene disponibles cada cliente, para saber quiénes son mis clientes más fieles, quiénes ya pueden canjear y cuántos puntos tengo "debiendo" en premios.

**Why this priority**: Es lo primero que pidió y no depende de nada nuevo: los movimientos de puntos ya existen. Se puede entregar sola y da valor desde el primer día.

**Independent Test**: Con varios clientes que tienen puntos ganados, canjes, devoluciones y ajustes, abrir la sección "Puntos" y comprobar que cada fila coincide con los movimientos de la ficha de ese cliente y que los indicadores coinciden con la suma de las filas.

**Acceptance Scenarios**:

1. **Given** hay clientes con movimientos de puntos, **When** la dueña abre la sección "Puntos" del panel, **Then** ve una tabla con una fila por cliente que muestra nombre, tipo de cliente, puntos ganados, puntos canjeados, ajustes, puntos disponibles y fecha del último movimiento, ordenada de más a menos puntos disponibles.
2. **Given** una clienta ganó 320 puntos en total, se le revirtieron 20 por un pedido cancelado, canjeó 150, recuperó 0 y recibió un ajuste de +10, **When** la dueña mira su fila, **Then** ve Ganados 300, Canjeados 150, Ajustes +10 y Disponibles 160, y Disponibles es siempre Ganados − Canjeados + Ajustes.
3. **Given** la tabla tiene muchos clientes, **When** la dueña escribe parte de un nombre o un teléfono en el buscador, **Then** la tabla muestra solo los clientes que coinciden, ignorando acentos y mayúsculas.
4. **Given** la tabla está abierta, **When** la dueña elige ordenar por puntos ganados, por canjeados o por último movimiento, **Then** la tabla se reordena por esa columna.
5. **Given** la sección está abierta, **When** la dueña revisa los indicadores de arriba, **Then** ve el total de puntos en circulación (la suma de los disponibles de todos los clientes), cuántos clientes tienen puntos, cuántos ya pueden canjear al menos un premio activo y los puntos ganados y canjeados en el mes en curso (mes de Caracas).
6. **Given** la dueña quiere el detalle de un cliente, **When** pulsa su fila, **Then** llega a la ficha de ese cliente, donde están sus movimientos de puntos y el ajuste manual que ya existen.
7. **Given** una persona sin autorización de administradora, **When** intenta abrir la sección, **Then** el acceso se niega igual que en el resto del panel.

---

### User Story 2 - Consultar mis puntos y lo que puedo canjear (Priority: P1)

Como clienta registrada, quiero una vista "Mis puntos" donde vea cuántos puntos tengo, cómo los gané, qué premios existen y cuánto me falta para cada uno, para saber qué puedo pedir sin preguntar por WhatsApp.

**Why this priority**: Es la mitad visible del programa para el cliente. Los datos ya existen; hoy están mezclados en "Mi cuenta" con la deuda y el saldo a favor, sin explicar cómo se ganan los puntos ni qué se necesita para canjear.

**Independent Test**: Entrar con una cuenta vinculada a un cliente con 160 puntos, abrir "Mis puntos" y comprobar que el saldo coincide con el del panel, que los premios de hasta 160 puntos aparecen como canjeables y que los demás indican cuántos puntos faltan.

**Acceptance Scenarios**:

1. **Given** una clienta con sesión iniciada y cuenta vinculada, **When** abre "Mis puntos", **Then** ve sus puntos disponibles, el mismo número que muestra el panel para ella.
2. **Given** hay premios activos de 100, 140 y 240 puntos y la clienta tiene 160, **When** mira el catálogo de premios, **Then** los de 100 y 140 aparecen como "Ya lo puedes canjear" y el de 240 indica "Te faltan 80 puntos", cada uno con su nombre, descripción, costo en puntos y condiciones (compra mínima, solo con delivery).
3. **Given** la clienta todavía no alcanza ningún premio, **When** abre "Mis puntos", **Then** ve cuál es el premio más cercano y cuántos puntos le faltan para alcanzarlo.
4. **Given** la clienta quiere entender el programa, **When** lee la vista, **Then** encuentra en lenguaje sencillo cómo se ganan los puntos (1 punto por cada dólar de productos, cuando el pedido queda pagado), que el delivery no suma puntos y que los premios se canjean al hacer un pedido.
5. **Given** la clienta tiene movimientos de puntos, **When** revisa su historial, **Then** ve cada movimiento con fecha, concepto (compra, canje, devolución, bono de bienvenida, ajuste), pedido relacionado y puntos con su signo, del más reciente al más antiguo.
6. **Given** el producto de un premio está agotado, **When** la clienta mira el catálogo, **Then** ese premio aparece marcado "Sin existencia por ahora" y no como canjeable.
7. **Given** una persona sin sesión, con el correo sin verificar o con la vinculación pendiente, **When** intenta abrir "Mis puntos", **Then** no ve puntos de ningún cliente y se le indica cómo iniciar sesión o que su cuenta está en revisión.
8. **Given** una clienta con premios canjeables, **When** pulsa "Canjear" en uno de ellos, **Then** la vista la lleva a hacer su pedido en la tienda y le explica que el premio se elige en el paso de pago, donde se descuentan los puntos.

---

### User Story 3 - Canjear mis puntos por delivery gratis (Priority: P2)

Como clienta, quiero usar mis puntos para que el delivery de mi pedido salga gratis, y como dueña quiero ofrecer ese premio con un costo en puntos y una compra mínima que yo decida.

**Why this priority**: Es el premio nuevo que pidió la dueña y el más fácil de alcanzar para el cliente, pero toca el total del pedido, así que requiere más cuidado que las dos historias anteriores. El canje por productos ya existe.

**Independent Test**: Crear el premio "Delivery gratis" (100 puntos, compra mínima USD 15). Con una clienta de 120 puntos, hacer un pedido de USD 20 en productos con delivery a una zona de USD 4 y canjear el premio: el pedido debe quedar en USD 20, la clienta en 20 puntos y, al quedar pagado el pedido, debe ganar 20 puntos. Cancelar otro pedido igual y comprobar que recupera los 100 puntos.

**Acceptance Scenarios**:

1. **Given** la dueña está en la sección de premios, **When** crea un premio de tipo "Delivery gratis" con costo de 100 puntos y compra mínima de USD 15 y lo activa, **Then** el premio aparece en "Mis puntos" y entre los premios canjeables al finalizar una compra.
2. **Given** una clienta con 120 puntos y un pedido de USD 20 en productos con delivery a una zona de USD 4, **When** canjea "Delivery gratis" y confirma la compra, **Then** el total a pagar es USD 20, el pedido muestra el delivery de USD 4 y, por separado, el descuento "Delivery gratis" de USD 4, y a la clienta le quedan 20 puntos.
3. **Given** el pedido anterior queda pagado, **When** se acreditan los puntos, **Then** la clienta gana 20 puntos (los de sus productos), igual que si hubiera pagado el delivery.
4. **Given** la clienta elige retirar su pedido en tienda, **When** llega al paso de pago, **Then** "Delivery gratis" aparece deshabilitado con la nota "Solo para pedidos con delivery", y si ya lo había elegido antes de cambiar a retiro, deja de estar elegido y no se le descuentan puntos.
5. **Given** un pedido de USD 12 en productos y un premio con compra mínima de USD 15, **When** la clienta intenta canjearlo, **Then** el premio aparece deshabilitado con la nota "Agrega USD 3,00 más en productos para usarlo".
6. **Given** un pedido con "Delivery gratis" canjeado, **When** se cancela, **Then** la clienta recupera los 100 puntos en la misma operación, como con cualquier otro canje.
7. **Given** una venta registrada desde el panel con costo de delivery, **When** la administradora canjea "Delivery gratis" para ese cliente, **Then** aplica con las mismas reglas que en la tienda.
8. **Given** la clienta ya eligió un premio de delivery gratis en su pedido, **When** intenta elegir otro premio de delivery gratis, **Then** el segundo no se puede elegir: un pedido admite un solo delivery gratis.

---

### User Story 4 - Armar el catálogo de premios con una regla clara de costos (Priority: P2)

Como dueña, quiero que al crear un premio el sistema me proponga cuántos puntos debe costar según la tabla de puntos del programa, para armar el catálogo rápido y sin regalar de más ni pedir de más.

**Why this priority**: Sin un catálogo cargado, "Mis puntos" no tiene nada que ofrecer. La dueña ya puede crear premios a mano; esta historia le da el criterio y el punto de partida.

**Independent Test**: Crear un premio de producto gratis eligiendo un producto de USD 7 al detal y comprobar que el costo propuesto es 140 puntos; cambiarlo a 150, guardar y comprobar que queda en 150. Crear un premio de delivery gratis y comprobar que propone 100 puntos y USD 15 de compra mínima.

**Acceptance Scenarios**:

1. **Given** la dueña crea un premio de producto gratis, **When** elige el producto y la cantidad, **Then** el sistema propone como costo 20 puntos por cada USD del precio al detal de lo que se regala, redondeado a la decena más cercana (1 unidad de USD 7 → 140 puntos; 2 unidades de USD 6,50 → 260 puntos).
2. **Given** la dueña crea un premio de delivery gratis, **When** abre el formulario, **Then** el sistema propone 100 puntos de costo y USD 15 de compra mínima.
3. **Given** un costo propuesto, **When** la dueña escribe otro valor y guarda, **Then** queda el valor que ella escribió; la propuesta nunca se impone.
4. **Given** un premio existente, **When** la dueña le pone, cambia o quita la compra mínima, **Then** la condición se aplica a los canjes hechos desde ese momento y no altera los pedidos ya registrados.
5. **Given** el precio de un producto cambia después de creado su premio, **When** la dueña revisa la lista de premios, **Then** el costo en puntos del premio sigue siendo el que ella guardó.

---

### User Story 5 - Recibir puntos de bienvenida al crear mi cuenta (Priority: P3)

Como persona que compra en la tienda, quiero recibir puntos de bienvenida al crear mi cuenta, para tener un motivo para registrarme y empezar más cerca de mi primer premio. Como dueña, quiero que más clientes se registren, porque así sus pedidos quedan identificados y vuelven a comprar.

**Why this priority**: Mejora la adopción del programa, pero el programa funciona sin él. Se puede entregar al final o posponer sin afectar las demás historias.

**Independent Test**: Crear una cuenta nueva de consumidor y comprobar que aparece un movimiento de 25 puntos "Bono de bienvenida"; desvincular y volver a vincular la cuenta y comprobar que no se repite.

**Acceptance Scenarios**:

1. **Given** una persona crea su cuenta y queda vinculada a un cliente consumidor, **When** la vinculación se confirma, **Then** el cliente recibe 25 puntos con el concepto "Bono de bienvenida", una sola vez.
2. **Given** una cuenta cuya vinculación quedó pendiente, **When** la administradora la confirma desde la ficha, **Then** el bono se acredita en ese momento, y no antes.
3. **Given** un cliente que ya recibió el bono, **When** su cuenta se desvincula y se vuelve a vincular, o se vincula a otra cuenta, **Then** no recibe otro bono.
4. **Given** un cliente mayorista crea su cuenta, **When** queda vinculada, **Then** no recibe bono, igual que no acumula puntos por sus compras.
5. **Given** consumidores que ya tenían su cuenta vinculada antes de activarse la función, **When** la función se activa, **Then** reciben el bono una sola vez, para que nadie quede en desventaja por haberse registrado antes.

---

### Edge Cases

- **Cliente sin movimientos de puntos**: no aparece en la sección "Puntos" del panel; aparece cuando tiene su primer movimiento.
- **Cliente con movimientos y saldo en cero**: sí aparece, con Disponibles en 0, porque interesa ver lo que ganó y canjeó.
- **Mayorista con puntos** (antes fue consumidor): aparece en el panel con su tipo actual, ve "Mis puntos" y puede canjear, pero no acumula ni recibe bono.
- **Sin premios activos**: "Mis puntos" muestra el saldo y el historial, y en lugar del catálogo el mensaje "Pronto tendremos premios para canjear con tus puntos".
- **El costo de la zona cambia mientras el cliente compra**: el delivery gratis cubre el costo vigente al confirmar la compra; el cliente nunca paga el delivery de un pedido con ese premio.
- **Zona inactiva**: el pedido se rechaza como hoy, sin descontar puntos.
- **Delivery gratis junto con otros premios y saldo a favor**: se pueden combinar; primero se aplican los premios y luego el saldo a favor sobre lo que queda. El total nunca queda negativo.
- **Compra mínima y descuentos**: la compra mínima se compara con el monto de productos después de descuentos, sin delivery y sin contar las líneas gratis de otros premios.
- **Editar un pedido con delivery gratis**: la edición no toca los canjes (regla vigente). El descuento de delivery gratis se conserva igual al delivery guardado en el pedido.
- **Premio de delivery desactivado o puntos insuficientes al confirmar**: la compra se rechaza sin aplicar nada, con un mensaje que explica qué cambió, y el carrito se conserva (regla vigente de los canjes).
- **Venta rápida por WhatsApp y cotización rápida**: no cambian. No guardan pedidos, así que no suman ni canjean puntos.
- **Bono de bienvenida y cuentas repetidas**: una persona podría crear varias cuentas con correos distintos. El riesgo es bajo y aceptado: 25 puntos no alcanzan para ningún premio y todo canje exige un pedido. La dueña puede corregirlo con un ajuste manual.
- **Bono con el programa sin premios**: el bono se acredita igual; los puntos quedan disponibles para cuando haya premios.
- **Puntos del mes en los indicadores**: el mes en curso se corta en hora de Caracas, no en la del servidor ni la del navegador.
- **Pedido importado desde Excel**: sigue sin sumar ni canjear puntos, y no aparece como movimiento en ninguna de las dos vistas.

## Requirements *(mandatory)*

### Functional Requirements

**Sección "Puntos" del panel**

- **FR-001**: El panel DEBE tener una sección "Puntos", accesible desde su navegación y solo para administradoras autorizadas, con el mismo control de acceso que el resto del panel.
- **FR-002**: La sección DEBE listar una fila por cada cliente que tenga al menos un movimiento de puntos, con: nombre, tipo de cliente, puntos ganados, puntos canjeados, ajustes, puntos disponibles y fecha del último movimiento.
- **FR-003**: Los valores de cada fila DEBEN calcularse desde los movimientos de puntos existentes: Ganados = acumulaciones y bonos menos reversiones; Canjeados = canjes menos devoluciones; Ajustes = ajustes manuales con su signo. Disponibles DEBE ser siempre Ganados − Canjeados + Ajustes y coincidir con el saldo que muestran la ficha del cliente y "Mis puntos".
- **FR-004**: La sección DEBE permitir buscar por nombre o teléfono (sin distinguir acentos ni mayúsculas) y ordenar por puntos disponibles (orden inicial, de mayor a menor), ganados, canjeados o último movimiento.
- **FR-005**: La sección DEBE mostrar como indicadores: puntos en circulación (suma de disponibles), número de clientes con puntos disponibles, número de clientes que ya pueden canjear al menos un premio activo, y puntos ganados y canjeados en el mes en curso según la hora de Caracas.
- **FR-006**: Cada fila DEBE llevar a la ficha del cliente, y la sección DEBE enlazar con la administración de premios.
- **FR-007**: La sección es de solo consulta: los ajustes manuales de puntos se siguen haciendo desde la ficha del cliente.

**Vista "Mis puntos" del cliente**

- **FR-008**: La tienda DEBE ofrecer al cliente con sesión iniciada y cuenta vinculada una vista "Mis puntos", accesible desde "Mi cuenta", usable en un teléfono.
- **FR-009**: "Mis puntos" DEBE mostrar los puntos disponibles, el premio más cercano con los puntos que faltan, el catálogo de premios activos y el historial de movimientos de puntos.
- **FR-010**: Cada premio del catálogo DEBE mostrar nombre, descripción, costo en puntos, sus condiciones (compra mínima, solo con delivery) y su estado para ese cliente: canjeable, cuántos puntos faltan, o sin existencia.
- **FR-011**: "Mis puntos" DEBE explicar en lenguaje sencillo cómo se ganan los puntos y cómo se canjean, con los valores vigentes del programa.
- **FR-012**: Cada movimiento del historial DEBE mostrar fecha (hora de Caracas), concepto, pedido relacionado si existe y puntos con signo. NO DEBE mostrar quién registró el movimiento ni motivos internos de los ajustes.
- **FR-013**: Desde un premio canjeable, el cliente DEBE poder iniciar su pedido en la tienda; el premio se elige y los puntos se descuentan al confirmar la compra, nunca antes.
- **FR-014**: El cliente DEBE ver solo sus propios puntos; el cliente se determina siempre por su sesión. Sin sesión, con correo sin verificar o con vinculación pendiente, la vista NO DEBE mostrar datos de ningún cliente.
- **FR-015**: "Mis puntos" DEBE mostrarse a los consumidores y a cualquier cliente con puntos disponibles (misma regla que hoy aplica a la sección de puntos de "Mi cuenta").

**Premio "Delivery gratis"**

- **FR-016**: La dueña DEBE poder crear, editar, activar y desactivar premios de un tercer tipo, "Delivery gratis", con nombre, descripción y costo en puntos, igual que los tipos existentes.
- **FR-017**: Canjear "Delivery gratis" DEBE descontar del total del pedido el costo completo del delivery de ese pedido, cualquiera sea la zona activa, y descontar los puntos en la misma operación.
- **FR-018**: El pedido DEBE conservar registrado el costo del delivery y mostrar por separado el descuento del premio, tanto a la dueña como al cliente, de modo que la dueña siga sabiendo cuánto cuesta ese envío.
- **FR-019**: "Delivery gratis" solo DEBE poder canjearse en pedidos con delivery y costo de envío mayor que cero; en pedidos con retiro en tienda DEBE aparecer deshabilitado con su explicación.
- **FR-020**: Un pedido DEBE admitir como máximo un premio de delivery gratis.
- **FR-021**: El delivery cubierto por el premio NO DEBE cambiar los puntos que gana el pedido: se siguen calculando sobre el monto de productos pagado.
- **FR-022**: El canje de delivery gratis DEBE estar disponible donde ya se canjean premios: al finalizar una compra en la tienda y en las ventas y pedidos del panel.
- **FR-023**: Al cancelar un pedido con delivery gratis canjeado, el cliente DEBE recuperar los puntos en la misma operación, como con los demás canjes.

**Compra mínima**

- **FR-024**: Todo premio DEBE poder tener una compra mínima opcional en USD. Sin ella, el premio no exige monto mínimo.
- **FR-025**: La compra mínima DEBE compararse con el monto de productos del pedido después de descuentos, sin delivery y sin las líneas gratis de premios. Si no se cumple, el canje se rechaza y la tienda indica cuánto falta agregar.
- **FR-026**: Todas las condiciones de un canje (puntos, premio activo, existencia, compra mínima, pedido con delivery) DEBEN volver a validarse al confirmar el pedido; si alguna dejó de cumplirse, no se aplica ningún cambio.

**Tabla de puntos**

- **FR-027**: La regla de acumulación vigente NO cambia: 1 punto por cada USD entero de productos efectivamente cobrado, sin delivery, cuando el pedido queda pagado, solo para consumidores y nunca en cargas de Excel.
- **FR-028**: Al crear un premio de producto gratis, el sistema DEBE proponer su costo en puntos como 20 puntos por cada USD del precio al detal de lo que se regala (precio × cantidad), redondeado a la decena más cercana. La dueña DEBE poder cambiarlo antes de guardar.
- **FR-029**: Al crear un premio de delivery gratis, el sistema DEBE proponer 100 puntos de costo y USD 15 de compra mínima, ambos editables.
- **FR-030**: El costo en puntos guardado de un premio NO DEBE cambiar solo cuando cambian los precios de los productos o las tarifas de delivery.
- **FR-031**: Los premios de descuento en USD que ya existan DEBEN seguir funcionando sin cambios.

**Bono de bienvenida**

- **FR-032**: Un cliente consumidor DEBE recibir 25 puntos de bienvenida cuando su cuenta de la tienda queda vinculada (de inmediato si el correo verificado lo vincula o si se crea como cliente nuevo; al confirmarla la administradora si quedó pendiente).
- **FR-033**: El bono DEBE acreditarse como máximo una vez por cliente, sin importar cuántas veces se vincule o desvincule su cuenta, y DEBE quedar como un movimiento identificable ("Bono de bienvenida") en su historial.
- **FR-034**: Los consumidores con cuenta ya vinculada al activarse la función DEBEN recibir el bono una sola vez. Los mayoristas no lo reciben.

**Reglas generales**

- **FR-035**: Los puntos, saldos y premios existentes DEBEN conservarse al activar la función; ningún saldo de puntos cambia, salvo por el bono de bienvenida.
- **FR-036**: El saldo de puntos de un cliente NUNCA DEBE quedar negativo, y dos canjes simultáneos del mismo cliente no pueden gastar los mismos puntos.
- **FR-037**: Las pantallas y mensajes DEBEN estar en español, las fechas en hora de Caracas y los avisos de éxito y error DEBEN usar el sistema de notificaciones existente de la app.

### Key Entities *(include if feature involves data)*

- **Movimiento de puntos**: ya existe. Suma o resta de puntos de un cliente (acumulación, canje, devolución, reversión, ajuste), con fecha y pedido relacionado. Se agrega el concepto "bono de bienvenida", que cuenta como puntos ganados.
- **Resumen de puntos por cliente**: no se guarda; se calcula desde los movimientos: ganados, canjeados, ajustes, disponibles y último movimiento. Es lo que muestra la sección del panel.
- **Premio**: ya existe (descuento en USD o producto gratis, con costo en puntos y estado activo). Se agrega el tipo "delivery gratis" y una compra mínima opcional en USD para cualquier tipo.
- **Canje**: ya existe; el uso de un premio en un pedido. El de delivery gratis reduce el total en el costo del envío de ese pedido y se revierte si el pedido se cancela.
- **Pedido**: ya existe. Conserva su costo de delivery y registra por separado lo descontado por premios.
- **Tabla de puntos**: los valores del programa: 1 punto por USD de productos, 25 puntos de bienvenida, 20 puntos por USD de precio al detal como costo sugerido de un premio en producto, y 100 puntos con USD 15 de compra mínima como valores sugeridos del delivery gratis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La dueña puede saber cuántos puntos disponibles tiene un cliente conocido en menos de 15 segundos desde que entra al panel, sin abrir su ficha.
- **SC-002**: En una muestra de al menos 20 clientes con acumulaciones, canjes, devoluciones, reversiones y ajustes, los puntos disponibles de la sección del panel coinciden con los de la ficha y con los de "Mis puntos" en el 100% de los casos, y en todas las filas Disponibles = Ganados − Canjeados + Ajustes.
- **SC-003**: Un cliente con cuenta puede ver sus puntos disponibles y saber qué premios puede canjear en menos de 30 segundos desde que inicia sesión.
- **SC-004**: En una pantalla de 360 píxeles de ancho, "Mis puntos" muestra el saldo, el catálogo de premios y el historial sin desplazamiento horizontal.
- **SC-005**: En el 100% de los pedidos de prueba con delivery gratis, el cliente paga exactamente el monto de sus productos (menos otros descuentos), se le descuenta exactamente el costo en puntos del premio y gana los mismos puntos que habría ganado pagando el delivery.
- **SC-006**: En el 100% de las cancelaciones de prueba de pedidos con delivery gratis, el cliente recupera todos los puntos del canje.
- **SC-007**: En el 100% de las pruebas en que no se cumple una condición del premio (retiro en tienda, compra mínima, puntos insuficientes, premio inactivo, segundo delivery gratis), el canje se rechaza sin descontar puntos ni modificar el pedido.
- **SC-008**: En el 100% de las pruebas de vinculación (inmediata, pendiente y confirmada, desvinculada y vuelta a vincular), cada cliente consumidor recibe el bono de bienvenida exactamente una vez, y ningún mayorista lo recibe.
- **SC-009**: La dueña puede crear un premio nuevo, con el costo propuesto por el sistema, en menos de 1 minuto.
- **SC-010**: En las pruebas de acceso, el 0% de las cuentas de cliente logra ver la sección "Puntos" del panel o los puntos de otro cliente.
- **SC-011**: A los 3 meses de activar la función, al menos el 20% de los clientes consumidores con puntos suficientes para algún premio ha canjeado al menos uno.
- **SC-012**: A los 3 meses de activar la función, el valor de los premios entregados (productos a su costo más delivery cubierto) no supera el 5% de las ventas a consumidores del mismo periodo.

## Assumptions

- **Se construye sobre la especificación 010**: la acumulación, los movimientos de puntos, los premios de descuento y de producto, el canje en la tienda y en el panel, la devolución de puntos al cancelar y la cuenta del cliente ya existen y no se rediseñan. Esta especificación solo agrega lo que falta.
- **Todo canje viaja dentro de un pedido**: no se entregan premios sueltos. Así el premio se coordina con la entrega normal del pedido, cada canje trae una compra nueva y no hace falta un flujo aparte de "pedido de premio". "Mis puntos" muestra qué se puede canjear y lleva al cliente a comprar; el premio se elige en el paso de pago, como hoy.
- **El delivery gratis cubre el envío completo a cualquier zona**: la promesa es simple para el cliente. Como 64 de las 90 zonas cuestan USD 3 (16 cuestan USD 4, 6 cuestan USD 5 y 4 cuestan USD 6), el costo promedio para la dueña es de unos USD 3,44 por canje. No se añade un tope por zona.
- **La tasa de acumulación se mantiene en 1 punto por USD**: cambiarla alteraría el valor de los puntos que los clientes ya tienen. Lo que se calibra es el costo de los premios.
- **Los costos de la tabla son sugerencias editables**: se calcularon con las tarifas de delivery actuales y con un pedido promedio estimado de USD 25. La dueña debe revisar los costos propuestos contra sus precios y márgenes reales al cargar el catálogo, y puede cambiarlos cuando quiera.
- **El catálogo de premios en producto lo arma la dueña**: la especificación define la regla de costo (20 puntos por USD) y sugiere tres niveles (entrada, intermedio y estrella), pero no fija productos concretos.
- **Los puntos siguen sin vencer** y no hay niveles de cliente, puntos por cumpleaños ni por referidos. La sección "Puntos" del panel le permite a la dueña vigilar los puntos en circulación y decidir más adelante si hace falta un vencimiento.
- **Los mayoristas siguen sin acumular**: ya tienen su precio especial. Pueden ver y canjear puntos que hayan ganado como consumidores.
- **"Mis puntos" es parte de la tienda pública** (dentro de "Mi cuenta"), y "Puntos" es parte del panel: no se crea ninguna superficie nueva.
- **La sección del panel no filtra por periodo ni exporta**: muestra los totales históricos por cliente y los puntos del mes en curso como indicador. El detalle por fecha de un cliente está en su ficha.
- **Sin avisos automáticos**: no se envían correos ni mensajes de WhatsApp cuando el cliente gana puntos o alcanza un premio; la dueña puede avisarle por WhatsApp si quiere.
- **Fuera de alcance**: vencimiento de puntos, niveles o categorías, referidos, cumpleaños, premios de varios productos distintos (combos), transferir puntos entre clientes, canjes sin pedido, tope de delivery por zona, exportación de la sección de puntos y avisos automáticos.
- **Entrega por fases**: la sección del panel (US1) y "Mis puntos" (US2) pueden entregarse primero porque solo leen datos existentes; luego el delivery gratis con la compra mínima (US3) y los costos propuestos (US4); y al final el bono de bienvenida (US5).
