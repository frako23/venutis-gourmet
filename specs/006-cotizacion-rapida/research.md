# Research: Cotización rápida para compartir

**Feature**: `006-cotizacion-rapida`
**Fecha**: 2026-10-15

## Decisión 1: Generación local de la imagen

**Decisión**: Dibujar la cotización directamente en Canvas 2D, convertirla a PNG con `canvas.toBlob`, crear un `File` temporal y conservar un botón de descarga independiente.

**Razonamiento**:

- El objetivo visual requiere respetar saltos de línea, colores y altura variable de la lista; Canvas permite controlar esas medidas sin depender del renderizado `foreignObject` del DOM.
- La imagen necesita una composición estable de texto, líneas, marca y totales; no necesita fotografías de productos.
- La generación local evita subir datos del destinatario y precios a un servicio externo.
- El File API permite trabajar con `Blob`, `File` y URLs de objeto para datos locales; la URL temporal debe revocarse al reemplazar o desmontar el artefacto.
- Web Share permite compartir archivos cuando el navegador/dispositivo lo soporta. Debe comprobarse con `navigator.canShare({ files })` y ejecutarse desde una interacción de usuario.

**Alternativas consideradas**:

- **Captura del DOM con `html-to-image`**: descartada después de comprobar que el arte fuera del viewport podía producir un PNG negro en el navegador objetivo por el renderizado `foreignObject`.
- **Agregar `html2canvas`**: descartada porque reconstruye el DOM con restricciones adicionales de CSS y recursos remotos; no aporta valor frente al Canvas controlado.
- **Generar solo SVG**: descartada como formato principal porque el tratamiento de SVG como adjunto puede variar entre aplicaciones; se necesita un PNG convencional.
- **Generar la imagen en el servidor**: descartada porque exigiría otra superficie de renderizado, transferencia o almacenamiento para una cotización efímera.

**Fuentes**:

- [W3C Web Share API](https://www.w3.org/TR/web-share/)
- [W3C File API](https://www.w3.org/TR/FileAPI/)

## Decisión 2: Catálogo y precios

**Decisión**: La nueva ruta consultará productos disponibles desde Prisma en el servidor, con `id`, `nombre`, `categoria`, `precioDetal`, `inventario` e imágenes. La interacción usará una proyección propia de cotización y una lectura fresca antes de generar para detectar cambios de precio o disponibilidad.

**Razonamiento**:

- `/venta-rapida` ya obtiene `Producto` con `imagenes`, ordena y filtra `inventario > 0`.
- El modelo `Producto` contiene el precio detal, la categoría, el inventario y la relación de imágenes.
- `lib/prisma.ts` ofrece un singleton para evitar crear clientes Prisma por render.
- La lectura fresca permite cumplir el caso de un producto modificado mientras la página estaba abierta sin escribir datos comerciales.

**Alternativas consideradas**:

- **Copiar un catálogo fijo en el cliente**: descartada porque los precios y disponibilidad dejarían de representar la fuente de verdad.
- **Reutilizar el store persistido del checkout**: descartada porque mezcla una cotización sin persistencia con un flujo que conserva carrito, cliente y estado de compra.
- **Crear una tabla `Cotizacion`**: descartada porque la especificación excluye historial y persistencia en esta versión.

## Decisión 3: Estado y seguridad de datos

**Decisión**: Mantener selección, datos opcionales del destinatario, artefacto de imagen y estado de obsolescencia en el componente cliente, sin Zustand persistido, cookies ni Server Actions de escritura.

**Razonamiento**:

- La cotización no representa una reserva, pedido, pago o cliente.
- Abandonar o recargar la página debe descartar los datos temporales.
- El nombre y teléfono opcionales solo deben entrar en el documento que la operadora decide generar.
- La ruta conserva el acceso existente de la vista rápida; no se introduce autenticación nueva.

## Decisión 4: Compartir y fallback

**Decisión**: Usar `navigator.share({ files, text, title })` solo cuando el archivo sea compartible; en cualquier otro caso descargar la imagen y abrir el enlace de WhatsApp con texto preparado, dejando claro que el adjunto es manual.

**Razonamiento**:

- Web Share requiere contexto seguro, disponibilidad del navegador y activación directa del usuario.
- La API no permite asegurar qué destino eligió la persona ni que WhatsApp haya confirmado el envío.
- Un enlace `wa.me` puede abrir el chat y preparar texto, pero no adjunta por sí mismo el `Blob` local.
- En desktop o navegadores incompatibles se debe conservar la imagen descargable y mostrar instrucciones claras.

## Decisión 5: Recursos de la imagen

**Decisión**: El arte incluirá logo local, marca, fecha, datos opcionales, líneas, totales y una nota de cotización; no incluirá miniaturas remotas de productos.

**Razonamiento**:

- Las imágenes de productos son URLs remotas y no se incluyen en Canvas; así se evita depender de CORS durante la generación.
- La miniatura no es necesaria para cumplir la información comercial de la cotización.
- El logo local y las fuentes del proyecto permiten conservar la identidad visual sin depender de una descarga externa durante la generación.

## Decisión 6: Verificación

**Decisión**: Combinar pruebas puras automatizadas con una comprobación manual renderizada del flujo.

**Razonamiento**:

- El repositorio usa `node:test` y ya tiene `tests/checkout/quick-sale-channel.test.ts` para reglas de `/venta-rapida`.
- Los cálculos, fingerprint, texto de WhatsApp y serialización de líneas se pueden probar sin navegador ni base de datos.
- La captura real, la descarga, el desbordamiento móvil y el selector de compartir requieren un navegador real; no se tratarán como probados por TypeScript o build.

**Validaciones previstas**:

- `npm.cmd run test:checkout`
- `npm.cmd run lint`
- `npm.cmd run build`
- Recorrido manual en `/cotizacion-rapida` con catálogo de desarrollo, pantalla móvil y escritorio.
