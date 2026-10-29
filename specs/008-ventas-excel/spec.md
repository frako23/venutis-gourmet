# Feature Specification: Control de ventas desde Excel: carga masiva, tipo de precio y cuentas por cobrar

**Feature Branch**: `008-ventas-excel`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "actualmente mi clienta la dueña de venutis gourmet maneja las ventas en un excel, en esta ruta "C:\Users\frako\Downloads\Ventas PASTAS para la Web.xlsx" esta un ejemplo de las ventas que ella realizó en agosto de este año, quiero adaptar el sitema de ventas y pedidos para que aproveche tanto los beneficios que tiene actualmente como los beneficios de la informacion que viene recopilando en excel, tambien quiero agregar una funcionalidad para carga masiva de ventas con estos archivos en excel"

## User Scenarios & Testing *(mandatory)*

> **Archivo de referencia**: la hoja "VENTAS" del libro de agosto de 2026 ("CONTROL DE VENTAS") tiene una fila por producto vendido con las columnas FECHA, NOTA DE ENTREGA, ORDEN CODIGO, CLIENTE, GRUPO, PRODUCTO, SABOR, CANT X PAQ., TIPO, GR, PVP UND, VENTA, PAGADO, ABONO, DEUDA y X COBRAR. Contiene 54 líneas agrupadas en 27 notas de entrega (de la 1200 a la 1227, sin la 1219), 16 clientes, un total de USD 2.901,05 y una deuda de USD 33,00 (nota 1225). Los tipos usados son MAYOR (37 líneas), DETAL (14) y PROMO (3). Este archivo es el caso de prueba de las historias siguientes.

### User Story 1 - Cargar un archivo de ventas de Excel (Priority: P1)

Como dueña del negocio, quiero subir al panel el archivo de Excel donde llevo el control de ventas y que el sistema lo convierta en pedidos, para no transcribir venta por venta y para que esa información alimente la tabla de ventas, el historial de cada cliente, el panel principal y las analíticas.

**Why this priority**: Es la funcionalidad pedida de forma explícita y la única vía para traer al sistema la información que hoy solo vive en Excel. Sin ella, las demás historias no tienen datos con los que trabajar.

**Independent Test**: La persona sube el archivo de agosto, revisa la vista previa, resuelve los productos y clientes que el sistema no reconoce y confirma. Quedan 27 pedidos numerados de 1200 a 1227 (sin 1219) con un total combinado de USD 2.901,05: 26 en "Pagado" y 1 (nota 1225) en "Por cobrar" con saldo de USD 33,00.

**Acceptance Scenarios**:

1. **Given** un archivo con el formato de "Control de ventas", **When** la persona lo sube, **Then** ve una vista previa agrupada por nota de entrega (número, fecha, cliente, líneas con producto, cantidad, tipo de precio, precio unitario e importe, total y estado de cobro resultante) y un resumen con la cantidad de pedidos, de líneas, el total en USD y el total por cobrar, sin que se haya guardado nada todavía.
2. **Given** la vista previa, **When** una línea tiene un dato inválido (fecha que no es fecha, cantidad o precio no numéricos o menores o iguales a cero, cliente o producto vacíos, tipo distinto de DETAL, MAYOR o PROMO), **Then** la línea se marca con su número de fila, la columna afectada y el motivo, y la confirmación queda bloqueada hasta que se cargue un archivo corregido.
3. **Given** una línea cuyo producto (grupo, producto, sabor y gramaje) no coincide con un producto del catálogo ni con una equivalencia ya guardada, **When** se muestra la vista previa, **Then** el sistema propone el producto del catálogo más parecido o permite elegir uno, y la elección se recuerda para las cargas siguientes.
4. **Given** un nombre de cliente que no coincide con un cliente registrado ni con una equivalencia ya guardada, **When** se muestra la vista previa, **Then** la persona puede vincularlo a un cliente existente o darlo de alta según FR-012, y la decisión se recuerda para las cargas siguientes.
5. **Given** todas las líneas válidas y todos los productos y clientes resueltos, **When** la persona confirma, **Then** cada nota de entrega se convierte en un pedido con ese número, la fecha y el cliente del archivo, sus líneas con el tipo de precio y el precio unitario del archivo, y el estado según lo cobrado (FR-018); el historial de cada pedido registra la carga con la persona responsable, la fecha y el nombre del archivo.
6. **Given** un archivo cuyas notas ya fueron cargadas, **When** la persona lo vuelve a subir, **Then** esas notas aparecen como "Ya registrada" y se omiten; confirmar no crea pedidos duplicados.
7. **Given** la persona confirma la carga, **When** falla el guardado de cualquiera de los pedidos, **Then** no se guarda ningún pedido del archivo y se muestra una notificación con un mensaje comprensible.
8. **Given** pedidos ya importados, **When** la persona consulta la tabla de ventas, el detalle de un cliente, el panel principal o las analíticas del periodo, **Then** los pedidos importados aparecen y suman según su fecha de venta, igual que cualquier otro pedido.

