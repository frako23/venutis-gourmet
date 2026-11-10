# Feature Specification: Rediseño de la pestaña Resumen con cuatro gráficos principales

**Feature Branch**: `013-resumen-graficos`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "vamos a rediseñar la pestaña resumen del panel administrativo, quiero tener 4 gráficos principales: 1. gráfico de ventas por mes en barras, en la línea X meses en la línea Y montos con tooltip para ver el detalle de la venta en cada mes. 2. top 5 productos más vendidos, un gráfico con el detalle de los 5 productos más vendidos con cantidad y montos. 3. otro gráfico donde se vean las analíticas de la tienda, cuánta gente ha visitado la tienda. 4. otro gráfico con las ventas por tipo de clientes, cuántas ventas fueron de consumidores, cuántas por mayoristas"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver las ventas de cada mes en un gráfico de barras (Priority: P1)

Como administradora, al abrir la pestaña "Resumen" quiero ver un gráfico de barras con lo vendido en cada mes, para saber de un vistazo cómo va el negocio, qué meses fueron buenos y cuáles flojos, sin armar el cálculo a mano ni entrar a otra sección.

**Why this priority**: Es la lectura más importante del negocio y hoy no existe en ninguna parte del panel: el Resumen solo muestra un total de los últimos 30 días y las analíticas de ventas muestran una semana o un mes a la vez, nunca la evolución. Con solo este gráfico la pestaña ya entrega valor.

**Independent Test**: Con pedidos registrados en varios meses, la administradora abre "Resumen" y ve una barra por cada uno de los últimos 12 meses; acerca el cursor (o toca) la barra de un mes y ve el monto vendido, la cantidad de ventas y el ticket promedio de ese mes, y las cifras coinciden con los pedidos no cancelados de ese mes.

**Acceptance Scenarios**:

1. **Given** existen ventas en los últimos meses, **When** la administradora abre "Resumen", **Then** ve un gráfico de barras con los meses en el eje horizontal (del más antiguo al mes en curso) y los montos en USD en el eje vertical, una barra por mes.
2. **Given** el gráfico de ventas por mes, **When** la administradora pasa el cursor sobre una barra, la toca en un teléfono o llega a ella con el teclado, **Then** aparece un detalle con el mes y el año, el monto total vendido en USD, la cantidad de ventas y el ticket promedio de ese mes.
3. **Given** un mes de la ventana sin ninguna venta, **When** se muestra el gráfico, **Then** ese mes aparece en su lugar con monto 0, sin romper la secuencia de meses.
4. **Given** el mes en curso todavía no termina, **When** se muestra su barra y su detalle, **Then** queda identificado como mes en curso con ventas parciales hasta hoy.
5. **Given** un pedido cancelado y otro por cobrar en el mismo mes, **When** se calcula el monto del mes, **Then** el cancelado no cuenta y el que está por cobrar sí.
6. **Given** un pedido registrado a las 9:00 p. m. (hora de Caracas) del último día de un mes, **When** se agrupan las ventas por mes, **Then** ese pedido cuenta en ese mes y no en el siguiente.

---

### User Story 2 - Conocer los 5 productos más vendidos (Priority: P2)

Como administradora, quiero ver en el Resumen los 5 productos que más se están vendiendo, con cuántas unidades salieron y cuánto dinero representaron, para decidir qué producir, qué reponer y qué promocionar.

**Why this priority**: Responde la segunda pregunta que más se hace la dueña ("¿qué es lo que más sale?"). La información ya existe en las analíticas de ventas, pero como una tabla completa por semana o por mes; aquí queda resumida y a la vista.

**Independent Test**: Con ventas de al menos 6 productos distintos en los últimos 30 días, la administradora abre "Resumen" y ve exactamente los 5 productos con más unidades vendidas, ordenados de mayor a menor, cada uno con sus unidades y su monto en USD; el sexto no aparece.

**Acceptance Scenarios**:

1. **Given** ventas de más de 5 productos en los últimos 30 días, **When** la administradora abre "Resumen", **Then** el gráfico muestra solo los 5 productos con más unidades vendidas, ordenados de mayor a menor.
2. **Given** el gráfico de productos, **When** la administradora lo lee, **Then** cada producto muestra su nombre, las unidades vendidas y el monto vendido en USD, legibles sin tener que pasar el cursor.
3. **Given** dos productos con las mismas unidades vendidas, **When** se ordena el ranking, **Then** va primero el que sumó más monto.
4. **Given** solo 3 productos tuvieron ventas en el período, **When** se muestra el gráfico, **Then** aparecen esos 3 y no se rellenan posiciones con productos sin ventas.
5. **Given** ningún producto tuvo ventas en el período, **When** se muestra el gráfico, **Then** aparece un mensaje que lo explica en lugar de un gráfico vacío.
6. **Given** el gráfico de productos, **When** la administradora quiere ver todos los productos y no solo los 5 primeros, **Then** encuentra un acceso a las analíticas de ventas.

---

### User Story 3 - Comparar las ventas a consumidores y a mayoristas (Priority: P2)

Como administradora, quiero ver cuántas ventas se hicieron a consumidores y cuántas a mayoristas, y cuánto dinero aportó cada grupo, para entender de dónde viene el ingreso del negocio.

**Why this priority**: Hoy el panel solo desglosa las ventas por tipo de precio (detal, mayor, promo), que no es lo mismo que el tipo de cliente. Es una lectura nueva, pero depende menos del día a día que las dos anteriores.

**Independent Test**: Con 7 ventas a consumidores por $210 y 3 ventas a mayoristas por $540 en los últimos 30 días, la administradora abre "Resumen" y ve "Consumidores: 7 ventas · $210,00 · 28 %" y "Mayoristas: 3 ventas · $540,00 · 72 %", y la suma coincide con el indicador de ventas del período.

**Acceptance Scenarios**:

1. **Given** ventas a clientes de ambos tipos en los últimos 30 días, **When** la administradora abre "Resumen", **Then** ve un gráfico que compara "Consumidores" y "Mayoristas" y, para cada grupo, la cantidad de ventas, el monto en USD y su porcentaje del monto total.
2. **Given** las cifras de ambos grupos, **When** se suman, **Then** la cantidad de ventas y el monto coinciden con el indicador "Ventas acumuladas" de la misma pestaña.
3. **Given** un cliente mayorista que compró algunos productos a precio detal, **When** se clasifica su venta, **Then** cuenta como venta a mayorista, porque manda el tipo del cliente y no el tipo de precio de cada línea.
4. **Given** solo hubo ventas a un tipo de cliente, **When** se muestra el gráfico, **Then** el otro grupo aparece con 0 ventas y $0,00, sin desaparecer.
5. **Given** no hubo ventas en el período, **When** se muestra el gráfico, **Then** aparece un mensaje que lo explica en lugar de un gráfico vacío.

---

### User Story 4 - Ver cuánta gente visita la tienda (Priority: P3)

Como administradora, quiero ver en el Resumen cuánta gente ha visitado la tienda en línea y cómo ha variado día a día, para relacionar el movimiento de la tienda con las ventas y con lo que publico en redes.

**Why this priority**: Completa la lectura del negocio, pero depende de una fuente externa que puede no estar disponible y ya existe una sección dedicada (Analíticas → Visitas) donde consultar el dato. Es el gráfico que menos bloquea el valor de la pestaña.

**Independent Test**: Con la fuente de visitas configurada y con datos, la administradora abre "Resumen" y ve la evolución diaria de visitantes de los últimos 30 días, junto con el total de visitantes y de páginas vistas del período; con la fuente caída, ve un mensaje dentro de ese gráfico y los otros tres siguen funcionando.

**Acceptance Scenarios**:

1. **Given** la fuente de visitas tiene datos de los últimos 30 días, **When** la administradora abre "Resumen", **Then** ve un gráfico con los visitantes de cada día del período y los totales de visitantes y de páginas vistas.
2. **Given** el gráfico de visitas, **When** la administradora señala un día, **Then** ve la fecha y los visitantes de ese día.
3. **Given** la fuente de visitas no está configurada, no responde o rechaza la consulta, **When** la administradora abre "Resumen", **Then** el espacio de ese gráfico muestra un mensaje claro del estado, sin cifras, y los demás gráficos e indicadores se muestran con normalidad.
4. **Given** la fuente responde pero no hubo visitas en el período, **When** se muestra el gráfico, **Then** aparece un mensaje de "sin visitas en el período" y no un gráfico plano que parezca un error.
5. **Given** el gráfico de visitas, **When** la administradora quiere el desglose por página, origen, país o dispositivo, **Then** encuentra un acceso a la sección de visitas existente.

