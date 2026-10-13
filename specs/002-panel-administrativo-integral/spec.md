# Feature Specification: Panel administrativo integral

**Feature Branch**: `002-panel-administrativo-integral`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Vamos a reestructurar y rediseñar todo el panel administrativo que actualmente tiene Venuti's Gourmet. Además de lo que actualmente se gestiona desde el panel, se desea registrar ventas en una vista tipo hoja de Excel, aplicar descuentos por porcentaje o por dólares, monitorear el pedido con los estados por cobrar, en pedido y pagado, consultar analíticas semanales y mensuales con un predictor basado en el histórico, y generar notas de entrega descargables como PDF para clientes mayoristas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operar desde un panel administrativo unificado (Priority: P1)

Como administrador autenticado, quiero encontrar en una sola experiencia la gestión actual y las nuevas funciones operativas, para trabajar con productos, inventario, clientes, pedidos y ventas sin navegar por pantallas inconexas.

**Why this priority**: El rediseño es la base de todas las demás funciones y debe reducir la fricción diaria sin perder las capacidades que el negocio ya utiliza.

**Independent Test**: Iniciar sesión como administrador, recorrer la navegación principal y comprobar que las funciones existentes y los módulos de ventas, pedidos, analíticas y notas de entrega tienen una entrada clara y usable.

**Acceptance Scenarios**:

1. **Given** un administrador autenticado, **When** abre el panel, **Then** ve una navegación coherente con accesos a las gestiones existentes, ventas, pedidos, analíticas y notas de entrega.
2. **Given** el administrador accede desde una pantalla móvil o de escritorio, **When** consulta una sección, **Then** puede leer sus datos y ejecutar sus acciones principales sin desplazamiento horizontal ni depender de hover.
3. **Given** una capacidad administrativa existente, **When** el rediseño está disponible, **Then** la capacidad conserva su propósito, sus datos y las restricciones de acceso vigentes.

---

### User Story 2 - Consultar y registrar ventas en una vista operativa (Priority: P1)

Como administrador, quiero consultar las ventas existentes en una vista tabular parecida a una hoja de cálculo y registrar ventas manuales desde esa misma área, para tener un registro operativo completo y fácil de revisar.

**Why this priority**: El registro de ventas es la base para monitorear pedidos, calcular analíticas y generar documentos de entrega.

**Independent Test**: Abrir la sección de ventas, filtrar una venta existente, crear una venta manual con cliente y productos, guardarla y comprobar que aparece en la tabla con sus importes, descuento, moneda y estado.

**Acceptance Scenarios**:

1. **Given** existen ventas registradas, **When** el administrador abre la sección de ventas, **Then** ve una fila por venta con número, fecha, cliente, importe base, descuento, total, moneda, estado y acciones disponibles.
2. **Given** el administrador necesita encontrar una operación, **When** filtra por fecha, cliente, número de orden o estado, **Then** la tabla muestra solo los registros que cumplen los filtros y permite volver a la vista completa.
3. **Given** el administrador inicia una venta manual, **When** selecciona o registra los datos mínimos del cliente, agrega uno o más productos y cantidades, **Then** puede revisar un resumen antes de guardar.
4. **Given** una venta manual tiene productos, cantidades y precios válidos, **When** el administrador la confirma, **Then** se registra como una venta visible en la tabla y sus importes coinciden con el detalle guardado.
5. **Given** una venta manual tiene datos inválidos o inventario insuficiente, **When** el administrador intenta confirmarla, **Then** se muestra el motivo y no queda una venta parcialmente guardada.

---

### User Story 3 - Aplicar descuentos controlados a una venta (Priority: P1)

Como administrador, quiero aplicar un descuento por porcentaje o por una cantidad en dólares, para ajustar el precio acordado con el cliente sin perder la trazabilidad del importe original y del importe final.

**Why this priority**: Los descuentos afectan directamente el total vendido, el cobro y las analíticas; deben quedar claros para evitar diferencias entre lo acordado y lo registrado.

