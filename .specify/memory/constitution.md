# Constitución de Venuti's Gourmet

## Principios fundamentales

### I. Separación de las tres aplicaciones

El sistema se gobierna como tres superficies relacionadas, pero con responsabilidades
explícitas: el e-commerce atiende la compra pública; el panel administrativo gestiona
la operación interna; y la vista rápida (`/venta-rapida`) facilita la preparación de
pedidos ágiles y su coordinación por WhatsApp. Cada cambio debe indicar qué superficie
afecta y respetar sus límites de acceso, datos y flujo. La vista rápida no se convertirá
en un panel administrativo ni en un checkout persistente por accidente. Esta separación
reduce ambigüedades, evita accesos indebidos y permite evolucionar cada flujo con
criterios verificables.

### II. Fuente única y consistencia operacional

PostgreSQL, accedido mediante Prisma, es la fuente de verdad para catálogo, clientes,
pedidos, pagos e inventario. Toda escritura persistente debe ejecutarse en el servidor,
validar sus entradas y conservar las invariantes del dominio. Las operaciones que
confirmen una venta y afecten inventario deben ser atómicas; las modificaciones del
esquema deben incluir una migración revisable. Si `/venta-rapida` pasa de preparar un
mensaje a registrar ventas, deberá reutilizar las mismas reglas de pedido, pago e
inventario y definir su comportamiento de forma explícita. El objetivo es que el stock,
los pedidos y los importes representen el estado real del negocio.

### III. Seguridad, privacidad y control administrativo

Las rutas y acciones administrativas requieren autenticación y autorización del lado
del servidor; ninguna decisión de seguridad puede depender solo de la interfaz. Las
credenciales, claves de terceros y datos de conexión se mantienen en variables de
entorno ignoradas por Git y nunca se imprimen ni se incorporan al código. Los formularios
y Server Actions deben validar y normalizar los datos antes de acceder a la base de
datos, y el sistema debe limitar la exposición de datos personales y de pago a lo
necesario para cada operación. Esta disciplina protege al negocio, a sus clientes y al
canal operativo interno.

### IV. Calidad verificable y cambios trazables

Toda funcionalidad significativa debe tener criterios de aceptación y pruebas
proporcionales al riesgo, con especial atención a checkout, inventario, autenticación,
precios, pagos y cambios de estado. Las reglas de negocio deben probarse sin depender
de datos de producción; las migraciones deben revisarse junto con sus efectos sobre
datos existentes. Antes de integrar cambios se ejecutarán las validaciones disponibles
del proyecto, como lint, compilación y pruebas relevantes, y se documentarán las
limitaciones de cualquier verificación omitida. Así, una compilación exitosa no se
confunde con evidencia suficiente de un flujo de negocio correcto.

### V. Simplicidad, experiencia móvil y canales reales

La experiencia pública debe ser clara y usable en dispositivos móviles, con precios,
disponibilidad, selección y estado del pedido visibles sin depender de suposiciones del
usuario. WhatsApp puede mantenerse como canal de coordinación cuando el flujo lo
requiera, pero no se añadirán pasarelas de pago, webhooks, integraciones o capas de
complejidad sin una necesidad de negocio documentada. Se preferirán soluciones pequeñas
que reutilicen el modelo y los servicios existentes, preserven la trazabilidad y
permitan retirar una decisión futura sin migraciones innecesarias.

## Restricciones del sistema y del dominio

- La aplicación usa Next.js con App Router, React, TypeScript estricto, PostgreSQL y
  Prisma. Los cambios deben respetar las convenciones existentes antes de introducir
  una nueva biblioteca o una nueva capa arquitectónica.
- El catálogo público, el checkout, el panel administrativo y la vista rápida deben
  compartir las reglas del dominio sin compartir indebidamente sus permisos o su
  presentación.
- Los importes pueden expresarse en dólares estadounidenses y bolívares; cuando una
  operación use tasa de cambio, la tasa aplicada debe quedar asociada al pedido o al
  pago para conservar su contexto histórico.
- En el comportamiento actual, `/venta-rapida` consulta productos disponibles,
  calcula totales y prepara un pedido para WhatsApp; no crea una `Transaccion` ni
  descuenta inventario. Cualquier cambio de ese comportamiento requiere una
  especificación propia, pruebas y una revisión de sus efectos operativos.
- El panel administrativo es interno y protegido. No se habilitarán registros,
  permisos, accesos públicos ni integraciones de identidad adicionales sin una decisión
  documentada y una revisión de seguridad.
- Los secretos de PostgreSQL, autenticación, almacenamiento de imágenes y servicios
  externos solo se configuran localmente o en el proveedor de despliegue; nunca se
  versionan valores reales.

## Flujo de trabajo y puertas de calidad

1. Cada funcionalidad relevante comienza con una especificación que delimita objetivo,
   actores, superficie afectada, datos, invariantes y criterios de aceptación.
2. Antes de implementar, se revisan las dependencias entre e-commerce, panel
   administrativo y vista rápida, especialmente cuando el cambio afecta inventario,
   pedidos, pagos, autenticación o WhatsApp.
3. Los cambios de esquema se acompañan de migración, regeneración de Prisma y una
   validación contra una base de datos de desarrollo aislada. Nunca se usan datos reales
   para probar una migración destructiva o incompleta.
4. La revisión verifica seguridad del servidor, validación de entradas, accesibilidad y
   usabilidad móvil cuando corresponda, además de pruebas unitarias o de integración
   para las reglas modificadas.
5. Antes de entregar, se ejecutan los comandos de calidad disponibles en el proyecto,
   al menos lint y compilación cuando el cambio los afecte, y se revisa el diff para
   detectar secretos, cambios fuera de alcance o documentación desactualizada.

## Gobernanza

Esta constitución define las reglas de diseño y entrega del proyecto y prevalece sobre
convenciones informales que las contradigan. Toda enmienda debe describir el motivo,
los principios afectados, las consecuencias para las tres aplicaciones y cualquier
migración o trabajo de adopción necesario. La enmienda se incorpora con un cambio
revisable en este archivo y actualiza el informe de impacto mientras permanece en
revisión.

La versión usa SemVer: MAJOR para eliminar o redefinir de forma incompatible un
principio; MINOR para añadir un principio o ampliar materialmente una obligación; y
PATCH para aclaraciones, correcciones de redacción o ajustes sin cambio semántico.
Toda revisión de una funcionalidad debe comprobar el cumplimiento de esta constitución.
Una excepción requiere justificar su alcance, riesgo, responsable y fecha de revisión;
no puede convertirse en una práctica implícita por repetición.

TODO(RATIFICATION_DATE): Confirmar si 2026-10-07 corresponde a la fecha formal de
ratificación de esta constitución.

**Versión**: 1.0.0 | **Ratificada**: 2026-10-07 | **Última enmienda**: 2026-10-07