---

### Edge Cases

- **Negocio sin ventas registradas** (instalación nueva o base de pruebas vacía): los tres gráficos de ventas muestran su mensaje de "sin ventas" y la pestaña no falla.
- **Mes en curso recién empezado**: su barra puede ser muy baja; queda identificada como parcial para que no se lea como una caída.
- **Ventas cargadas desde Excel con fechas pasadas**: cuentan en el mes de su fecha de compra, no en el mes en que se cargó el archivo.
- **Pedido que se cancela después**: deja de contar en todos los gráficos la próxima vez que se abre la pestaña.
- **Cantidades con decimales** (productos vendidos por fracción): las unidades se muestran con hasta 2 decimales y sin ceros sobrantes.
- **Producto entregado gratis como premio**: suma unidades pero no monto, igual que en las analíticas de ventas.
- **Nombre de producto muy largo**: se recorta en el gráfico y el nombre completo se puede consultar en el detalle.
- **Un mes excepcional muy por encima del resto**: las barras de los demás meses siguen siendo distinguibles y sus valores se pueden leer en el detalle.
- **Cliente al que se le cambió el tipo** (de consumidor a mayorista o al revés): sus ventas se clasifican con el tipo que tiene hoy.
- **Fuente de visitas lenta**: los gráficos de ventas no esperan por ella; el gráfico de visitas muestra que está cargando y luego el dato o el mensaje de error.
- **Fuente de visitas con datos atrasados o parciales** en los días más recientes: el gráfico no presenta el dato como tiempo real.
- **Pantalla de teléfono**: los cuatro gráficos se apilan en una columna y los detalles se abren con un toque.

## Requirements *(mandatory)*

### Functional Requirements

**Organización de la pestaña**

- **FR-001**: La pestaña "Resumen" del panel administrativo (`/admin`) DEBE presentar como contenido principal cuatro gráficos: ventas por mes, top 5 de productos más vendidos, visitas de la tienda y ventas por tipo de cliente.
- **FR-002**: La pestaña DEBE conservar los cuatro indicadores actuales (ventas acumuladas, pedidos abiertos, alertas de inventario y clientes mayoristas) y los accesos rápidos. Los dos paneles de texto que hoy solo enlazan a analíticas y a notas de entrega se retiran; cada gráfico ofrece el acceso a su sección de detalle.
- **FR-003**: Cada gráfico DEBE mostrar un título, el período que cubre y la unidad de sus cifras (USD, unidades, ventas o visitantes), de modo que se entienda sin explicación adicional.
- **FR-004**: Los cuatro gráficos DEBEN poder leerse y usarse en un teléfono sin desplazamiento horizontal, y el detalle de cada elemento DEBE poder abrirse con cursor, con un toque y con teclado.
- **FR-005**: Cuando un gráfico no tiene datos que mostrar, DEBE presentar un mensaje que lo explique en lugar de un gráfico vacío o de ceros que parezcan un dato confirmado.

**Reglas comunes de las cifras de ventas**

- **FR-006**: Para los gráficos, una "venta" es un pedido que no está cancelado, esté cobrado o no, registrado por cualquier vía (tienda, venta manual o carga de Excel), y se ubica en el tiempo por su fecha de compra.
- **FR-007**: Todos los montos se muestran en USD con dos decimales.
- **FR-008**: Los cortes por día y por mes, y el cálculo de "los últimos 30 días", DEBEN hacerse en hora de Caracas, sin depender de la hora del servidor ni del dispositivo; esto incluye el indicador "Ventas acumuladas" ya existente.
- **FR-009**: Las cifras DEBEN reflejar los pedidos registrados en el momento en que se abre o se recarga la pestaña.

**Gráfico 1: ventas por mes**

