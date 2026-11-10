# Contrato de interfaz: pestaña Resumen

**Spec**: [spec.md](../spec.md) | **Datos**: [datos.md](./datos.md) | **Decisiones**: [research.md](../research.md)

Superficie: solo el panel administrativo, en `/admin`. Todo usa las clases `.admin-*`, las fuentes y los colores existentes del panel ([DESIGN.md](../../../DESIGN.md)).

## 1. Estructura de la página

```text
app/admin/page.tsx (servidor)
├─ Cabecera
│   ├─ "Visión general" · título "Control de operación" · subtítulo
│   └─ Accesos rápidos: [Registrar venta] [Agregar producto]
├─ Indicadores: 4 × DashboardCard
├─ Fila A (3 columnas desde xl)
│   ├─ Ventas por mes                (2 columnas)
│   └─ Ventas por tipo de cliente    (1 columna)
└─ Fila B (2 columnas desde lg)
    ├─ Productos más vendidos
    └─ <Suspense> Visitas de la tienda </Suspense>
```

- Por debajo de `lg` todo va en una columna, en este orden: indicadores, ventas por mes, tipo de cliente, productos, visitas.
- Se retiran los dos paneles de enlaces ("Analítica de ventas" y "Documentos mayoristas") y el indicador "Datos del sistema actualizados".
- La eyebrow de la cabecera pasa de "Visión general · últimos 30 días" a "Visión general": cada tarjeta declara su propio período.
- Ningún bloque provoca desplazamiento horizontal a 360 px de ancho (SC-006).

## 2. Componentes

| Componente | Archivo | Tipo | Cambio |
|---|---|---|---|
| `QuickActions` | `components/admin/dashboard/quickActions.tsx` | Servidor | Pasa de panel con dos tarjetas a dos botones (`admin-button-primary` y `admin-button-secondary`) con su icono. |
| `DashboardCard` | `components/admin/dashboard/dashboardCard.tsx` | Servidor | Sin cambios. |
| `ChartCard` | `components/admin/dashboard/chartCard.tsx` | Servidor | **Nuevo.** Marco común de los cuatro gráficos. |
| `MonthlySalesChart` | `components/admin/dashboard/monthlySalesChart.tsx` | Cliente | **Nuevo.** Recharts. |
| `ClientTypeChart` | `components/admin/dashboard/clientTypeChart.tsx` | Servidor | **Nuevo.** HTML y CSS. |
| `TopProductsChart` | `components/admin/dashboard/topProductsChart.tsx` | Servidor | **Nuevo.** HTML y CSS. |
| `VisitsSection` | `components/admin/dashboard/visitsSection.tsx` | Servidor, asíncrono | **Nuevo.** Espera la consulta de visitas y elige estado o gráfico. |
| `VisitsChart` | `components/admin/dashboard/visitsChart.tsx` | Cliente | **Nuevo.** Recharts. |

### `ChartCard`

Un `<section className="admin-panel p-5">` con `aria-labelledby` apuntando a su título.

| Prop | Uso |
|---|---|
| `eyebrow`, `titulo` | Encabezado (`admin-eyebrow` y `<h2>`). |
| `periodo` | Línea que dice qué período y qué unidad cubre (FR-003). |
| `enlace?` | `{ href, texto }`: acceso a la sección de detalle, arriba a la derecha. |
| `children` | El gráfico, el mensaje de vacío o el estado. |
| `cifras?` | Tabla HTML con los mismos datos; se muestra dentro de un `<details>` con el resumen "Ver cifras". |

## 3. Indicadores

| Tarjeta | Valor | Texto de apoyo |
|---|---|---|
| Ventas acumuladas | `formatUsd(indicadores.ventasUsd)` | "N ventas · últimos 30 días" |
| Pedidos abiertos | sin cambios | sin cambios |
| Alertas de inventario | sin cambios | sin cambios |
| Clientes mayoristas | sin cambios | "N notas recientes" |

## 4. Gráfico 1: ventas por mes

