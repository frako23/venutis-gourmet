# Feature Specification: Checkout directo desde Venta Rápida

**Feature Branch**: `005-checkout-venta-rapida`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Deseo que la página /venta-rapida, además de enviar pedidos por WhatsApp, permita procesarlos directamente dentro de la aplicación. Debe registrar los datos del cliente en el pedido, solicitar la dirección cuando sea delivery, permitir elegir el tipo de pago, mostrar todos los datos e instrucciones del pago y completar el formulario de venta que ya existe."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el canal y conservar el pedido (Priority: P1)

Como cliente que arma un pedido en `/venta-rapida`, quiero elegir entre enviarlo por WhatsApp o procesarlo dentro de la aplicación sin perder los productos, cantidades ni importes que ya seleccioné.

**Why this priority**: Es la decisión central de la funcionalidad y debe conservar la rapidez de la vista actual sin eliminar el canal de coordinación por WhatsApp.

**Independent Test**: Con productos disponibles en el carrito, se puede probar cada opción por separado y verificar que WhatsApp sigue generando el pedido actual, mientras que el canal directo abre el flujo de datos del cliente y no crea la venta antes de la confirmación final.

**Acceptance Scenarios**:

1. **Given** el carrito de `/venta-rapida` contiene uno o más productos disponibles, **When** el cliente elige "Enviar por WhatsApp", **Then** se abre WhatsApp con el detalle, cantidades, precios, tasa y total del pedido, sin exigir registro previo.
2. **Given** el carrito de `/venta-rapida` contiene uno o más productos disponibles, **When** el cliente elige "Procesar pedido en la app", **Then** se conserva el mismo carrito y se inicia el formulario de compra directa.
3. **Given** el cliente abrió el resumen pero todavía no confirmó una compra directa, **When** abandona o cambia de canal, **Then** no se crea un pedido, pago o descuento de inventario por ese solo hecho.

---

### User Story 2 - Registrar o reutilizar los datos del cliente (Priority: P1)

Como cliente que procesa el pedido dentro de la aplicación, quiero identificarme con mi teléfono para registrar mis datos una sola vez y asociarlos a la venta.

**Why this priority**: Sin un cliente asociado no hay forma confiable de entregar el pedido, consultar la operación ni mantener la trazabilidad que necesita el negocio.

**Independent Test**: Se prueba una compra con un teléfono existente y otra con un teléfono nuevo; ambas deben terminar con un único cliente asociado al pedido y con los datos visibles en la confirmación.

**Acceptance Scenarios**:

1. **Given** el teléfono ya pertenece a un cliente, **When** el cliente lo introduce en el formulario, **Then** se muestran sus datos existentes, se evita crear un duplicado y el pedido queda asociado a ese cliente.
2. **Given** el teléfono no pertenece a un cliente, **When** el cliente completa nombre, apellido y opcionalmente correo, **Then** se registra un nuevo cliente y esos datos quedan asociados a la venta que se confirme.
3. **Given** faltan nombre, apellido o un teléfono válido, **When** el cliente intenta continuar, **Then** el formulario identifica los campos faltantes y no permite avanzar.

---

### User Story 3 - Definir entrega y dirección (Priority: P1)

Como cliente, quiero escoger si recibiré el pedido por delivery o lo retiraré, y registrar una dirección completa cuando corresponda.

**Why this priority**: La modalidad de entrega cambia el total, los datos necesarios para operar el pedido y la información que debe quedar en la venta.

**Independent Test**: Se prueba una compra con delivery y otra con retiro; la primera exige una dirección válida y conserva su contenido histórico, mientras la segunda no exige dirección.

**Acceptance Scenarios**:

1. **Given** el cliente selecciona delivery, **When** elige una dirección existente o registra alias, zona y dirección detallada, **Then** el sistema calcula el cargo de la zona y guarda en el pedido la dirección utilizada, además de asociarla al cliente.
2. **Given** el cliente selecciona retiro, **When** continúa al pago, **Then** no se exige una dirección de delivery ni se suma un cargo de delivery.
3. **Given** la zona del cliente no está disponible entre las zonas configuradas, **When** intenta procesar el pedido directo, **Then** recibe una explicación y puede continuar por WhatsApp para coordinar la entrega, sin crear una venta directa con un cargo desconocido.
4. **Given** el cliente selecciona delivery pero no completa una dirección, **When** intenta continuar, **Then** se bloquea el avance y se indica qué dato falta.

---

### User Story 4 - Consultar y registrar el pago (Priority: P1)

Como cliente, quiero elegir el método de pago, recibir sus datos e instrucciones y registrar la información del pago junto con mi pedido.

**Why this priority**: El pedido directo necesita una instrucción accionable para pagar y un registro operativo que permita al equipo verificar y dar seguimiento a la operación.

**Independent Test**: Para cada método habilitado se verifica que aparecen sus datos e instrucciones, que el monto corresponde al total final y que la confirmación conserva la información introducida por el cliente.

**Acceptance Scenarios**:

1. **Given** el cliente llegó al paso de pago, **When** selecciona Pago Móvil, Zelle, Transferencia Bs o Efectivo USD, **Then** ve los datos e instrucciones configurados para ese método, la moneda aplicable y el monto final a pagar.
2. **Given** el pedido incluye delivery, **When** se muestran las instrucciones de pago, **Then** los montos en USD y bolívares incluyen productos más delivery y muestran la tasa utilizada.
3. **Given** el cliente usa un método que requiere comprobación o referencia, **When** completa fecha, monto y referencia, **Then** esos datos se validan y se registran en el pedido; el sistema no presenta el pago como confirmado únicamente porque el formulario fue enviado.
4. **Given** el cliente selecciona efectivo USD, **When** confirma el pedido, **Then** se registra el método y el importe esperado, se indica que el cobro queda pendiente de entrega y no se exige una referencia inexistente.
5. **Given** el cliente no selecciona método o deja incompletos los datos obligatorios del pago, **When** intenta confirmar, **Then** se muestran errores claros y no se crea la venta.

---

### User Story 5 - Confirmar el pedido y dejarlo operativo (Priority: P1)

Como cliente y como equipo de Venuti's Gourmet, quiero que una confirmación exitosa genere la misma venta operativa que el checkout existente, con toda la información necesaria para preparar, cobrar y entregar el pedido.

**Why this priority**: Es el resultado de negocio de la funcionalidad: convertir el carrito rápido en un pedido trazable sin duplicar procesos ni crear registros incompletos.

**Independent Test**: Con un carrito válido se confirma un pedido directo y se verifica, desde la confirmación y el panel interno, el cliente, las líneas, el importe, la entrega, el pago, el estado inicial y la actualización de inventario.

**Acceptance Scenarios**:

1. **Given** cliente, carrito, entrega y pago son válidos, **When** confirma el pedido, **Then** se crea una única venta con número de orden, cliente, líneas de producto, cantidades, precios vigentes, subtotal, delivery, total, modalidad de entrega, dirección cuando aplique y datos del pago.
2. **Given** se crea una venta directa correctamente, **When** el cliente llega a la confirmación, **Then** ve el número de orden, el resumen de productos, los totales en USD y bolívares, la tasa, la entrega, el método de pago, la referencia o indicación de pendiente y las instrucciones necesarias para completar el pago.
3. **Given** una venta directa fue creada, **When** el equipo abre la sección interna de ventas y pedidos, **Then** puede encontrarla con los datos del cliente, entrega, pago y estado operativo correspondiente.
4. **Given** el método de pago aún no ha sido verificado por el negocio, **When** se crea el pedido, **Then** el estado inicial indica que está en pedido o por cobrar según corresponda; solo una confirmación explícita del cobro puede llevarlo a pagado.
5. **Given** el cliente pulsa varias veces el botón de confirmación o reintenta una respuesta ambigua, **When** el pedido ya fue creado, **Then** no se generan ventas duplicadas ni se descuenta inventario más de una vez.