- **FR-010**: El sistema DEBE mostrar un gráfico de barras con los últimos 12 meses, incluido el mes en curso, en orden cronológico en el eje horizontal, y el monto vendido en USD en el eje vertical.
- **FR-011**: El monto de cada mes es la suma del total de sus ventas, es decir, lo cobrado o por cobrar al cliente, con descuentos y delivery incluidos.
- **FR-012**: Al señalar una barra, el sistema DEBE mostrar un detalle con el mes y el año, el monto total, la cantidad de ventas y el ticket promedio (monto ÷ cantidad de ventas) de ese mes.
- **FR-013**: Los meses sin ventas DEBEN aparecer con monto 0 y el mes en curso DEBE identificarse como parcial.

**Gráfico 2: top 5 de productos más vendidos**

- **FR-014**: El sistema DEBE mostrar los 5 productos con más unidades vendidas en los últimos 30 días, ordenados de mayor a menor; ante un empate en unidades va primero el de mayor monto.
- **FR-015**: Cada producto DEBE mostrar su nombre, las unidades vendidas y el monto vendido en USD. El monto de un producto es la suma de precio × cantidad de sus líneas de pedido, con la misma regla de la tabla "Venta por producto" de las analíticas de ventas (sin delivery ni descuentos aplicados al pedido).
- **FR-016**: Si menos de 5 productos tuvieron ventas, el gráfico muestra solo esos productos.

**Gráfico 3: visitas de la tienda**

- **FR-017**: El sistema DEBE mostrar la evolución diaria de visitantes de la tienda en los últimos 30 días, junto con el total de visitantes y de páginas vistas del período.
- **FR-018**: El gráfico DEBE usar la misma fuente y las mismas reglas de la sección Analíticas → Visitas: solo tráfico del sitio en producción, cifras agregadas y anónimas, e identificadas como "visitantes agregados" (no como personas únicas).
- **FR-019**: El gráfico DEBE distinguir, dentro de su propio espacio, los estados: con datos, sin visitas en el período, fuente no configurada, fuente no disponible y consulta no autorizada; en ninguno de ellos se muestran cifras inventadas ni detalles sensibles de la conexión.
- **FR-020**: Un fallo o una demora de la fuente de visitas NO DEBE impedir ni retrasar la visualización de los indicadores y de los otros tres gráficos.

**Gráfico 4: ventas por tipo de cliente**

- **FR-021**: El sistema DEBE mostrar un gráfico que compare las ventas a consumidores y a mayoristas en los últimos 30 días, indicando para cada grupo la cantidad de ventas, el monto en USD y el porcentaje que representa del monto total.
- **FR-022**: El tipo de una venta es el tipo registrado del cliente del pedido (consumidor o mayorista), no el tipo de precio de sus líneas.
- **FR-023**: La suma de ambos grupos, en cantidad de ventas y en monto, DEBE coincidir con el indicador "Ventas acumuladas" de la pestaña, que cubre el mismo período con la misma regla.

**Acceso y alcance**

- **FR-024**: La pestaña y todas sus cifras DEBEN quedar protegidas por el control de acceso existente del panel administrativo, verificado en el servidor; los gráficos no muestran datos personales de clientes.
- **FR-025**: La pestaña es solo de consulta: no crea, modifica ni guarda pedidos, clientes, productos, inventario ni registros de visitas.

### Key Entities *(include if feature involves data)*

- **Venta (pedido)**: pedido no cancelado, con fecha de compra, total en USD y cliente. Es la base de los gráficos de ventas por mes y por tipo de cliente.
- **Línea de pedido**: producto, cantidad (hasta 2 decimales) y precio unitario dentro de una venta. Es la base del top 5 de productos.
- **Cliente**: aporta su tipo (consumidor o mayorista) para clasificar cada venta.
- **Producto**: aporta el nombre que se muestra en el top 5.
- **Visitas de la tienda**: cifras agregadas y anónimas de visitantes y páginas vistas por día, entregadas por la fuente externa que ya usa la sección de visitas; no se guardan en el sistema.

