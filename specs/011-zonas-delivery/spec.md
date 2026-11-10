# Feature Specification: Zonas de delivery administrables y delivery en la venta rápida

**Feature Branch**: `011-zonas-delivery`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "dentro del panel administrativo quiero una seccion "Delivery" la usuaria quiere porder ver, editar zonas de deliveries con costos ya agregados y agregar zonas de deliverys nuevas, quiero que la informacion se muestre tipo table y que tambien permita editar directo desde la tabla asi como agregar filas directo desde la tabla, tambien quiero que en "/venta-rapida" si se desea concreatar la venta por whatsapp aparezca una opcion para seleccionar delivery, que se muesteren las zonas de todos los deliveries, que tenga buscador para conseguir la zona más rapida y que una vez seleccionada la zona solo aparezca esa seleccion en pantalla y que se despliegue un pequeño formulario donde se coloque telefono, nombre y direccion de la persona que va a retirar el delivery"

## Clarifications

### Session 2026-11-10

- Q: ¿"Las zonas de todos los deliveries" es una sola lista de zonas con su costo o hay varios servicios de delivery, cada uno con sus zonas y costos? → A: Una sola lista: cada zona tiene un único costo, como hoy; "todos los deliveries" se refiere a todos los grupos de costo ($3, $4, $5, $6).
- Q: Además de ver, editar y agregar, ¿la dueña puede quitar una zona que ya no atiende? → A: Puede desactivarla (y reactivarla). La zona inactiva sigue en la tabla, pero deja de ofrecerse en la tienda, la venta rápida y la cotización rápida; no se eliminan zonas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver y editar las zonas de delivery desde el panel (Priority: P1)

La dueña entra a la nueva sección "Delivery" del panel y ve en una tabla todas las zonas a las que hace envíos con su costo, ya cargadas con las zonas y costos que la tienda usa hoy (por ejemplo, Altamira a $3, Baruta a $4, El Hatillo a $5 y Caricuao a $6). Cuando cambia una tarifa o corrige un nombre, lo hace directamente en la celda de la tabla, sin abrir otra pantalla.

Hoy la lista de zonas y sus costos está fija en el sistema: cambiar el costo de una zona requiere a un desarrollador.

**Why this priority**: Es lo primero que pidió la dueña y el ajuste de tarifas es la operación más frecuente. Con solo esta historia ya controla lo que se cobra por delivery.

**Independent Test**: Con la zona "Chuao" a $3, la dueña abre "Delivery", cambia el costo de Chuao a $3,50 en la tabla y confirma. Al recargar, la tabla muestra Chuao a $3,50.

**Acceptance Scenarios**:

1. **Given** una persona autorizada en el panel, **When** abre la sección "Delivery", **Then** ve una tabla con todas las zonas (nombre y costo en USD), ordenadas por costo y luego por nombre, con las 90 zonas que la tienda usa hoy ya cargadas con su costo actual.
2. **Given** la tabla, **When** edita el nombre o el costo de una zona en su celda y confirma (con Enter o al salir de la celda), **Then** el cambio se guarda, recibe una confirmación visible y la fila muestra el valor guardado en su posición según el orden.
3. **Given** una celda en edición, **When** cancela (con Escape), **Then** la celda vuelve al valor guardado y no se guarda nada.
4. **Given** una celda en edición, **When** confirma un valor inválido (nombre vacío, nombre de otra zona existente, costo vacío, cero, negativo, no numérico o con más de 2 decimales), **Then** no se guarda, se indica el motivo y la celda queda en edición para corregirla o cancelar.
5. **Given** una persona no autorizada para el panel, **When** intenta ver o modificar las zonas (por la interfaz o por cualquier otra vía), **Then** se le rechaza y las zonas no cambian.
6. **Given** la dueña usa su teléfono, **When** abre la sección, **Then** puede leer y editar cualquier fila sin que la información quede cortada.
7. **Given** una zona activa que ya no se atiende, **When** la dueña la desactiva desde su fila, **Then** la zona queda marcada como inactiva en la tabla, recibe una confirmación visible y deja de ofrecerse en la tienda, la venta rápida y la cotización rápida.
8. **Given** una zona inactiva, **When** la dueña la reactiva desde su fila, **Then** vuelve a ofrecerse con el nombre y el costo que tenía.