---

### User Story 2 - Registrar el tipo de precio y el precio pactado de cada línea (Priority: P1)

Como persona que registra ventas, quiero indicar en cada línea si el producto se vendió a precio Detal, Mayor o Promo y ajustar el precio unitario pactado, como hago en el Excel, para que el sistema guarde en qué condición se vendió cada producto y las ventas manuales sean comparables con las importadas.

**Why this priority**: En el Excel cada línea lleva su TIPO y su PVP, y un mismo producto se vende a precios distintos según el cliente o la promoción (por ejemplo, el Tortelloni de espinaca al mayor aparece a 7,50, 8,00, 8,75 y 9,25). Sin este dato la carga perdería información y las ventas nuevas no podrían analizarse igual que las históricas.

**Independent Test**: Registrar una venta manual a un cliente mayorista con una línea Mayor (precio propuesto: el mayorista del catálogo), una línea Detal (precio detal del catálogo) y una línea Promo (precio escrito a mano); el detalle del pedido muestra el tipo y el precio de cada línea, y las analíticas del periodo muestran la venta repartida por tipo.

**Acceptance Scenarios**:

1. **Given** una venta manual nueva, **When** la persona agrega un producto, **Then** el tipo de precio se propone según el tipo de cliente (Mayor para mayoristas, Detal para clientes al detal) y el precio unitario se rellena con el precio del catálogo correspondiente, que la persona puede modificar.
2. **Given** una línea con tipo Detal o Mayor, **When** la persona cambia el tipo, **Then** el precio unitario se reemplaza por el precio de catálogo del nuevo tipo.
3. **Given** una línea a la que se asigna el tipo Promo, **When** la persona intenta guardar la venta sin escribir el precio, **Then** el sistema lo impide e indica que el precio de promoción es obligatorio.
4. **Given** un pedido guardado, **When** la persona abre su detalle, **Then** cada línea muestra su tipo de precio, su precio unitario y su importe.
5. **Given** un pedido hecho en la tienda web, **When** se guarda, **Then** sus líneas registran Detal si se compró en el contexto de consumidor y Mayor si se compró en el contexto de mayorista, sin intervención de la persona.
6. **Given** pedidos de un periodo con líneas de distintos tipos, **When** la persona consulta las analíticas de ventas de ese periodo, **Then** ve el importe y las unidades vendidas desglosados por Detal, Mayor y Promo, sin contar pedidos cancelados.

---

### User Story 3 - Registrar abonos y conocer lo que se debe (Priority: P2)

Como dueña del negocio, quiero registrar abonos parciales a un pedido y ver cuánto debe cada pedido y cada cliente, para reemplazar las columnas ABONO, DEUDA y X COBRAR de mi Excel y saber a quién cobrar.

**Why this priority**: El seguimiento de cobros es uno de los usos centrales del Excel. Hoy el panel solo distingue "Por cobrar" de "Pagado", muestra un único pago por pedido y no dice cuánto falta por cobrar. Depende de que existan pedidos (Historias 1 y 2), pero el negocio puede empezar a usarlos sin esta historia.

