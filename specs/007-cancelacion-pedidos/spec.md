# Feature Specification: Cancelación de pedidos y cambio de estado desde la tabla

**Feature Branch**: `007-cancelacion-pedidos`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "en el modulo de ventas y pedidos debo agregar el estado cancelado, esto ocurre cuando un cliente monta un pedido pero al final lo cancela, quiero que cuando modifique el estado a cancelado aparezca una modal solicitando la razon de la cancelación del pedido pero que no sea un campo obligatorio, tambien quiero poder cambiar los estados de cada pedido directamente desde la tabla sin tener que entrar en modo edicion masiva"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancelar un pedido indicando la razón (Priority: P1)

Como persona que administra el panel, quiero marcar como "Cancelado" un pedido que el cliente montó y luego anuló, y dejar anotada la razón si la conozco, para que el registro de ventas refleje lo que realmente ocurrió y el pedido deje de contar como venta.

**Why this priority**: Hoy no existe una forma operativa de cancelar un pedido; los pedidos anulados quedan como "Por cobrar" o "En pedido" y distorsionan el seguimiento de cobros y las cifras de ventas. Es el motivo principal de la funcionalidad.

**Independent Test**: Con un pedido en "Por cobrar", la persona abre el control de estado del pedido, elige "Cancelado", completa o deja vacía la razón en la ventana que aparece y confirma; el pedido queda cancelado, el historial muestra el cambio con la razón y el pedido deja de aparecer en las cifras de ventas.

**Acceptance Scenarios**:

1. **Given** un pedido en "Por cobrar" o "En pedido", **When** la persona elige "Cancelado" como nuevo estado, **Then** aparece una ventana modal que solicita la razón de la cancelación, indica que el campo es opcional y ofrece confirmar la cancelación o volver sin cambios.
2. **Given** la ventana de cancelación está abierta, **When** la persona escribe una razón y confirma, **Then** el pedido pasa a "Cancelado" y el historial del pedido registra el estado anterior, el nuevo estado, quién lo hizo, cuándo y la razón escrita.
3. **Given** la ventana de cancelación está abierta, **When** la persona confirma sin escribir ninguna razón, **Then** el pedido pasa a "Cancelado" igualmente y el historial registra el cambio sin razón.
4. **Given** la ventana de cancelación está abierta, **When** la persona elige volver, cierra la ventana o pulsa fuera de ella, **Then** el pedido conserva su estado anterior y el control de estado vuelve a mostrar ese estado.
5. **Given** un pedido ya cancelado, **When** la persona consulta el pedido, **Then** el estado se muestra como "Cancelado" y no se ofrece cambiarlo a otro estado.
6. **Given** un pedido en "Pagado", **When** la persona revisa los estados disponibles, **Then** "Cancelado" no aparece entre ellos; si el cobro se revirtió, primero debe pasar el pedido a "Por cobrar" y luego cancelarlo.
7. **Given** un pedido con productos en "Por cobrar", **When** la persona confirma su cancelación, **Then** las cantidades de cada producto del pedido vuelven al inventario disponible.

---

### User Story 2 - Cambiar el estado de un pedido desde la tabla (Priority: P1)

Como persona que administra el panel, quiero cambiar el estado de cada pedido directamente en su fila de la tabla de "Ventas y pedidos", para dar seguimiento diario a los pedidos sin abrir el editor masivo ni entrar al detalle de cada uno.

**Why this priority**: El cambio de estado es la operación más frecuente del módulo. Hoy obliga a entrar al editor masivo o al detalle del pedido, lo que hace lento el seguimiento cotidiano y expone a modificar por error otros datos de la venta.

**Independent Test**: Con la tabla de ventas visible en modo normal, la persona cambia el estado de un pedido de "Por cobrar" a "En pedido" desde su fila; el cambio se guarda, se confirma con una notificación y queda en el historial, sin haber abierto el editor masivo.

**Acceptance Scenarios**:

1. **Given** la tabla de ventas en modo normal, **When** la persona abre el control de estado de una fila, **Then** ve los estados a los que ese pedido puede pasar y el estado actual marcado.
2. **Given** un pedido en "Por cobrar", **When** la persona lo cambia a "En pedido" desde la tabla, **Then** el cambio se guarda sin pasos adicionales, se muestra una notificación de éxito y la fila refleja el nuevo estado.
3. **Given** un pedido en "Por cobrar" o "En pedido", **When** la persona lo cambia a "Pagado" desde la tabla, **Then** se le pide confirmar explícitamente que el cobro se recibió antes de guardar, igual que en el resto del panel; si no confirma, el pedido conserva su estado.
4. **Given** un pedido en "Por cobrar" o "En pedido", **When** la persona lo cambia a "Cancelado" desde la tabla, **Then** aparece la misma ventana de razón de cancelación descrita en la Historia 1.
5. **Given** la persona consulta la tabla desde un teléfono, **When** ve los pedidos como tarjetas, **Then** también puede cambiar el estado desde cada tarjeta con las mismas reglas.
6. **Given** el cambio de estado no puede guardarse (por ejemplo, por un fallo de conexión o porque el pedido cambió mientras tanto), **When** ocurre el error, **Then** se muestra una notificación comprensible y la fila vuelve a mostrar el estado real guardado del pedido.

---

### User Story 3 - Consultar los pedidos cancelados y su razón (Priority: P2)

Como persona que administra el panel, quiero identificar los pedidos cancelados y saber por qué se cancelaron, para entender las pérdidas de ventas y dar seguimiento a los clientes si hace falta.

**Why this priority**: Aporta valor una vez que la cancelación existe, pero el negocio puede operar con las Historias 1 y 2 aunque esta consulta sea básica.

**Independent Test**: Con al menos un pedido cancelado con razón, la persona filtra la tabla por "Cancelado", ve el pedido con su estado distinguible y, al abrir su detalle, lee la razón en el historial.

**Acceptance Scenarios**:

1. **Given** existen pedidos cancelados, **When** la persona filtra la tabla por el estado "Cancelado", **Then** solo se listan pedidos cancelados, cada uno con el estado identificado visualmente como cancelado.
2. **Given** un pedido cancelado con razón, **When** la persona abre su detalle, **Then** el historial muestra el cambio a "Cancelado" con fecha, responsable y razón.
3. **Given** existen pedidos cancelados en un periodo, **When** la persona consulta el panel principal o las analíticas de ese periodo, **Then** los pedidos cancelados no suman a ventas, ingresos, unidades vendidas ni proyecciones.

---

### Edge Cases

- La razón contiene solo espacios: se trata como cancelación sin razón.
- La razón supera el largo máximo permitido: la ventana indica el límite y no permite escribir más allá de él.
- La persona hace clic dos veces en confirmar o cambia el estado de la misma fila mientras se está guardando: el control de esa fila se bloquea hasta terminar y el cambio se aplica una sola vez; en una cancelación, el inventario se devuelve una sola vez.
- Un producto del pedido ya no se muestra en el catálogo: su cantidad vuelve igualmente a su inventario al cancelar.
- Otra persona cambió o canceló el mismo pedido mientras la tabla estaba abierta: el cambio se valida contra el estado vigente del pedido; si ya no es válido (por ejemplo, el pedido ya está cancelado), se rechaza con un mensaje y la fila se actualiza al estado real.
- Hay un filtro de estado activo y el pedido cambia a un estado que no coincide con el filtro: el cambio se confirma con la notificación y la lista se actualiza respetando el filtro activo.
- El pedido tiene registros históricos con el estado "pendiente": se presenta como "Por cobrar" y puede cancelarse como cualquier pedido por cobrar.
- El pedido tiene pagos parciales registrados: la ventana de cancelación advierte que el pedido tiene pagos registrados; la cancelación no elimina esos pagos y cualquier devolución se gestiona fuera del sistema.
- El pedido tiene una nota de entrega asociada: la nota se conserva y sigue consultable; cancelar el pedido no la modifica.
- El editor masivo está abierto: los controles de estado por fila no se muestran en ese modo; el editor masivo mantiene su propio flujo de guardado.

## Requirements *(mandatory)*

### Functional Requirements

**Estado "Cancelado"**

