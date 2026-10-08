# Feature Specification: Catálogo público unificado

**Feature Branch**: `001-catalogo-unificado`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Deseo modificar el flujo actual de la app principal: al principio el usuario debe elegir si entra como consumidor o como mayorista. Quiero que la página sea mucho más simple; solo quiero que exista el flujo de consumidor y que desde ahí mismo se puedan mostrar los productos de mayoristas. No quiero manejarlo como dos aplicaciones diferentes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir contexto de compra al entrar (Priority: P1)

Como visitante, quiero entrar directamente al catálogo consumidor y poder cambiar al contexto mayorista desde la misma experiencia, sin tener que decidir entre dos aplicaciones diferentes.

**Why this priority**: El acceso directo reduce pasos desde el primer contacto y elimina la confusión causada por dos entradas públicas separadas.

**Independent Test**: Abrir la aplicación en una sesión nueva y comprobar que entra directamente al catálogo consumidor, donde el visitante puede activar el contexto mayorista sin salir de la experiencia.

**Acceptance Scenarios**:

1. **Given** una sesión nueva en la entrada pública, **When** el visitante llega a la página, **Then** entra directamente al catálogo consumidor canónico.
2. **Given** el visitante está en el catálogo consumidor, **When** consulta la navegación, **Then** ve una indicación visible del contexto activo y puede cambiar a mayorista desde el mismo catálogo.
3. **Given** el visitante cambia de opinión, **When** cambia el contexto elegido, **Then** la aplicación actualiza la presentación del catálogo sin abrir otra aplicación ni exigir un nuevo registro.

---

### User Story 2 - Descubrir productos mayoristas desde el flujo consumidor (Priority: P1)

Como visitante que navega el flujo consumidor, quiero encontrar y consultar los productos destinados a mayoristas desde el mismo catálogo, para no abandonar la página ni usar una sección independiente.

**Why this priority**: Es el cambio central solicitado: mantener una experiencia sencilla y única sin perder la oferta mayorista.

**Independent Test**: Desde el contexto "Consumidor", localizar un producto mayorista, abrir su detalle, comprobar su identificación comercial y volver al catálogo sin salir del flujo público unificado.

**Acceptance Scenarios**:

1. **Given** el visitante está en el contexto "Consumidor", **When** consulta el catálogo, **Then** puede identificar y acceder a los productos mayoristas disponibles mediante una sección, filtro o agrupación claramente reconocible.
2. **Given** existe un producto mayorista publicado y disponible, **When** el visitante abre su ficha, **Then** ve su nombre, imagen, disponibilidad, información comercial vigente y la indicación de que pertenece a la oferta mayorista.
3. **Given** no existen productos mayoristas publicados o disponibles, **When** el visitante consulta la oferta mayorista, **Then** recibe un estado vacío comprensible y puede continuar navegando los productos de consumidores.

---

### User Story 3 - Comprar sin cambiar de aplicación (Priority: P1)

Como visitante, quiero añadir productos encontrados en el catálogo unificado al carrito y continuar por el flujo de compra existente, para completar mi solicitud sin saltos entre experiencias.

**Why this priority**: La simplificación solo aporta valor si también se mantiene el camino completo desde el descubrimiento hasta la compra.

**Independent Test**: Seleccionar un producto de consumidor y un producto mayorista permitido, añadirlos al carrito y avanzar hasta el checkout usando la misma navegación pública.

**Acceptance Scenarios**:

1. **Given** el visitante está viendo un producto publicado y disponible, **When** lo añade al carrito, **Then** el producto aparece en el carrito con su precio y disponibilidad vigentes.
2. **Given** el visitante tiene productos del catálogo unificado en el carrito, **When** inicia el checkout, **Then** continúa por el flujo de consumidor existente sin ser enviado a una aplicación mayorista separada.
3. **Given** el visitante cambia el contexto después de añadir productos, **When** vuelve al catálogo, **Then** el carrito conserva sus productos y la aplicación comunica cualquier cambio de precio, disponibilidad o condición antes de confirmar la compra.

### Edge Cases

