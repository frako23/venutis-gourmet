# Implementation Plan: Panel administrativo integral

**Branch**: `002-panel-administrativo-integral` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-panel-administrativo-integral/spec.md`

## Summary

Se actualizará la superficie administrativa existente y se ampliará la entidad
`Transaccion` para que siga siendo la fuente única de ventas, pedidos, descuentos y
analíticas. El trabajo añadirá una navegación y un dashboard operativos, una tabla de
ventas con registro manual, descuentos calculados en USD, estados operativos con
historial, reportes semanales/mensuales, un predictor explicable y notas de entrega
para mayoristas con PDF descargable.

La implementación reutilizará las rutas administrativas actuales, Server Actions,
Prisma, Zod, Recharts y la autenticación de Stack Auth. Las escrituras sensibles se
validarán y ejecutarán del lado del servidor dentro de transacciones de base de datos.
La generación de PDF será una capacidad local del panel, sin servicio externo de
documentos ni cambio en el flujo público o en `/venta-rapida`.

## Technical Context

**Language/Version**: TypeScript 5.9 en modo estricto, con React 19.1 y Next.js 15.5.9

**Primary Dependencies**: Next.js App Router, Prisma 6.17, PostgreSQL, Zod 4, Tailwind CSS 4, Recharts, Lucide React, Sonner y Stack Auth existentes; `pdf-lib` como única dependencia local nueva para la descarga directa del PDF, según la decisión documentada en `research.md`.

**Storage**: PostgreSQL mediante Prisma. Se conservarán `Transaccion`, `DetalleCompra`, `Pago`, `Cliente` y `Producto`; se añadirán campos para importes/descuentos, historial de estados y notas de entrega.

**Testing**: Validaciones puras de importes, descuentos, estados, predictor y reglas de notas con `node:test` ejecutado mediante la configuración TypeScript existente; pruebas de integración contra una base PostgreSQL local aislada; `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npx.cmd prisma validate` y `npm.cmd run build` como puertas de calidad.

**Target Platform**: Aplicación web interna desplegada con Next.js, accesible en escritorio y móvil moderno; los documentos PDF deben poder descargarse desde navegadores compatibles.

**Project Type**: Aplicación web monolítica con App Router, páginas administrativas, componentes React, Server Actions y persistencia Prisma.

**Performance Goals**: Mostrar la primera página de ventas y sus filtros habituales en menos de 2 segundos para hasta 100.000 transacciones; generar el resumen analítico seleccionado en menos de 5 segundos para ese volumen; completar y descargar una nota de entrega en menos de 30 segundos.

**Constraints**: No modificar el significado ni los permisos de e-commerce y `/venta-rapida`; no añadir pasarelas, webhooks, colas ni microservicios; no exponer datos administrativos; no probar migraciones destructivas contra producción; mantener importes históricos y tasas asociadas; usar paginación y agregaciones del lado del servidor.

**Scale/Scope**: Una superficie administrativa protegida, aproximadamente seis flujos nuevos o rediseñados, el catálogo y clientes existentes, transacciones históricas y notas de entrega para clientes mayoristas. No se crean nuevos roles ni registro público.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Separación de las tres aplicaciones — PASS**: El alcance se limita al panel administrativo. `/venta-rapida`, e-commerce público y coordinación por WhatsApp mantienen responsabilidades separadas.
- **II. Fuente única y consistencia operacional — PASS**: `Transaccion` sigue siendo la fuente de verdad; las ventas manuales, descuentos y cambios de estado se persisten en PostgreSQL con Prisma y las operaciones de inventario se harán atómicamente.
- **III. Seguridad, privacidad y control administrativo — PASS**: Las páginas y Server Actions exigirán la autenticación y autorización administrativa del servidor. No se versionan secretos ni se añaden accesos públicos.
- **IV. Calidad verificable y cambios trazables — PASS**: El diseño incluye migración revisable, historial de estados, pruebas de reglas de negocio, validación de esquema, lint, compilación y verificación de regresión.
- **V. Simplicidad, experiencia móvil y canales reales — PASS**: Se reutilizan dependencias y modelos existentes, el predictor será explicable y no se agregan integraciones de pago. Las vistas administrativas tendrán una adaptación móvil explícita.

## Project Structure

### Documentation (this feature)

```text
specs/002-panel-administrativo-integral/
├── plan.md              # Este plan
├── research.md          # Decisiones y alternativas de la Fase 0
├── data-model.md        # Entidades, campos, relaciones e invariantes
├── quickstart.md        # Guía de validación local y funcional
├── contracts/
│   └── admin-panel.md   # Contratos de rutas, Server Actions y estados
└── tasks.md             # Fase 2, generado por $speckit-tasks
```

### Source Code (repository root)

```text
app/
└── admin/
    ├── page.tsx                         # Dashboard administrativo
    ├── layout.tsx                       # Protección y shell compartido
    ├── transactions/page.tsx            # Tabla de ventas/pedidos
    ├── transactions/[id]/page.tsx       # Detalle, descuento y estado
    ├── add-transaction/page.tsx          # Registro manual compatible
    ├── analytics/page.tsx               # Analíticas y predictor
    └── delivery-notes/
        ├── page.tsx                     # Listado de notas
        ├── new/page.tsx                  # Formulario mayorista
        ├── [id]/page.tsx                 # Detalle de nota
        └── [id]/pdf/route.ts             # Descarga del PDF