---

### User Story 2 - Agregar zonas nuevas desde la misma tabla (Priority: P1)

La dueña empieza a enviar a una urbanización nueva. Desde la propia tabla agrega una fila, escribe el nombre y el costo, y la zona queda disponible de inmediato para la tienda, la venta rápida y la cotización rápida.

**Why this priority**: Es la segunda operación pedida explícitamente; sin ella, una zona nueva sigue requiriendo a un desarrollador.

**Independent Test**: La dueña agrega "Santa Sofía" a $4 desde la fila nueva y confirma. La zona aparece en la tabla entre las de $4 y, al abrir la venta rápida, aparece en el buscador de zonas.

**Acceptance Scenarios**:

1. **Given** la tabla, **When** pulsa "Agregar zona", **Then** aparece una fila nueva editable dentro de la tabla con el cursor en el nombre.
2. **Given** la fila nueva con nombre y costo válidos, **When** confirma, **Then** la zona se crea, recibe una confirmación visible y queda en la tabla en la posición que le corresponde.
3. **Given** la fila nueva con un nombre que ya existe, activo o inactivo (sin importar mayúsculas, minúsculas ni acentos), o un costo inválido, **When** confirma, **Then** no se crea, se indica el motivo y la fila sigue editable.
4. **Given** la fila nueva sin confirmar, **When** la descarta, **Then** desaparece sin crear nada.
5. **Given** una zona recién creada, **When** pulsa de nuevo "Agregar zona", **Then** puede cargar otra sin salir de la vista.

---

### User Story 3 - Las zonas del panel son las que usa toda la tienda (Priority: P1)

Las zonas y costos del panel pasan a ser los únicos que existen: el checkout de la tienda los usa para calcular y cobrar el delivery, los clientes los ven al elegir el sector de una dirección, la cotización rápida los ofrece y la venta rápida los muestra. La lista fija actual deja de usarse.

**Why this priority**: Sin esta historia, la dueña cambiaría una tarifa en el panel y la tienda seguiría cobrando la anterior: el panel mostraría un precio y el pedido registraría otro.

**Independent Test**: Tras cambiar Chuao a $3,50 y crear "Santa Sofía" a $4: (a) el selector de sector del checkout muestra ambas con esos costos; (b) un pedido nuevo con delivery a Chuao registra $3,50 de delivery; (c) la cotización rápida ofrece ambas con esos costos; (d) un pedido anterior con delivery a Chuao sigue mostrando $3.

**Acceptance Scenarios**:

1. **Given** una zona con costo actualizado, **When** un cliente confirma un pedido con delivery a esa zona, **Then** el sistema cobra el costo vigente al momento de confirmar, calculado en el servidor y no a partir de lo que envía el navegador.
2. **Given** pedidos ya registrados con delivery, **When** cambia el nombre o el costo de su zona, **Then** esos pedidos conservan la zona y el costo con los que se registraron.
3. **Given** un cliente con una dirección guardada en una zona, **When** la dueña renombra esa zona, **Then** la dirección sigue asociada a la zona (con el nombre nuevo) y puede usarse en el checkout sin volver a elegir el sector.
4. **Given** una zona nueva, **When** un cliente guarda una dirección, **Then** puede elegirla como sector.
5. **Given** un cliente con una dirección guardada en una zona que la dueña desactivó, **When** intenta confirmar un pedido con delivery a esa dirección, **Then** el sistema no lo confirma y le pide elegir otro sector o retirar en tienda; los pedidos ya registrados con esa zona no cambian.

---

### User Story 4 - Elegir delivery al enviar la venta rápida por WhatsApp (Priority: P2)

En `/venta-rapida`, al revisar el pedido antes de enviarlo por WhatsApp, quien compra puede indicar que lo quiere con delivery. Ve todas las zonas con su costo, agrupadas por costo, y un buscador para encontrar la suya escribiendo parte del nombre. Al elegirla, la lista desaparece, en pantalla queda solo la zona elegida con su costo y se despliega un pequeño formulario para el nombre, el teléfono y la dirección de quien recibirá el pedido. El mensaje de WhatsApp incluye la zona, el costo del delivery, el total con delivery y los datos de quien recibe.