**Independent Test**: Sobre un pedido "Por cobrar" de USD 33,00, la persona registra un abono de USD 20,00: el saldo queda en USD 13,00, el pedido sigue "Por cobrar" y el resumen de cuentas por cobrar muestra al cliente con USD 13,00 de deuda. Registra luego un abono de USD 13,00: el saldo llega a 0, el pedido pasa a "Pagado" y el cliente desaparece de las cuentas por cobrar.

**Acceptance Scenarios**:

1. **Given** un pedido en "Por cobrar" o "En pedido" con saldo mayor que cero, **When** la persona registra un abono con monto (en USD, o en Bs con la tasa del día), método de pago, referencia opcional y fecha, **Then** el abono se suma a lo abonado y el saldo pasa a ser el total menos la suma de los abonos.
2. **Given** un pedido con saldo de USD 13,00, **When** la persona intenta registrar un abono mayor que el saldo, igual a cero o negativo, **Then** el sistema lo rechaza con un mensaje que indica el saldo pendiente.
3. **Given** un pedido con saldo pendiente, **When** un abono deja el saldo en cero, **Then** el pedido pasa a "Pagado" en la misma operación y el historial registra el cambio con la persona responsable y el motivo "Saldado con abonos".
4. **Given** un pedido, **When** la persona abre su detalle, **Then** ve todos sus abonos (fecha, monto, método y referencia), el total abonado y el saldo pendiente.
5. **Given** la tabla de "Ventas y pedidos", **When** la persona la consulta, **Then** cada pedido muestra lo abonado y el saldo, y puede filtrar los pedidos con saldo pendiente.
6. **Given** pedidos con saldo pendiente de varios clientes, **When** la persona abre el resumen de cuentas por cobrar, **Then** ve el total por cobrar del negocio y, por cliente, su deuda, la cantidad de pedidos pendientes y la fecha del pedido pendiente más antiguo, ordenados de mayor a menor deuda.
7. **Given** un abono registrado por error en un pedido que no está "Pagado", **When** la persona lo anula, **Then** el saldo se recalcula y el historial del pedido registra la anulación con la persona responsable y la fecha.

---

### User Story 4 - Descargar el control de ventas con el formato del Excel (Priority: P3)

Como dueña del negocio, quiero descargar las ventas de un periodo con las mismas columnas de mi Excel, para seguir haciendo mis análisis habituales mientras el sistema pasa a ser el registro oficial de las ventas.

**Why this priority**: Facilita la transición: la dueña conserva su herramienta de análisis sin volver a llevar el registro a mano. El negocio puede operar sin esta historia.

**Independent Test**: Tras importar el archivo de agosto, la persona descarga el control de ventas de agosto: el archivo tiene las columnas del formato de carga, 54 líneas, un total de USD 2.901,05 y una deuda de USD 33,00; al volver a subirlo, todas las notas aparecen como "Ya registrada".

**Acceptance Scenarios**:

1. **Given** pedidos en un periodo, **When** la persona descarga el control de ventas de ese periodo, **Then** obtiene un archivo de Excel con una fila por línea de pedido y las columnas del formato de carga, con VENTA, ABONO, DEUDA y X COBRAR calculados.
2. **Given** pedidos cancelados en el periodo, **When** la persona descarga el control de ventas, **Then** esos pedidos no aparecen en el archivo.
3. **Given** un archivo descargado del sistema, **When** la persona lo vuelve a subir sin cambios, **Then** no se crea ningún pedido.

---

### Edge Cases

