# Investigación y decisiones: Checkout directo desde Venta Rápida

## Alcance revisado

La implementación actual de `/venta-rapida` consulta productos disponibles y mantiene
un carrito local dentro de `PuntoDeVenta`. Su única salida es `mensajeWhatsapp`, por lo
que no crea cliente, dirección, `Transaccion`, `Pago` ni descuento de inventario.

El checkout público existente está repartido entre `app/finalizar-compra`,
`components/finalizar-compra`, `store/appStore.ts` y `lib/actions/checkout.ts`. Ya
resuelve clientes por teléfono, direcciones por zona, métodos de pago, registro de
detalles, pago, fidelidad, inventario y la confirmación de la orden. El registro de
la venta actual no conserva cargo ni snapshot de dirección, y la acción acepta del
navegador el total y el estado `pagado` sin distinguir cobro declarado de cobro
confirmado.

## Decisión 1: Reutilizar el checkout existente

**Decision**: El botón directo de `/venta-rapida` adaptará el carrito local al formato
del `appStore` y navegará al checkout público existente.

**Rationale**: Evita duplicar los pasos de cliente, entrega, pago, confirmación y
limpieza de carrito. Mantiene una sola fuente de reglas para e-commerce y venta rápida.

**Alternatives considered**:

- Crear un segundo formulario dentro de `PuntoDeVenta`: rechazado porque duplicaría
  validaciones y produciría diferencias con `/finalizar-compra`.
- Crear un endpoint o servicio nuevo: rechazado porque la aplicación ya tiene una
  acción de checkout y la constitución exige proporcionalidad.

## Decisión 2: Validación final y cálculo en servidor

**Decision**: `procesarCompra` recibirá identificadores, cantidades, contexto, entrega,
pago y clave de idempotencia, pero recalculará precios, subtotal, delivery y total a
partir de catálogo, zonas y datos de pago válidos.

**Rationale**: Los valores del navegador son editables. La acción ya consulta stock y
precio vigente; el diseño extiende esa protección a la entrega, total, cliente,
dirección y método de pago.

**Alternatives considered**:

- Confiar en `montoTotal`, `deliveryPrice` y precio enviados por el navegador:
  rechazado por riesgo de cobro incorrecto, stock inconsistente y datos manipulados.
- Recalcular solo en el cliente: rechazado por la misma razón.

## Decisión 3: Snapshot de delivery en la venta

**Decision**: La venta conservará la zona, alias y dirección detallada usadas al
confirmar, además del cargo de delivery. El cliente mantendrá su relación con la
dirección para futuras compras, pero la confirmación y el panel leerán primero el
snapshot de la venta.

**Rationale**: La dirección del cliente puede editarse o eliminarse después. Consultar
la primera dirección actual, como hace hoy la confirmación, puede mostrar una entrega
distinta de la que se compró.

**Alternatives considered**:

- Guardar solo `direccionId`: rechazado porque no conserva el histórico si la dirección
  cambia y no permite interpretar una venta antigua de forma independiente.
- No guardar delivery en la venta: rechazado porque impide auditar el total y preparar
  la entrega.

## Decisión 4: Estados operativos de pago

**Decision**: El pedido directo con efectivo inicia `por_cobrar`; un método digital con
datos declarados inicia `en_pedido`. Ninguno inicia `pagado` sin confirmación explícita
del negocio. El equipo conserva las transiciones existentes en el panel.

**Rationale**: Un formulario enviado prueba que el cliente declaró un pago, no que el
negocio recibió o verificó el dinero. Esta decisión aprovecha los estados ya presentes
en `EstadoTransaccion` y la regla administrativa de confirmación de pago.

**Alternatives considered**:

- Marcar siempre `pagado`, como hace actualmente `procesarCompra`: rechazado porque
  confunde declaración con cobro confirmado.
- Crear un enum o flujo de estados nuevo: rechazado porque los estados operativos
  existentes ya cubren por cobrar, en pedido y pagado.

## Decisión 5: Idempotencia de confirmación

**Decision**: Cada intento de confirmación directa tendrá una `claveIdempotencia`
única persistida en la venta. Si la misma clave llega de nuevo, la acción devolverá la
venta ya creada y no repetirá sus efectos.

**Rationale**: La confirmación puede repetirse por doble clic, recarga o respuesta de
red ambigua. Una transacción de base de datos por sí sola no evita dos transacciones
separadas.

**Alternatives considered**:

- Deshabilitar el botón solamente en la interfaz: rechazado porque no protege contra
  reintentos de red ni múltiples pestañas.
- Buscar por teléfono y hora: rechazado porque puede unir pedidos legítimos.

## Decisión 6: Métodos y datos de pago

**Decision**: Se conservan los cuatro métodos actualmente expuestos por el checkout:
Pago Móvil, Zelle, Transferencia Bs y Efectivo USD. Las instrucciones provienen de la
configuración actual; el registro conserva método, importes, fecha, tasa y referencia
cuando aplique. El monto mostrado siempre incluye delivery.

**Rationale**: Reutiliza la información de pago existente sin añadir una pasarela,
subida de comprobantes o integración bancaria.

**Alternatives considered**:

- Exponer también `TransferenciaUsd` porque existe en el enum: rechazado para esta
  versión, ya que no está configurado en la UI ni en los datos de instrucciones.
- Crear un proveedor externo de pagos: rechazado por alcance y constitución.

## Decisión 7: Dirección nueva y pedido

**Decision**: Se conserva el flujo actual de guardar una dirección para el cliente,
pero la acción final debe verificar que la dirección seleccionada pertenece al cliente
y copiar sus datos a la venta. La dirección nueva se valida con una zona configurada
antes de permitir el paso de pago.

**Rationale**: Permite reutilizar el gestor de direcciones existente y mantiene el
catálogo de zonas en un solo lugar, sin permitir que un cliente envíe el ID de otra
persona o un precio de delivery inventado.

**Alternatives considered**:

- Aceptar dirección y cargo completos solo desde el navegador: rechazado por
  manipulación y por no verificar pertenencia.
- Crear una dirección dentro de la misma transacción final sin conservar el gestor
  existente: posible, pero agrega una ruta de datos duplicada sin valor para esta
  entrega.

## Riesgos y controles

- **Base remota inaccesible**: validar esquema y pruebas contra PostgreSQL local
  aislado; no usar la base configurada en `.env` para fixtures.
- **Cambios de precio o stock**: volver a consultar producto y actualizar inventario
  dentro de la misma transacción.
- **Dirección mutable**: guardar snapshot estructurado en `Transaccion`.
- **Respuesta de red ambigua**: clave de idempotencia única y búsqueda de la venta
  existente.
- **Confusión de pago confirmado**: estados `por_cobrar`/`en_pedido` y confirmación
  administrativa existente.
- **Regresión del canal WhatsApp**: prueba que el canal no toca persistencia ni stock.

## Clarificaciones pendientes

No quedan marcadores `NEEDS CLARIFICATION`: las decisiones anteriores resuelven los
desconocidos técnicos y de alcance con base en la especificación, la constitución y
el comportamiento actual del proyecto.