### Edge Cases

- El carrito llega vacío, contiene cantidades inválidas o conserva un producto que ya no está disponible: no se crea la venta y se informa al cliente.
- El precio o el inventario cambian entre la selección y la confirmación: se rechaza la operación completa, no se crean pagos parciales ni se descuenta inventario, y se solicita actualizar el carrito.
- Se pierde la conexión después de confirmar: el cliente recibe un estado recuperable y no debe repetir la operación a ciegas; si existe número de orden, puede consultar la confirmación.
- El teléfono coincide con un cliente existente pero el correo enviado entra en conflicto con otro registro: se conserva el cliente identificado por teléfono y se solicita corregir u omitir el correo sin crear un duplicado.
- El cliente ya tiene varias direcciones: puede seleccionar una y la dirección usada queda identificada en el pedido; cambiar posteriormente la dirección del cliente no altera el histórico de esa venta.
- Una dirección existente fue eliminada o ya no permite calcular delivery: se solicita seleccionar o registrar otra dirección válida antes de confirmar.
- La tasa de cambio no está disponible o cambia durante el formulario: no se muestran importes incompletos; al confirmar se conserva la tasa realmente aplicada al pedido o se informa que debe reintentarse.
- Un dato de pago no válido, una referencia vacía para un método que la requiere o un monto distinto al total final: se detiene la confirmación y se conserva el carrito para corregirlo.
- WhatsApp no está disponible en el dispositivo: el canal directo sigue funcionando y el cliente recibe el número de orden sin depender de abrir WhatsApp.
- Un fallo de persistencia ocurre durante la confirmación: no debe quedar una venta sin sus líneas, pago o actualización de inventario correspondiente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La vista `/venta-rapida` DEBE ofrecer dos decisiones explícitas después de revisar el carrito: enviar el pedido por WhatsApp o procesarlo dentro de la aplicación.
- **FR-002**: El canal de WhatsApp DEBE conservar su comportamiento actual: preparar el mensaje con productos, cantidades, precios, tasa y total, sin exigir datos personales y sin crear una venta, pago o descuento de inventario por ese envío.
- **FR-003**: El canal directo DEBE trasladar al formulario de compra los productos, cantidades, contexto de precios y total seleccionados, y DEBE impedir que una visita al formulario cree una venta antes de la confirmación.
- **FR-004**: El formulario DEBE identificar al cliente por teléfono, reutilizar un cliente existente cuando corresponda y crear uno nuevo solo cuando no exista; nombre, apellido y teléfono son obligatorios y el correo es opcional si cumple un formato válido.
- **FR-005**: La venta directa DEBE conservar la identidad del cliente y los datos de contacto proporcionados al momento de confirmar, sin reemplazar silenciosamente datos válidos por información vacía.
- **FR-006**: El cliente DEBE poder escoger delivery o retiro; delivery DEBE exigir una dirección válida y retiro DEBE poder completarse sin dirección.
- **FR-007**: Para delivery, el formulario DEBE permitir seleccionar una dirección del cliente o registrar una nueva con alias, zona y detalle; la zona DEBE determinar el cargo configurado y la dirección utilizada DEBE quedar conservada como parte del pedido histórico.
- **FR-008**: El resumen DEBE mostrar subtotal, cargo de delivery cuando aplique, total en USD, equivalente en bolívares y tasa de cambio aplicada antes de confirmar.
- **FR-009**: El formulario DEBE mostrar los métodos de pago habilitados por el negocio y, al seleccionar uno, sus datos e instrucciones de pago, moneda, importe final y condiciones particulares.
- **FR-010**: Para los métodos que lo requieran, el formulario DEBE solicitar y validar fecha, monto en USD, monto en bolívares y referencia; para efectivo DEBE registrar el importe esperado y no exigir una referencia que no exista.
- **FR-011**: Los datos e instrucciones de pago mostrados al cliente DEBEN corresponder al total final del pedido, incluido delivery, y a la tasa que quedará asociada a la operación.
- **FR-012**: El sistema DEBE distinguir entre registrar los datos declarados por el cliente y confirmar que el negocio recibió el dinero; un pedido no DEBE marcarse como pagado solo por enviar el formulario.
- **FR-013**: La confirmación directa DEBE validar en el servidor que el carrito no está vacío, que cada producto existe, que la cantidad cabe en inventario y que el precio coincide con el vigente antes de crear registros.
- **FR-014**: La creación de la venta directa, sus líneas, el registro del pago declarado y el descuento de inventario DEBEN completarse como una sola operación consistente: si una parte falla, no debe quedar una venta incompleta ni un descuento parcial.
- **FR-015**: La venta DEBE guardar número de orden, cliente, líneas, precios, cantidades, subtotal, delivery, total, tasa, modalidad de entrega, dirección histórica cuando aplique, método de pago, importes, fecha y referencia cuando exista.
- **FR-016**: El pedido directo DEBE iniciar en un estado operativo coherente con el cobro pendiente —por cobrar o en pedido— y solo podrá pasar a pagado mediante la confirmación explícita prevista por el flujo operativo existente.
- **FR-017**: Después de confirmar, el cliente DEBE recibir una página de resumen con el número de orden, cliente, productos, cantidades, importes, entrega, pago declarado e instrucciones; también DEBE poder notificar opcionalmente el pedido por WhatsApp.
- **FR-018**: Las ventas originadas en `/venta-rapida` DEBEN aparecer en la gestión interna existente con los mismos datos necesarios para seguimiento, preparación, cobro y entrega que las demás ventas.
- **FR-019**: Un reintento causado por doble clic o respuesta incierta DEBE evitar ventas duplicadas, pagos duplicados y descuentos de inventario repetidos para la misma confirmación.
- **FR-020**: Los errores de validación, inventario, precio, tasa, pago o persistencia DEBEN mostrarse con lenguaje comprensible, conservar el carrito cuando sea seguro hacerlo y no exponer credenciales ni detalles técnicos internos.
- **FR-021**: La experiencia DEBE seguir siendo usable en pantallas móviles estrechas, con el resumen, los campos obligatorios, los importes y las acciones de WhatsApp o confirmación claramente identificables.