- **Encabezado**: eyebrow "Evolución" · título "Ventas por mes" · período "Últimos 12 meses · montos en USD" · enlace "Ver analíticas" a `/admin/analytics/sales?mes=<mesActual>`.
- **Forma**: columnas, una por mes, en orden cronológico. Alto del gráfico: 260 px, incluida la banda del eje.
- **Eje X**: `etiquetaCorta` ("dic", "ene"…). El primer mes y cada enero añaden el año con dos dígitos ("ene 26"). Recharts omite las etiquetas que no caben.
- **Eje Y**: números redondos con separador de miles de `es-VE`, sin decimales ni símbolo; la unidad está en el encabezado. Solo líneas horizontales de cuadrícula, continuas y finas (`#dedfd6`). Sin línea de eje.
- **Barras**: `#a57c2f`, grosor máximo de 24 px, extremo superior redondeado a 4 px y base recta. El mes en curso usa el mismo color al 45 % de opacidad.
- **Etiqueta directa**: solo el mes de mayor monto lleva su valor escrito sobre la barra (SC-001). Ninguna otra barra lleva número.
- **Nota al pie**: "La barra más clara es el mes en curso, con ventas hasta hoy."
- **Detalle** (cursor, toque o teclado, FR-012):

  ```text
  noviembre de 2026 · en curso
  USD 1.234,50
  18 ventas · ticket promedio USD 68,58
  ```

  El monto es el elemento destacado. Un mes sin ventas muestra el mes y "Sin ventas". "· en curso" aparece solo en el mes actual.
- **Teclado**: el gráfico recibe el foco y las flechas izquierda y derecha recorren los meses mostrando el mismo detalle (`accessibilityLayer` de Recharts).
- **Cifras**: tabla con las columnas Mes, Monto, Ventas y Ticket promedio, con los 12 meses.
- **Vacío** (los 12 meses en cero): "Aún no hay ventas registradas en los últimos 12 meses." No se dibujan ejes ni la tabla.
- **Sin animación**: `isAnimationActive={false}`.

## 5. Gráfico 2: productos más vendidos

- **Encabezado**: eyebrow "Lo que más sale" · título "Productos más vendidos" · período `periodo30Dias.label` + " · por unidades" · enlace "Ver todos los productos" a `/admin/analytics/sales`.
- **Forma**: lista ordenada (`<ol>`) de hasta 5 filas. Cada fila:

  ```text
  1  Fettuccine al huevo 500 g                 24 uds
     ████████████████████████████              USD 312,00
  ```

  - posición y nombre del producto, en hasta 2 líneas; el nombre completo va también en `title`;
  - barra de 10 px de alto, color `#a57c2f`, extremo derecho redondeado; su ancho es `cantidadVendida ÷ la mayor cantidad` de la lista;
  - unidades en negrita ("24 uds", hasta 2 decimales, sin ceros sobrantes) y monto debajo con `formatUsd`, en `admin-mono`.
- Todas las cifras están a la vista: no hay detalle emergente ni bloque "Ver cifras".
- **Menos de 5 productos**: se muestran los que haya, sin filas de relleno (FR-016).
- **Vacío**: "No hubo ventas de productos en este período."

## 6. Gráfico 3: visitas de la tienda

- **Encabezado**: eyebrow "Tráfico de la tienda" · título "Visitas de la tienda" · período `periodo30Dias.label` · enlace "Ver visitas" a `/admin/analytics/visits?visitasPeriodo=30d`.
- **Mientras carga** (`fallback` del `<Suspense>`): la misma tarjeta, con su encabezado y un bloque de 200 px con `animate-pulse` y el texto "Consultando visitas…".
- **Con datos** (`status` = `ready`):
  - dos cifras sobre el gráfico: "Visitantes agregados" y "Páginas vistas", con `toLocaleString("es-VE")`;
  - gráfico de área de 200 px de alto con los visitantes de cada día: línea de 2 px en `#66735f` y relleno del mismo color al 10 %;
  - eje X con el día y el mes ("12 oct"), formateados en UTC, unas 6 marcas; eje Y con enteros;
  - detalle con una línea vertical que sigue al cursor o al toque:

    ```text
    mar, 3 nov
    42 visitantes
    118 páginas vistas
    ```

  - nota al pie: "Visitantes agregados por día según Vercel. Cada día se corta en hora universal (UTC)."
  - cifras: tabla con las columnas Día, Visitantes y Páginas vistas.
