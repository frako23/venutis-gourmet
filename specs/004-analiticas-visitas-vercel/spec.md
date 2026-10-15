# Feature Specification: Analíticas de visitas con Vercel

**Feature Branch**: `004-analiticas-visitas-vercel`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Dentro del panel administrativo quiero agregar una sección de analíticas de visitas en la página; el sitio web está hospedado en Vercel, así que quiero aprovechar las APIs de analíticas que ya ofrece Vercel para integrarlas en la app."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el tráfico del sitio (Priority: P1)

Como usuario autenticado del panel administrativo, quiero consultar las visitas del sitio en la sección de analíticas para conocer cuántas personas están llegando a Venuti's Gourmet y cuántas páginas se están visualizando.

**Why this priority**: Entrega el valor principal de la funcionalidad: convertir los datos de tráfico del sitio en una lectura rápida para la operación del negocio, sin sustituir las analíticas comerciales existentes.

**Independent Test**: Con un periodo que tenga datos de tráfico, un usuario administrador abre la página de analíticas y puede identificar el total de visitantes agregados, el total de páginas vistas, el periodo consultado y que los datos corresponden al entorno productivo.

**Acceptance Scenarios**:

1. **Given** el usuario tiene una sesión administrativa válida y existe información de tráfico para el periodo seleccionado, **When** abre `/admin/analytics/visits`, **Then** ve un bloque claramente identificado como "Visitas del sitio" con visitantes agregados, páginas vistas y el periodo consultado.
2. **Given** el usuario está consultando `/admin/analytics/sales`, **When** cambia a `/admin/analytics/visits`, **Then** ambos tipos de información aparecen en secciones separadas y las cifras comerciales no se mezclan con las métricas de tráfico.
3. **Given** no existen datos para el periodo seleccionado, **When** el usuario abre la sección, **Then** ve un estado vacío explicativo y no se presentan ceros o cifras inventadas como si fueran datos confirmados.

---

### User Story 2 - Explorar el origen y la distribución de las visitas (Priority: P2)

Como usuario administrativo, quiero filtrar el periodo y revisar los principales recorridos y características agregadas de las visitas para entender qué contenido atrae más interés.

**Why this priority**: Las cifras generales permiten medir volumen, pero los desgloses permiten decidir qué páginas, canales y públicos requieren atención.

**Independent Test**: Con datos disponibles para dos periodos distintos, el usuario cambia el periodo y verifica que el resumen y los desgloses se actualizan de forma coherente, sin conservar filas del periodo anterior.

**Acceptance Scenarios**:

1. **Given** el usuario está en la sección de visitas, **When** selecciona los últimos 7, 30 o 90 días, o introduce un intervalo personalizado válido, **Then** todas las métricas muestran el mismo intervalo seleccionado.
2. **Given** existe tráfico registrado, **When** el usuario revisa los desgloses, **Then** puede identificar las páginas o rutas más visitadas, los referentes principales, los países y los tipos de dispositivo con sus cantidades correspondientes.
3. **Given** el usuario selecciona un intervalo personalizado cuya fecha final es anterior a la inicial, **When** intenta consultarlo, **Then** recibe una validación clara y no se realiza una consulta ambigua.

---

### User Story 3 - Confiar en el estado de los datos (Priority: P3)

Como usuario administrativo, quiero saber cuándo los datos no están disponibles o todavía no están configurados para distinguir una ausencia real de visitas de un problema de conexión o configuración.

**Why this priority**: Las decisiones comerciales no deben basarse en cifras incompletas, desactualizadas o presentadas sin contexto.

**Independent Test**: En escenarios de analítica no habilitada, credencial inválida, servicio no disponible y respuesta válida, el usuario recibe un estado comprensible para cada caso y conserva el acceso a las funciones comerciales del panel.

**Acceptance Scenarios**:

1. **Given** la fuente de analítica no está habilitada o aún no tiene datos, **When** el administrador consulta visitas, **Then** ve una explicación accionable del estado y la forma de verificar la configuración, sin que falle la página completa.
2. **Given** la fuente externa no responde o devuelve un error de autorización, **When** el administrador consulta visitas, **Then** ve un mensaje de indisponibilidad sin detalles sensibles y las analíticas de ventas continúan siendo utilizables.
3. **Given** el usuario no tiene autorización administrativa, **When** intenta acceder a la sección, **Then** se aplica el mismo control de acceso del panel y no se revela ninguna métrica de visitas.

### Edge Cases

- El periodo solicitado está fuera de la ventana histórica disponible para el proyecto: se informa que no hay datos consultables para ese intervalo y se permite seleccionar otro periodo.
- Los datos de Vercel tienen retraso o llegan parcialmente: se muestra la fecha y hora de la última actualización conocida y no se presenta el resultado como tiempo real.
- La respuesta contiene una ruta con parámetros que podrían incluir información personal, un token, un identificador de pedido o un correo: el panel no muestra esos valores.
- La fuente responde correctamente pero un desglose no tiene filas: se muestra el estado vacío de ese desglose sin ocultar los totales válidos.
- La conexión falla después de cargar una consulta anterior: el resultado anterior no se presenta como actual; debe quedar identificado como anterior o mostrarse el error de actualización.
- El sitio aún no ha recibido visitas en producción: se muestra el estado de espera o vacío y se conservan las analíticas comerciales.
- Una consulta lenta supera el tiempo razonable de espera: se muestra un estado de carga y después un error recuperable con opción de reintentar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE incorporar una sección propia de "Visitas del sitio" en `/admin/analytics/visits` y mantener las analíticas de ventas y predictor en `/admin/analytics/sales`, sin mezclar sus métricas.
- **FR-002**: El sistema DEBE consultar la fuente oficial de analítica web de Vercel asociada al proyecto productivo y utilizar sus datos agregados de visitas como fuente de esta sección.
- **FR-003**: El sistema DEBE mostrar, como mínimo, visitantes y páginas vistas para el intervalo seleccionado, con etiquetas y definiciones comprensibles para distinguir ambas métricas; la etiqueta de visitantes DEBE indicar que corresponde a la métrica agregada y anonimizada de Vercel, no a personas identificadas o rastreadas entre días.
- **FR-004**: El sistema DEBE usar los últimos 7 días como intervalo inicial y permitir seleccionar los últimos 30 días, los últimos 90 días o un intervalo personalizado válido.
- **FR-005**: El sistema DEBE mostrar el intervalo consultado, el entorno productivo y la fecha u hora de actualización asociada al resultado para evitar que el usuario interprete los datos sin contexto.
- **FR-006**: El sistema DEBE ofrecer desgloses agregados de páginas o rutas, referentes, países y tipos de dispositivo, ordenados de forma que los valores principales sean identificables sin recorrer una lista indefinida.
- **FR-007**: El sistema DEBE aplicar el intervalo seleccionado de manera consistente al resumen y a todos los desgloses de visitas.
- **FR-008**: El sistema DEBE diferenciar al menos estos estados: datos disponibles, sin datos, analítica pendiente de configuración, fuente temporalmente no disponible y consulta no autorizada o mal configurada.
- **FR-009**: El sistema DEBE permitir reintentar una consulta fallida sin perder el contexto del intervalo elegido y sin bloquear las demás funciones del panel administrativo.
- **FR-010**: El acceso a las métricas DEBE estar protegido por la autenticación y autorización administrativa existente, tanto al abrir la página como al solicitar los datos.
- **FR-011**: Las credenciales de Vercel DEBEN permanecer exclusivamente en la configuración segura del servidor y nunca deben enviarse al navegador, mostrarse en la interfaz ni escribirse en logs de aplicación.
- **FR-012**: El sistema DEBE mostrar únicamente información agregada necesaria para el análisis y DEBE ocultar o excluir parámetros de URL y valores que puedan identificar personas, pedidos, sesiones individuales, tokens o datos de contacto.
- **FR-013**: El sistema NO DEBE crear una copia histórica local de eventos de visita para esta primera versión; la vigencia y disponibilidad histórica se regirán por la fuente externa y su periodo de retención.
- **FR-014**: Si la fuente de visitas falla, el sistema DEBE conservar disponibles las analíticas comerciales y comunicar el fallo solo dentro del bloque de visitas afectado.
- **FR-015**: La primera versión DEBE limitarse a visitas y páginas vistas agregadas; quedan fuera los eventos personalizados, el rendimiento técnico del sitio, alertas automáticas, reportes programados y exportaciones propias.

