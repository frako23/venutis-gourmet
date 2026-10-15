# Investigación: Analíticas de visitas con Vercel

**Fecha**: 2026-10-15

## Decisiones

### 1. Usar la Web Analytics API oficial de Vercel como fuente de lectura

**Decisión**: Consultar los datasets `visits` de Vercel desde el servidor, sin añadir
Google Analytics, otro proveedor ni un SDK adicional.

**Motivo**: La API oficial entrega `pageviews` y `visitors`, usa el mismo modelo agregado
que el panel de Vercel y permite construir reportes propios. La documentación de Vercel
requiere tener Web Analytics habilitado, un token de acceso, el `projectId` y, si aplica,
el `teamId` o `slug`.

**Alternativas consideradas**:

- Google Analytics u otro proveedor: rechazado porque duplica la fuente de datos y añade
  configuración y privacidad fuera del alcance solicitado.
- Vercel Drains: rechazado porque entrega flujos sin procesar y obligaría a crear una
  infraestructura de ingestión y persistencia que la primera versión no necesita.

**Referencia**: [Query Web Analytics with the API](https://vercel.com/docs/analytics/web-analytics-api).

### 2. Separar el conteo de los desgloses

**Decisión**: Usar `visits/count` para visitantes y páginas vistas del intervalo, y
`visits/aggregate` para cuatro consultas independientes agrupadas por `requestPath`,
`referrerHostname`, `country` y `deviceType`, con límite de 10 filas.

**Motivo**: Vercel define el endpoint de conteo para un total y el agregado para filas
agrupadas por dimensión. La API permite una dimensión de agrupación por consulta y
agrupa el resto como `Others`, por lo que cuatro lecturas paralelas son claras y
acotadas. La consulta de agregados usará producción explícitamente aunque Vercel ya la
trata como entorno predeterminado.

**Alternativa considerada**: Una sola consulta agregada con múltiples dimensiones:
rechazada porque la API limita la agrupación a una dimensión temporal y otra dimensión,
lo que no cubre los cuatro paneles solicitados de manera legible.

**Referencia**: [Aggregates page views](https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views) y
[Counts page views](https://vercel.com/docs/rest-api/web-analytics/counts-page-views).

### 3. No crear un endpoint público de la aplicación

**Decisión**: El formulario de filtros enviará parámetros GET a la página protegida y la
página volverá a consultar Vercel en el servidor. Los componentes reciben solamente la
proyección normalizada.

**Motivo**: Reutiliza `requireAdmin` del layout, evita duplicar autorización en una ruta
JSON nueva y garantiza que `VERCEL_ANALYTICS_TOKEN` nunca llegue al navegador. Un botón
de reintento puede conservar los mismos parámetros y solicitar un nuevo renderizado.

**Alternativa considerada**: Ruta `/api/admin/analytics/visits` consumida desde un
componente cliente; rechazada por añadir superficie de autorización y no aportar valor
para esta primera versión.

### 4. Mantener la integración sin persistencia local

**Decisión**: No crear modelos Prisma ni migraciones. La capa de integración devolverá
un resultado tipado con el periodo, los totales, los desgloses, `consultedAt` y un estado
de disponibilidad.

**Motivo**: La especificación pide una lectura de los datos de Vercel y deja la retención
en manos de la fuente. Persistir una copia introduciría sincronización, datos obsoletos
y decisiones de retención sin una necesidad de negocio concreta.

### 5. Tratar el periodo de visitas como una regla distinta a ventas

**Decisión**: Crear `visit-periods.ts` con presets de 7, 30 y 90 días y rango
personalizado, en vez de modificar `resolveAnalyticsPeriod`, que actualmente modela
semanas y meses comerciales.

**Motivo**: Evita cambiar el significado de los filtros existentes de ventas y permite
validar rangos, fecha inicial y fecha final de forma independiente. Las fechas se
normalizan como fechas calendario de la zona operativa `America/Caracas` y se envían a
Vercel como `since`/`until`; la fecha de consulta se muestra como momento de lectura,
no como garantía de tiempo real.

### 6. Mapear errores sin filtrar detalles externos

**Decisión**: Mapear 400 a consulta inválida, 401/403 a no autorizado, 404/410 a
configuración o proyecto no disponible, 503 a servicio no disponible y timeout/red a
indisponibilidad temporal. La interfaz solo recibe un código y un mensaje operativo.

**Motivo**: La página de ventas debe seguir funcionando y los cuerpos de error de Vercel
no deben aparecer en la UI ni en logs con posibles datos sensibles.

### 7. Aplicar una proyección de privacidad defensiva

**Decisión**: Solicitar `requestPath` y `referrerHostname`, no URLs completas; aceptar
solo campos conocidos; eliminar query strings, hashes, `visitorId` y valores vacíos de
la proyección; limitar etiquetas a una longitud razonable.

**Motivo**: Vercel documenta `requestPath` como ruta sin parámetros, pero la capa propia
mantendrá una sanitización defensiva y nunca renderizará identificadores de visitantes.
La métrica `visitors` se etiquetará como agregada según Vercel, no como una identidad
persistente entre días.

**Referencia**: [Vercel Web Analytics](https://vercel.com/docs/analytics).

## Variables de configuración decididas

- `VERCEL_ANALYTICS_TOKEN`: token de lectura, solo servidor.
- `VERCEL_ANALYTICS_PROJECT_ID`: identificador del proyecto productivo.
- `VERCEL_ANALYTICS_TEAM_ID`: identificador del equipo, opcional para proyectos personales.
- `VERCEL_ANALYTICS_TEAM_SLUG`: alternativa opcional al identificador de equipo; no se
  requieren ambos.

La implementación debe rechazar la configuración ambigua si faltan token o proyecto, o
si se declaran simultáneamente identificador y slug de equipo sin una regla explícita.
Los valores reales se configuran localmente o en Vercel y nunca se versionan.
