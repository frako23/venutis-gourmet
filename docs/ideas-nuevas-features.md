# Ideas de nuevas funcionalidades para Venuti's Gourmet

Este documento propone funcionalidades que pueden resolver problemas operativos y comerciales de Venuti's Gourmet, tomando como base el catálogo, checkout, inventario, clientes, pagos, fidelidad, reseñas y punto de venta actuales.

## Priorización recomendada

| Prioridad | Funcionalidad | Problema | Impacto |
| --- | --- | --- | --- |
| Alta | Integrar punto de venta con inventario | Las ventas por WhatsApp no quedan registradas ni descuentan stock | Control real de existencias |
| Alta | Alertas de inventario | Riesgo de quiebres de stock | Menos ventas incumplidas |
| Alta | Estados y seguimiento de pedidos | Falta de visibilidad del proceso | Mejor coordinación y experiencia |
| Alta | Dashboard de indicadores | Falta de métricas consolidadas | Mejores decisiones |
| Media | Reservas y preventa | Productos artesanales pueden agotarse | Mejor planificación |
| Media | CRM y segmentación | Se desaprovecha la información de clientes | Más recompra |
| Media | Delivery por zona | El costo de entrega no está integrado completamente | Márgenes controlados |
| Baja | Programa de referidos | La adquisición depende de canales manuales | Crecimiento orgánico |
| Baja | Suscripciones | Clientes frecuentes repiten todo el proceso | Mayor recurrencia |

## 1. Integrar el punto de venta con pedidos e inventario

### Problema

La ruta /venta-rapida genera una orden para WhatsApp, pero actualmente no crea una Transaccion, no registra el pago y no descuenta inventario. Esto puede producir diferencias entre el stock real y el stock mostrado.

### Propuesta

Agregar un cierre de venta que permita seleccionar o registrar al cliente, elegir método de pago, confirmar el pedido, crear la transacción desde el servidor, descontar inventario de forma atómica y generar un comprobante.

Se puede mantener el envío del resumen por WhatsApp como canal de comunicación.

### Implementación sugerida

Reutilizar procesarCompra de lib/actions/checkout.ts o extraer su lógica común a una acción de ventas. El carrito de PuntoDeVenta debe convertirse al formato de CheckoutData.

### Indicadores

- Porcentaje de ventas del punto de venta registradas.
- Diferencia entre inventario físico e inventario del sistema.
- Tiempo promedio para completar una venta.

## 2. Alertas y niveles mínimos de inventario

### Problema

El sistema guarda inventario, pero no existe un umbral configurable ni una alerta temprana para productos próximos a agotarse.

### Propuesta

Agregar stock mínimo, stock ideal, estados disponible/bajo/agotado, alertas en el panel y filtros de productos con inventario bajo. También se podrían enviar avisos por correo o WhatsApp al equipo.

### Implementación sugerida

Añadir stockMinimo al modelo Producto y crear consultas de inventario bajo. El catálogo y el punto de venta deben respetar el estado de agotado.

### Indicadores

- Número de quiebres de stock.
- Productos agotados por período.
- Tiempo entre alerta y reposición.

## 3. Estados completos y seguimiento de pedidos

### Problema

El modelo actual contempla pagado, pendiente y cancelado, pero no representa preparación, despacho y entrega.

### Propuesta

Ampliar el ciclo con estados como pago confirmado, en preparación, listo para recoger, enviado, entregado y cancelado. El cliente podría consultar su pedido mediante el número de orden.

### Implementación sugerida

Extender EstadoTransaccion y crear un historial de cambios de estado. Enviar notificaciones cuando el pedido avance.

### Indicadores

- Tiempo desde compra hasta entrega.
- Tiempo promedio de preparación.
- Pedidos retrasados.
- Porcentaje de cancelaciones.

## 4. Dashboard de indicadores del negocio

### Problema

La sección de transacciones muestra datos operativos, pero no ofrece una visión consolidada de ventas, productos y clientes.

### Propuesta

Incluir ventas por período, ticket promedio, productos y categorías más vendidas, métodos de pago, clientes nuevos y recurrentes, margen estimado y ventas por canal.

### Implementación sugerida

Crear consultas agregadas con Prisma y gráficos con Recharts. Agregar filtros por fecha, categoría, canal y tipo de cliente.

### Indicadores

- Ingresos.
- Ticket promedio.
- Tasa de recompra.
- Margen por producto.
- Conversión del catálogo al checkout.

## 5. Gestión de producción y preventa

### Problema

Los productos artesanales pueden depender de producción previa, disponibilidad limitada o fechas específicas.

### Propuesta

Agregar calendario de producción, cupos diarios, fecha estimada de disponibilidad, tiempo de preparación, bloqueo al alcanzar capacidad y preventa para productos próximos a elaborarse.

### Implementación sugerida

Crear entidades para lotes o jornadas de producción relacionadas con productos. Al confirmar una compra, reservar capacidad además de descontar inventario.

### Indicadores

- Desperdicio de producción.
- Pedidos entregados a tiempo.
- Utilización de capacidad.
- Ventas perdidas por falta de disponibilidad.

## 6. CRM y segmentación de clientes

### Problema

La aplicación almacena clientes, historial de compras y puntos, pero todavía puede aprovechar mejor esa información.

### Propuesta

