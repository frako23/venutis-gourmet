# Contrato de la cotización rápida

**Feature**: `006-cotizacion-rapida`
**Ruta**: `/cotizacion-rapida`
**Naturaleza**: herramienta de cotización temporal con el mismo acceso de `/venta-rapida`; no es checkout ni registro comercial.

## Contrato de catálogo

La página recibe y puede revalidar una colección de productos disponibles con esta forma conceptual:

```text
ProductProjection {
  id: number
  nombre: string
  categoria: string
  precioUsd: number
  inventario: number
  imagenUrl?: string
}
```

Reglas:

- La fuente es el catálogo PostgreSQL existente.
- Solo se presentan inicialmente productos con inventario mayor que cero.
- La revalidación no modifica productos ni inventario.
- Si un producto ya no existe, está agotado o cambió de precio, la interfaz debe informar la diferencia antes de generar.

## Contrato de interacción

| Estado | Acción | Resultado visible |
|---|---|---|
| Sin líneas | Buscar/agregar producto | La tarjeta muestra selección y el resumen pasa a tener una línea. |
| Borrador | Aumentar/reducir/eliminar | Se recalculan línea, subtotal y total sin navegación. |
| Borrador | Abrir resumen | Se muestran líneas, destinatario opcional, tasa y totales. |
| Borrador válido | Generar imagen | Se muestra la última imagen y quedan disponibles descargar/compartir. |
| Generada | Editar cualquier dato | La imagen queda desactualizada y compartir se bloquea hasta regenerar. |
| Generada válida | Descargar | Se descarga un PNG con nombre de cotización. |
| Generada válida y Web Share compatible | Compartir por WhatsApp | Se abre el selector del sistema con archivo y texto de contexto. |
| Generada válida sin Web Share compatible | Compartir por WhatsApp | Se descarga/ofrece descargar el PNG y se abre WhatsApp con texto; se indica adjuntar manualmente. |
| Cualquier estado | Error | Se conserva la selección válida y se muestra una acción de reintento o corrección. |

## Contrato del documento generado

La imagen debe contener, en este orden lógico:

1. Identidad de Venuti's Gourmet.
2. Título "Cotización" y fecha de emisión.
3. Nombre y teléfono solo cuando fueron proporcionados.
4. Tabla o lista de líneas con cantidad, producto, precio unitario e importe.
5. Subtotal/total USD, total Bs y tasa de referencia cuando la tasa sea válida.
6. Nota breve que diferencie la cotización de una confirmación de pedido o pago.

El documento no debe mostrar datos de otros clientes, inventario interno, credenciales, referencias de pago ni afirmar disponibilidad futura.

## Contrato de compartir

```text
shareQuoteImage(imageFile, shareText) ->
  native-share-started
  | fallback-download-and-whatsapp
  | user-cancelled
  | recoverable-error
```

- `native-share-started` significa que el navegador abrió el selector; no significa que WhatsApp haya confirmado el envío.
- `fallback-download-and-whatsapp` significa que la imagen queda disponible localmente y el enlace de WhatsApp contiene texto preparado; la operadora adjunta el archivo.
- `user-cancelled` no debe borrar la cotización ni tratarse como un fallo de generación.
- `recoverable-error` conserva el archivo/selección cuando sea posible y ofrece reintentar.

## Contrato de no persistencia

Las siguientes acciones son explícitamente de solo lectura o locales al navegador:

- cargar/revalidar productos;
- seleccionar productos y cantidades;
- introducir nombre/teléfono temporal;
- calcular totales;
- generar, previsualizar y descargar la imagen;
- abrir el selector de compartir o WhatsApp.

Ninguna de ellas crea `Transaccion`, `DetalleCompra`, `Pago`, `Cliente`, `Direccion`, reserva o movimiento de inventario.
