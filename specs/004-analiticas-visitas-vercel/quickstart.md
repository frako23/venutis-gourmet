# Guía de validación: Analíticas de visitas con Vercel

## Prerrequisitos

1. Proyecto Venoutis Gourmet desplegado o ejecutable localmente.
2. Web Analytics habilitado en el proyecto productivo de Vercel.
3. Token de Vercel con permisos de lectura del proyecto.
4. Identificador del proyecto y, si pertenece a un equipo, `teamId` o `slug`.
5. No copiar valores reales al repositorio ni imprimir el token en la terminal.

Variables esperadas en el entorno local o de Vercel:

```env
VERCEL_ANALYTICS_TOKEN=""
VERCEL_ANALYTICS_PROJECT_ID=""
VERCEL_ANALYTICS_TEAM_ID=""
VERCEL_ANALYTICS_TEAM_SLUG=""
```

`VERCEL_ANALYTICS_TEAM_ID` y `VERCEL_ANALYTICS_TEAM_SLUG` son alternativas; no se
requieren ambos.

La página consulta Vercel desde un módulo `server-only`, vuelve a renderizarse mediante
GET y no crea una ruta pública `/api`. Un fallo o una configuración pendiente afecta
solo el bloque de visitas; las analíticas comerciales se conservan.

## Validación manual

1. Ejecutar `npm.cmd run dev`.
2. Iniciar sesión en el panel administrativo.
3. Abrir `/admin/analytics/sales` y confirmar que muestra únicamente las analíticas de
   ventas y predictor.
4. Abrir `/admin/analytics/visits` y confirmar que muestra únicamente el bloque
   **Visitas del sitio**.
5. Confirmar el periodo inicial de 7 días, los totales de visitantes y páginas vistas,
   y el indicador de entorno productivo.
6. Cambiar a 30 y 90 días y comprobar que el resumen y los cuatro desgloses cambian en
   conjunto.
7. Probar un intervalo personalizado válido y otro invertido; el segundo debe mostrar
   validación sin consultar Vercel.
8. Verificar que las filas muestran rutas o hostnames, nunca query strings,
   identificadores de visitantes, correos o tokens.
9. Reintentar una consulta tras una respuesta no disponible y comprobar que se conserva
   el periodo.
10. Comprobar que `/admin/analytics` redirige a `/admin/analytics/sales` y que el menú
    lateral ofrece ambas opciones debajo de **Analíticas**.
11. Desactivar temporalmente una variable en un entorno seguro de prueba y comprobar el
    estado de configuración sin romper las ventas, el predictor ni el resto del panel.

## Validación automatizada

Desde la raíz del proyecto:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run test:admin
npm.cmd run build
git diff --check
```

La nueva suite debe simular `fetch` y cubrir:

- Conteo y cuatro agregados válidos.
- Respuesta sin datos.
- Periodos de 7, 30, 90 días y personalizado.
- Rango invertido o incompleto.
- Falta de configuración.
- Respuestas 401, 403, 404, 410, 503 y timeout.
- Sanitización de rutas, hostnames, campos desconocidos y `visitorId`.
- Conservación del resultado de ventas cuando la fuente de visitas falla.

Las pruebas de integración existentes que requieren una base aislada deben conservar su
comportamiento actual de ejecución o salto explícito según `RUN_ADMIN_INTEGRATION` y
`ADMIN_TEST_DATABASE_URL`. No se deben crear fixtures de visitas en PostgreSQL.

Evidencia local del 15 de octubre de 2026: `npx.cmd tsc --noEmit`, `npm.cmd run lint`,
`npm.cmd run test:admin` y `npm.cmd run build` finalizaron correctamente. La suite
administrativa reportó 30 pruebas aprobadas y 7 omitidas porque pertenecen a escenarios
de integración que requieren `RUN_ADMIN_INTEGRATION` y una base aislada. El build mostró
warnings de ESLint ya existentes fuera de esta funcionalidad, pero no errores.

## Evidencia esperada

- La página administrativa responde sin exponer el token en HTML, props o red del
  navegador.
- Los totales visibles coinciden con una consulta equivalente del panel/API de Vercel,
  considerando su latencia de agregación.
- No se crea migración ni tabla nueva.
- Un fallo de Vercel muestra un estado localizado únicamente en el bloque de visitas y
  deja utilizables las analíticas comerciales.