components/admin/
├── dashboard/                            # KPIs y accesos operativos
├── ventas/                               # Tabla, filtros, formulario y estados
├── analiticas/                           # Gráficas, tablas y predictor
├── notas-entrega/                        # Formulario, vista y documento PDF
├── inventario/                           # Gestión existente adaptada al shell
└── UI/                                   # Primitivas administrativas compartidas

lib/
├── actions/
│   ├── admin-sales.ts                    # Alta manual y descuento
│   ├── order-status.ts                   # Cambios e historial de estado
│   └── delivery-notes.ts                 # Alta y consulta de notas
├── admin/
│   ├── auth.ts                           # Requisito de administrador del servidor
│   ├── sales-calculations.ts             # Cálculos puros de importes
│   ├── analytics.ts                      # Consultas agregadas
│   └── forecast.ts                       # Predictor explicable
└── prisma.ts                             # Instancia compartida para nuevas lecturas/escrituras

prisma/
├── schema.prisma                         # Extensión de transacciones y documentos
└── migrations/<timestamp>_admin_panel/   # Migración revisable y no destructiva

tests/
└── admin/
    ├── sales-calculations.test.ts
    ├── forecast.test.ts
    └── delivery-notes.test.ts
```

Las rutas existentes de inventario, productos y transacciones se conservarán para no
romper enlaces internos ni favoritos. La navegación podrá cambiar sus etiquetas a
español y presentar `/admin/transactions` como “Ventas y pedidos”, pero no creará una
segunda aplicación administrativa.

**Structure Decision**: Se mantiene el monolito Next.js existente y se agrupa el
código nuevo por dominio dentro de `app/admin`, `components/admin`, `lib/actions` y
`lib/admin`. No se crea un backend separado ni una capa de repositorios genérica; las
consultas y mutaciones usarán Prisma en módulos de dominio pequeños, con una instancia
compartida y transacciones explícitas donde cambien importes, estados o inventario.

## Constitution Check (Post-Design)

- **I. Separación de las tres aplicaciones — PASS**: Las rutas, acciones y el PDF
  están bajo `/admin`; no se modifican las responsabilidades públicas ni se persiste
  desde `/venta-rapida`.
- **II. Fuente única y consistencia operacional — PASS**: El diseño extiende
  `Transaccion`, reutiliza `DetalleCompra` y mantiene venta, descuento, historial e
  inventario en operaciones Prisma atómicas. La migración conserva datos históricos.
- **III. Seguridad, privacidad y control administrativo — PASS**: `requireAdmin` se
  aplica a páginas sensibles, Server Actions y descarga del PDF; la nota guarda solo
  los datos necesarios y no expone servicios externos.
- **IV. Calidad verificable y cambios trazables — PASS**: Se definieron invariantes,
  historial append-only, tests de dominio, fixtures locales, migración revisable y
  validaciones de TypeScript, lint, Prisma y build.
- **V. Simplicidad, experiencia móvil y canales reales — PASS**: Se conserva el
  monolito, se añade una sola dependencia para PDF, el predictor es una media móvil
  explicable y el contrato incluye validación móvil y límites de WhatsApp.