Hoy el mensaje de la venta rápida dice "NO INCLUYE DELIVERY" y la dueña tiene que preguntar la zona y los datos de entrega en la conversación.

**Why this priority**: Es la segunda parte del pedido y le ahorra a la dueña una ronda de preguntas por cada pedido con envío, pero depende de que las zonas y sus costos estén al día (Historias 1 a 3).

**Independent Test**: Con productos por $10 en el carrito, quien compra activa el delivery, escribe "hipico", ve "Club Hípico" y "Terrazas del Club Hípico", elige "Club Hípico" ($3): la lista se oculta y queda "Club Hípico · $3". Completa nombre, teléfono y dirección y envía: el mensaje muestra subtotal $10, delivery a Club Hípico $3, total $13 con su equivalente en Bs, y los datos de quien recibe.

**Acceptance Scenarios**:

1. **Given** un carrito con productos y el resumen del pedido abierto, **When** lo revisa, **Then** ve una opción para agregar delivery, desactivada por defecto; si no la activa, el envío por WhatsApp funciona como hoy, indicando que no incluye delivery.
2. **Given** activa el delivery, **When** se despliega la opción, **Then** ve todas las zonas vigentes con su costo, agrupadas por costo, y un buscador.
3. **Given** el buscador, **When** escribe parte de un nombre, **Then** la lista se filtra al instante sin distinguir mayúsculas, minúsculas ni acentos ("hipico" encuentra "Club Hípico"); si nada coincide, se indica que no hay zonas con ese nombre.
4. **Given** la lista, **When** elige una zona, **Then** la lista y el buscador se ocultan, queda visible solo la zona elegida con su costo y una opción para cambiarla, y se despliega el formulario de nombre, teléfono y dirección de quien recibe.
5. **Given** una zona elegida, **When** pulsa "Cambiar", **Then** vuelven el buscador y la lista, y lo ya escrito en el formulario se conserva.
6. **Given** una zona elegida, **When** mira el resumen, **Then** ve el subtotal de productos, el costo del delivery y el total con delivery, en USD y en Bs.
7. **Given** delivery activo, zona elegida y formulario completo, **When** envía por WhatsApp, **Then** el mensaje incluye el detalle de productos, el subtotal, la zona, el costo del delivery, el total con delivery (USD y Bs) y el nombre, teléfono y dirección de quien recibe.
8. **Given** delivery activo sin zona elegida, o con nombre, teléfono o dirección vacíos o un teléfono inválido, **When** intenta enviar, **Then** no se abre WhatsApp y se indica qué falta.
9. **Given** delivery activo, **When** lo desactiva, **Then** se ocultan la zona y el formulario, el total vuelve a ser solo el de productos y el mensaje se envía como hoy.
10. **Given** el resumen, **When** elige "Procesar pedido en la app", **Then** ese flujo no cambia: la zona se elige en el checkout existente, con las zonas del panel.

---

### Edge Cases

- Dos personas editan la misma zona casi a la vez: prevalece el último cambio guardado y la tabla muestra el valor vigente al recargar.
- Un nombre con espacios al inicio, al final o repetidos se normaliza antes de comparar y guardar.
- Nombres que solo difieren en acentos o mayúsculas ("Chacaito" y "Chacaíto") se consideran la misma zona: el segundo se rechaza como duplicado.
- Los costos admiten hasta 2 decimales ($3,50); cero o negativo se rechaza, porque un envío sin costo ya se cubre con el retiro en tienda.
- Un cliente tiene el checkout abierto y la dueña cambia el costo de su zona antes de que confirme: el sistema calcula el total con el costo vigente; si ya no coincide con el pago declarado, no confirma el pedido y pide revisar el total, que al recargar muestra el costo vigente. Nunca se registra un pedido con un costo de delivery distinto al vigente.
- En la venta rápida se muestran los costos vigentes al abrir la página; como el mensaje de WhatsApp no registra un pedido, la dueña confirma el monto final en la conversación.
- Si no se pueden obtener las zonas en la venta rápida, la opción de delivery indica que no está disponible y se puede seguir enviando el pedido sin delivery.
- Cerrar y volver a abrir el resumen de la venta rápida conserva la zona elegida y el formulario; vaciar el carrito los limpia.
- Con unas 90 zonas, la tabla del panel y la lista de la venta rápida siguen siendo legibles en un teléfono.
- La dueña intenta crear una zona con el nombre de una zona inactiva: se rechaza como duplicado y se le indica que puede reactivar la existente.
- Una zona se desactiva mientras alguien la tiene elegida en la venta rápida o en la cotización rápida: lo ya mostrado no cambia hasta la siguiente carga; en el checkout, la confirmación del pedido se rechaza y se pide otro sector.
- Si todas las zonas quedan inactivas, la venta rápida indica que el delivery no está disponible y el checkout solo ofrece el retiro en tienda.