Esta funcionalidad no crea entidades nuevas ni cambia los datos existentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La administradora identifica el mes con más ventas de los últimos 12 y su monto en menos de 10 segundos desde que abre "Resumen", sin navegar a otra sección.
- **SC-002**: En una verificación con un conjunto conocido de pedidos, el 100 % de las cifras de los gráficos de ventas (monto, cantidad y ticket promedio de cada mes; unidades y monto del top 5; cantidad, monto y porcentaje por tipo de cliente) coincide con el cálculo hecho a mano sobre esos pedidos.
- **SC-003**: El 100 % de los pedidos de prueba registrados entre las 8:00 p. m. y la medianoche (hora de Caracas) del último día de un mes se cuenta en ese mes.
- **SC-004**: Con una conexión normal, los indicadores y los tres gráficos de ventas se ven en menos de 3 segundos al abrir la pestaña, también cuando la fuente de visitas está caída o tarda en responder.
- **SC-005**: En los 5 estados de la fuente de visitas (con datos, sin visitas, no configurada, no disponible y no autorizada) el gráfico de visitas comunica el estado correcto sin cifras inventadas, y el resto de la pestaña funciona en todos ellos.
- **SC-006**: En un teléfono de 360 px de ancho, los cuatro gráficos se leen sin desplazamiento horizontal y el detalle de cualquier barra o punto se abre con un toque.
- **SC-007**: En el 100 % de las verificaciones, la suma de consumidores y mayoristas coincide con el indicador "Ventas acumuladas" del mismo período.
- **SC-008**: Ninguna persona sin acceso administrativo puede ver la pestaña ni obtener sus cifras.

## Fuera de alcance de esta versión

- Selector de período o rangos personalizados dentro del Resumen; los cambios de período se siguen haciendo en Analíticas → Ventas y Analíticas → Visitas.
- Montos en bolívares, comparaciones entre años, metas de venta y proyecciones (el predictor sigue en las analíticas de ventas).
- Exportar o imprimir los gráficos.
- Cambios en las páginas de Analíticas → Ventas y Analíticas → Visitas.
- Guardar un histórico propio de visitas.

## Assumptions

- **"Resumen"** es la primera opción del menú del panel (`/admin`), la que hoy muestra "Control de operación".
- **Ventas por mes**: se muestran los últimos 12 meses porque la petición no fija una ventana; es suficiente para ver la temporada completa sin saturar el gráfico.
- **Detalle del mes**: "el detalle de la venta en cada mes" se interpreta como monto total, cantidad de ventas y ticket promedio. No lista los pedidos del mes; para eso está "Ventas y pedidos".
- **Top 5**: "más vendidos" se interpreta como más unidades vendidas; el monto se muestra junto a las unidades pero no decide el orden, salvo en empates.
- **Período de los gráficos 2, 3 y 4**: los últimos 30 días, el mismo período que ya usa la pestaña ("Visión general · últimos 30 días"), para que los gráficos y los indicadores cuenten la misma historia. Un período móvil evita que el top 5 quede casi vacío los primeros días de cada mes.
- **Qué cuenta como venta**: todo pedido no cancelado, aunque esté por cobrar o en pedido, igual que en las analíticas actuales. Los pedidos cargados desde Excel cuentan, porque son ventas reales del negocio y aportan el historial de meses anteriores.
- **Monto de una venta frente a monto de un producto**: el gráfico por mes y el de tipo de cliente usan el total del pedido (con delivery y descuentos); el top 5 usa el importe de las líneas del producto. Por eso la suma del top 5 no tiene que coincidir con el total del período.
- **Tipo de cliente**: se usa el tipo que el cliente tiene registrado hoy; el sistema no guarda el tipo que tenía al momento de cada venta.
- **Visitas**: "cuánta gente ha visitado la tienda" se interpreta como visitantes por día. Se asume que la fuente de visitas actual puede entregar el dato por día; hoy el panel solo le pide totales y desgloses, así que esto se confirma en la planificación. Si no fuera posible, se acuerda con la usuaria una alternativa antes de implementar.
- **Contenido actual de la pestaña**: los indicadores y los accesos rápidos se mantienen porque sirven a la operación diaria (pedidos abiertos, alertas de inventario); los dos paneles de enlaces se retiran porque los gráficos los reemplazan.
- **Diseño**: se reutiliza la identidad visual, la navegación y los estilos actuales del panel; no se definen colores ni tipografías nuevas.
- **Superficie**: solo se toca el panel administrativo; la tienda, la venta rápida y la cotización rápida no cambian.
