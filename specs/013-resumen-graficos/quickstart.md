# Quickstart: validar la pestaña Resumen con sus cuatro gráficos

**Feature**: 013-resumen-graficos | **Contratos**: [datos](./contracts/datos.md) · [ui](./contracts/ui.md)

## Requisitos previos

- `.env` con `DATABASE_URL` de una base de **desarrollo** y tu correo en `ALLOWED_EMAILS`.
- Para el gráfico de visitas: `VERCEL_ANALYTICS_TOKEN` y `VERCEL_ANALYTICS_PROJECT_ID` (y `VERCEL_ANALYTICS_TEAM_ID` o `VERCEL_ANALYTICS_TEAM_SLUG` si el proyecto es de un equipo), como en la spec 004.
- `npm.cmd install`. No hay migraciones ni dependencias nuevas.

## 0. Confirmar la serie diaria de Vercel (antes de implementar el gráfico 3)

Con las variables cargadas en la sesión de PowerShell (no pegues el token en la terminal ni en el chat):

```powershell
$h = @{ Authorization = "Bearer $env:VERCEL_ANALYTICS_TOKEN" }
$q = "projectId=$env:VERCEL_ANALYTICS_PROJECT_ID&since=2026-10-12&until=2026-11-10&by=day&limit=100"
(Invoke-RestMethod -Headers $h "https://api.vercel.com/v1/query/web-analytics/visits/aggregate?$q").data | Format-Table
```

Añade `&teamId=...` o `&slug=...` si el proyecto es de un equipo.

**Resultado esperado**: una fila por día con `timestamp` (medianoche UTC), `pageviews` y `visitors`, sin fila "Others". Si los días sin visitas no vienen, es correcto: se completan con 0.

**Si no se cumple**: detén la implementación del gráfico 3 y revisa la Decisión 1 de [research.md](./research.md) con la usuaria, como indica la especificación.

## 1. Verificaciones automáticas

```powershell
npm.cmd run lint
npm.cmd run test:admin    # dashboard-core, sales-calculations y website-visits
npm.cmd run build
```

**Resultado esperado**: todo en verde. Los casos están listados en [contracts/datos.md](./contracts/datos.md).

## 2. Validación manual

Arranca con `npm.cmd run dev` y entra a `/admin` con un correo autorizado. Prepara en la base de desarrollo, con "Registrar venta":

- 2 clientes: un consumidor y un mayorista;
- 6 productos con existencia;
- ventas en al menos 3 meses distintos, usando el campo de fecha del formulario;
- una venta con fecha del **último día del mes pasado a las 21:00**;
- en los últimos 30 días: ventas a ambos tipos de cliente que incluyan los 6 productos con cantidades distintas, y un pedido que luego canceles.

### Historia 1: ventas por mes

1. Hay 12 barras, de la más antigua al mes en curso; los meses sin ventas ocupan su lugar sin barra.
2. La barra del mes en curso es más clara, y la nota al pie lo explica.
3. La barra más alta lleva su monto escrito encima.
4. Pasa el cursor por una barra: aparece el mes y el año, el monto, la cantidad de ventas y el ticket promedio. Comprueba un mes a mano contra "Ventas y pedidos".
5. La venta de las 21:00 del último día del mes pasado cuenta en el mes pasado, no en el actual (SC-003).
6. El pedido cancelado no suma en ninguna barra.
7. Con el teclado: lleva el foco al gráfico con Tab y recorre los meses con las flechas; el detalle cambia.
8. Abre "Ver cifras": la tabla muestra los mismos 12 meses y valores.

### Historia 2: productos más vendidos

1. Aparecen exactamente 5 productos, ordenados por unidades de mayor a menor; el sexto no aparece.
2. Cada fila muestra el nombre, las unidades y el monto sin pasar el cursor.
3. Suma a mano las unidades de un producto en los pedidos de los últimos 30 días: coincide.
4. "Ver todos los productos" abre las analíticas de ventas.
5. En una base con solo 3 productos vendidos, aparecen 3 filas; sin ventas, aparece el mensaje de vacío.

### Historia 3: ventas por tipo de cliente

1. Se ven los dos grupos con su cantidad de ventas, su monto y su porcentaje.
2. La suma de ventas y de monto de los dos grupos coincide con la tarjeta "Ventas acumuladas" (SC-007).
3. Una venta al mayorista con líneas a precio detal cuenta en "Mayoristas".
4. En una base con ventas a un solo tipo, el otro grupo aparece en cero.

### Historia 4: visitas de la tienda

1. Con la conexión configurada: se ven los visitantes agregados, las páginas vistas y la curva de 30 días. Los totales coinciden con `/admin/analytics/visits?visitasPeriodo=30d`.
2. Señala un día: aparecen la fecha, los visitantes y las páginas vistas.
3. "Ver visitas" abre la página de visitas en 30 días.
4. Recorre los estados (reinicia `npm.cmd run dev` tras cada cambio de `.env`):

   | Cómo provocarlo | Qué debe verse en la tarjeta de visitas |
   |---|---|
   | Quitar `VERCEL_ANALYTICS_TOKEN` | "Falta configurar la conexión…" |
   | Poner un token inválido | "…no tiene permisos suficientes." |
   | Desconectar la red del equipo | "…no respondió. Puedes intentarlo de nuevo." y "Reintentar" |
   | Proyecto sin visitas en el período | "No hubo visitas en este período." |

   En los cuatro casos, los indicadores y los otros tres gráficos se ven completos, y no aparece ninguna cifra de visitas ni texto técnico (SC-005).
5. Con la red del navegador limitada ("Slow 4G" en las herramientas de desarrollo) o la fuente caída: los indicadores y los gráficos de ventas aparecen primero y la tarjeta de visitas muestra "Consultando visitas…" hasta resolverse (SC-004).

### Organización y teléfono

1. Los accesos "Registrar venta" y "Agregar producto" están en la cabecera y funcionan.
2. Ya no aparecen los paneles "Analítica de ventas" ni "Documentos mayoristas".
3. A 360 px de ancho (modo dispositivo del navegador): todo queda en una columna, no hay desplazamiento horizontal, y un toque sobre una barra o sobre la curva abre su detalle (SC-006).

### Acceso

1. Cierra la sesión y abre `/admin`: redirige al acceso del panel y no se ve ninguna cifra (SC-008).
2. Entra con un correo que no esté en `ALLOWED_EMAILS`: tampoco se ve el Resumen.

### Regresión

1. `/admin/analytics/sales` muestra la tabla "Venta por producto" con las mismas cifras que antes del cambio para una misma semana o mes.
2. `/admin/analytics/visits` sigue mostrando totales y desgloses.