Crear segmentos como cliente nuevo, frecuente, inactivo, mayorista, de alto valor o con preferencia por categoría. Permitir campañas dirigidas y notas internas.

### Implementación sugerida

Calcular segmentos usando Cliente, Transaccion, DetalleCompra y Fidelidad. Agregar consentimiento para comunicaciones y fecha de última compra.

### Indicadores

- Tasa de recompra.
- Valor de vida del cliente.
- Clientes reactivados.
- Ingresos por segmento.

## 7. Promociones, cupones y precios programados

### Problema

El sistema maneja precios detal y mayorista, pero no campañas, descuentos temporales ni reglas promocionales.

### Propuesta

Agregar cupones, promociones por categoría, combos, descuentos por volumen, precios por fecha y compra mínima para envío gratis.

### Implementación sugerida

Crear modelos Promocion, Cupon y PromocionProducto. Guardar el descuento aplicado en Transaccion para conservar el histórico.

### Indicadores

- Uso de cupones.
- Incremento del ticket promedio.
- Margen después de descuentos.
- Ventas generadas por campaña.

## 8. Delivery por zonas

### Problema

El sistema permite direcciones y tipo de retiro, pero el costo de delivery no está integrado completamente al pedido.

### Propuesta

Agregar zonas, tarifas, pedido mínimo, días y horarios de cobertura, tiempo estimado, repartidor y estado de entrega.

### Implementación sugerida

Crear ZonaEntrega y relacionarla con la dirección o selección del checkout. Guardar el costo aplicado dentro de Transaccion.

### Indicadores

- Costo promedio de entrega.
- Margen neto por zona.
- Entregas a tiempo.
- Cancelaciones por costo de delivery.

## 9. Reservas temporales de inventario

### Problema

Entre la consulta del catálogo y la confirmación del checkout, otro cliente puede comprar las últimas unidades.

### Propuesta

Reservar temporalmente el inventario durante el checkout, con vencimiento automático. La confirmación convierte la reserva en venta y la expiración la libera.

### Implementación sugerida

Crear una tabla de reservas con producto, cantidad, cliente, expiración y estado.

### Indicadores

- Pedidos fallidos por falta de stock.
- Reservas expiradas.
- Conversión de reservas a compras.

## 10. Notificaciones automáticas

### Problema

El seguimiento depende de consultas manuales del cliente o del equipo.

### Propuesta

Enviar notificaciones por correo o WhatsApp para confirmación de pedido, pago, cambios de estado, pedido listo, envío, solicitud de reseña, carrito abandonado e inventario bajo.

### Implementación sugerida

Crear eventos de dominio y procesar notificaciones de forma asíncrona. Guardar el estado de cada notificación para evitar duplicados.

### Indicadores

- Recuperación de carritos abandonados.
- Reseñas obtenidas.
- Tiempo de respuesta del cliente.
- Tasa de entrega de mensajes.

## 11. Programa de referidos

### Problema

La fidelidad recompensa compras, pero no incentiva que los clientes atraigan nuevos compradores.

### Propuesta

Asignar a cada cliente un código de referido y entregar puntos o beneficios al referente y al nuevo cliente después de una compra válida.

### Implementación sugerida

Agregar códigos únicos, relación entre referente y referido, reglas antifraude y límites por período.

### Indicadores

- Clientes nuevos por referidos.
- Costo de adquisición.
- Conversión de códigos.
- Ingresos generados.

## 12. Suscripciones y pedidos recurrentes

### Problema

Los clientes frecuentes deben repetir manualmente la selección y coordinación de sus pedidos.

### Propuesta

Permitir pedidos semanales, quincenales o mensuales para pastas, salsas, combos y clientes mayoristas.

### Implementación sugerida

Crear plantillas con frecuencia, fecha próxima, productos y dirección. Cada generación debe requerir confirmación o autorización explícita de pago.

### Indicadores

- Ingresos recurrentes.
- Cancelación.
- Retención.
- Ticket promedio recurrente.

## Plan de implementación recomendado

### Fase 1: control operativo

1. Integrar punto de venta con pedidos e inventario.
2. Agregar estados de pedido.
3. Implementar stock mínimo y alertas.
4. Registrar el canal de venta.
5. Centralizar el uso de PrismaClient.

### Fase 2: visibilidad y rentabilidad

1. Dashboard de indicadores.
2. Costos de delivery por zona.
3. Promociones y cupones.
4. Reportes de margen y productos más vendidos.

### Fase 3: crecimiento

1. CRM y segmentación.
2. Notificaciones automáticas.
3. Programa de referidos.
4. Recuperación de carritos abandonados.
5. Suscripciones y pedidos recurrentes.

### Fase 4: planificación avanzada

1. Producción por lotes y capacidad.
2. Reservas temporales de inventario.
3. Pronóstico de demanda.
4. Integración con contabilidad o facturación.

## Recomendación inicial

La primera funcionalidad recomendada es integrar el punto de venta rápido con las transacciones e inventario. Actualmente existe una brecha entre las ventas gestionadas por WhatsApp y la información almacenada en el sistema. Resolverla mejoraría inmediatamente la confiabilidad del stock, los reportes y la medición real del negocio.

Después conviene agregar alertas de inventario y estados operativos del pedido, porque reducen errores internos y mejoran la experiencia del cliente sin requerir cambios importantes en el catálogo público.

