# Investigación: Catálogo público unificado

**Feature**: `001-catalogo-unificado`
**Fecha**: 2026-10-07

## Decisión 1: Mantener una ruta canónica para el catálogo público

**Decisión**: La experiencia canónica será el catálogo que actualmente vive en `/productos/consumidores`. El contexto se comunicará con el parámetro `contexto=consumidor|mayorista`. `/productos/mayoristas` dejará de renderizar una aplicación alternativa y funcionará como entrada de compatibilidad hacia el mismo catálogo.

**Razonamiento**: `app/productos/consumidores/page.tsx` ya consulta productos, categorías, imágenes, inventario y precio detal; `app/productos/mayoristas/page.tsx` solo muestra un portal "en construcción" y un enlace a WhatsApp. Reutilizar la ruta funcional reduce duplicación y cumple la decisión de una sola experiencia pública.

**Alternativas consideradas**:

- Mantener dos rutas con componentes separados: descartado porque conserva la duplicación y contradice el objetivo de simplificar.
- Eliminar inmediatamente la ruta mayorista: descartado porque enlaces guardados o compartidos perderían una respuesta útil; se conservará una redirección de compatibilidad.

## Decisión 2: Representar el contexto de compra de forma temporal y compartible

**Decisión**: Usar `contexto` en la URL como fuente de entrada para las páginas servidoras y reflejarlo en el estado persistido del carrito para que el checkout conserve la selección. El valor ausente o inválido se normalizará a `consumidor`.

**Razonamiento**: El contexto no es un rol administrativo ni una autorización nueva. La URL permite que la ficha de producto, el regreso al listado y los enlaces públicos conserven la selección sin crear una entidad en PostgreSQL.

**Alternativas consideradas**:

- Guardar el contexto exclusivamente en PostgreSQL: descartado porque es una preferencia temporal y exigiría asociarlo a un cliente antes de que exista.
- Guardarlo exclusivamente en `localStorage`: descartado porque las páginas de catálogo son servidoras y necesitan el contexto para elegir el precio antes de renderizar.

## Decisión 3: Reutilizar los precios existentes para la oferta mayorista

**Decisión**: El contexto `consumidor` usa `Producto.precioDetal` y el contexto `mayorista` usa `Producto.precioMayorista`. Un producto se considera elegible para mostrarse como oferta mayorista cuando tiene un precio mayorista válido según las reglas actuales del catálogo. No se añadirá una columna de clasificación de producto ni se reintroducirá el campo `tipoCliente` en `Producto`.

**Razonamiento**: `prisma/schema.prisma` conserva ambos precios y `lib/actions/products.ts` exige que sean positivos al crear o editar productos. La migración `20260210140952_remove_tipocliente` muestra que la clasificación anterior del producto fue retirada; volver a añadirla crearía una decisión de dominio y una migración que la solicitud no necesita.

**Alternativas consideradas**:

- Añadir nuevamente `Producto.tipoCliente`: descartado por complejidad, migración y posible incompatibilidad con datos existentes.
- Mostrar la pantalla mayorista sin productos: descartado porque no satisface la necesidad de consultar la oferta desde el flujo público.

## Decisión 4: Hacer que el carrito pueda cambiar de contexto sin perder productos

**Decisión**: Ampliar el elemento persistido del carrito con los dos precios disponibles y el contexto activo. Al cambiar de contexto, se recalcula el precio visible y el total usando el precio correspondiente. Los carritos antiguos que solo tengan el precio anterior se migrarán de forma compatible y quedarán sujetos a la validación final del servidor.

**Razonamiento**: `store/appStore.ts` persiste actualmente `selectedProducts` con un único `precio`; cambiar la vista sin actualizar ese precio produciría totales engañosos. La ampliación es local al navegador y no requiere un cambio de esquema.

**Alternativas consideradas**:

- Mantener el precio antiguo hasta confirmar: descartado porque el usuario podría revisar un total que ya no corresponde al contexto activo.
- Vaciar el carrito al cambiar de contexto: descartado porque contradice la continuidad solicitada y penaliza la navegación.

## Decisión 5: Validar el precio vigente en el servidor antes de confirmar

**Decisión**: `procesarCompra` recibirá el contexto seleccionado, volverá a consultar los productos y verificará inventario y precio por línea antes de crear `Transaccion` y `DetalleCompra`. El precio guardado en cada detalle será el precio resuelto en el servidor, no un valor confiado del navegador.

**Razonamiento**: La acción actual ya usa una transacción Prisma para inventario y pedido, pero acepta `precio` desde el carrito. La constitución exige validar entradas y conservar consistencia de importes e inventario; esta feature también exige detectar cambios antes de confirmar.

**Alternativas consideradas**:

- Confiar solamente en el precio del carrito: descartado por riesgo de desactualización y por incumplir FR-008.
- Crear un checkout mayorista separado: descartado porque duplicaría la superficie y las reglas operativas.

## Decisión 6: Mantener el alcance en la superficie pública

**Decisión**: El cambio abarcará la entrada pública, catálogo, detalle, navegación compartida, carrito y validación del checkout. No modificará `/admin`, `/venta-rapida`, autenticación administrativa, pasarelas, WhatsApp ni el esquema Prisma.

**Razonamiento**: La constitución separa e-commerce, panel y vista rápida. La solicitud pide simplificar la aplicación principal, no cambiar las responsabilidades operativas ni registrar nuevas ventas.