## Requirements *(mandatory)*

### Functional Requirements

**Sección "Delivery" del panel**

- **FR-001**: El panel DEBE tener una sección "Delivery" accesible desde su navegación, disponible solo para las personas autorizadas del panel.
- **FR-002**: La sección DEBE mostrar las zonas en una tabla con el nombre y el costo de delivery en USD, ordenada por costo y luego por nombre.
- **FR-003**: Al habilitar la función, el sistema DEBE contener las 90 zonas que la tienda usa hoy con su costo actual (64 a $3, 16 a $4, 6 a $5 y 4 a $6), sin que la dueña tenga que cargarlas.
- **FR-004**: Se DEBE poder editar el nombre y el costo de una zona directamente en su celda: el cambio se guarda al confirmar (Enter o al salir de la celda) y se descarta con Escape.
- **FR-005**: Se DEBE poder agregar una zona desde una fila nueva dentro de la propia tabla, sin salir de la vista, y descartar esa fila sin crear nada.
- **FR-006**: El nombre de una zona DEBE ser obligatorio, se normaliza quitando espacios sobrantes, admite hasta 80 caracteres y DEBE ser único sin distinguir mayúsculas, minúsculas ni acentos.
- **FR-007**: El costo de una zona DEBE ser obligatorio, en USD, mayor que cero y con hasta 2 decimales.
- **FR-008**: Toda creación o modificación de zonas DEBE validarse y autorizarse en el servidor; la interfaz no basta para aceptar un cambio.
- **FR-009**: Cada guardado, exitoso o rechazado, DEBE notificarse con el mecanismo de notificaciones de la aplicación, indicando el motivo cuando se rechaza.
- **FR-010**: Se DEBE poder desactivar y reactivar una zona desde su fila. Una zona inactiva sigue en la tabla, marcada como tal, conserva su nombre y su costo, y cuenta para la regla de nombre único (FR-006). Las zonas no se eliminan.

**Una sola lista de zonas**

- **FR-011**: Las zonas del panel DEBEN ser la única fuente de zonas y costos de delivery para el checkout de la tienda, el selector de sector de las direcciones, la cotización rápida y la venta rápida; la lista fija actual deja de usarse. Solo las zonas activas se ofrecen fuera del panel.
- **FR-012**: Al confirmar un pedido con delivery, el sistema DEBE calcular su costo a partir de la zona vigente en ese momento y DEBE rechazar el pedido si la zona de la dirección está inactiva, pidiendo elegir otro sector.
- **FR-013**: Los pedidos ya registrados DEBEN conservar la zona y el costo de delivery con los que se registraron, aunque luego cambie la zona.
- **FR-014**: Renombrar una zona DEBE mantener asociadas a ella las direcciones guardadas que la usaban.
- **FR-015**: Los cambios de zonas DEBEN verse en la tienda, la venta rápida y la cotización rápida en su siguiente carga, sin intervención técnica.
- **FR-016**: Existe una sola lista de zonas: cada zona tiene un único costo y no se distinguen servicios ni empresas de delivery.

**Delivery en la venta rápida**