- **Estructura de la hoja**: el título "CONTROL DE VENTAS" ocupa la primera fila, los encabezados la segunda, la columna A está vacía y algunos encabezados tienen saltos de línea ("CANT\nX PAQ."). Los encabezados se reconocen por su nombre, sin importar mayúsculas, acentos, saltos de línea, espacios ni posición. Si falta una columna obligatoria, se informa cuál y no se muestra la vista previa.
- **Varias hojas**: el libro trae una hoja "VENTAS" con datos y una "Hoja1" vacía. Se usa la primera hoja que tenga los encabezados reconocibles; si ninguna los tiene, se informa.
- **Filas vacías con fórmulas**: la última fila del archivo de muestra tiene fórmulas pero no datos. Las filas sin fecha, nota, cliente ni producto se ignoran sin reportarse como error.
- **Texto inconsistente**: espacios sobrantes ("ARAGITXA ", "RAVIOLI "), mayúsculas y acentos ("CHAMPIÑON", "CHACÓN") no impiden reconocer clientes ni productos.
- **Columnas calculadas**: VENTA, DEUDA y X COBRAR se recalculan, no se leen. Si la VENTA del archivo no coincide con CANT × PVP, la línea se marca con una advertencia (no bloqueante) y se usa CANT × PVP.
- **Nota inconsistente**: si las líneas de una misma nota tienen fechas o clientes distintos, la nota se marca con un error bloqueante, porque una nota corresponde a un solo pedido.
- **Producto repetido en una nota**: la nota 1212 tiene dos líneas del mismo producto con precios distintos (8,00 y 7,50). Se conservan como líneas separadas, cada una con su precio.
- **Numeración y orden**: las notas no consecutivas (falta la 1219) o con fechas fuera de orden (la 1213 es del 13 de agosto y la 1212 del 17) no son errores.
- **Nota sin número**: una línea sin número de nota es un error bloqueante, porque el número es lo que evita duplicados al recargar.
- **Número ya usado por otra venta**: si una nota del archivo tiene el número de un pedido existente pero con otro cliente, otra fecha u otro total, se marca como conflicto bloqueante y se muestra el pedido existente, para que la persona corrija el número en el archivo.
- **Valores de PAGADO**: "SI", "Si", "sí" y "NO", "no " se reconocen sin importar mayúsculas, acentos ni espacios. Una celda vacía se trata como "NO" y se marca con una advertencia.
- **Cobro parcial dentro de una nota**: si una nota mezcla líneas pagadas y no pagadas, o tiene un ABONO menor que la VENTA de la línea, el pedido queda "Por cobrar" con lo abonado registrado y el saldo restante.
- **Abono mayor que la venta**: un ABONO mayor que la VENTA de su línea es un error bloqueante.
- **Cantidades con decimales**: la nota 1203 vende 16,5 paquetes y se acepta tal cual (FR-017). Una cantidad con más de 2 decimales es un error bloqueante.
- **Fechas**: se aceptan fechas de Excel y fechas escritas como día/mes/año. Una fecha futura es un error bloqueante.
- **Producto inexistente en el catálogo**: si el producto vendido no existe en el catálogo, la persona debe crearlo primero en el inventario o elegir el producto equivalente; la carga no crea productos.
- **Mismo texto, distinta presentación**: un Ravioli de espinaca de 200 g (PVP 4,20) y uno de 500 g (PVP 10,50) son descripciones distintas y cada una tiene su propia equivalencia.
- **Archivo no válido**: un archivo que no es de Excel, está dañado, protegido con contraseña o supera los límites de FR-002 se rechaza con un mensaje que explica el motivo.
- **Cargas simultáneas**: si dos personas confirman el mismo archivo a la vez, solo una crea los pedidos; la otra recibe el aviso de que esas notas ya están registradas y no se crea nada duplicado.
- **Cambios entre vista previa y confirmación**: si entre la vista previa y la confirmación otra persona crea un pedido con uno de los números, elimina un producto o un cliente elegido, la confirmación se rechaza completa y se pide revisar la vista previa de nuevo.
- **Pedidos importados cancelados**: un pedido importado puede cancelarse con las reglas vigentes, pero como su carga no descontó inventario, la cancelación tampoco lo devuelve (FR-016).
- **Stock insuficiente al importar**: no bloquea la carga, porque las ventas importadas no descuentan inventario.
- **Cliente importado que luego compra en la tienda**: un cliente dado de alta sin teléfono desde la carga y que después compra en la tienda con su teléfono queda registrado como un cliente distinto hasta que se complete su teléfono en el módulo de clientes.
- **Pedido "Pagado" sin abonos**: los pedidos marcados como pagados confirmando el cobro, sin registrar pagos, tienen saldo cero.
- **Pedido "Pagado" que vuelve a "Por cobrar"**: su saldo vuelve a ser el total menos los abonos registrados.
- **Pedido cancelado con abonos**: conserva sus abonos, no admite nuevos y no aparece en las cuentas por cobrar.
- **Líneas anteriores a esta funcionalidad**: no tienen tipo de precio; se muestran como "Sin especificar" y en las analíticas se agrupan bajo ese rótulo.

