# Feature Specification: Gestión administrativa de clientes

**Feature Branch**: `003-gestion-clientes`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Quiero en el panel administrativo crear una sección de clientes en la que aparezca en una tabla todos los clientes que hay tanto consumidores como mayoristas con toda su información, que pueda filtrar por nombre o RIF por consumidor o mayorista y que pueda con un botón abrir una modal con la que pueda crear un nuevo cliente ya sea consumidor o mayorista y también quiero poder editar los clientes de forma masiva."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar y filtrar todos los clientes (Priority: P1)

Como administrador autenticado, quiero consultar en una sola sección todos los clientes consumidores y mayoristas, con la información de su perfil disponible, para localizar rápidamente a la persona o empresa que necesito gestionar.

**Why this priority**: La lista unificada es la base para operar clientes y evita mantener registros separados o depender de la búsqueda dentro de las ventas.

**Independent Test**: Abrir la sección de clientes con datos de ambos tipos, comprobar que todos son accesibles y aplicar filtros por nombre, RIF y tipo para verificar que solo aparecen los resultados correspondientes.

**Acceptance Scenarios**:

1. **Given** existen clientes consumidores y mayoristas, **When** un administrador abre la sección de clientes, **Then** ve una fila por cada registro accesible, el total de resultados y una presentación clara del tipo, nombre, RIF, teléfono, correo y resumen de direcciones.
2. **Given** un cliente tiene más de una dirección o datos relacionados con pedidos, **When** el administrador consulta la información completa de su fila, **Then** puede ver todas las direcciones y el resumen del perfil sin modificar el historial de pedidos o pagos desde esta sección.
3. **Given** el administrador introduce parte de un nombre o un RIF, **When** ejecuta la búsqueda, **Then** la tabla muestra únicamente clientes cuyo nombre o RIF coincide sin distinguir mayúsculas, minúsculas, espacios o guiones de formato.
4. **Given** el administrador selecciona Consumidor, Mayorista o Todos, **When** combina esa selección con una búsqueda, **Then** solo se muestran registros que cumplen ambos criterios y puede limpiar los filtros para volver al conjunto completo.
5. **Given** ningún cliente coincide con los filtros, **When** termina la búsqueda, **Then** la sección muestra un estado vacío comprensible y conserva visible la opción de limpiar filtros o crear un cliente.

### User Story 2 - Crear un cliente desde una modal (Priority: P1)

Como administrador autenticado, quiero pulsar un botón para abrir una modal y registrar un nuevo consumidor o mayorista, para que el cliente quede disponible inmediatamente en la gestión operativa.

**Why this priority**: El alta controlada evita registros incompletos y permite que el equipo incorpore clientes sin salir del flujo de administración.

**Independent Test**: Abrir la modal, crear un consumidor y un mayorista con datos válidos, comprobar que cada uno aparece en la tabla con su tipo correcto y probar el rechazo de datos inválidos o duplicados.

**Acceptance Scenarios**:

1. **Given** un administrador está en la sección de clientes, **When** pulsa “Nuevo cliente”, **Then** se abre una modal con selección de tipo Consumidor o Mayorista y los campos de identidad, RIF, contacto y dirección inicial opcional.
2. **Given** el administrador selecciona un tipo y completa los datos obligatorios válidos, **When** confirma el formulario, **Then** el cliente se guarda una sola vez, la modal se cierra y el nuevo registro aparece en la tabla con un mensaje de éxito.
3. **Given** el administrador cierra la modal con datos sin guardar, **When** confirma que desea salir o descarta los cambios, **Then** no se crea ningún cliente.
4. **Given** el RIF, teléfono o correo ya pertenece a otro cliente, **When** el administrador intenta guardar, **Then** la operación se rechaza indicando el campo en conflicto y no crea un duplicado.
5. **Given** falta un campo obligatorio o un dato tiene formato inválido, **When** el administrador confirma el formulario, **Then** se muestran errores junto a los campos afectados y se conservan los valores válidos ya introducidos.

### User Story 3 - Editar clientes de forma masiva (Priority: P1)

Como administrador autenticado, quiero editar directamente varias filas de clientes y guardarlas en una sola operación, para corregir o actualizar muchos registros sin abrir formularios uno por uno.

**Why this priority**: La edición masiva reduce el tiempo de mantenimiento de datos y responde al flujo operativo tipo hoja de cálculo que ya utiliza el panel.