- **FR-001**: El sistema MUST ofrecer "Cancelado" como estado seleccionable para los pedidos en "Por cobrar" o "En pedido" (incluidos los registros históricos "pendiente", que se presentan como "Por cobrar"), y MUST NOT ofrecerlo ni aceptarlo para pedidos en "Pagado".
- **FR-002**: Al elegir "Cancelado" en un cambio de estado individual (desde la tabla o desde el detalle del pedido), el sistema MUST mostrar una ventana modal que solicite la razón de la cancelación, identifique el pedido afectado (número de orden y cliente) y ofrezca dos acciones: confirmar la cancelación o volver sin cambios.
- **FR-003**: La razón de cancelación MUST ser opcional: la persona puede confirmar sin escribir nada. Una razón formada solo por espacios se trata como ausente.
- **FR-004**: La razón MUST aceptar texto libre de hasta 240 caracteres, el mismo límite que ya tienen los motivos de cambio de estado, y la ventana MUST indicar cuántos caracteres quedan.
- **FR-005**: Cerrar o descartar la ventana de cancelación (botón de volver, tecla de escape o clic fuera de ella) MUST dejar el pedido sin cambios y el control de estado mostrando el estado anterior.
- **FR-006**: Al confirmar la cancelación, el sistema MUST registrar en el historial del pedido el estado anterior, el estado "Cancelado", la persona que hizo el cambio, la fecha y hora, y la razón si se indicó.
- **FR-007**: Al cancelar un pedido, el sistema MUST devolver automáticamente al inventario la cantidad de cada producto del pedido, en la misma operación que cambia el estado: o se aplican el cambio de estado, el registro en el historial y la devolución al inventario, o no se aplica ninguno.
- **FR-008**: Cancelar un pedido MUST conservar el pedido, sus productos, sus montos y sus pagos registrados; el pedido sigue siendo consultable y no se elimina.
- **FR-009**: Un pedido cancelado MUST NOT admitir cambios a otro estado desde ningún punto del panel.
- **FR-010**: Los pedidos cancelados MUST quedar excluidos de las cifras de ventas, ingresos, unidades vendidas, productos más vendidos y proyecciones del panel principal y de las analíticas.
- **FR-011**: La cancelación MUST seguir las mismas reglas (qué pedidos pueden cancelarse) y producir los mismos efectos sobre el pedido, el historial y el inventario se haga desde la tabla o desde el detalle del pedido. El editor masivo MUST NOT permitir cancelar pedidos, ni desde su interfaz ni aceptando la cancelación al guardar.

**Cambio de estado desde la tabla**

- **FR-012**: Cada pedido de la tabla de "Ventas y pedidos" MUST tener, en su fila de escritorio y en su tarjeta móvil, un control que permita cambiar su estado sin activar el editor masivo ni abrir el detalle del pedido.
- **FR-013**: El control de estado MUST ofrecer solo los estados válidos para el estado actual del pedido; en pedidos cancelados MUST mostrarse el estado sin permitir cambiarlo.
- **FR-014**: Los cambios entre "Por cobrar" y "En pedido", y los que salen de "Pagado", MUST guardarse al seleccionarlos, sin pasos adicionales.
- **FR-015**: El cambio a "Pagado" desde un pedido en "Por cobrar" o "En pedido" MUST requerir una confirmación explícita de que el cobro se recibió antes de guardarse; si la persona no confirma, el pedido conserva su estado.
- **FR-016**: El cambio a "Cancelado" desde la tabla MUST seguir FR-002 a FR-006.
- **FR-017**: Todo cambio de estado hecho desde la tabla MUST quedar registrado en el historial del pedido con la persona responsable y la fecha y hora.
- **FR-018**: El sistema MUST notificar el resultado de cada cambio de estado (éxito o error con un mensaje comprensible) y, ante un error, la fila MUST volver a mostrar el estado realmente guardado.
- **FR-019**: Mientras se guarda un cambio, el control de estado de esa fila MUST bloquearse para evitar envíos duplicados; el resto de la tabla sigue disponible.
- **FR-020**: El sistema MUST validar cada cambio contra el estado vigente del pedido al momento de guardarlo, no contra el estado que mostraba la pantalla, y rechazar los cambios que ya no sean válidos.