## Requirements *(mandatory)*

### Functional Requirements

**Carga del archivo y vista previa**

- **FR-001**: Solo las personas autorizadas para el panel administrativo MUST poder cargar archivos y confirmar cargas, y esa autorización MUST verificarse tanto al leer el archivo como al confirmar, no solo en la interfaz.
- **FR-002**: El sistema MUST aceptar archivos de Excel (.xlsx) de hasta 5 MB y hasta 2.000 líneas de venta por carga.
- **FR-003**: El sistema MUST localizar la hoja y la fila de encabezados reconociendo las columnas por su nombre, tolerando filas de título previas, columnas vacías, diferencias de mayúsculas, acentos, espacios y saltos de línea, y un orden distinto de columnas.
- **FR-004**: Las columnas FECHA, NOTA DE ENTREGA, CLIENTE, PRODUCTO, CANT X PAQ., TIPO, PVP UND y PAGADO MUST ser obligatorias. GRUPO, SABOR y GR MUST usarse, cuando existan, para reconocer el producto. ABONO MUST usarse, cuando tenga un valor numérico, como lo cobrado de la línea. ORDEN CODIGO, VENTA, DEUDA y X COBRAR MUST NOT leerse como datos; VENTA solo se compara para emitir la advertencia descrita en los casos límite.
- **FR-005**: El sistema MUST ignorar las filas sin fecha, nota, cliente ni producto, aunque contengan fórmulas.
- **FR-006**: Antes de guardar nada, el sistema MUST mostrar una vista previa agrupada por nota de entrega con número, fecha, cliente, líneas (producto reconocido, cantidad, tipo de precio, precio unitario e importe), total, lo abonado, el saldo y el estado resultante, más un resumen con la cantidad de pedidos nuevos, ya registrados y con error, el total en USD y el total por cobrar.
- **FR-007**: El sistema MUST validar cada línea y reportar cada error y cada advertencia con su número de fila, la columna y el motivo. Los errores bloquean la confirmación; las advertencias no.
- **FR-008**: El sistema MUST agrupar en un solo pedido las líneas con el mismo número de nota y MUST tratar como error bloqueante una nota cuyas líneas tengan fechas o clientes distintos.

**Reconocimiento de productos y clientes**

- **FR-009**: El sistema MUST reconocer el producto de cada línea comparando grupo, producto, sabor y gramaje con el catálogo y con las equivalencias guardadas, sin distinguir mayúsculas, acentos ni espacios sobrantes. Cuando no haya una coincidencia exacta o una equivalencia guardada, MUST proponer el producto más parecido y exigir que la persona lo confirme o elija otro.
- **FR-010**: El sistema MUST reconocer el cliente de cada nota comparando su nombre con los clientes registrados y con las equivalencias guardadas, sin distinguir mayúsculas, acentos ni espacios sobrantes.
- **FR-011**: Las decisiones de la persona sobre productos y clientes MUST guardarse como equivalencias y aplicarse automáticamente en las cargas siguientes. La persona MUST poder cambiar una equivalencia desde la vista previa de una carga posterior.
- **FR-012**: Para un cliente no reconocido, la persona MUST poder vincularlo a un cliente existente o darlo de alta desde la vista previa solo con el nombre del archivo y un tipo de cliente, sin teléfono. El tipo propuesto MUST ser mayorista si alguna línea de sus notas usa el tipo MAYOR y detal en caso contrario, y la persona MUST poder cambiarlo antes de confirmar. Los clientes dados de alta así MUST poder completarse después desde el módulo de clientes; el teléfono sigue siendo único cuando se registra.

**Creación de los pedidos**