### Key Entities

- **Consulta de visitas**: Representa una solicitud de lectura con intervalo, entorno productivo, estado de respuesta y momento de actualización.
- **Métrica agregada de tráfico**: Representa un total de visitantes agregados o páginas vistas, o una fila de desglose por página/ruta, referente, país o dispositivo.
- **Estado de disponibilidad de analítica**: Representa si la fuente está lista, vacía, pendiente de configuración, temporalmente indisponible o no autorizada.
- **Fuente de analítica web**: Servicio externo de Vercel que conserva y entrega las métricas agregadas; no es una entidad comercial del catálogo, ventas, clientes o inventario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario administrativo con una conexión normal puede identificar visitantes agregados, páginas vistas y periodo consultado en menos de 10 segundos desde que abre la página.
- **SC-002**: En una verificación con el mismo proyecto, entorno e intervalo, el 100% de los totales mostrados coincide con la fuente de Vercel, considerando únicamente la latencia o actualización declarada por dicha fuente.
- **SC-003**: En al menos 5 escenarios de prueba —datos válidos, sin datos, analítica no habilitada, fuente no disponible y autorización inválida— el panel comunica el estado correcto sin presentar cifras inventadas ni credenciales sensibles.
- **SC-004**: En una revisión de permisos, ningún usuario sin acceso administrativo puede consultar o visualizar métricas de visitas, y ningún secreto de la integración aparece en el navegador o en los registros de aplicación.
- **SC-005**: Al cambiar entre dos intervalos válidos, el 100% de los bloques de visitas —resumen y desgloses— refleja el nuevo intervalo y no conserva filas del intervalo anterior.
- **SC-006**: Las pruebas existentes de las analíticas comerciales continúan pasando y un fallo de la fuente de visitas no impide consultar ventas, pedidos, clientes o inventario.
- **SC-007**: En una revisión de usabilidad con 5 tareas administrativas, al menos 4 usuarios identifican correctamente la diferencia entre visitantes agregados y páginas vistas y encuentran el origen o la distribución principal del tráfico.

## Fuera de alcance de esta versión

- Registrar eventos personalizados de interacción o compras.
- Integrar Speed Insights o métricas de rendimiento técnico.
- Guardar un histórico propio en PostgreSQL para superar la retención de Vercel.
- Crear alertas, informes por correo, paneles públicos o permisos nuevos.
- Reemplazar las analíticas de ventas, el predictor comercial o el panel nativo de Vercel.

## Assumptions

- El proyecto productivo tiene habilitada la analítica web de Vercel o puede habilitarse antes de la puesta en producción de esta funcionalidad.
- Existe una credencial restringida al proyecto o equipo de Vercel, configurada únicamente en el entorno seguro del despliegue y con permisos de lectura suficientes.
- Se reutiliza la autenticación y autorización administrativa actual; no se crean cuentas, roles ni flujos de identidad nuevos.
- La fuente externa entrega información agregada y anonimizada; esta funcionalidad no pretende identificar ni seguir visitantes individuales ni presentar la métrica de visitantes como un conteo de personas únicas entre todos los días del intervalo.
- La vista inicial consulta producción para no mezclar tráfico de pruebas o previews con el comportamiento real del sitio.
- Las fechas se interpretan y presentan con la zona horaria operativa del proyecto, asumida inicialmente como America/Caracas, y cualquier diferencia de actualización de la fuente se comunica en la interfaz.
- La disponibilidad, latencia, retención y límites de consulta de los datos dependen del plan y la configuración vigentes de Vercel.
- El diseño reutiliza la página, navegación y estilos actuales del panel administrativo, con una presentación usable en pantallas pequeñas.
