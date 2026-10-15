# Implementation Plan: Checkout directo desde Venta Rápida

**Branch**: `005-checkout-venta-rapida` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-checkout-venta-rapida/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

La vista `/venta-rapida` conservará WhatsApp como canal de coordinación y agregará una
segunda salida hacia el checkout existente. El carrito rápido se convertirá al formato
que ya consume `/finalizar-compra`; el checkout reutilizará el registro de cliente,
direcciones, métodos de pago, venta, inventario y confirmación actuales, pero con
validación completa del lado servidor.

El diseño requiere ampliar el registro de la venta para conservar el cargo y la
dirección histórica de delivery, asociar una clave de idempotencia y registrar el
estado operativo correcto. La creación de venta, detalles, pago declarado e inventario
será consistente y no se marcará como pagada una operación cuyo cobro no haya sido
confirmado por el negocio.

## Technical Context

<!--
  Contexto técnico documentado para el proyecto y la feature.
-->

**Language/Version**: TypeScript estricto sobre Next.js 15.5, React 19 y App Router

**Primary Dependencies**: Prisma 6.17, PostgreSQL, Zustand 5, Zod 4, Server Actions existentes y componentes React del checkout

**Storage**: PostgreSQL mediante Prisma; la fuente de verdad es la base de datos configurada para el entorno aislado de desarrollo

**Testing**: `node:test` con `ts-node/esm` para reglas y acciones, pruebas de integración condicionadas a una base local aislada, `npm.cmd run test:admin`, lint, TypeScript y verificación manual móvil del flujo

**Target Platform**: Aplicación web pública en navegadores móviles y de escritorio, con procesamiento persistente en el servidor

**Project Type**: Aplicación web Next.js con superficies públicas, checkout y panel administrativo

**Performance Goals**: El cliente debe ver una respuesta de confirmación o un error recuperable en un tiempo normal de red y completar la tarea principal en menos de 4 minutos; no se introduce procesamiento en segundo plano

**Constraints**: No pasarela, webhook ni conciliación automática; no probar contra producción; no confiar en totales, precios, stock, delivery o estado enviados por el navegador; la confirmación debe ser atómica y móvil

**Scale/Scope**: Una vista rápida, el checkout público existente, una acción de persistencia de pedido, el modelo de venta y sus consumidores administrativos; cuatro métodos de pago ya expuestos por la UI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Resultado | Evidencia del diseño |
|---|---|---|
| Separación de superficies | PASS | `/venta-rapida` sigue siendo pública y rápida; el panel solo recibe el pedido para operación interna. |
| Fuente única y consistencia | PASS | La venta, el pago declarado, los detalles, la dirección histórica y el inventario se validan y persisten con la operación del pedido. |
| Seguridad y privacidad | PASS | Las validaciones finales ocurren en servidor; el navegador no decide precio, stock, estado ni cargo de delivery; no se añaden credenciales ni accesos nuevos. |
| Calidad trazable | PASS | Se agregan pruebas de reglas, integración aislada, migración revisable, lint, TypeScript y verificación móvil. |
| Simplicidad y canales reales | PASS | Se reutiliza checkout, Prisma, Zustand, acciones y WhatsApp; no se agregan pasarelas, webhooks, colas ni servicios externos. |

No hay violaciones que requieran justificar complejidad adicional.

### Re-check after Phase 1 design

PASS. El modelo conserva las tres superficies, limita las escrituras al servidor,
mantiene PostgreSQL/Prisma como fuente de verdad, hace atómica la operación que
afecta inventario, no incorpora pagos externos y deja pruebas reproducibles contra una
base aislada. La dirección histórica y la clave de idempotencia agregan solo los datos
necesarios para cumplir la especificación y evitar inconsistencias operativas.

## Project Structure

### Documentation (this feature)

```text
specs/005-checkout-venta-rapida/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/
│   └── checkout-directo.md
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  Estructura concreta del repositorio para esta feature.
-->

```text
app/
├── venta-rapida/page.tsx
├── finalizar-compra/page.tsx
├── confirmacion/page.tsx
└── admin/transactions/
components/
├── venta-rapida/puntoDeVenta.tsx
└── finalizar-compra/
    ├── checkoutForm.tsx
    ├── personalInformation.tsx
    ├── deliveryInformation.tsx
    ├── addressManager.tsx
    └── paymentInformation.tsx
lib/
├── actions/checkout.ts
├── actions/clients.ts
├── actions/address.ts
├── constants/constants.ts
└── pos.ts
store/appStore.ts
prisma/
├── schema.prisma
└── migrations/<timestamp>_checkout_venta_rapida/migration.sql
tests/
├── admin/
└── checkout/
```

**Structure Decision**: Se mantiene el monolito web existente. La vista rápida solo
adapta su carrito al store compartido y deriva al checkout público; las reglas de
precio, stock, entrega, cliente, pago y persistencia se concentran en las acciones y
el modelo existentes. La migración se limita a los datos históricos que la venta
necesita conservar. Las pruebas nuevas se agrupan en `tests/checkout/` y las pruebas
administrativas existentes se mantienen.

## Complexity Tracking

No aplica: la comprobación de la constitución no encontró violaciones.

## Design Decisions

- El carrito de `/venta-rapida` reemplaza el carrito persistido del checkout al elegir
  el canal directo, evitando mezclar una selección rápida con productos antiguos del
  store.
- El servidor recalcula precios según el contexto consumidor y valida el cargo de
  delivery a partir de la zona; nunca acepta como fuente de verdad el total del
  navegador.
- La venta guarda `montoSubtotal`, `montoDelivery`, `montoTotal`, tasa y un snapshot
  estructurado de la dirección usada. La página de confirmación y el panel dejan de
  depender de la primera dirección actual del cliente.
- La acción recibe una `claveIdempotencia` única por intento de confirmación. Un
  reintento con la misma clave devuelve la venta existente sin repetir pago ni stock.
- Un pedido con efectivo inicia `por_cobrar`; los métodos digitales con datos
  declarados inician `en_pedido`. El panel conserva la decisión final de marcarlo
  como `pagado`.
- La creación de la venta, sus detalles, el pago declarado, el historial inicial y
  el descuento de inventario se ejecutan dentro de una única transacción de base de
  datos.

## Phase 0 / Phase 1 Delivery Notes

Phase 0 documenta las decisiones y riesgos en `research.md`. Phase 1 define el modelo
de datos, el contrato de la acción de checkout y una guía de validación reproducible;
`tasks.md` queda para `$speckit-tasks`.