**Independent Test**: Crear o editar una venta, aplicar un descuento porcentual y después probar un descuento en dólares en otra venta, comprobando el subtotal, el descuento y el total final.

**Acceptance Scenarios**:

1. **Given** una venta con un subtotal positivo, **When** el administrador elige descuento por porcentaje e introduce un valor válido, **Then** el sistema calcula y muestra el importe descontado y el total resultante.
2. **Given** una venta con un subtotal positivo, **When** el administrador elige descuento en dólares e introduce un valor válido en USD, **Then** el sistema aplica ese descuento en USD o su equivalente calculado con la tasa de la operación cuando la venta se expresa en bolívares, y muestra el total resultante en la moneda de la venta.
3. **Given** el valor del descuento supera el subtotal, es negativo o no es numérico, **When** el administrador intenta guardar, **Then** la operación se rechaza con un mensaje comprensible.
4. **Given** una venta tiene un descuento, **When** se consulta la tabla o el detalle, **Then** se distinguen el subtotal, el tipo y valor del descuento y el total final; no se aplican ambos tipos de descuento de forma accidental.

---

### User Story 4 - Monitorear y actualizar el estado de los pedidos (Priority: P1)

Como administrador, quiero ver y cambiar el estado operativo de cada pedido entre "Por cobrar", "En pedido" y "Pagado", para saber qué requiere seguimiento y cuál es la situación real de la operación.

**Why this priority**: El estado es la señal operativa central para coordinar cobros y preparación de pedidos.

**Independent Test**: Abrir el detalle de una venta, cambiar su estado a cada uno de los tres valores permitidos y comprobar que el nuevo estado se refleja en la tabla, el detalle y el historial de cambios.

**Acceptance Scenarios**:

1. **Given** una venta o pedido registrado, **When** el administrador abre su detalle, **Then** ve claramente uno de los estados "Por cobrar", "En pedido" o "Pagado".
2. **Given** el administrador tiene autorización para operar pedidos, **When** selecciona un nuevo estado y confirma, **Then** el pedido conserva el nuevo estado, la fecha del cambio y el responsable del cambio.
3. **Given** el administrador marca una operación como "Pagado", **When** no existe información suficiente del cobro según las reglas vigentes, **Then** el sistema solicita la información mínima o una confirmación explícita antes de completar el cambio.
4. **Given** un pedido fue actualizado, **When** otro administrador consulta la lista, **Then** observa el mismo estado vigente y no una etiqueta desactualizada.
5. **Given** existen operaciones históricas con un estado anterior al rediseño, **When** el administrador consulta el historial, **Then** esas operaciones siguen siendo localizables y no se reclasifican silenciosamente de forma que se pierda su significado.

---

### User Story 5 - Consultar analíticas y una predicción de ventas (Priority: P2)

Como administrador, quiero conocer cuánto se vendió por semana y por mes, tanto en total como por producto, y consultar una estimación basada en el historial, para tomar decisiones de compra, inventario y planificación.

**Why this priority**: Las analíticas convierten el registro operativo en información útil, pero dependen de que ventas y estados estén correctamente registrados.

**Independent Test**: Abrir analíticas, seleccionar una semana y un mes con ventas conocidas, comparar los totales generales y por producto con el registro de ventas y consultar la estimación disponible.

**Acceptance Scenarios**:

1. **Given** existen ventas en el periodo seleccionado, **When** el administrador consulta el resumen semanal o mensual, **Then** ve el total vendido y la cantidad de ventas del periodo.
2. **Given** existen ventas de varios productos, **When** el administrador cambia a la vista por producto, **Then** puede identificar cuánto aportó cada producto al total del periodo y ordenar o filtrar los resultados.
3. **Given** hay suficiente historial comparable, **When** el administrador solicita un predictor, **Then** recibe una estimación para el periodo siguiente acompañada del periodo histórico utilizado y una indicación de que es una referencia, no una garantía.
4. **Given** no hay suficiente historial o los registros no tienen datos confiables, **When** el administrador consulta el predictor, **Then** ve un aviso de datos insuficientes y no se presenta una cifra inventada como pronóstico.

---

