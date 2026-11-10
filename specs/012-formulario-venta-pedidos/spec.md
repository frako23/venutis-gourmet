# Feature Specification: Formulario de venta con búsqueda y alta de clientes, edición y eliminación de pedidos

**Feature Branch**: `012-formulario-venta-pedidos`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "la usuaria quiere que se arregle el formulario de registro de venta dentro del panel administrativo, quiere ella poder registrar un nuevo usuario, tambien quiere que cuando vaya a buscar un usuario dentro de la base de datos poder tener un buscador por nombre para conseguirlo rápidamente, también quiere poder editar y hasta eliminar ordenes que ya hayan sido creadas, en la tabla de ventas y pedidos una funcionalidad que le permita editar la orden que seleccione, la mandaria al formulario de crear orden ya con la data precargada, y tambien otra acción que le permita borrar la orden mostrando una modal de confirmacion antes de hacerlo"

## Clarifications

### Session 2026-11-10

- Q: ¿Qué pedidos se pueden editar? → A: Todos menos los cancelados, **incluidos los pagados**. En un pedido pagado, si el total sube hay que confirmar que se cobró la diferencia, y los puntos ganados se ajustan al nuevo monto.
- Q: ¿Qué significa eliminar un pedido y para qué pedidos? → A: **Borrado definitivo**, solo para pedidos que no tienen cobros (ni abonos ni estado pagado), puntos, saldo a favor, nota de entrega ni reseñas, como los duplicados o de prueba. Los demás se cancelan.
- Q: ¿En qué hora se manejan las fechas? → A: Siempre en hora de Caracas, para mostrar, proponer e interpretar fechas, sin depender del servidor ni del navegador. Es una regla general de la constitución (v2.1.0) y aplica a todas las fechas de esta función.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar al cliente por nombre al registrar una venta (Priority: P1)

Como administradora, al registrar una venta manual quiero escribir parte del nombre del cliente y ver de inmediato los clientes que coinciden, para elegirlo en segundos en lugar de recorrer una lista larga con todos los clientes.

**Why this priority**: Es el paso que más tiempo consume en cada venta manual: hoy el cliente se elige en una lista desplegable con toda la base de clientes, sin forma de filtrar. Afecta a todas las ventas que se registran desde el panel.

**Independent Test**: En el formulario de venta, la persona escribe "mar" en el campo de cliente; aparecen solo los clientes cuyo nombre o apellido contiene esas letras (por ejemplo "María Pérez" y "Marcos Díaz"), elige uno y el formulario aplica su tipo de precio como hoy.

**Acceptance Scenarios**:

1. **Given** el formulario de registro de venta, **When** la persona escribe una o más letras en el buscador de cliente, **Then** la lista muestra solo los clientes cuyo nombre o apellido contiene lo escrito, sin distinguir mayúsculas, minúsculas ni acentos.
2. **Given** la persona escribe nombre y apellido parciales (por ejemplo "mar pe"), **When** se filtra la lista, **Then** aparecen los clientes que contienen ambas partes ("María Pérez") y no los que solo contienen una.
3. **Given** la lista filtrada, **When** la persona elige un cliente con el ratón o con el teclado, **Then** el cliente queda seleccionado, se muestra su nombre completo y su tipo (consumidor o mayorista), y el formulario aplica el tipo de precio que le corresponde, su saldo a favor y sus puntos, igual que hoy.
4. **Given** un cliente ya seleccionado, **When** la persona quiere cambiarlo, **Then** puede limpiar la selección y volver a buscar.
5. **Given** que lo escrito no coincide con ningún cliente, **When** se filtra la lista, **Then** se indica que no hay coincidencias y se ofrece registrar un cliente nuevo (Historia 2).

---

### User Story 2 - Registrar un cliente nuevo sin salir del formulario de venta (Priority: P1)

Como administradora, cuando el comprador todavía no existe en la base de datos quiero registrarlo desde el mismo formulario de venta, para completar la venta sin perder lo que ya cargué ni ir a otra pantalla.

**Why this priority**: Hoy, si el cliente no existe, hay que abandonar el formulario, crear el cliente en otra sección y volver a cargar toda la venta. Es la principal causa de que el formulario se perciba como "roto".

**Independent Test**: Con productos ya cargados en el formulario, la persona busca "Lucía Rojas", no hay coincidencias, pulsa "Registrar cliente nuevo", completa los datos y guarda; el cliente queda creado y seleccionado en la venta, y los productos cargados siguen intactos.

**Acceptance Scenarios**:

1. **Given** el formulario de venta, **When** la persona pulsa "Registrar cliente nuevo" (siempre disponible junto al buscador), **Then** se abre una ventana con los mismos datos y validaciones del alta de clientes del panel (tipo de cliente, nombre, apellido, teléfono, correo, RIF y demás campos existentes).
2. **Given** la persona escribió un nombre en el buscador sin coincidencias, **When** abre el alta desde ahí, **Then** el nombre escrito aparece precargado en la ventana.
3. **Given** la ventana de alta con datos válidos, **When** la persona guarda, **Then** el cliente se crea, se muestra una notificación de éxito, la ventana se cierra y el cliente queda seleccionado en la venta con el tipo de precio que le corresponde.
4. **Given** la ventana de alta con datos inválidos o con un teléfono, correo o RIF que ya pertenece a otro cliente, **When** la persona intenta guardar, **Then** se muestra el motivo junto al campo y el cliente no se crea.
5. **Given** la ventana de alta abierta, **When** la persona la cierra sin guardar, **Then** la venta conserva todo lo que ya tenía cargado.

---

### User Story 3 - Editar un pedido existente desde la tabla de ventas (Priority: P1)

Como administradora, quiero elegir "Editar" en un pedido de la tabla de "Ventas y pedidos" y llegar al formulario de venta con los datos de ese pedido ya cargados, para corregir errores (cantidades, productos, precios, cliente, fecha, descuento) sin cancelarlo y volver a crearlo.

**Why this priority**: Hoy un pedido mal cargado solo se puede corregir parcialmente (estado y descuento) o cancelándolo y registrando otro, lo que ensucia el historial y obliga a repetir trabajo. Es la segunda petición explícita de la usuaria.

**Independent Test**: Con un pedido "Por cobrar" de 3 unidades del producto A, la persona pulsa "Editar" en su fila, ve el formulario con el cliente, la fecha, las líneas, el descuento y la tasa del pedido, cambia la cantidad a 5 y guarda; el pedido conserva su número de orden, su total refleja 5 unidades, el inventario del producto A baja 2 unidades más y el historial muestra la edición.

**Acceptance Scenarios**:

1. **Given** la tabla de ventas (vista de tabla o de tarjetas en teléfono), **When** la persona revisa las acciones de un pedido editable, **Then** encuentra la acción "Editar".
2. **Given** la persona pulsa "Editar", **When** se abre el formulario, **Then** muestra el número de orden, el cliente, la fecha, el tipo de entrega, cada línea con su producto, tipo de precio, cantidad y precio unitario tal como se guardaron, el descuento, la tasa y el resumen de totales del pedido, e indica claramente que se está editando un pedido existente.
3. **Given** el formulario en modo edición, **When** la persona cambia datos y guarda, **Then** se actualiza el mismo pedido (no se crea uno nuevo), se muestra una notificación de éxito y la persona vuelve a la tabla o al detalle del pedido con los datos actualizados.
4. **Given** una edición que aumenta, reduce, agrega o quita productos, **When** se guarda, **Then** el inventario de cada producto se ajusta solo por la diferencia entre lo que tenía el pedido y lo que tiene ahora; si no hay existencia suficiente para un aumento, no se guarda nada y se indica qué producto no alcanza.
5. **Given** una edición, **When** se guarda, **Then** los totales (subtotal, descuento, descuento por puntos, delivery y total) se recalculan con las mismas reglas que al registrar una venta.
6. **Given** un pedido con abonos registrados, **When** la edición dejaría el total por debajo de lo ya abonado, **Then** no se guarda y se explica el motivo.
7. **Given** una edición guardada, **When** se consulta el detalle del pedido, **Then** su historial registra que fue editado, quién lo hizo y cuándo.
8. **Given** el formulario en modo edición, **When** la persona sale sin guardar, **Then** el pedido queda exactamente como estaba.
9. **Given** un pedido cancelado, **When** la persona revisa sus acciones, **Then** "Editar" no se ofrece.
10. **Given** un pedido pagado, **When** la edición sube el total, **Then** el formulario pide confirmar que se cobró la diferencia; sin esa confirmación no se guarda y se sugiere pasar el pedido a "Por cobrar" si el cliente aún debe la diferencia.
11. **Given** un pedido pagado que ya acreditó puntos al cliente, **When** se guarda una edición que cambia el monto de productos, **Then** los puntos del pedido se ajustan al nuevo monto: se acredita la diferencia o se revierte con tope, sin dejar nunca al cliente con puntos negativos.
12. **Given** un pedido registrado a las 21:30 hora de Caracas, **When** se abre para editar, **Then** el formulario muestra esa fecha y hora tal cual, y al guardar sin tocarla el pedido conserva la misma fecha y hora.