- Si el visitante entra mediante un enlace antiguo o profundo asociado a una vista de consumidores o mayoristas, debe aterrizar en el catálogo público unificado con el contexto más razonable y una opción clara para cambiarlo.
- Si una oferta mayorista deja de estar publicada, disponible o autorizada mientras el visitante la consulta, debe mostrarse como no disponible y no debe poder confirmarse en el carrito.
- Si un producto tiene información comercial distinta para consumidores y mayoristas, la aplicación debe mostrar el precio y las condiciones correspondientes al contexto elegido, sin mezclar importes ni ocultar requisitos aplicables.
- Si el visitante recarga la página o vuelve atrás, el contexto y el carrito deben conservarse durante la sesión cuando sea posible; si no se puede conservar el contexto, se debe usar consumidor como valor predeterminado sin perder indebidamente el carrito.
- En pantallas móviles estrechas, el selector inicial, la identificación del tipo de producto, el precio y las acciones principales deben permanecer legibles y utilizables sin desplazamiento horizontal.
- Los productos sin imagen, descripción o precio válido no deben presentarse como comprables; deben quedar fuera de la oferta pública o mostrar un estado no disponible comprensible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La aplicación DEBE llevar la entrada pública directamente al catálogo consumidor canónico, sin mostrar una pantalla intermedia de elección.
- **FR-002**: Ambos contextos DEBEN conducir a una única experiencia pública de catálogo y a un único flujo de consumidor; no DEBE existir una segunda aplicación, navegación paralela o checkout mayorista independiente para esta feature.
- **FR-003**: La aplicación DEBE conservar y mostrar el contexto seleccionado mientras el visitante navega por el catálogo, consulta un producto y vuelve al listado.
- **FR-004**: Desde el contexto "Consumidor", los visitantes DEBEN poder descubrir, filtrar o abrir los productos mayoristas publicados y disponibles desde el mismo catálogo.
- **FR-005**: Cada producto mayorista visible DEBE estar identificado de forma inequívoca como parte de la oferta mayorista y mostrar únicamente la información comercial vigente para el contexto seleccionado.
- **FR-006**: La aplicación DEBE mantener separadas las condiciones comerciales de consumidor y mayorista cuando existan diferencias, evitando mostrar un precio o requisito de un contexto como si aplicara al otro.
- **FR-007**: La aplicación DEBE permitir que un visitante añada productos permitidos del catálogo unificado al carrito y continúe por el flujo de checkout de consumidor existente.
- **FR-008**: La aplicación DEBE validar nuevamente disponibilidad, precio y condiciones comerciales antes de permitir la confirmación de la compra.
- **FR-009**: La aplicación DEBE conservar el carrito al cambiar de contexto y DEBE informar de manera clara cualquier producto que ya no pueda comprarse bajo el contexto activo.
- **FR-010**: Las entradas públicas anteriores que distingan consumidores y mayoristas DEBEN llevar al catálogo unificado o resolver su contenido dentro de él, sin crear una experiencia pública duplicada.
- **FR-011**: La feature NO DEBE añadir autenticación mayorista, pasarelas de pago, integraciones externas, reglas nuevas de descuentos por volumen ni cambios en el panel administrativo.
- **FR-012**: Las acciones administrativas, los datos personales y las reglas de inventario DEBEN conservar los permisos y validaciones actuales; este cambio solo redefine la presentación y navegación pública del catálogo.
- **FR-013**: La experiencia DEBE ser usable en dispositivos móviles: el selector inicial, las etiquetas de contexto, los precios, la disponibilidad y las acciones de navegación deben ser visibles y accionables sin depender de hover ni de desplazamiento horizontal.

### Key Entities *(include if feature involves data)*

- **Contexto de compra**: Preferencia temporal del visitante entre consumidor y mayorista. Orienta la presentación pública durante la sesión; no representa una aplicación, rol administrativo ni autorización nueva.
- **Producto publicado**: Producto del catálogo con nombre, imagen, descripción, clasificación comercial, precio o precios aplicables y disponibilidad suficientes para mostrarse o comprarse.
- **Oferta mayorista**: Presentación de los productos destinados a clientes mayoristas, con sus condiciones comerciales vigentes y una identificación visible dentro del catálogo unificado.
- **Carrito de compra**: Selección temporal de productos que debe seguir siendo compatible con el checkout de consumidor existente al cambiar de contexto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de las sesiones públicas nuevas, el visitante llega directamente al catálogo consumidor canónico.
- **SC-002**: En pruebas funcionales, el 100% de los visitantes puede cambiar al contexto mayorista desde el catálogo unificado sin abrir una aplicación o checkout separado.
- **SC-003**: Al menos el 90% de los usuarios de prueba puede localizar y abrir un producto mayorista desde el contexto "Consumidor" en menos de 60 segundos, sin usar enlaces externos ni instrucciones del equipo.
- **SC-004**: El 100% de los productos mayoristas publicados y disponibles que se muestren desde el catálogo conserva su identificación comercial y sus condiciones vigentes al abrir la ficha y al revisar el carrito.
- **SC-005**: Al menos el 90% de los usuarios de prueba puede añadir un producto del catálogo unificado y llegar al checkout de consumidor sin cambiar de aplicación ni perder el carrito.
- **SC-006**: En una pantalla móvil de 360 píxeles de ancho, el selector inicial, la identificación del producto mayorista, el precio, la disponibilidad y las acciones principales se pueden leer y utilizar sin desplazamiento horizontal.
- **SC-007**: Las pruebas de regresión confirman que las rutas administrativas, la gestión de inventario y las reglas actuales de confirmación de pedidos no cambian como consecuencia de esta feature.

## Assumptions

- El acceso inicial usa consumidor como contexto predeterminado; cambiar a mayorista solo orienta la presentación y la intención de compra, y no crea cuentas, roles, permisos ni una aplicación separada.
- El flujo canónico de esta feature es el flujo público de consumidor. La opción "Mayorista" reutiliza ese mismo catálogo, detalle, carrito y checkout.
- Las reglas actuales del negocio determinan qué precio, disponibilidad y condiciones corresponden a cada contexto. Esta feature no define nuevos descuentos, mínimos de compra ni requisitos de elegibilidad.
- Los productos mayoristas que se muestren públicamente son aquellos que ya estén publicados y puedan ofrecerse según las reglas vigentes del catálogo y del inventario.
- El contexto puede mantenerse durante la sesión del visitante; no se requiere persistirlo como un nuevo dato permanente de cliente.
- Los enlaces y superficies públicas existentes para consumidores y mayoristas se consideran dependencias de migración hacia la experiencia unificada; el panel administrativo y la vista rápida quedan fuera de alcance.
- El checkout continúa usando el canal y las reglas operativas actuales, incluido WhatsApp cuando corresponda; no se incorpora una pasarela de pago.