**Consulta y acceso**

- **FR-021**: Los pedidos cancelados MUST distinguirse visualmente en la tabla y en el detalle con el color reservado para el estado cancelado, y MUST poder filtrarse por el estado "Cancelado".
- **FR-022**: La razón de cancelación MUST mostrarse en el historial del detalle del pedido.
- **FR-023**: Solo las personas autorizadas para el panel administrativo MUST poder cambiar estados o cancelar pedidos, y esa autorización MUST verificarse en cada cambio, no solo en la interfaz.

### Key Entities *(include if feature involves data)*

- **Pedido**: Venta registrada con cliente, productos, montos y un estado operativo. Con esta funcionalidad, "Cancelado" pasa a ser un estado operativo final, al que se llega desde "Por cobrar" o "En pedido".
- **Registro de cambio de estado**: Entrada del historial del pedido que no se modifica ni se borra; guarda el estado anterior, el estado nuevo, la persona responsable, la fecha y hora y una razón opcional (en las cancelaciones, la razón de la cancelación).
- **Inventario de producto**: Cantidad disponible de cada producto. Se descuenta al crear un pedido y se devuelve al cancelarlo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La persona cambia el estado de un pedido desde la tabla en 2 interacciones o menos cuando el estado no requiere confirmación, y en 3 o menos para "Pagado" o "Cancelado", sin abrir el editor masivo ni el detalle.
- **SC-002**: El 100 % de las cancelaciones quedan registradas en el historial con fecha, responsable y, cuando se indicó, la razón.
- **SC-003**: Ningún pedido cancelado suma a ventas, ingresos, unidades vendidas ni proyecciones del panel principal y las analíticas.
- **SC-004**: En el 100 % de los casos en que la ventana de cancelación se cierra sin confirmar, el pedido conserva su estado anterior.
- **SC-005**: Tras cualquier cambio de estado, exitoso o fallido, el estado que muestra la tabla coincide con el estado guardado del pedido.
- **SC-006**: En una prueba con la persona que administra el panel, puede actualizar el estado de 10 pedidos seguidos desde la tabla en menos de 2 minutos.
- **SC-007**: En el 100 % de las cancelaciones, el inventario de cada producto aumenta exactamente en la cantidad que tenía el pedido cancelado, sin intervención manual.

## Assumptions

- La funcionalidad afecta solo al panel administrativo ("Ventas y pedidos" y el detalle del pedido). La tienda, la venta rápida y la cotización rápida no cambian, y los clientes no pueden cancelar pedidos por sí mismos.
- La cancelación es definitiva, como ya ocurre hoy con los pedidos cancelados históricos: un pedido cancelado no se reabre. Si un pedido se canceló por error, se registra un pedido nuevo. La ventana de cancelación funciona también como confirmación para evitar cancelaciones accidentales.
- Las transiciones entre "Por cobrar", "En pedido" y "Pagado" siguen las reglas actuales del panel; esta funcionalidad solo las hace accesibles desde la tabla.
- La cancelación no elimina ni revierte pagos registrados; cualquier devolución de dinero se coordina fuera del sistema (por WhatsApp o transferencia).
- Solo se cancelan pedidos aún no cobrados. Si un pedido pagado se revierte, primero se pasa a "Por cobrar", algo que el panel ya permite, y después se cancela.
- Los pedidos cancelados antes de esta funcionalidad no se recalculan: su inventario no se devuelve de forma retroactiva.
- El editor masivo conserva su flujo actual, que ya no ofrece cancelar pedidos: la cancelación se hace solo desde la tabla o el detalle, donde se pide la razón y se devuelve el inventario (FR-011).
- Los puntos de fidelidad acumulados por un pedido cancelado no se revierten en esta versión, porque hoy no se consultan ni se canjean en ninguna pantalla; su tratamiento se definirá cuando exista el canje.
- No se envía ningún aviso automático al cliente al cancelar su pedido.
- La razón de cancelación es texto libre; no se define un catálogo de motivos predefinidos.
- Las personas autorizadas son las mismas que hoy acceden al panel administrativo; no se crean roles nuevos.