---

### User Story 4 - Eliminar un pedido con confirmación (Priority: P2)

Como administradora, quiero eliminar desde la tabla de ventas un pedido que nunca debió existir (por ejemplo, uno duplicado o de prueba), con una ventana que me pida confirmar antes de hacerlo, para mantener limpio el registro sin riesgo de borrar algo por accidente.

**Why this priority**: Es menos frecuente que editar y la cancelación ya cubre los pedidos que el cliente anuló; eliminar resuelve sobre todo duplicados y errores de carga. Por ser irreversible, va después de la edición.

**Independent Test**: Con un pedido duplicado "Por cobrar", la persona pulsa "Eliminar" en su fila, la ventana muestra el número de orden, el cliente y el total, confirma, y el pedido desaparece de la tabla mientras sus productos vuelven al inventario.

**Acceptance Scenarios**:

1. **Given** la tabla de ventas (vista de tabla o de tarjetas), **When** la persona revisa las acciones de un pedido que se puede eliminar, **Then** encuentra la acción "Eliminar", visualmente distinguible como acción peligrosa.
2. **Given** la persona pulsa "Eliminar", **When** se abre la ventana de confirmación, **Then** muestra el número de orden, el cliente, la fecha y el total del pedido, advierte que la acción no se puede deshacer y ofrece "Eliminar pedido" y "Volver".
3. **Given** la ventana de confirmación, **When** la persona elige "Volver", cierra la ventana o pulsa fuera de ella, **Then** no se elimina nada.
4. **Given** la ventana de confirmación, **When** la persona confirma, **Then** el pedido se elimina según FR-018, se muestra una notificación de éxito y la tabla se actualiza sin ese pedido.
5. **Given** un pedido eliminado, **When** se consultan la tabla, las cuentas por cobrar, las analíticas o la ficha del cliente, **Then** el pedido ya no aparece ni cuenta en ninguna cifra.
6. **Given** un pedido pagado, o con abonos, puntos, saldo a favor, nota de entrega o reseñas, **When** la persona revisa sus acciones, **Then** "Eliminar" no se ofrece y se indica que ese pedido se cancela en lugar de eliminarse. Si el pedido adquirió alguno de esos movimientos mientras la ventana estaba abierta, la eliminación se rechaza con un mensaje que explica por qué.
7. **Given** un pedido cancelado sin ninguno de esos movimientos (por ejemplo, un duplicado que se canceló), **When** la persona lo elimina, **Then** desaparece del registro sin devolver inventario otra vez, porque ya se devolvió al cancelarlo.
8. **Given** un pedido "Por cobrar" de la tienda con un pago declarado por el cliente pero no recibido, **When** la persona confirma su eliminación, **Then** el pedido y su pago declarado se eliminan juntos, y la ventana de confirmación lo advierte antes.

---

### Edge Cases