- **Estados sin gráfico** (FR-019). Nunca se muestran cifras ni ceros:

  | `status` | Mensaje | Acción |
  |---|---|---|
  | `no_data` | "No hubo visitas en este período." | Enlace "Ver visitas" |
  | `not_configured` | "Falta configurar la conexión de visitas en el servidor." | — |
  | `unauthorized` | "La conexión de visitas no tiene permisos suficientes." | — |
  | `unavailable` | "La fuente de visitas no respondió. Puedes intentarlo de nuevo." | Enlace "Reintentar" a `/admin` |
  | `invalid` | "No se pudo consultar el período de visitas." | Enlace "Reintentar" a `/admin` |

  El mensaje va en un bloque con `role="status"`, con el estilo del panel de estado de la página de visitas. No se muestran códigos, cuerpos de error ni nombres de variables de entorno.

## 7. Gráfico 4: ventas por tipo de cliente

- **Encabezado**: eyebrow "Origen del ingreso" · título "Ventas por tipo de cliente" · período `periodo30Dias.label`. Sin enlace.
- **Forma**: dos barras segmentadas finas y, debajo, una fila por grupo con sus cifras.

  ```text
  Cantidad de ventas
  ██████████████████████████▌▐███████████     70 % · 30 %

  Monto vendido
  ██████████▌▐███████████████████████████     28 % · 72 %

  ■ Consumidores     7 ventas     USD 210,00     28 % del monto
  ■ Mayoristas       3 ventas     USD 540,00     72 % del monto
  ```

  - barras de 8 px de alto, extremos redondeados, separación de 2 px entre los dos segmentos; un segmento en cero no se dibuja;
  - colores: consumidores `#a57c2f`, mayoristas `#587487`;
  - cada barra es un `role="img"` con un `aria-label` que dice sus dos porcentajes ("Monto vendido: consumidores 28 %, mayoristas 72 %");
  - cada fila lleva un cuadro del color de su grupo; el texto usa los colores de texto del panel, nunca el color de la serie;
  - los dos grupos aparecen siempre, aunque uno esté en cero (escenario 4 de la Historia 3);
  - porcentajes con un decimal como máximo.
- Todas las cifras están a la vista: no hay detalle emergente ni bloque "Ver cifras".
- **Vacío** (sin ventas en el período): "No hubo ventas en este período."

## 8. Formatos

| Dato | Formato |
|---|---|
| Montos | `formatUsd` de `lib/format.ts` ("USD 1.234,50") |
| Cantidad de ventas, visitantes, páginas vistas | `toLocaleString("es-VE")` |
| Unidades | `toLocaleString("es-VE", { maximumFractionDigits: 2 })` + " uds" |
| Porcentajes | Un decimal como máximo + " %" |
| Meses | `Intl.DateTimeFormat("es-VE")` sobre la clave `YYYY-MM`, con `timeZone: "UTC"` |
| Días de visitas | `Intl.DateTimeFormat("es-VE")` con `timeZone: "UTC"` |

Las fechas nunca se formatean con la zona del navegador.

## 9. Accesibilidad y comportamiento

- Ningún valor depende solo del detalle emergente: los gráficos 1 y 3 tienen su tabla en "Ver cifras", y los gráficos 2 y 4 muestran todo a la vista.
- El foco visible es el del panel (contorno de 3 px).
- La identidad de un grupo nunca depende solo del color: siempre hay un nombre al lado.
- Sin avisos (`toast`): la página no ejecuta acciones.
- Sin estado en el navegador más allá del detalle activo de Recharts; no se usa `localStorage`, ni el store de Zustand, ni el contexto de checkout.