**Independent Test**: Activar la edición de una tabla con varios clientes, modificar campos en varias filas, guardar los cambios y verificar que todos se aplican; después introducir un error en una fila y confirmar que no se guarda ninguna modificación de la tanda.

**Acceptance Scenarios**:

1. **Given** la tabla contiene clientes existentes, **When** el administrador activa la edición, **Then** puede modificar en línea el tipo, nombre, apellido, RIF, teléfono y correo de varias filas y las filas modificadas quedan identificadas como pendientes.
2. **Given** hay cambios pendientes en una o más filas, **When** el administrador pulsa “Guardar cambios”, **Then** el sistema valida el conjunto completo antes de guardar y muestra una confirmación o un resultado de error por fila y campo.
3. **Given** todas las filas modificadas son válidas y no tienen conflictos, **When** se confirma el guardado, **Then** todos los cambios se persisten juntos, desaparece el estado pendiente y la tabla refleja los datos actualizados.
4. **Given** una fila tiene un formato inválido, un identificador duplicado o un conflicto con otro cambio, **When** el administrador intenta guardar, **Then** se rechaza la tanda completa, ninguna fila queda parcialmente actualizada y las ediciones permanecen disponibles para corregirlas.
5. **Given** el administrador intenta cambiar un cliente de Consumidor a Mayorista o viceversa, **When** guarda el cambio, **Then** se actualiza su clasificación futura y se informa que las ventas, pagos y documentos históricos conservan su significado original.
6. **Given** existen cambios pendientes, **When** el administrador cambia de filtro, abandona la sección o recarga la página, **Then** recibe un aviso para guardar o descartar los cambios antes de perderlos.

### User Story 4 - Mantener datos protegidos y trazables (Priority: P2)

Como responsable del panel, quiero que la gestión de clientes solo esté disponible para administradores autorizados y que los cambios mantengan las relaciones históricas, para proteger datos personales y evitar que una corrección altere operaciones anteriores.

**Why this priority**: Los clientes contienen datos personales y su clasificación puede influir en operaciones futuras; la seguridad y la trazabilidad son condiciones de confianza del módulo.

**Independent Test**: Consultar y modificar la sección con una sesión autorizada y otra no autorizada, y comprobar que un cambio de datos o tipo no cambia el cliente asociado ni los importes de transacciones históricas.

**Acceptance Scenarios**:

1. **Given** la sesión no está autenticada o no tiene autorización administrativa, **When** intenta abrir la sección o ejecutar una escritura, **Then** no puede consultar ni modificar datos de clientes.
2. **Given** un cliente tiene ventas, pagos, notas o direcciones relacionadas, **When** se actualizan sus datos de perfil, **Then** las relaciones existentes permanecen vinculadas al mismo cliente y los datos históricos no se reescriben.
3. **Given** una modificación masiva termina correctamente, **When** el equipo revisa el resultado, **Then** puede identificar qué registros fueron modificados y cuándo, conforme a la trazabilidad administrativa vigente.

### Edge Cases