- **Búsqueda sin acentos o con mayúsculas**: "maria" y "MARÍA" encuentran a "María"; la búsqueda también tolera espacios de más.
- **Clientes homónimos**: si dos clientes se llaman igual, la lista muestra un dato que los distinga (teléfono o RIF, parcialmente si es necesario) para no elegir al equivocado.
- **Base de clientes grande**: la búsqueda sigue respondiendo de inmediato con cientos o miles de clientes.
- **Alta de un cliente que ya existe**: si el teléfono, correo o RIF ya pertenece a otro cliente, se rechaza el alta y se indica el campo en conflicto, para que la persona busque y elija al cliente existente.
- **Edición de un pedido importado desde Excel**: se edita igual, pero, como en la carga, no mueve inventario ni puntos.
- **Edición con un producto agotado o retirado del catálogo**: las líneas que ya tenía el pedido se conservan y se pueden reducir o quitar; para aumentarlas cuenta como disponible lo que ya estaba reservado por el propio pedido más la existencia actual.
- **Pedido con premios canjeados o saldo a favor aplicado**: las líneas de producto gratis y el descuento por puntos se muestran como parte del pedido, pero no se modifican desde el formulario; el saldo a favor aplicado sigue siendo un abono del pedido.
- **Cambio de cliente en un pedido con puntos, canjes o saldo a favor asociados**: se rechaza, igual que hoy en el editor masivo, porque esos movimientos pertenecen al cliente original.
- **Pedido modificado por otra acción mientras se editaba** (por ejemplo, se registró un abono, se canceló o se pagó): al guardar se detecta el cambio, no se sobrescribe y se pide recargar el pedido.
- **Pedido de la tienda con delivery**: la zona, la dirección y el costo de delivery guardados se conservan y siguen sumando al total; la edición no los recalcula con la tarifa actual de la zona.
- **Edición que aumenta lo que el cliente debe por encima de su crédito**: en un pedido sin cobrar se pide la misma autorización que al registrar una venta manual, y queda anotada en el historial. Un pedido pagado no se evalúa contra el crédito.
- **Pedido pagado cuyo total baja**: se guarda y el pedido sigue pagado, siempre que el nuevo total no quede por debajo de lo abonado. Los puntos se revierten en proporción, con tope. El dinero que se le deba devolver al cliente no se registra automáticamente: si corresponde dejarlo a favor, se hace con las herramientas de saldo a favor que ya existen.
- **Pedido importado y pagado**: se edita sin mover inventario ni puntos, como en la carga desde Excel.
- **Venta registrada de noche**: a las 22:00 hora de Caracas, la fecha propuesta y la guardada son las de ese mismo día, no las del siguiente.
- **Doble clic al confirmar la eliminación o al guardar la edición**: se procesa una sola vez.
- **Eliminar el único pedido de la última página de la tabla**: la tabla muestra la página anterior en lugar de una página vacía.
- **Pedido con nota de entrega o reseña asociada**: no se puede eliminar (FR-018); se cancela.
- **Pedido "Por cobrar" con abonos que luego se anularon todos**: los abonos anulados siguen siendo movimientos de dinero registrados, así que el pedido no se puede eliminar y se cancela.

## Requirements *(mandatory)*

### Functional Requirements

**Búsqueda de cliente en el formulario de venta**

- **FR-001**: El formulario de registro de venta del panel DEBE permitir buscar al cliente escribiendo parte de su nombre y/o apellido, y mostrar solo los clientes que coinciden mientras se escribe.
- **FR-002**: La búsqueda DEBE ignorar mayúsculas, minúsculas, acentos y espacios de más, y cuando se escriben varias palabras DEBE exigir que el cliente contenga todas.
- **FR-003**: Cada resultado DEBE mostrar el nombre completo, el tipo de cliente y un dato que permita distinguir homónimos (teléfono o RIF).
- **FR-004**: El buscador DEBE poder usarse con el teclado (moverse entre resultados y elegir) y en pantallas de teléfono.
- **FR-005**: Al elegir un cliente, el formulario DEBE comportarse como hoy: aplicar el tipo de precio que le corresponde (detal o mayor) a las líneas que no son promoción y mostrar su saldo a favor y sus puntos disponibles.

**Alta de cliente desde el formulario**

- **FR-006**: El formulario de venta DEBE ofrecer "Registrar cliente nuevo" sin salir de la pantalla, junto al buscador y también cuando la búsqueda no tiene coincidencias.
- **FR-007**: El alta DEBE pedir los mismos datos y aplicar las mismas validaciones y reglas de unicidad (teléfono, correo, RIF) que el alta de clientes existente en el panel, de modo que un cliente creado desde la venta sea igual a uno creado desde la sección de clientes.
- **FR-008**: Cuando el alta se abre desde una búsqueda sin coincidencias, el texto buscado DEBE precargarse como nombre y apellido.
- **FR-009**: Al guardar el alta con éxito, el cliente nuevo DEBE quedar seleccionado en la venta y los datos ya cargados en el formulario (líneas, descuento, tasa, estado, entrega) DEBEN conservarse; al cerrarla sin guardar, también.

**Corrección del formulario**

- **FR-010**: Todas las fechas y horas de esta función DEBEN manejarse en hora de Caracas, sin depender de la zona horaria del servidor ni del navegador:
  - la fecha que el formulario propone para una venta nueva es la fecha y hora actuales de Caracas;
  - la fecha y hora que se ingresan se interpretan como hora de Caracas;
  - al editar, la fecha guardada del pedido se muestra en hora de Caracas y, si no se toca, se conserva idéntica;
  - las fechas de la ventana de eliminación y las del historial del pedido se muestran en hora de Caracas.

**Edición de pedidos**