### User Story 6 - Generar notas de entrega para mayoristas (Priority: P2)

Como administrador, quiero completar un formulario sencillo para generar una nota de entrega de un cliente mayorista y descargarla en PDF, para acompañar la entrega con un documento claro y presentable.

**Why this priority**: Las notas de entrega mejoran la coordinación con clientes mayoristas y dan un respaldo documental a la entrega sin convertir el documento en una factura fiscal.

**Independent Test**: Seleccionar un cliente mayorista, completar una nota con productos, cantidades, fecha y observaciones, generarla, descargar el PDF y comprobar que el documento coincide con los datos introducidos.

**Acceptance Scenarios**:

1. **Given** el administrador inicia una nota de entrega, **When** selecciona un cliente mayorista y agrega productos y cantidades, **Then** puede revisar la nota antes de generarla.
2. **Given** la nota tiene los datos obligatorios, **When** el administrador la confirma, **Then** se guarda con un número identificador y queda disponible para volver a consultarla.
3. **Given** existe una nota generada, **When** el administrador solicita descargarla, **Then** obtiene un PDF legible que incluye la identidad visual del negocio, número y fecha, cliente, detalle de productos y cantidades, datos de entrega y observaciones registradas.
4. **Given** se intenta crear una nota para un cliente que no es mayorista o sin productos válidos, **When** el administrador intenta continuar, **Then** la operación se bloquea y explica qué debe corregirse.
5. **Given** el administrador genera una nota de entrega, **When** termina la operación, **Then** la nota no marca por sí sola el pedido como pagado ni modifica el inventario de forma independiente.

### Edge Cases

