# Feature Specification: Cotización rápida para compartir

**Feature Branch**: `006-cotizacion-rapida`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Deseo crear una copia de la página /venta-rapida en el diseño de la UI pero la funcionalidad va a ser diferente, desde esta página la dueña del negocio va a poder realizar cotizaciones rápidas y con un botón va a generar una imagen de la cotización que podrá compartir fácilmente por WhatsApp."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Armar una cotización rápidamente (Priority: P1)

Como dueña o colaboradora autorizada del negocio, quiero seleccionar productos y cantidades en una página con el mismo lenguaje visual de `/venta-rapida`, para preparar una cotización mientras atiendo a una persona.

**Why this priority**: La selección rápida de productos es la base de todo el flujo y debe conservar la agilidad de la vista que ya utiliza el negocio.

**Independent Test**: Con un catálogo disponible, la operadora puede buscar productos, agregarlos, modificar cantidades y ver únicamente los productos seleccionados sin crear un pedido ni alterar el inventario.

**Acceptance Scenarios**:

1. **Given** la operadora abre la página de cotizaciones, **When** consulta el catálogo o busca por nombre o categoría, **Then** encuentra los productos disponibles en una presentación visual consistente con `/venta-rapida`.
2. **Given** la operadora selecciona uno o más productos, **When** aumenta, reduce o elimina una cantidad, **Then** el resumen de la cotización se actualiza inmediatamente con las líneas y cantidades correctas.
3. **Given** la operadora no ha seleccionado productos, **When** intenta continuar, **Then** la página explica que debe agregar al menos un producto y no genera una cotización vacía.
4. **Given** la operadora limpia la selección, **When** confirma la acción, **Then** se eliminan las líneas de la cotización sin modificar pedidos, pagos o inventario.

---

### User Story 2 - Revisar y generar la imagen de la cotización (Priority: P1)

Como dueña del negocio, quiero revisar los datos de una cotización y generar una imagen legible, para enviarla a la persona interesada sin tener que transcribir los productos y precios.

**Why this priority**: La imagen es el resultado principal de la funcionalidad y debe representar fielmente la oferta antes de compartirla.

**Independent Test**: Con una selección válida, la operadora puede abrir el resumen, completar opcionalmente los datos del destinatario, generar la imagen y verificar que la imagen contiene marca, fecha, líneas, cantidades, precios y totales.

**Acceptance Scenarios**:

1. **Given** existe una selección válida, **When** la operadora abre el resumen, **Then** ve productos, cantidades, precio unitario, importe por línea, subtotal, total en dólares, equivalente en bolívares y tasa de referencia vigente.
2. **Given** la operadora desea identificar a la persona que recibirá la cotización, **When** introduce nombre y teléfono, **Then** esos datos aparecen en el resumen y en la imagen; si los deja vacíos, la cotización puede generarse sin datos personales.
3. **Given** el resumen contiene todos los datos calculados, **When** la operadora pulsa "Generar imagen", **Then** se produce una imagen descargable y legible con la identidad visual de Venuti's Gourmet y con los mismos importes mostrados en pantalla.
4. **Given** la generación de la imagen no puede completarse, **When** ocurre el error, **Then** se conserva la cotización en pantalla, se muestra un mensaje comprensible y la operadora puede reintentar sin perder la selección.

---

### User Story 3 - Compartir la cotización por WhatsApp (Priority: P1)

Como dueña del negocio, quiero compartir la imagen generada por WhatsApp desde un botón visible, para enviar la cotización con el menor número posible de pasos.

**Why this priority**: WhatsApp es el canal operativo del negocio; compartir el documento directamente reduce errores y acelera la respuesta comercial.

**Independent Test**: Con una imagen generada, la operadora puede pulsar el botón de compartir, completar el envío en un dispositivo compatible o recibir una alternativa accionable en un dispositivo que no permita compartir archivos directamente.

**Acceptance Scenarios**:

1. **Given** existe una imagen de cotización generada, **When** la operadora pulsa "Compartir por WhatsApp" en un dispositivo que permite compartir archivos, **Then** se abre el flujo de compartir con la imagen seleccionada y un texto breve de contexto.
2. **Given** el dispositivo o navegador no permite adjuntar la imagen directamente a WhatsApp, **When** la operadora pulsa "Compartir por WhatsApp", **Then** la página ofrece descargar la imagen y abrir WhatsApp con un mensaje de texto preparado, indicando claramente que debe adjuntar la imagen descargada.
3. **Given** WhatsApp no está instalado o no puede abrirse, **When** la operadora intenta compartir, **Then** la imagen permanece disponible para descargar y la página informa que puede compartirla manualmente desde la galería o archivos.
4. **Given** la operadora modifica productos, cantidades o datos después de generar la imagen, **When** intenta compartir, **Then** la página evita compartir una imagen desactualizada y solicita generar nuevamente la cotización.

---

### Edge Cases

- El catálogo no carga o no contiene productos disponibles: la página informa la situación y no permite generar una cotización sin líneas.
- Un producto deja de estar disponible o cambia de precio mientras la operadora prepara la cotización: se informa el cambio antes de generar la imagen y se recalculan los importes con el valor vigente.
- La cantidad introducida no es un número entero positivo o supera la disponibilidad mostrada: se rechaza la cantidad y se conserva la última selección válida.
- La tasa de cambio no está disponible o es cero: se muestran los importes que sí puedan calcularse, se impide publicar un equivalente en bolívares incompleto y se explica qué debe corregirse.
- Los nombres de productos, categorías o datos del destinatario son muy extensos: la imagen conserva legibilidad sin ocultar el total ni romper el diseño.
- La selección contiene muchas líneas: el resumen y la imagen siguen siendo desplazables o paginables sin perder ninguna línea ni el total.
- La operadora genera varias imágenes durante una misma sesión: la última imagen corresponde siempre a la última cotización confirmada en pantalla.
- Se recarga o abandona la página antes de compartir: no se crea una venta, pedido, pago, cliente ni descuento de inventario.
- Se pulsa varias veces el botón de generación o de compartir: no se producen descargas o acciones duplicadas de forma inesperada y el estado de la interfaz permanece comprensible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La aplicación DEBE ofrecer una página de cotización rápida independiente de `/venta-rapida`, conservando su lenguaje visual, facilidad de búsqueda y organización general, pero con acciones propias de cotización.
- **FR-002**: La página DEBE mostrar productos disponibles con nombre, categoría, imagen y precio vigente en dólares, y DEBE permitir buscarlos por nombre o categoría.
- **FR-003**: La operadora DEBE poder agregar, aumentar, reducir y eliminar productos de una cotización sin abandonar la página.
- **FR-004**: La página DEBE mostrar un resumen actualizado con líneas, cantidades, precio unitario, importe por línea, subtotal, total en dólares, equivalente en bolívares y tasa aplicada cuando esté disponible.
- **FR-005**: La aplicación DEBE permitir introducir opcionalmente nombre y teléfono del destinatario de la cotización, y DEBE incluir esos datos en la imagen solo cuando hayan sido proporcionados.
- **FR-006**: La aplicación DEBE mostrar una vista previa o resumen suficiente para que la operadora revise la cotización antes de generar la imagen.
- **FR-007**: El botón de generación DEBE producir una imagen descargable que incluya, como mínimo, la marca del negocio, fecha de emisión, líneas de productos, cantidades, precios, totales y tasa de cambio cuando corresponda.
- **FR-008**: La imagen DEBE conservar los mismos productos, cantidades e importes que la cotización revisada en pantalla; cualquier cambio posterior DEBE marcar la imagen anterior como desactualizada.
- **FR-009**: La aplicación DEBE ofrecer un botón visible para compartir la última imagen generada por WhatsApp.
- **FR-010**: Cuando el dispositivo permita compartir archivos, el botón de WhatsApp DEBE iniciar el flujo de compartir incluyendo la imagen y un texto breve de contexto.
- **FR-011**: Cuando el dispositivo no permita compartir la imagen directamente, la aplicación DEBE ofrecer la descarga de la imagen y un mensaje de WhatsApp preparado como alternativa, indicando que la imagen debe adjuntarse manualmente.
- **FR-012**: La aplicación DEBE informar de forma clara los errores de carga, cálculo, generación o compartición, y DEBE conservar la selección válida para permitir la corrección o el reintento.
- **FR-013**: La aplicación NO DEBE crear pedidos, ventas, pagos, clientes, direcciones ni registros persistentes de cotización como consecuencia de seleccionar productos, generar una imagen o compartirla.
- **FR-014**: La aplicación NO DEBE descontar inventario ni presentar la cotización como una reserva, venta confirmada o pago realizado.
- **FR-015**: La página DEBE mantener el acceso y los límites de seguridad existentes para `/venta-rapida`; esta funcionalidad no debe introducir permisos públicos, registros de usuarios ni un nuevo sistema de autenticación.
- **FR-016**: La experiencia DEBE ser usable desde un teléfono, con controles táctiles, textos legibles, resumen accesible y acciones principales identificables sin depender de una pantalla grande.