### Key Entities *(include if feature involves data)*

- **Cliente**: Persona identificada por teléfono, con nombre, apellido, correo opcional y relación con sus direcciones y pedidos.
- **Pedido o venta**: Operación confirmada con número de orden, cliente, productos, cantidades, precios, totales, modalidad de entrega, dirección histórica, estado operativo y fecha.
- **Dirección de entrega**: Alias, zona y detalle que pertenecen al cliente; cuando se usa en un pedido, se conserva una copia o referencia histórica que no cambia si el cliente edita sus direcciones después.
- **Detalle del pedido**: Producto, cantidad y precio vigente capturados en la venta, independientes de cambios posteriores del catálogo.
- **Pago declarado**: Método elegido, importes, moneda, tasa, fecha y referencia proporcionados por el cliente, distinguiendo su registro de la confirmación del cobro.
- **Instrucciones de pago**: Datos operativos que el negocio muestra para cada método habilitado, junto con la moneda, el importe y las indicaciones necesarias para realizarlo.
- **Estado del pedido**: Situación operativa que permite distinguir por cobrar, en pedido, pagado o cancelado según las reglas existentes del negocio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una prueba con un carrito válido, al menos 90% de los usuarios puede elegir el canal, completar sus datos, confirmar un pedido directo y encontrar su número de orden en menos de 4 minutos.
- **SC-002**: El 100% de los pedidos directos confirmados en una prueba de aceptación contiene cliente, líneas, cantidades, precios, total, modalidad de entrega y datos del pago; los pedidos con delivery contienen además la dirección usada.
- **SC-003**: En el 100% de las pruebas del canal WhatsApp, el mensaje conserva el detalle del carrito y no se crea una venta, pago ni descuento de inventario.
- **SC-004**: En el 100% de las pruebas de pago, los datos e instrucciones mostrados y la confirmación reflejan el total final, incluyendo delivery, la moneda correspondiente y la tasa asociada.
- **SC-005**: En pruebas de inventario insuficiente, cambio de precio, tasa no disponible y error de persistencia, el 100% de las operaciones rechazadas deja cero ventas incompletas y cero descuentos parciales de inventario.
- **SC-006**: En una prueba de doble confirmación o reintento, el sistema crea como máximo una venta, un registro de pago declarado y un descuento de inventario por pedido confirmado.
- **SC-007**: El 100% de los pedidos directos confirmados aparece en la gestión interna con estado operativo, cliente, dirección cuando corresponda, productos, total y datos del pago declarados.
- **SC-008**: En una revisión con cinco tareas móviles y una pantalla estrecha, al menos cuatro usuarios identifican correctamente las opciones WhatsApp y proceso directo, completan los campos obligatorios y pueden revisar el total antes de confirmar.
- **SC-009**: En pruebas con cliente existente, cliente nuevo, delivery, retiro, pago digital y efectivo, el sistema no crea clientes duplicados ni presenta un pedido como pagado sin confirmación explícita del cobro.

