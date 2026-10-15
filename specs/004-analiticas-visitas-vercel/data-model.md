# Modelo de datos: Analíticas de visitas con Vercel

Esta funcionalidad es de solo lectura. No añade tablas, columnas, relaciones ni
migraciones a PostgreSQL.

## VisitPeriod

Representa el intervalo solicitado por el administrador.

| Campo | Tipo | Regla |
|---|---|---|
| `preset` | `"7d" \| "30d" \| "90d" \| "custom"` | Los presets calculan el intervalo hasta el día actual de la zona operativa. |
| `since` | `string` | Fecha calendario `YYYY-MM-DD`, incluida. |
| `until` | `string` | Fecha calendario `YYYY-MM-DD`, incluida y no anterior a `since`. |
| `label` | `string` | Texto localizado para la interfaz. |
| `isValid` | `boolean` | Falso para rango incompleto, invertido o con formato inválido. |

Reglas adicionales:

- El intervalo inicial es `7d`.
- El intervalo personalizado exige ambas fechas.
- Los valores de query string se validan antes de llamar a Vercel.
- El servicio no amplía automáticamente un periodo fuera de la ventana histórica de la
  fuente; devuelve la respuesta disponible o el estado correspondiente.

## VisitMetric

Representa un total agregado para el intervalo.

| Campo | Tipo | Regla |
|---|---|---|
| `pageviews` | `number` | Entero no negativo proveniente de `visits/count`. |
| `visitors` | `number` | Entero no negativo proveniente de `visits/count`; se etiqueta como métrica agregada de Vercel. |

## VisitBreakdownRow

Representa una fila de un panel agrupado.

| Campo | Tipo | Regla |
|---|---|---|
| `label` | `string` | Valor sanitizado de una dimensión permitida. |
| `pageviews` | `number` | Entero no negativo. |
| `visitors` | `number` | Entero no negativo. |
| `isOthers` | `boolean` | Verdadero cuando Vercel agrupa valores restantes en `Others`. |

Dimensiones permitidas en la primera versión:

- `requestPath`: página o ruta sin parámetros de consulta.
- `referrerHostname`: dominio referente; el valor vacío se presenta como tráfico directo.
- `country`: código o nombre recibido de Vercel.
- `deviceType`: tipo de dispositivo recibido de Vercel.

No se conserva ni se expone `visitorId`, URL completa, query string, hash, correo,
identificador de pedido o token.

## WebsiteVisitsResult

Proyección que recibe la interfaz administrativa.

```text
{
  period: VisitPeriod,
  environment: "production",
  queriedAt: string,
  status: "ready" | "no_data" | "not_configured" | "unavailable" | "unauthorized" | "invalid",
  summary: VisitMetric | null,
  breakdowns: {
    paths: VisitBreakdownRow[],
    referrers: VisitBreakdownRow[],
    countries: VisitBreakdownRow[],
    devices: VisitBreakdownRow[]
  },
  message: string
}
```

### Estados

- `ready`: el conteo y los cuatro desgloses se validaron y pueden mostrarse.
- `no_data`: la respuesta válida no contiene métricas para el intervalo.
- `not_configured`: faltan variables seguras o la analítica aún no está lista.
- `unavailable`: timeout, red, 404/410 de servicio o 503.
- `unauthorized`: token inválido o sin permisos.
- `invalid`: el periodo o la configuración local no supera la validación.

El estado de visitas no cambia el estado ni el resultado de las analíticas de ventas.