- **FR-013**: Al confirmar, el sistema MUST crear un pedido por cada nota nueva, con el número de la nota como número de pedido, la fecha del archivo como fecha de venta, el cliente reconocido y una línea por cada fila con su producto, cantidad, tipo de precio (DETAL → Detal, MAYOR → Mayor, PROMO → Promo) y el precio unitario del archivo.
- **FR-014**: El precio unitario del archivo MUST respetarse aunque difiera del precio de catálogo; la vista previa MUST mostrar la diferencia como dato informativo, no como error.
- **FR-015**: El importe de cada línea MUST ser cantidad × precio unitario y el total del pedido la suma de sus líneas, sin descuentos ni costo de delivery.
- **FR-016**: Las ventas importadas MUST NOT modificar el inventario, porque son ventas ya realizadas que el inventario actual ya refleja; por lo mismo, la carga MUST NOT rechazarse por falta de stock. El sistema MUST distinguir los pedidos importados de los demás, y cancelar un pedido importado MUST NOT devolver inventario.
- **FR-017**: Las cantidades de las líneas de pedido MUST admitir hasta 2 decimales y ser mayores que cero, tanto en las cargas de Excel como en la venta manual y en las filas nuevas del editor masivo (por ejemplo, 16,5 paquetes). El inventario de cada producto MUST admitir decimales, de modo que una venta manual de 16,5 paquetes lo descuente exactamente y su cancelación lo devuelva exactamente. Una cantidad con más de 2 decimales MUST rechazarse con un mensaje.
- **FR-018**: Lo cobrado de cada línea MUST ser el valor de su columna ABONO si es numérico; si no lo es, la VENTA de la línea cuando PAGADO es "SI" y cero cuando es "NO". Lo abonado de un pedido es la suma de sus líneas. El pedido MUST quedar en "Pagado" si lo abonado cubre el total y en "Por cobrar" si no; lo abonado MUST registrarse como un abono del pedido con método "No especificado" y la fecha de la venta.
- **FR-019**: Una nota cuyo número ya pertenece a un pedido con el mismo cliente, la misma fecha y el mismo importe de productos (sin descuentos ni delivery, que el Excel no registra) MUST mostrarse como "Ya registrada" y omitirse. Si el número pertenece a un pedido con otros datos, MUST tratarse como conflicto bloqueante.
- **FR-020**: La confirmación MUST crear todos los pedidos del archivo en una sola operación: o se crean todos con sus líneas, abonos e historial, o no se crea ninguno. Al confirmar, el sistema MUST volver a validar los números de pedido, los productos y los clientes contra los datos vigentes, sin dar por buena la vista previa.
- **FR-021**: El historial de cada pedido importado MUST registrar su estado inicial con la persona responsable, la fecha y hora y el motivo "Importado desde Excel" junto con el nombre del archivo.
- **FR-022**: Tras confirmar, el sistema MUST notificar cuántos pedidos se crearon, cuántas notas se omitieron por estar ya registradas y el total importado en USD.
- **FR-023**: Los pedidos importados MUST comportarse como cualquier otro pedido: aparecer en la tabla de ventas, en el historial del cliente, en el panel principal, en las analíticas y en las proyecciones según su fecha de venta, y admitir cambios de estado, abonos y cancelación con las reglas vigentes.

**Tipo de precio por línea**

- **FR-024**: Cada línea de pedido creada a partir de esta funcionalidad MUST guardar su tipo de precio: Detal, Mayor o Promo.
- **FR-025**: En la venta manual y en las filas nuevas del editor masivo, cada línea MUST tener un selector de tipo de precio que se propone según el tipo de cliente; para Detal y Mayor MUST rellenar el precio unitario con el precio de catálogo correspondiente, que la persona puede modificar; para Promo MUST exigir que la persona escriba el precio.
- **FR-026**: En los pedidos de la tienda web, el tipo de precio MUST asignarse automáticamente según el contexto de compra: Detal para consumidor y Mayor para mayorista.
- **FR-027**: Las líneas de pedidos creados antes de esta funcionalidad MUST mostrarse con el tipo "Sin especificar"; no se infiere su tipo de forma retroactiva.
- **FR-028**: El detalle del pedido MUST mostrar, en cada línea, el tipo de precio, el precio unitario y el importe.
- **FR-029**: Las analíticas de ventas MUST mostrar, para el periodo consultado, el importe y las unidades vendidas desglosados por tipo de precio, excluyendo los pedidos cancelados.

