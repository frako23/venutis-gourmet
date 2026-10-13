# Research: Panel administrativo integral

## Alcance y evidencia del repositorio

La revisión de `prisma/schema.prisma`, `docs/descripcion-tecnica.md`, las rutas de
`app/admin` y las acciones de `lib/actions` confirma que el sistema ya registra
`Transaccion`, `DetalleCompra`, `Pago`, `Cliente` y `Producto`. El checkout crea la
transacción, registra el pago y descuenta inventario dentro de una transacción Prisma.
El panel actual tiene inventario y transacciones, pero la alta administrativa de
transacciones todavía no persiste una venta completa y las rutas existentes no
ofrecen filtros, historial de estados, analíticas ni notas de entrega.

## Decisión 1: reutilizar `Transaccion` como venta y pedido

**Decision**: No se crea una entidad paralela `Venta`. La venta manual, el pedido del
checkout y la fila mostrada en la nueva hoja operativa continuarán representados por
`Transaccion`, con `DetalleCompra` como sus líneas.

**Rationale**: Evita duplicar importes, inventario, clientes, pagos y relaciones de
fidelidad. También permite que las analíticas incluyan tanto compras del checkout como
ventas manuales usando una misma fuente de verdad.

**Alternatives considered**:

- Crear `Venta` separada: descartado porque exigiría sincronizarla con
  `Transaccion`, duplicaría el historial y elevaría el riesgo de reportes divergentes.
- Convertir `/venta-rapida` en el origen de ventas persistentes: descartado porque la
  constitución mantiene esa superficie como preparación y coordinación por WhatsApp.

## Decisión 2: mantener compatibilidad con estados históricos

**Decision**: Añadir los estados operativos `por_cobrar` y `en_pedido` al enum actual,
conservar `pagado`, `pendiente` y `cancelado`, y tratar `pendiente` como estado legado
que se presenta como “Por cobrar”. `cancelado` permanece consultable como excepción
histórica y no se ofrece como estado operativo nuevo.

**Rationale**: La base actual ya contiene `pagado`, `pendiente` y `cancelado`. Eliminar
o renombrar valores del enum puede romper datos existentes y migraciones. Conservarlos
permite una migración aditiva y deja visible el significado histórico.

**Alternatives considered**:

- Reemplazar el enum completo y convertir todos los registros: descartado por el
  riesgo de una migración destructiva y por la necesidad de auditar cada conversión.
- Usar solo etiquetas de presentación sin añadir estados persistentes: descartado
  porque “En pedido” debe poder filtrarse, auditarse y consultarse de forma estable.

## Decisión 3: importes canónicos en USD y tasa histórica

**Decision**: Mantener `Transaccion.montoTotal` como total canónico en USD para
compatibilidad con checkout y analíticas. Añadir subtotal, tipo/valor de descuento,
importe descontado y una tasa de cambio de la operación. Los valores en bolívares se
calculan o registran usando esa tasa; nunca se reemplaza una tasa histórica por la
tasa actual.

**Rationale**: El checkout actual calcula precios y totales en USD, mientras `Pago`
conserva montos en USD/Bs y la tasa usada. Un total canónico evita mezclar monedas en
las agregaciones; guardar el contexto de la tasa permite explicar el descuento en USD
cuando la presentación sea en bolívares.

**Alternatives considered**:

- Guardar solo el monto mostrado en cada moneda: descartado porque dificulta
  comparar periodos y puede producir doble conteo.
- Migrar inmediatamente todos los importes `Float` a `Decimal`: reservado para una
  iniciativa financiera separada; la feature mantiene el tipo existente, redondea en
  límites de entrada/salida y cubre los cálculos con pruebas de centavos.

## Decisión 4: cálculo de descuentos en un módulo puro

**Decision**: Centralizar subtotal, descuento porcentual, descuento USD, conversión,
redondeo y total final en funciones puras de `lib/admin/sales-calculations.ts`. El
servidor vuelve a ejecutar estas funciones antes de persistir.

**Rationale**: La interfaz puede mostrar un resumen inmediato, pero la decisión de
negocio no puede depender de valores enviados por el navegador. Un módulo puro se
puede probar con casos límite y evita que tabla, formulario y Server Action calculen
totales distintos.

**Alternatives considered**:

- Calcular solo en React: descartado por seguridad y por riesgo de manipulación.
- Repartir la fórmula entre varias Server Actions: descartado porque dificultaría
  mantener invariantes y pruebas.