- **FR-017**: El resumen del pedido de `/venta-rapida` DEBE ofrecer una opción para agregar delivery, desactivada por defecto, que acompaña el envío por WhatsApp.
- **FR-018**: Al activarla, DEBE mostrar todas las zonas activas con su costo, agrupadas por costo, y un buscador que filtre por coincidencia parcial del nombre sin distinguir mayúsculas, minúsculas ni acentos.
- **FR-019**: Al elegir una zona, DEBE ocultar la lista y el buscador, mostrar solo la zona elegida con su costo y permitir cambiarla.
- **FR-020**: Al elegir una zona, DEBE desplegar un formulario con el nombre, el teléfono y la dirección de quien recibe el pedido; los tres son obligatorios y el teléfono DEBE tener entre 10 y 15 dígitos (admite "+", espacios y guiones).
- **FR-021**: Con una zona elegida, el resumen DEBE mostrar el subtotal de productos, el costo del delivery y el total con delivery, en USD y en Bs con la misma tasa que ya usa el resumen.
- **FR-022**: Con delivery, el mensaje de WhatsApp DEBE incluir la zona, el costo del delivery, el total con delivery (USD y Bs) y el nombre, teléfono y dirección de quien recibe. Sin delivery, el mensaje se mantiene como hoy.
- **FR-023**: Si el delivery está activo y falta la zona o algún dato de quien recibe, o el teléfono no es válido, NO se DEBE abrir WhatsApp y se DEBE indicar qué falta.
- **FR-024**: La opción de delivery de la venta rápida NO DEBE registrar pedidos, clientes ni direcciones, ni descontar inventario: los datos de quien recibe solo viajan en el mensaje de WhatsApp.
- **FR-025**: La zona elegida y los datos del formulario DEBEN conservarse al cerrar y reabrir el resumen y limpiarse al vaciar el carrito.
- **FR-026**: El flujo "Procesar pedido en la app" de la venta rápida NO DEBE cambiar, salvo que el checkout usa las zonas del panel (FR-011).

### Key Entities *(include if feature involves data)*

- **Zona de delivery**: un sector al que se hacen envíos. Tiene un nombre único, un costo en USD y un estado (activa o inactiva); solo las activas se ofrecen fuera del panel. Las direcciones guardadas de los clientes se asocian a una zona, y cada pedido con delivery guarda una copia del nombre de la zona y del costo cobrado, que no cambia si luego se edita la zona.
- **Datos de quien recibe (venta rápida)**: nombre, teléfono y dirección de la persona que recibe el pedido. Solo forman parte del mensaje de WhatsApp; no se guardan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La dueña cambia el costo de una zona en menos de 15 segundos desde que abre la sección "Delivery", sin ayuda técnica.
- **SC-002**: La dueña agrega una zona nueva en menos de 30 segundos y la zona aparece en la tienda, la venta rápida y la cotización rápida en su siguiente carga.
- **SC-003**: El 100 % de los pedidos nuevos con delivery registra el costo vigente en el panel al momento de confirmarse, y ningún pedido anterior cambia su costo de delivery.
- **SC-004**: Al habilitar la función, la tabla muestra las 90 zonas actuales, activas y con el mismo costo que hoy; ninguna se pierde ni cambia de precio.
- **SC-007**: Una zona desactivada deja de ofrecerse en la tienda, la venta rápida y la cotización rápida en su siguiente carga, y ningún pedido nuevo puede registrar delivery a esa zona.
- **SC-005**: En la venta rápida, quien compra encuentra su zona y completa los datos de entrega en menos de 1 minuto.
- **SC-006**: El 100 % de los mensajes de WhatsApp con delivery incluye la zona, el costo del delivery, el total con delivery y el nombre, teléfono y dirección de quien recibe, de modo que la dueña no tiene que preguntarlos.

## Assumptions

- No hay varios servicios de delivery: cada zona tiene un único costo de delivery, igual para consumidores y mayoristas, expresado en USD; el equivalente en Bs se calcula con la tasa vigente, como el resto de importes.
- El orden de la tabla y de las listas de zonas es por costo y luego alfabético; no se agrega un orden manual. Las zonas inactivas se muestran en la tabla en ese mismo orden, distinguidas visualmente.
- La tabla del panel no lleva buscador propio en esta versión: el orden por costo y nombre y la búsqueda del navegador bastan para unas 90 zonas.
- "La persona que va a retirar el delivery" es quien recibe el pedido en la dirección indicada.
- La venta rápida es pública y no exige iniciar sesión; los datos de quien recibe no se guardan ni se asocian a un cliente.
- No se lleva historial de cambios de costos de las zonas: el costo cobrado queda registrado en cada pedido.
- Las ediciones simultáneas siguen la regla de "el último cambio guardado prevalece".
- La sección queda disponible para las mismas personas que ya acceden al panel; no se crean roles nuevos.
