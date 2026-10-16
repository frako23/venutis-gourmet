# Quickstart: Validar cotización rápida

**Feature**: `006-cotizacion-rapida`

Esta guía valida el comportamiento visible y las reglas de no persistencia. No sustituye las tareas de implementación ni describe el código interno.

## Prerrequisitos

- Dependencias instaladas y cliente Prisma generado.
- Base de datos de desarrollo accesible con productos, imágenes y al menos un producto con inventario positivo.
- Variables de entorno locales configuradas sin exponer secretos en commits.
- Para validar compartir nativo desde un teléfono remoto: entorno HTTPS. `localhost` puede usarse desde el mismo equipo; una URL HTTP por IP local debe ejercitar el fallback.

## Arranque

```powershell
npm.cmd run dev
```

Abrir:

```text
http://localhost:3000/cotizacion-rapida
```

Para una comprobación con HTTPS local, usar el comando de desarrollo seguro existente y abrir la URL que muestre el servidor.

## Escenarios funcionales

### 1. Selección y cálculo

1. Buscar por nombre y por categoría.
2. Agregar dos productos y cambiar sus cantidades.
3. Confirmar que el resumen muestra líneas, cantidades, subtotal USD, total Bs y tasa.
4. Eliminar una línea y verificar que todos los importes se recalculan.
5. Vaciar la selección y confirmar que no se permite generar una cotización vacía.

**Esperado**: no hay navegación al checkout y no aparece ninguna acción de pago o confirmación de venta.

### 2. Generación y fidelidad de la imagen

1. Introducir un nombre y teléfono de prueba.
2. Anotar las líneas y totales mostrados.
3. Pulsar `Generar imagen`.
4. Revisar la previsualización y descargar el PNG.
5. Abrir el PNG y comprobar marca, fecha, datos opcionales, líneas, cantidades, precios y totales.

**Esperado**: el archivo coincide con el resumen y no contiene datos de otros clientes ni inventario interno.

### 3. Invalidez después de editar

1. Generar una imagen.
2. Cambiar una cantidad, producto, destinatario o tasa.
3. Intentar compartir sin generar otra imagen.

**Esperado**: compartir queda bloqueado o solicita regenerar; nunca se comparte silenciosamente el archivo anterior.

### 4. Compartir compatible

1. Usar `localhost` o HTTPS en un dispositivo compatible.
2. Generar la imagen.
3. Pulsar `Compartir por WhatsApp`.

**Esperado**: se abre el selector de compartir con un archivo PNG y texto breve. La interfaz no afirma que el envío fue confirmado.

### 5. Fallback de compartir

1. Usar un navegador o contexto donde Web Share no esté disponible, o cancelar la capacidad de compartir archivos.
2. Generar la imagen y pulsar compartir.

**Esperado**: la imagen se descarga o queda disponible para descargar, se abre WhatsApp con un mensaje preparado y se explica que la operadora debe adjuntar el PNG manualmente.

### 6. No persistencia

1. Antes de la prueba, registrar de forma segura los conteos de desarrollo relevantes si se dispone de una base aislada.
2. Seleccionar productos, introducir datos, generar, descargar y compartir.
3. Recargar o abandonar la página.

**Esperado**: no se crean clientes, direcciones, transacciones, detalles, pagos ni cambios de inventario; al recargar se pierde la cotización temporal.

## Validaciones automatizadas y de entrega

```powershell
npm.cmd run test:checkout
npm.cmd run lint
npm.cmd run build
```

La prueba unitaria debe cubrir cálculos, fingerprint/obsolescencia y texto de WhatsApp sin depender de una base real. La revisión manual debe confirmar el renderizado móvil real, porque la presencia de clases CSS o una compilación correcta no demuestra que el resumen, el PNG o el compartir funcionen en el dispositivo.

## Registro de validación de implementación

- `npm.cmd run test:checkout`: correcto, 21 pruebas aprobadas y 3 pruebas de integración omitidas por sus prerrequisitos existentes.
- `npx.cmd tsc --noEmit`: correcto.
- `npm.cmd run lint`: correcto, con 8 advertencias preexistentes fuera de la nueva ruta; no hubo errores.
- `npm.cmd run build`: correcto; Next.js incluyó `/cotizacion-rapida` como ruta dinámica. El build mostró las mismas advertencias preexistentes del lint.
- `http://localhost:3000/cotizacion-rapida`: respondió HTTP 200 durante la comprobación local y mostró el estado de catálogo no disponible; la base PostgreSQL configurada no era accesible, por lo que no se pudo ejercitar la selección con productos reales.
- Pendiente de ejecución manual en navegador/dispositivo real: inspección visual del PNG, Web Share nativo, fallback de WhatsApp y comprobación de conteos en una base aislada.