- Si una venta o pedido no tiene cliente asociado, la tabla debe mostrar un estado identificable y exigir los datos mínimos antes de generar una nota de entrega.
- Si el inventario cambia mientras se prepara una venta manual, la confirmación debe volver a validar las cantidades y evitar guardar un registro parcial.
- Si el descuento porcentual es 0% o el descuento en dólares es $0, el sistema debe conservar el total original sin crear importes negativos.
- Si el descuento alcanza exactamente el subtotal, el total puede ser cero solo cuando las reglas comerciales lo permitan; nunca debe quedar negativo.
- Si una venta contiene importes en dólares y bolívares, la tasa aplicada a la conversión debe quedar asociada a esa operación y no reemplazarse retroactivamente por la tasa actual.
- Si se modifica el estado de una operación que ya está marcada como "Pagado", debe solicitarse confirmación y conservarse el historial, sin borrar el registro anterior.
- Si existen registros históricos con estados anteriores al rediseño, deben conservarse y mostrarse con una equivalencia comprensible: "pendiente" puede presentarse como "Por cobrar", "pagado" como "Pagado" y "cancelado" debe conservarse como excepción histórica, sin habilitarlo como estado activo nuevo.
- Si no existen ventas en una semana o mes, las analíticas deben mostrar cero y un estado vacío útil, no una gráfica engañosa.
- Si un producto tiene nombre largo, una nota tiene muchos productos o los datos ocupan más de una página, el PDF debe mantener encabezados, filas legibles y totales sin cortar información.
- Si el usuario pierde la sesión o no tiene autorización, ninguna acción de escritura, cambio de estado, analítica privada o descarga de documento debe completarse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El panel DEBE requerir la autenticación y autorización administrativa vigentes para consultar o modificar información interna.
- **FR-002**: El rediseño DEBE ofrecer una navegación unificada, coherente y usable en escritorio y móvil para la gestión existente y para las nuevas secciones de ventas, pedidos, analíticas y notas de entrega.
- **FR-003**: El rediseño DEBE conservar el propósito y las reglas de acceso de las capacidades administrativas existentes, incluyendo gestión de productos, inventario, clientes y transacciones o pedidos.
- **FR-004**: La sección de ventas DEBE mostrar las operaciones registradas en una vista tabular con apariencia de hoja operativa, búsqueda, filtros, ordenamiento y acceso al detalle.
- **FR-005**: La sección de ventas DEBE permitir registrar una operación manual con cliente, fecha, número de orden cuando corresponda, productos, cantidades, precios, moneda, método o información de cobro disponible y estado inicial.
- **FR-006**: El sistema DEBE calcular y mostrar por cada venta el subtotal, el descuento, el total final y, cuando aplique, la conversión en bolívares con la tasa asociada a la operación.
- **FR-007**: El sistema DEBE validar cliente, productos, cantidades, precios, moneda e inventario antes de confirmar una venta, y no DEBE guardar ventas ni descuentos parcialmente si la validación falla.
- **FR-008**: Una venta confirmada DEBE seguir las reglas vigentes de actualización de inventario de las operaciones comerciales; una nota de entrega no DEBE alterar inventario por sí sola.
- **FR-009**: El administrador DEBE poder seleccionar un descuento por porcentaje o por dólares, con un solo tipo activo por venta y con el valor, importe descontado y total final visibles.
- **FR-010**: Los descuentos expresados en dólares DEBEN conservar su valor en USD y, si la venta está expresada en bolívares, DEBEN convertirse usando la tasa asociada a esa operación antes de compararse con el subtotal; los descuentos negativos, no numéricos o superiores al subtotal convertido DEBEN rechazarse.
- **FR-011**: El panel DEBE presentar para cada operación activa los estados operativos "Por cobrar", "En pedido" y "Pagado", con una descripción comprensible y un estado vigente inequívoco; los estados históricos que no tengan equivalencia directa DEBEN seguir siendo consultables.
- **FR-012**: El administrador autorizado DEBE poder cambiar el estado de un pedido y el sistema DEBE registrar la fecha, el responsable y el estado anterior y nuevo, sin procesar pagos externos automáticamente.
- **FR-013**: El panel DEBE ofrecer analíticas semanales y mensuales con total vendido, cantidad de operaciones y desglose por producto, aplicando filtros de periodo y producto.
- **FR-014**: El predictor DEBE basarse únicamente en el historial disponible, indicar el periodo de referencia y mostrar un estado de datos insuficientes cuando no exista una base confiable para estimar.
- **FR-015**: El sistema DEBE permitir crear una nota de entrega únicamente para un cliente mayorista, con número, fecha, datos del cliente, productos, cantidades, información de entrega y observaciones.
- **FR-016**: El sistema DEBE guardar las notas de entrega generadas y permitir consultarlas y descargarlas nuevamente sin alterar por sí mismas el estado de pago ni el inventario.
- **FR-017**: El PDF de la nota DEBE contener una presentación llamativa pero legible, identidad visual del negocio, información de la operación, detalle completo de los productos y espacio para observaciones o recepción.
- **FR-018**: Las vistas, formularios, tablas, estados, mensajes de validación y documentos DEBEN usar etiquetas comprensibles en español y conservar los importes y fechas de forma consistente.
- **FR-019**: Las acciones administrativas DEBEN validar sus entradas del lado del servidor, limitar la exposición de datos personales a lo necesario y dejar trazabilidad de los cambios sensibles.
- **FR-020**: La feature DEBE permanecer dentro del panel administrativo; no DEBE convertir la vista pública, la vista rápida ni WhatsApp en un sistema de pago o en un panel administrativo paralelo.

### Key Entities *(include if feature involves data)*