## Decisión 5: venta manual atómica con validación de inventario

**Decision**: Registrar la venta manual, sus detalles, descuento, pago opcional,
historial inicial de estado y decremento de inventario en una única transacción de
base de datos. La actualización de cada producto debe comprobar que la cantidad
disponible sigue siendo suficiente; si una línea falla, se revierte toda la operación.

**Rationale**: La constitución exige consistencia entre ventas e inventario. La
comprobación debe repetirse dentro de la transacción porque el stock puede cambiar
entre la carga del formulario y la confirmación.

**Alternatives considered**:

- Guardar primero la venta y ajustar inventario después: descartado porque deja
  estados parciales.
- Confiar solo en el stock mostrado en el formulario: descartado porque no protege
  contra dos operaciones concurrentes.

## Decisión 6: analíticas agregadas y predictor explicable

**Decision**: Las analíticas se calcularán del lado del servidor a partir de
transacciones no canceladas, con filtros de fecha, granularidad y producto. El
predictor inicial será una media móvil explicable: promedio de las últimas cuatro
semanas completas para una predicción semanal y de los últimos tres meses completos
para una predicción mensual. Se mostrará el periodo de referencia y se declarará
“datos insuficientes” si no existe el mínimo histórico requerido.

**Rationale**: El negocio pidió un predictor basado en su histórico, no un modelo
opaco ni una promesa de demanda. Una media móvil se puede explicar, verificar con
datos conocidos y retirar o sustituir posteriormente sin migrar ventas.

**Alternatives considered**:

- Usar una librería de machine learning o un servicio externo: descartado por
  complejidad, dependencia de datos y ausencia de necesidad probada.
- Calcular las analíticas en el navegador con todas las ventas: descartado por
  rendimiento, exposición de datos y dificultad para mantener filtros coherentes.

## Decisión 7: PDF generado localmente

**Decision**: Generar el PDF en una ruta interna del servidor usando una única
dependencia local de propósito específico (`pdf-lib`), con datos previamente
validados y una plantilla propia de la marca. `react-to-print` puede conservarse para
una vista de impresión, pero no será la garantía principal de descarga.

**Rationale**: La especificación exige una descarga repetible y controlada. El diálogo
de impresión del navegador depende de la configuración del usuario y no garantiza un
archivo descargable homogéneo. La generación local evita subir datos de clientes a un
servicio externo y permite controlar encabezados, saltos de página, totales y
observaciones.

**Alternatives considered**:

- Usar únicamente `react-to-print`: descartado como mecanismo principal porque abre
  la impresión del navegador y deja el guardado como PDF a una acción manual.
- Generar el documento en un servicio externo: descartado por privacidad,
  credenciales adicionales y complejidad sin valor operativo.

## Decisión 8: autorización compartida para lecturas y escrituras

**Decision**: Crear una comprobación `requireAdmin` del lado del servidor que reutilice
Stack Auth y `ALLOWED_EMAILS`, y llamarla desde las páginas administrativas sensibles,
Server Actions y ruta PDF. Las mutaciones no dependerán de que el usuario haya visto
una pantalla protegida.

**Rationale**: El layout actual protege la navegación, pero las nuevas acciones de
ventas, estados, notas y PDF deben validar la autorización en su propio límite de
servidor. Esto cumple la constitución sin crear nuevos roles.

**Alternatives considered**:

- Confiar solo en el layout o middleware: descartado porque una Server Action puede
  recibir una invocación directa.
- Añadir un sistema de roles nuevo: descartado porque la feature no define roles
  distintos y el proyecto ya tiene un control administrativo autorizado.

## Decisión 9: rutas existentes como compatibilidad

**Decision**: Mantener `/admin/transactions`, `/admin/transactions/[id]`,
`/admin/add-transaction` e `/admin/inventory`, modernizando su presentación y
comportamiento. Se añadirán `/admin`, `/admin/analytics` y `/admin/delivery-notes` con
sus vistas relacionadas; la navegación mostrará nombres de negocio en español.

**Rationale**: Preserva enlaces y favoritos actuales, reduce migración de rutas y
permite entregar el rediseño por módulos sin duplicar aplicaciones.

**Alternatives considered**:

- Cambiar todos los paths a nombres nuevos en español: descartado porque rompe
  enlaces existentes sin aportar valor funcional.
- Mantener solo la navegación actual: descartado porque no ofrece entradas claras
  para analíticas, notas de entrega y dashboard.