## Fuera de alcance de esta versión

- Integrar una pasarela de pago, cobro con tarjeta, webhook, conciliación bancaria o verificación automática de transferencias, Zelle o Pago Móvil.
- Subir comprobantes de pago o procesar imágenes de recibos.
- Crear cuentas con contraseña, perfiles públicos, fidelidad nueva o un nuevo mecanismo de autenticación.
- Reemplazar el canal de WhatsApp, el checkout existente o la gestión interna de ventas; la vista rápida debe reutilizar las reglas y registros existentes.
- Permitir delivery fuera de las zonas configuradas sin una coordinación manual por WhatsApp.
- Crear un flujo mayorista independiente dentro de `/venta-rapida`; el canal conserva el contexto y precios que la vista rápida ya ofrece.

## Assumptions

- `/venta-rapida` es una superficie pública de pedidos rápidos y el cliente no necesita iniciar sesión para comprar; el teléfono es el mecanismo actual para encontrar o crear su cliente.
- El catálogo y los precios mostrados en esta vista corresponden al contexto detal actual; cualquier cambio de contexto debe seguir las reglas de compra existentes.
- Se reutilizan el formulario de checkout, las zonas de delivery, los métodos de pago, la página de confirmación y la gestión interna ya existentes, adaptándolos para recibir el carrito de `/venta-rapida`.
- Los datos de pago configurados por el negocio son la fuente autorizada de las instrucciones que se muestran al cliente; el sistema solo registra lo que el cliente declara y no afirma que una transferencia haya sido verificada.
- La venta directa sí confirma un pedido operativo y descuenta inventario de manera atómica; el canal WhatsApp solo coordina la intención y no reserva existencias.
- Cuando el estado del pago no puede confirmarse automáticamente, el pedido se conserva como por cobrar o en pedido y el equipo lo actualiza mediante su flujo operativo existente.
- La dirección se guarda como información histórica del pedido además de permanecer vinculada al cliente, para que una edición posterior no cambie una venta ya realizada.
- La tasa de cambio y los importes se expresan con las convenciones monetarias actuales del negocio y se conserva la tasa aplicada para interpretar el pago después.
- Las validaciones y pruebas se ejecutarán contra datos de desarrollo aislados; no se usarán clientes, pagos ni inventario reales para ensayar escenarios destructivos.