- **Venta**: Operación comercial registrada con cliente, fecha, moneda, importes, descuento, estado, información de cobro disponible y sus productos.
- **Detalle de venta**: Producto, cantidad y precio aplicado que explican el importe de una venta y permiten el desglose analítico.
- **Descuento**: Ajuste asociado a una venta, expresado como porcentaje o como cantidad en dólares, con su valor e importe calculado.
- **Estado de pedido**: Situación operativa de una venta o pedido: "Por cobrar", "En pedido" o "Pagado", junto con el historial de cambios.
- **Analítica de ventas**: Resumen calculado a partir de ventas registradas para un periodo, con totales generales y por producto.
- **Predicción de ventas**: Estimación orientativa para un periodo futuro, acompañada por el historial utilizado y la calidad o suficiencia de los datos.
- **Nota de entrega**: Documento operativo asociado a un cliente mayorista y a uno o más productos, con datos de entrega, observaciones y versiones descargables.
- **Cliente mayorista**: Cliente existente identificado como mayorista y elegible para recibir una nota de entrega.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al menos el 90% de los administradores de prueba puede localizar una venta y abrir su detalle en menos de 30 segundos desde la entrada al panel.
- **SC-002**: Al menos el 90% de los administradores de prueba puede registrar una venta manual completa en menos de 3 minutos y sin asistencia externa.
- **SC-003**: El 100% de las ventas manuales confirmadas aparece en la vista de ventas con subtotal, descuento, total, moneda y estado coherentes con su detalle.
- **SC-004**: En una revisión de casos válidos e inválidos, el 100% de los descuentos negativos, no numéricos o superiores al subtotal es rechazado antes de guardar.
- **SC-005**: El 100% de los cambios de estado confirmados se refleja en la tabla y el detalle del pedido, conservando estado anterior, nuevo estado, fecha y responsable.
- **SC-006**: Para un conjunto de prueba con ventas conocidas, el 100% de los totales semanales, mensuales y por producto coincide con el registro de ventas considerado, sin incluir operaciones fuera del filtro seleccionado.
- **SC-007**: Cuando existe historial suficiente, el predictor muestra una estimación junto con su periodo de referencia; cuando no existe, el 100% de las pruebas muestra un aviso de datos insuficientes y no una cifra inventada.
- **SC-008**: Al menos el 95% de las notas de entrega de prueba puede completarse, guardarse y descargarse como PDF en menos de 30 segundos, con todos los datos introducidos legibles y sin cortes de contenido.
- **SC-009**: En una revisión de regresión, el 100% de las gestiones administrativas existentes incluidas en el alcance continúa siendo accesible para un administrador autorizado.
- **SC-010**: En una pantalla de 360 píxeles de ancho, las acciones principales de navegación, consulta, registro y cambio de estado siguen siendo legibles y utilizables sin desplazamiento horizontal.

## Assumptions

- El público objetivo son administradores autenticados que ya tienen acceso al panel; esta feature no crea registro público ni nuevos roles o permisos.
- El catálogo, los clientes, las transacciones, el inventario y la autenticación existentes son las fuentes operativas que deben reutilizarse y conservarse.
- Los importes pueden expresarse en dólares estadounidenses y bolívares. Cuando se use conversión, la tasa aplicada se conserva con la venta para mantener el contexto histórico.
- Una venta puede tener un solo descuento activo, expresado por porcentaje o por cantidad en dólares; no se combinan ambos tipos por defecto. Los descuentos por cantidad se introducen en USD y se convierten con la tasa histórica de la operación cuando corresponda.
- Una venta confirmada sigue las reglas actuales del negocio para inventario y disponibilidad. Una nota de entrega documenta una entrega y no representa por sí misma un pago ni una reducción adicional de inventario.
- Los estados "Por cobrar", "En pedido" y "Pagado" son estados operativos visibles para el equipo; el cambio a "Pagado" requiere la confirmación administrativa y la información mínima exigida por las reglas vigentes, pero no incorpora una pasarela de pago. Los estados históricos existentes se conservan y se presentan con una equivalencia comprensible sin perder su significado original.
- El predictor es una ayuda de planificación y no una promesa de ventas, reposición automática ni decisión irreversible de inventario.
- La nota de entrega no sustituye una factura fiscal y no se añaden impuestos, requisitos fiscales o integraciones externas que no hayan sido definidos.
- Las notas se generan para clientes mayoristas existentes; la creación de clientes, si fuera necesaria, debe respetar el flujo administrativo vigente antes de crear la nota.
- La vista rápida y el e-commerce público permanecen separados del panel. La coordinación por WhatsApp, cuando aplique, sigue siendo coordinación y no confirmación automática de pago.
- Los datos históricos incompletos se muestran como incompletos o se excluyen del cálculo afectado; el sistema no debe inventar precios, disponibilidad, ventas ni pronósticos.