- Si existen clientes históricos sin RIF, deben mostrarse como “Sin RIF” y poder completarse mediante la creación de una edición válida; no se debe inventar un RIF.
- Si un RIF se introduce con espacios, guiones o letras en minúscula, se debe normalizar para comparar duplicados y conservar una presentación uniforme con prefijo `V`, `E`, `J`, `G` o `P`, ocho dígitos y un dígito verificador.
- Si un RIF pertenece a una persona consumidora, puede quedar vacío; para un mayorista debe ser obligatorio y válido según el formato fiscal definido para Venezuela.
- Si el nombre buscado contiene acentos o el RIF se introduce con una separación distinta, la búsqueda debe encontrar el registro equivalente.
- Si el teléfono o correo opcional coincide con otro cliente, debe tratarse como conflicto y no como un segundo registro.
- Si no existen clientes o una combinación de filtros no devuelve resultados, debe mostrarse un estado vacío útil, sin error técnico ni tabla engañosa.
- Si un cliente tiene varias direcciones, la tabla no debe duplicar la fila del cliente por cada dirección; el detalle debe mostrar la relación completa.
- Si se intenta guardar una tanda con dos filas que intercambian o repiten el mismo RIF, teléfono o correo, debe rechazarse la tanda completa y explicar el conflicto.
- Si otro administrador modifica un cliente después de que se cargó la tabla, el guardado masivo debe detectar el conflicto y evitar sobrescribir silenciosamente el cambio más reciente.
- Si el administrador pierde la sesión durante una consulta o un guardado, no deben exponerse datos nuevos ni quedar cambios parcialmente persistidos.
- La eliminación de clientes, la fusión de duplicados, la importación masiva y la exportación no forman parte de esta versión.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La sección DEBE estar disponible únicamente dentro del panel administrativo y DEBE requerir la autenticación y autorización administrativa vigentes para consultar o modificar datos.
- **FR-002**: La navegación administrativa DEBE ofrecer una entrada claramente identificada como “Clientes” y no DEBE crear una gestión paralela en el e-commerce público ni en la vista rápida.
- **FR-003**: La sección DEBE presentar en una tabla unificada todos los clientes Consumidores y Mayoristas existentes, con total de resultados y acceso a todos los registros aunque el conjunto requiera paginación.
- **FR-004**: Cada fila DEBE mostrar, o permitir consultar sin ambigüedad, el tipo de cliente, nombre y apellido, RIF, teléfono, correo, resumen o detalle de direcciones, fecha de alta y fecha de última actualización; los pedidos y pagos completos seguirán consultándose en sus módulos correspondientes.
- **FR-005**: La tabla DEBE permitir filtrar por tipo de cliente con las opciones Todos, Consumidor y Mayorista.
- **FR-006**: La tabla DEBE permitir buscar por coincidencia parcial de nombre o RIF y combinar esa búsqueda con el filtro de tipo; la comparación DEBE ignorar diferencias de mayúsculas, acentos, espacios y guiones de formato.
- **FR-007**: La tabla DEBE conservar los filtros al cambiar de página, ofrecer una acción visible para limpiarlos y comunicar claramente cuando no hay resultados.
- **FR-008**: La sección DEBE incluir un botón “Nuevo cliente” que abra una modal sin abandonar la tabla y que pueda cerrarse sin guardar datos.
- **FR-009**: La modal DEBE permitir seleccionar Consumidor o Mayorista y capturar nombre, apellido o contacto, RIF, teléfono, correo electrónico y, de forma opcional, una primera dirección con urbanización, dirección detallada y tipo de dirección.
- **FR-010**: El sistema DEBE exigir nombre, apellido o contacto y teléfono; DEBE exigir RIF para Mayoristas, aceptar RIF opcional para Consumidores y validar un RIF presente con prefijo `V`, `E`, `J`, `G` o `P`, ocho dígitos y un dígito verificador antes de crear o actualizar un cliente.
- **FR-011**: El RIF, teléfono y correo electrónico, cuando estén presentes, DEBEN compararse como identificadores únicos entre ambos tipos de cliente; los valores deben normalizarse antes de comprobar duplicados.
- **FR-012**: Una creación válida DEBE registrar un único cliente, mostrar un resultado comprensible y actualizar la tabla sin requerir una navegación manual adicional; una creación inválida NO DEBE dejar registros parciales.
- **FR-013**: La tabla DEBE ofrecer un modo de edición en línea para modificar en varias filas el tipo, nombre, apellido o contacto, RIF, teléfono y correo electrónico de clientes existentes.
- **FR-014**: El modo de edición masiva DEBE mostrar las filas con cambios pendientes y ofrecer acciones explícitas para “Guardar cambios” o “Descartar cambios”; la edición de direcciones anidadas no forma parte del guardado masivo de esta versión.
- **FR-015**: Antes de persistir una tanda de cambios, el sistema DEBE validar todas las filas, campos obligatorios, formatos, identificadores duplicados y conflictos de concurrencia; si una validación falla, NO DEBE guardar ninguna fila de la tanda.
- **FR-016**: Cuando una tanda válida se guarda, todos sus cambios DEBEN quedar aplicados juntos, la tabla DEBE reflejar el resultado y el administrador DEBE recibir confirmación del número de filas actualizadas.
- **FR-017**: Los errores de alta y edición DEBEN identificar la fila y el campo que requiere corrección sin borrar los demás valores introducidos por el administrador.
- **FR-018**: Cambiar el tipo, nombre, RIF o datos de contacto de un cliente NO DEBE reescribir importes, estados, pagos, productos, notas ni relaciones históricas; la clasificación modificada solo aplicará a operaciones futuras.
- **FR-019**: Los datos de clientes DEBEN validarse y autorizarse antes de cualquier escritura, limitarse a los administradores que los necesitan y conservar la trazabilidad administrativa de las modificaciones realizadas.
- **FR-020**: La presentación DEBE usar etiquetas y mensajes en español, mantener una experiencia usable en pantallas pequeñas y evitar que el número de columnas o las acciones de edición oculten el guardado, el filtro o la creación.