### Key Entities *(include if feature involves data)*

- **Cotización en preparación**: representación temporal de la selección actual, con datos opcionales del destinatario, fecha, tasa de cambio y totales; existe solo mientras la operadora la edita o hasta generar la imagen.
- **Línea de cotización**: producto, nombre mostrado, cantidad, precio unitario e importe calculado que se presenta en el resumen y en la imagen.
- **Imagen de cotización**: documento visual generado a partir de una cotización revisada, disponible para descargar y compartir, sin convertirse en un registro comercial persistente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una prueba con catálogo disponible, una operadora puede seleccionar productos, revisar el total y generar una imagen en menos de 2 minutos.
- **SC-002**: En el 100% de las pruebas de generación, la imagen contiene las mismas líneas, cantidades, precios y totales que el resumen confirmado en pantalla.
- **SC-003**: Al menos el 95% de los intentos de compartir en dispositivos compatibles inicia el flujo de compartir la imagen en un máximo de 10 segundos después de pulsar el botón.
- **SC-004**: En el 100% de las pruebas realizadas en dispositivos no compatibles, la operadora recibe una alternativa visible para descargar la imagen y continuar con un mensaje de WhatsApp preparado.
- **SC-005**: En el 100% de las pruebas, la cotización rápida no crea pedidos, ventas, pagos, clientes ni cambios de inventario.
- **SC-006**: Al menos el 90% de las operadoras de prueba puede completar la tarea principal en el primer intento sin instrucciones externas.
- **SC-007**: En una revisión móvil, ninguna acción principal queda inaccesible por desbordamiento horizontal y el total permanece visible antes de generar la imagen.

## Assumptions

- La nueva página se identificará inicialmente como `/cotizacion-rapida`; la ruta podrá ajustarse durante la planificación si el negocio adopta otro nombre.
- La identidad visual, el catálogo, los precios y la tasa de cambio se reutilizarán según las reglas vigentes de `/venta-rapida`.
- El actor principal es la dueña o una colaboradora autorizada que ya puede acceder a la vista rápida; la autenticación y autorización existentes se mantienen sin cambios.
- La cotización es una herramienta de comunicación comercial y no constituye una reserva, pedido, venta, pago ni comprobante fiscal.
- Nombre y teléfono del destinatario son opcionales porque la dueña puede preparar primero una cotización genérica; cuando se proporcionen, se consideran datos personales y solo se muestran en el documento solicitado.
- La fecha de emisión se toma del momento en que se genera la imagen y no implica una fecha de vencimiento ni una garantía de precio futuro.
- La opción de compartir depende de las capacidades del dispositivo y del navegador; la descarga de la imagen es la alternativa mínima disponible.
- No se agregan pasarelas de pago, persistencia histórica, envío automático de archivos a terceros ni nuevas integraciones fuera del flujo de compartir por WhatsApp.