**Abonos y cuentas por cobrar**

- **FR-030**: La persona MUST poder registrar abonos en pedidos "Por cobrar" o "En pedido" con saldo mayor que cero, indicando el monto (en USD, o en Bs con la tasa de cambio, que se convierte a USD), el método de pago, una referencia opcional y la fecha.
- **FR-031**: El saldo de un pedido MUST ser su total menos la suma de sus abonos vigentes. El saldo de un pedido "Pagado" MUST ser cero aunque no tenga abonos registrados.
- **FR-032**: El sistema MUST rechazar abonos menores o iguales a cero y abonos mayores que el saldo pendiente.
- **FR-033**: Cuando un abono deje el saldo en cero, el pedido MUST pasar a "Pagado" en la misma operación, y el historial MUST registrarlo con la persona responsable y el motivo "Saldado con abonos".
- **FR-034**: La persona MUST poder anular un abono registrado por error mientras el pedido no esté "Pagado". La anulación MUST conservar el abono como anulado, recalcular el saldo y quedar registrada en el historial del pedido con la persona responsable y la fecha.
- **FR-035**: El detalle del pedido MUST listar todos sus abonos (fecha, monto, método, referencia y si está anulado), el total abonado y el saldo.
- **FR-036**: La tabla de "Ventas y pedidos" MUST mostrar lo abonado y el saldo de cada pedido y MUST permitir filtrar los pedidos con saldo pendiente.
- **FR-037**: El panel MUST ofrecer un resumen de cuentas por cobrar con el total por cobrar del negocio y, por cliente, su deuda, la cantidad de pedidos pendientes y la fecha del pedido pendiente más antiguo, ordenado de mayor a menor deuda y excluyendo los pedidos cancelados.
- **FR-038**: Los pedidos cancelados MUST conservar sus abonos, MUST NOT admitir abonos nuevos y MUST quedar fuera de las cuentas por cobrar.

**Exportación del control de ventas**

- **FR-039**: La persona MUST poder descargar, para un periodo, un archivo de Excel con una fila por línea de pedido y las columnas del formato de carga, excluyendo los pedidos cancelados.
- **FR-040**: En el archivo descargado, GRUPO, PRODUCTO, SABOR y GR MUST tomarse de la equivalencia guardada del producto si existe; si no, PRODUCTO MUST mostrar el nombre del catálogo, GRUPO la categoría, y SABOR y GR quedar vacíos. El saldo de cada pedido MUST repartirse como DEUDA entre sus líneas, empezando por la última, de modo que la suma de DEUDA de una nota sea su saldo (sin la parte de delivery, que el formato no tiene). En cada línea, ABONO MUST ser VENTA menos DEUDA. En pedidos sin descuento ni delivery, esto equivale a repartir lo abonado en orden desde la primera línea.
- **FR-041**: Un archivo descargado del sistema MUST poder volver a cargarse sin crear pedidos.

### Key Entities *(include if feature involves data)*