### Key Entities *(include if feature involves data)*

- **Cliente**: Persona o entidad registrada para operar con Venuti’s Gourmet, con tipo, identidad, datos de contacto, RIF opcional u obligatorio según el tipo, fechas de alta y actualización, y relaciones con direcciones y operaciones.
- **Tipo de cliente**: Clasificación visible como Consumidor o Mayorista que organiza filtros y reglas de captura; modificarla no altera las operaciones históricas.
- **RIF**: Identificador fiscal normalizado y único cuando está presente, usado para localizar y evitar duplicados.
- **Dirección**: Una o más ubicaciones asociadas a un cliente, con urbanización, dirección detallada y tipo; se consulta como parte del perfil y no se edita masivamente en esta versión.
- **Edición masiva de clientes**: Conjunto de cambios pendientes sobre varios clientes que se valida y guarda como una única operación, sin persistencia parcial.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al menos el 90% de los administradores de prueba puede abrir Clientes, localizar un registro conocido y consultar su información principal en menos de 30 segundos.
- **SC-002**: En una muestra con consumidores y mayoristas, el 100% de las búsquedas y combinaciones de tipo, nombre y RIF devuelve exactamente los registros que cumplen los criterios y ninguno que no los cumple.
- **SC-003**: Al menos el 90% de los administradores de prueba puede crear un consumidor y un mayorista válidos en menos de 2 minutos por registro, y ambos aparecen en la tabla sin recarga manual adicional.
- **SC-004**: En las pruebas de validación, el 100% de los RIF, teléfonos, correos duplicados y datos obligatorios o formateados incorrectamente se rechaza antes de crear o actualizar un cliente.
- **SC-005**: En una tanda válida de al menos 20 clientes, el 100% de las filas modificadas queda actualizado con los valores introducidos y se muestra una confirmación del resultado.
- **SC-006**: En una tanda que contiene al menos un error, el 100% de las pruebas confirma que no se actualiza ninguna fila válida de forma parcial y que los errores quedan identificados para corregirlos.
- **SC-007**: En una revisión de regresión, el 100% de los pedidos, pagos, notas y direcciones de prueba permanece relacionado con el mismo cliente y conserva sus datos históricos después de editar su perfil o tipo.
- **SC-008**: En una pantalla de 360 píxeles de ancho, el 100% de las acciones principales —filtrar, crear, guardar y descartar cambios— permanece visible o accesible sin perder información ni depender de hover.
- **SC-009**: En pruebas con sesión no autorizada, el 100% de los intentos de consultar o modificar clientes es bloqueado y no se produce ninguna escritura.

## Assumptions

- El público objetivo son administradores autenticados que ya tienen acceso al panel; no se crean roles, registros públicos ni permisos nuevos con esta feature.
- La lista reutiliza el registro único de clientes existente; Consumidor es la etiqueta administrativa legible para los clientes que hoy se identifican como `detal`, y Mayorista mantiene su clasificación equivalente.
- Para mantener una captura operativa razonable, el RIF será obligatorio para Mayoristas y opcional para Consumidores; todo RIF presente deberá usar el formato normalizado de prefijo `V`, `E`, `J`, `G` o `P`, ocho dígitos y un dígito verificador.
- Nombre, apellido o contacto y teléfono son obligatorios; el correo es opcional, pero no puede repetirse cuando se suministra. Los identificadores existentes que ya son únicos conservan esa regla.
- Los clientes históricos sin RIF no se eliminan ni se bloquean por la nueva validación; se muestran como “Sin RIF” hasta que un administrador los complete con un valor válido.
- La tabla mostrará un resumen de direcciones y permitirá consultar el detalle completo del perfil; las direcciones seguirán gestionándose mediante su flujo específico y no se incluirán en la edición masiva de filas.
- Si el volumen de clientes requiere paginación, todos los registros seguirán siendo accesibles y los filtros se conservarán durante la navegación.
- La edición masiva modifica perfiles existentes y no incluye eliminación, fusión, importación, exportación ni edición de pedidos, pagos, notas o inventario.
- Una modificación del tipo de cliente organiza futuras operaciones y no recalcula precios, estados, pagos ni documentos históricos.
- La vista rápida, el e-commerce público, WhatsApp y los flujos de pago permanecen fuera del alcance de esta feature.
