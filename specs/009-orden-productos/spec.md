# Feature Specification: Orden manual de productos, igual en todas las vistas

**Feature Branch**: `009-orden-productos`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "la clienta quiere poder ordenar manualmente como se muestran los productos, este orden debe ser el mismo en todas las vistas del producto"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reordenar el catálogo desde el panel (Priority: P1)

La dueña entra al panel administrativo, abre la vista para ordenar los productos y ve el catálogo completo en el orden actual. Mueve un producto a la posición que quiere (por ejemplo, sube un producto nuevo al primer lugar o baja uno de temporada al final), guarda, y a partir de ese momento la tienda muestra los productos en ese orden.

Hoy el orden está fijado en el sistema por el nombre exacto de cada producto: cambiarlo requiere a un desarrollador, un producto renombrado pierde su lugar y los productos nuevos caen al final sin control.

**Why this priority**: Es lo que la clienta pidió explícitamente y lo único que le da control sobre la vitrina. Con solo esta historia ya puede decidir qué se ve primero en la tienda.

**Independent Test**: Con un catálogo donde "Ravioli de carne" está primero y "Pan de jamón" último, la dueña mueve "Pan de jamón" a la primera posición y guarda. Al abrir la tienda en "Todos", "Pan de jamón" aparece primero y "Ravioli de carne" segundo; los demás conservan su orden relativo.

**Acceptance Scenarios**:

1. **Given** una persona autorizada en el panel, **When** abre la vista de ordenar productos, **Then** ve todos los productos del catálogo (con y sin inventario) en el orden vigente, con nombre, imagen y categoría para reconocerlos.
2. **Given** la lista en pantalla, **When** mueve un producto a otra posición, **Then** la lista refleja el cambio de inmediato y los demás productos se desplazan sin perder su orden relativo.
3. **Given** cambios sin guardar, **When** guarda, **Then** el nuevo orden queda registrado, recibe una confirmación visible y la tienda lo muestra en la siguiente carga.
4. **Given** cambios sin guardar, **When** los descarta, **Then** la lista vuelve al orden guardado y ninguna vista cambia.
5. **Given** la dueña usa su teléfono, **When** reordena la lista, **Then** puede llevar un producto a cualquier posición sin necesitar precisión de computadora.
6. **Given** una persona no autorizada para el panel, **When** intenta cambiar el orden (por la interfaz o por cualquier otra vía), **Then** el cambio se rechaza y el orden no se modifica.

---

### User Story 2 - El mismo orden en todas las vistas (Priority: P1)

Después de guardar, el orden elegido es el que ven los clientes en la tienda (consumidor y mayorista), el que usa la dueña en la venta rápida y en la cotización rápida, y el que aparece en las listas y selectores de productos del panel. Hoy cada vista tiene su propio orden: la tienda y la cotización usan una lista, la venta rápida otra distinta (por ejemplo, "Mezzaluna de camarones" va sexta en la venta rápida y décima en la tienda) y el panel ordena alfabéticamente o por fecha de creación.

**Why this priority**: Es la segunda mitad explícita del pedido ("el mismo en todas las vistas"). Sin ella, la dueña ordenaría la tienda pero seguiría buscando los productos en lugares distintos al vender y cotizar.

**Independent Test**: Tras mover "Pan de jamón" al primer lugar (Historia 1), abrir la tienda (consumidor y mayorista), la venta rápida, la cotización rápida, el inventario del panel y el selector de productos de la venta manual: en todos "Pan de jamón" es el primero de los productos que esa vista muestra y el resto sigue la misma secuencia.

**Acceptance Scenarios**:

1. **Given** un orden guardado, **When** se abre la tienda en "Todos", **Then** los productos aparecen exactamente en ese orden.
2. **Given** un orden guardado, **When** se filtra la tienda por una categoría o se cambia al contexto mayorista, **Then** los productos visibles conservan entre sí el orden guardado.
3. **Given** un orden guardado, **When** se abren la venta rápida o la cotización rápida, **Then** los productos disponibles aparecen en el orden guardado (los que esa vista oculta, como los agotados, simplemente no se muestran y no alteran el orden de los demás).
4. **Given** una cotización en curso, **When** la cotización relee precios e inventario, **Then** los productos siguen apareciendo en el orden guardado.
5. **Given** un orden guardado, **When** se abren el inventario del panel o un selector de productos del panel (venta manual, nueva nota de entrega, filtros por producto, equivalencias de la carga de Excel), **Then** los productos aparecen en el orden guardado.
6. **Given** el sistema recién actualizado con esta función y sin que nadie haya reordenado aún, **When** se abre la tienda, **Then** los productos aparecen en el mismo orden en que se veían antes de la actualización.