- **FR-011**: La tabla de "Ventas y pedidos" (vista de tabla y vista de tarjetas) y el detalle de un pedido DEBEN ofrecer la acción "Editar" en los pedidos editables, que lleva al formulario de venta con los datos de ese pedido precargados.
- **FR-012**: Se pueden editar todos los pedidos excepto los cancelados, que tienen un estado final. Eso incluye los "Por cobrar" (y los históricos "Pendiente"), los "En pedido" y los "Pagados". Al editar un pedido pagado:
  - si el nuevo total es mayor que el anterior, DEBE exigirse la confirmación explícita de que se cobró la diferencia; sin ella, la edición se rechaza;
  - el pedido sigue pagado y no se evalúa contra el crédito del cliente;
  - si el pedido acreditó puntos, DEBEN ajustarse al nuevo monto de productos con la regla vigente (1 punto por USD entero de productos, sin delivery, solo para precio detal): se acredita la diferencia o se revierte con tope, sin dejar nunca el saldo de puntos del cliente en negativo. El ajuste queda registrado como un movimiento de puntos del pedido.
  - En los pedidos importados desde Excel no se mueven puntos.
- **FR-013**: En modo edición el formulario DEBE permitir cambiar el cliente, la fecha, el número de orden (que debe seguir siendo único), el tipo de entrega, las líneas (agregar, quitar y cambiar producto, tipo de precio, cantidad y precio unitario), el descuento y la tasa. El estado del pedido no se cambia desde el formulario: se sigue cambiando con el control de estado existente y sus reglas (confirmación de cobro, razón de cancelación).
- **FR-014**: Guardar una edición DEBE actualizar el mismo pedido, en una sola operación de todo o nada: si cualquier validación falla, el pedido, el inventario y los saldos quedan como estaban.
- **FR-015**: Guardar una edición DEBE ajustar el inventario de cada producto solo por la diferencia entre las cantidades anteriores y las nuevas, rechazando la edición si un aumento no tiene existencia suficiente. Los pedidos importados desde Excel no mueven inventario.
- **FR-016**: Guardar una edición DEBE recalcular los totales con las mismas reglas que el registro de una venta manual, conservando el descuento por puntos, las líneas de premios y el costo de delivery guardados, y DEBE rechazarse si el nuevo total queda por debajo de lo ya abonado.
- **FR-017**: Cada edición guardada DEBE quedar registrada en el historial del pedido con quién la hizo, cuándo y un resumen de lo que cambió; el historial existente no se modifica.

**Eliminación de pedidos**

- **FR-018**: La tabla de "Ventas y pedidos" (vista de tabla y vista de tarjetas) DEBE ofrecer la acción "Eliminar" solo en los pedidos que no estén pagados y que no tengan abonos (vigentes ni anulados), movimientos de puntos, movimientos de saldo a favor, notas de entrega ni reseñas. Eliminar es un borrado definitivo: el pedido, sus líneas, sus pagos declarados y su historial dejan de existir. Para los demás pedidos el camino sigue siendo cancelar. Las condiciones DEBEN volver a verificarse en el momento de eliminar, no solo al mostrar la acción.
- **FR-019**: Antes de eliminar, el sistema DEBE mostrar una ventana de confirmación con el número de orden, el cliente, la fecha y el total. La ventana DEBE advertir que la acción no se puede deshacer y avisar si el pedido tiene un pago declarado que se eliminará con él, y DEBE exigir una confirmación explícita. Cerrar la ventana o elegir "Volver" no elimina nada.
- **FR-020**: Eliminar un pedido no importado y no cancelado DEBE devolver al inventario las cantidades de sus productos en la misma operación. Un pedido importado desde Excel no devuelve inventario (como ya ocurre al cancelarlo), y uno cancelado tampoco, porque ya lo devolvió al cancelarse.
- **FR-021**: Un pedido eliminado NO DEBE aparecer ni contar en la tabla de ventas, las cuentas por cobrar, la deuda del cliente, las analíticas, el panel principal, las exportaciones ni la ficha del cliente.

**Reglas comunes**

- **FR-022**: Editar y eliminar pedidos y crear clientes desde el formulario DEBEN estar disponibles solo para las personas autorizadas a usar el panel, verificándolo en el servidor en cada operación.
- **FR-023**: Todos los resultados (éxito, error de validación, falta de existencia, pedido modificado mientras tanto) DEBEN comunicarse con las notificaciones del panel, en español y con un mensaje que diga qué hacer.
- **FR-024**: Si el pedido cambió desde que se abrió para editar o eliminar (otro abono, cambio de estado, otra edición), la operación DEBE rechazarse sin sobrescribir y pedir que se recargue el pedido.