- **Pedido**: Venta registrada con número, fecha, cliente, líneas, total en USD y estado. Con esta funcionalidad, un pedido puede provenir de una carga de Excel (su número es el de la nota de entrega del archivo, queda identificado como importado y no afecta el inventario) y tiene un saldo derivado de sus abonos.
- **Línea de pedido**: Producto vendido dentro de un pedido, con cantidad (hasta 2 decimales), precio unitario, importe y, ahora, tipo de precio (Detal, Mayor, Promo o "Sin especificar" en las líneas anteriores).
- **Inventario de producto**: Cantidad disponible de cada producto, que ahora admite hasta 2 decimales. Lo descuentan las ventas manuales y web y lo devuelven sus cancelaciones; las ventas importadas no lo afectan.
- **Abono**: Pago, total o parcial, aplicado a un pedido: monto en USD (y en Bs con su tasa, si se pagó en bolívares), método de pago ("No especificado" en los importados), referencia opcional, fecha, persona que lo registró y, si corresponde, su anulación.
- **Equivalencia de carga**: Relación recordada entre un texto del Excel y un registro del sistema: la descripción de un producto (grupo, producto, sabor y gramaje) con un producto del catálogo, o el nombre de un cliente con un cliente registrado. La comparten todas las personas autorizadas del panel.
- **Cliente**: Persona o comercio que compra. Las cargas lo identifican solo por su nombre; los dados de alta desde una carga pueden no tener teléfono hasta que se completen (FR-012).
- **Registro de cambio de estado**: Entrada del historial del pedido que no se modifica ni se borra; registra la importación, los cambios a "Pagado" por abonos y las anulaciones de abonos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La dueña carga el archivo mensual de muestra (54 líneas), desde que lo sube hasta que confirma, en menos de 10 minutos la primera vez y en menos de 3 minutos en las cargas siguientes de archivos con los mismos productos y clientes.
- **SC-002**: Tras importar el archivo de muestra, el total de ventas de esos pedidos en el panel coincide al centavo con el Excel (USD 2.901,05) y lo pendiente por cobrar coincide con la columna DEUDA (USD 33,00).
- **SC-003**: Cargar dos veces el mismo archivo crea 0 pedidos nuevos en la segunda carga.
- **SC-004**: El 100 % de los errores de un archivo se reportan en la vista previa con fila, columna y motivo, y una carga con errores no guarda ningún pedido.
- **SC-005**: En la segunda carga de un mes con los mismos productos y clientes, al menos el 90 % de las líneas se reconocen sin intervención de la persona.
- **SC-006**: La dueña responde "¿cuánto me debe cada cliente?" desde el panel en menos de 30 segundos, sin abrir el Excel.
- **SC-007**: Registrar un abono desde el detalle del pedido toma menos de 1 minuto.
- **SC-008**: El 100 % de las líneas de pedidos creados después de esta funcionalidad (manuales, web e importados) tienen tipo de precio.
- **SC-009**: El control de ventas descargado de un periodo suma el mismo total y el mismo saldo pendiente que el panel muestra para ese periodo.

## Assumptions

- La funcionalidad pertenece al panel administrativo. La tienda solo cambia en que sus pedidos registran el tipo de precio de forma automática (FR-026); la venta rápida y la cotización rápida no cambian.
- El formato de referencia es la hoja "CONTROL DE VENTAS" del archivo de agosto de 2026. Archivos con otra estructura deberán adaptarse a esas columnas.
- Los montos del Excel están en USD. Los pedidos importados no tienen tasa de cambio ni monto en Bs, y no se calculan de forma retroactiva.
- El número de NOTA DE ENTREGA del Excel funciona como número de pedido. El correlativo automático del sistema empieza en 1300, por encima de la numeración de los archivos actuales; si la numeración del Excel llega a ese rango, los choques se tratan como conflictos (FR-019).
- La carga no crea documentos de "Nota de entrega" del panel (los que generan PDF para mayoristas); esos se siguen emitiendo como hoy.
- Los pedidos importados no tienen descuento, costo de delivery ni dirección de entrega, y usan la forma de entrega por defecto del sistema.
- El Excel no indica el método de pago; lo cobrado según el archivo se registra con el método "No especificado".
- El precio Promo no existe en el catálogo; siempre se escribe a mano o viene del archivo.
- La columna ORDEN CODIGO está vacía en el archivo de muestra y se ignora en esta versión.
- La carga no crea productos: los productos vendidos deben existir en el catálogo.
- Las cargas son un registro de ventas ya realizadas: no descuentan inventario. Las ventas nuevas se registran desde el panel o la tienda, que sí lo descuentan.
- Solo los clientes dados de alta desde una carga pueden quedar sin teléfono; las altas desde el módulo de clientes y desde la tienda lo siguen exigiendo.
- La tienda web y la venta rápida siguen vendiendo por unidades enteras; las cantidades con decimales se registran desde el panel o desde las cargas.
- Los pedidos importados no acumulan puntos de fidelidad, porque hoy no se consultan ni se canjean en ninguna pantalla.
- Las personas autorizadas son las mismas que hoy acceden al panel; no se crean roles nuevos.
- Una carga es un acto de registro histórico: no envía avisos a los clientes.