---

### User Story 3 - Productos nuevos y cambios del catálogo sin romper el orden (Priority: P2)

Cuando la dueña crea un producto, cambia su nombre o lo elimina, el orden del resto del catálogo se mantiene y ella no tiene que volver a ordenarlo todo.

**Why this priority**: Evita el problema actual de que el orden dependa del nombre exacto. El catálogo cambia pocas veces, por eso va después de las dos historias principales.

**Independent Test**: Crear el producto "Ravioli de calabaza": aparece al final en todas las vistas. Renombrar "Salsa Napoli" a "Salsa Napoli tradicional": conserva su posición. Eliminar un producto del medio: los demás conservan su orden relativo y no quedan huecos visibles.

**Acceptance Scenarios**:

1. **Given** un catálogo ordenado, **When** se crea un producto, **Then** queda en la última posición de todas las vistas hasta que la dueña lo mueva.
2. **Given** un producto en la posición 5, **When** se edita su nombre, precio, categoría o inventario, **Then** sigue en la posición 5.
3. **Given** un catálogo ordenado, **When** se elimina un producto, **Then** los demás conservan su orden relativo.
4. **Given** un producto que se agota y luego se repone, **When** vuelve a mostrarse en la venta rápida o la cotización, **Then** reaparece en su posición de siempre.

---

### Edge Cases

- **Dos personas reordenan a la vez**: prevalece el último orden guardado completo; el sistema no mezcla los dos órdenes ni deja posiciones duplicadas.
- **Producto creado o eliminado mientras alguien reordena**: al guardar, el producto creado mientras tanto queda al final y el eliminado se ignora; el guardado no falla por eso.
- **Productos con la misma posición o sin posición** (datos inconsistentes): todas las vistas los muestran igual, desempatando de forma estable y predecible (por nombre), para que nunca difieran entre sí.
- **Productos que hoy no tienen un lugar asignado** (la tienda los muestra al final): al activar la función conservan ese lugar al final, en el mismo orden en que se ven hoy.
- **Diferencia entre la tienda y la venta rápida actuales**: el orden inicial es el de la tienda; la venta rápida pasa a usarlo (es un cambio visible en esa vista y es el resultado esperado).
- **Catálogo vacío o de un solo producto**: la vista de ordenar lo indica y no ofrece nada que mover.
- **Fallo al guardar**: se informa el error, el orden anterior sigue vigente en todas las vistas y los cambios en pantalla no se pierden para poder reintentar.
- **Listas que no son el catálogo**: las líneas de un pedido, una nota de entrega, el PDF, el carrito y el archivo exportado siguen en el orden en que se registraron las líneas; los rankings de analíticas siguen ordenados por su métrica (por ejemplo, más vendidos). No forman parte de este orden.

## Requirements *(mandatory)*

### Functional Requirements

**Definir el orden**

- **FR-001**: El sistema MUST mantener un único orden manual para todo el catálogo; cada producto ocupa una posición en él.
- **FR-002**: Las personas autorizadas para el panel administrativo MUST poder ver el catálogo completo en su orden vigente, incluidos los productos sin inventario, y mover cualquier producto a cualquier posición.
- **FR-003**: Mover un producto MUST desplazar a los demás sin alterar su orden relativo.
- **FR-004**: La reorganización MUST poder hacerse desde un teléfono y desde una computadora, incluido llevar un producto del final al principio sin pasar por cada posición intermedia.
- **FR-005**: Los cambios MUST aplicarse a las vistas solo cuando la persona guarda; MUST poder descartarlos antes de guardar, y el resultado de guardar (éxito o error) MUST informarse con una notificación visible.
- **FR-006**: Solo las personas autorizadas para el panel MUST poder cambiar el orden, y esa autorización MUST verificarse al guardar, no solo en la interfaz.
- **FR-007**: El orden MUST quedar asociado al producto mismo, no a su nombre: editar el nombre, precio, categoría, descripción, imágenes o inventario de un producto MUST conservar su posición.

