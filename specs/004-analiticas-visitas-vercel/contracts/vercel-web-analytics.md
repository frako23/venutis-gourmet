# Contrato externo: Vercel Web Analytics

**Consumidor**: capa server-only de `/admin/analytics`.

**Proveedor**: Web Analytics API de Vercel.

**Referencia consultada**: 2026-10-15. Ver [API de Web Analytics](https://vercel.com/docs/analytics/web-analytics-api), [agregados de páginas vistas](https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views) y [conteos de páginas vistas](https://vercel.com/docs/rest-api/web-analytics/counts-page-views).

## Configuración de autenticación

- Base: `https://api.vercel.com/v1/query/web-analytics`.
- Header: `Authorization: Bearer <VERCEL_ANALYTICS_TOKEN>`.
- Obligatorios: `projectId`, `since`, `until` cuando se consulta un periodo.
- Equipo: `teamId` o `slug` solo cuando el proyecto pertenece a un equipo.
- El token nunca se incluye en props, HTML, query strings del navegador, mensajes ni
  logs.

## Solicitud de totales

`GET /visits/count`

Parámetros:

- `projectId`.
- `since` y `until` en formato de fecha aceptado por Vercel.
- `teamId` o `slug`, si aplica.
- La fuente es productiva; la capa interna no permite seleccionar previews.

Respuesta relevante esperada:

```json
{
  "data": {
    "pageviews": 1250,
    "visitors": 980
  },
  "query": {
    "since": "2026-10-01",
    "until": "2026-10-07"
  },
  "version": 1
}
```

La normalización acepta solo `data.pageviews` y `data.visitors` como enteros no
negativos. Los demás campos no se reenvían a la interfaz.

## Solicitud de desgloses

`GET /visits/aggregate`

Se realizan cuatro lecturas independientes, con la misma fecha, proyecto y equipo:

| Panel | `by` | Límite | Proyección visible |
|---|---|---:|---|
| Páginas | `requestPath` | 10 | Ruta sin query string |
| Referentes | `referrerHostname` | 10 | Hostname o "Tráfico directo" |
| Países | `country` | 10 | País |
| Dispositivos | `deviceType` | 10 | Tipo de dispositivo |

Parámetros comunes:

- `projectId`, `since`, `until`, `by`, `limit=10`.
- `filter=environment eq 'production'` cuando el endpoint lo acepte; la respuesta se
  rechaza si contiene un entorno distinto a producción.
- `teamId` o `slug`, si aplica.

La capa admite el agrupamiento `Others` como una fila normalizada con `isOthers=true`.
No se renderizan campos como `visitorId`, `requestHostname`, UTM ni valores de evento.

## Errores y traducción interna

| Respuesta externa | Estado interno | Mensaje visible |
|---:|---|---|
| 400 | `invalid` | No se pudo validar el periodo o la consulta. |
| 401/403 | `unauthorized` | La conexión de analítica no tiene autorización suficiente. |
| 404/410 | `not_configured` o `unavailable` | Verifica el proyecto y la habilitación de Web Analytics. |
| 503 | `unavailable` | Vercel no está disponible temporalmente. |
| Timeout, DNS o red | `unavailable` | No se pudieron actualizar las visitas; puedes reintentar. |
| 200 sin filas o métricas cero | `no_data` | No hay datos para el intervalo consultado. |

Los cuerpos de error del proveedor se registran solo como código controlado, nunca como
texto completo. Si alguna de las cinco lecturas falla, el bloque de visitas devuelve un
estado recuperable y la página conserva el resultado comercial.