### Key Entities *(include if feature involves data)*

- **Pedido (venta)**: operación registrada con número de orden único, cliente, fecha, estado, tipo de entrega, delivery, descuentos, tasa y total en USD. Esta función permite modificarlo después de creado y eliminarlo.
- **Línea del pedido**: producto, cantidad (hasta 2 decimales), precio unitario y tipo de precio (detal, mayor o promoción). Las líneas de premios a precio 0 forman parte del pedido pero no se editan desde el formulario.
- **Cliente**: comprador con nombre, apellido, tipo (consumidor o mayorista), datos de contacto únicos, crédito, saldo a favor y puntos. Ahora también se puede crear desde el formulario de venta.
- **Historial del pedido**: registro de solo inserción de los cambios de estado; pasa a registrar también las ediciones.
- **Inventario de producto**: existencia que se ajusta por diferencia al editar y se devuelve al eliminar (excepto en pedidos importados).
- **Abonos, puntos y saldo a favor**: movimientos de dinero y fidelización ligados al pedido y al cliente; limitan qué se puede editar o eliminar.
- **Nota de entrega**: documento para mayoristas que puede estar ligado a un pedido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La administradora encuentra y selecciona a un cliente existente escribiendo como máximo 4 letras de su nombre o apellido, en menos de 5 segundos, con la base completa de clientes cargada.
- **SC-002**: Una venta para un cliente que no existía se completa sin salir del formulario y sin volver a cargar ningún producto, en menos de 2 minutos.
- **SC-003**: Corregir la cantidad de una línea de un pedido existente, desde la tabla de ventas hasta ver el pedido actualizado, toma menos de 1 minuto y no requiere cancelar ni volver a registrar el pedido.
- **SC-004**: En el 100 % de las ediciones y eliminaciones de pedidos no importados, la existencia de cada producto queda igual a la anterior menos la diferencia de cantidades (o más la cantidad devuelta), sin desfases.
- **SC-005**: Ningún pedido se elimina sin que la persona haya visto sus datos en la ventana de confirmación y confirmado explícitamente.
- **SC-006**: El 100 % de las ediciones de pedidos aparecen en el historial del pedido con quién y cuándo.
- **SC-007**: Después de eliminar un pedido, ninguna cifra del panel (ventas, cuentas por cobrar, deuda del cliente, analíticas) lo incluye.
- **SC-008**: El 100 % de las ventas registradas o editadas entre las 20:00 y las 23:59 hora de Caracas quedan con la fecha de ese mismo día en la tabla, el detalle, los filtros y las exportaciones.
- **SC-009**: Después de editar un pedido pagado, los puntos del cliente coinciden con los que le corresponden por el nuevo monto, sin que su saldo de puntos quede nunca en negativo.

## Assumptions

- "Usuario" en la petición se refiere al **cliente** comprador (la entidad Cliente), no a una persona con acceso al panel. Las personas con acceso al panel se siguen gestionando con la lista de correos autorizados, sin cambios.
- "Arreglar el formulario de registro de venta" se concreta en: buscador de clientes por nombre, alta de clientes desde el formulario, la fecha propuesta en hora de Caracas y el uso del mismo formulario para editar pedidos. Si la usuaria percibe otros fallos concretos, se tratan como cambios aparte.
- El buscador se aplica al cliente; la búsqueda de productos dentro del formulario no forma parte de este alcance.
- La edición reutiliza el formulario de registro de venta; no se crea un formulario distinto para editar.
- El estado del pedido, los abonos, los canjes de premios y el saldo a favor se siguen gestionando desde sus controles actuales (tabla y detalle del pedido); el formulario de edición los conserva y los muestra, pero no los cambia.
- La autorización de crédito al editar sigue la misma regla que al registrar una venta manual.
- Las ventas de la tienda, la venta rápida y la cotización rápida no cambian; las acciones de editar y eliminar existen solo en el panel.
- La cancelación de pedidos (spec 007) se mantiene igual y sigue siendo el camino para los pedidos que el cliente anuló; eliminar es para pedidos que no debieron registrarse.
- Eliminar no deja registro de la eliminación (decisión de la usuaria). Como solo se eliminan pedidos sin dinero recibido, puntos, saldo a favor ni documentos asociados, no se pierde ningún movimiento que afecte a otros registros.
- En los pedidos pagados, la confirmación de que se cobró la diferencia sigue la misma regla que hoy rige para marcar un pedido como pagado. Si la usuaria quiere dejar constancia del cobro, lo hace con los abonos existentes.