**Aplicar el orden en todas las vistas**

- **FR-008**: Las siguientes vistas MUST mostrar los productos en el orden guardado:
  - tienda pública, en contexto consumidor y mayorista, con y sin filtro de categoría;
  - venta rápida;
  - cotización rápida, incluida la relectura de precios e inventario;
  - inventario del panel administrativo;
  - selectores y filtros de producto del panel: venta manual, nueva nota de entrega, filtro por producto de pedidos y de analíticas de ventas, y equivalencias de la carga de Excel.
- **FR-009**: Cuando una vista muestra solo una parte del catálogo (por categoría, por contexto mayorista, por disponibilidad o por búsqueda), los productos visibles MUST conservar entre sí el orden guardado.
- **FR-010**: Un cambio de orden guardado MUST verse en todas las vistas de FR-008 en su siguiente carga, sin pasos adicionales.
- **FR-011**: El orden MUST tener una sola definición en el sistema; ninguna vista MUST mantener un orden propio, y los órdenes que hoy tiene cada vista MUST dejar de aplicarse.
- **FR-012**: Cuando dos productos queden empatados o sin posición, todas las vistas MUST desempatarlos con el mismo criterio (nombre), de modo que nunca muestren órdenes distintos.

**Altas, bajas y orden inicial**

- **FR-013**: Un producto nuevo MUST quedar en la última posición.
- **FR-014**: Eliminar un producto MUST conservar el orden relativo de los demás.
- **FR-015**: Al activar la función, el orden inicial MUST reproducir exactamente el que la tienda muestra hoy en "Todos", incluidos al final los productos que hoy no tienen un lugar asignado.

**Fuera de alcance**

- **FR-016**: Este orden MUST NOT aplicarse a las líneas de pedidos, notas de entrega, PDF, carrito ni exportaciones (que siguen el orden de registro), ni a los rankings de analíticas (que siguen su métrica).

### Key Entities *(include if feature involves data)*

- **Producto**: suma una posición en el catálogo que define dónde aparece en todas las vistas. La posición pertenece al producto (no depende de su nombre) y se conserva al editar cualquier otro dato.
- **Orden del catálogo**: la secuencia completa de productos por posición. Es única para todo el sistema; las vistas la filtran pero no la reordenan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La dueña lleva un producto de la última a la primera posición y guarda en menos de 30 segundos, desde teléfono o computadora.
- **SC-002**: La dueña reordena el catálogo completo (unos 30 productos) en menos de 5 minutos.
- **SC-003**: Tras guardar, el 100 % de las vistas listadas en FR-008 muestran la misma secuencia de productos en su siguiente carga.
- **SC-004**: Cambiar el orden del catálogo no requiere intervención de un desarrollador (hoy la requiere el 100 % de las veces).
- **SC-005**: Al activar la función, la tienda muestra los productos en el mismo orden que antes, sin ninguna diferencia visible.
- **SC-006**: Renombrar, editar o reponer un producto no cambia su posición en ningún caso.

## Assumptions

- "Todas las vistas del producto" se interpreta como toda lista o selector donde se elige o se exhibe un producto del catálogo (tienda, venta rápida, cotización rápida y panel). No incluye listas que representan líneas ya registradas ni rankings por métrica (FR-016).
- Hay un solo orden global, no uno por categoría: filtrar por categoría muestra los productos de esa categoría en su orden relativo. Con unos 30 productos, una sola lista es manejable.
- El orden inicial toma como referencia el de la tienda, no el de la venta rápida, porque es el que ven los clientes y el que la dueña conoce; la venta rápida cambia para alinearse.
- La vista de ordenar vive en el panel administrativo, junto al inventario, que ya es donde se administra el catálogo; no se crea una superficie nueva.
- Las personas autorizadas son las mismas que hoy acceden al panel; no se añaden roles.
- El detalle de un producto no muestra otros productos, así que no se ve afectado.
- Esta función toca la tienda pública, el panel, la venta rápida y la cotización rápida, pero solo en el orden de presentación: no cambia precios, inventario, pedidos ni lo que cada superficie persiste.
