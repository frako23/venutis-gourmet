# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev            # Next.js 15 + Turbopack (http://localhost:3000)
npm run dev:secure     # igual, con HTTPS experimental
npm run build          # build de producción (Turbopack)
npm run lint           # eslint
npm run test:admin     # node --test sobre tests/admin/*.test.ts (vía ts-node/esm)
npm run test:checkout  # node --test sobre tests/checkout/*.test.ts
npx prisma migrate dev # aplica migraciones (requiere DATABASE_URL)
npx prisma generate    # regenera el cliente (también corre en postinstall)
```

Un solo test: `node --loader ts-node/esm --test tests/admin/<archivo>.test.ts`. Los tests usan el runner nativo de Node (`node:test`), no Jest/Vitest.

Las variables de entorno requeridas (`DATABASE_URL`, `ALLOWED_EMAILS`, Stack Auth, Cloudinary, `VERCEL_ANALYTICS_*`) están documentadas en [README.md](README.md).

## Convenciones

- **Notificaciones**: todas las notificaciones dentro de la app (éxito, error, avisos) deben manejarse con **sonner** (`toast` desde `"sonner"`). No introducir otras librerías ni alerts/banners ad hoc para esto. Ya existe un `<Toaster>` en `app/layout.tsx`, `app/productos/layout.tsx` y `app/admin/layout.tsx`.
- La UI y los mensajes están en español; los nombres de dominio del modelo también (`Transaccion`, `Cliente`, `Producto`...).
- Alias de imports: `@/*` apunta a la raíz del proyecto.
- Todo cambio de `prisma/schema.prisma` debe ir con su migración y regeneración del cliente.

## Arquitectura

Tienda + panel administrativo + punto de venta para pastas/salsas gourmet. Next.js 15 App Router, React 19, TypeScript estricto, Tailwind 4, PostgreSQL con Prisma, Stack Auth, Cloudinary. Documentación más detallada en [docs/descripcion-tecnica.md](docs/descripcion-tecnica.md); las especificaciones por feature están en `specs/00N-*`.

**Escrituras vs. lecturas**: las mutaciones viven como Server Actions (`"use server"`) en `lib/actions/*` y validan con Zod antes de tocar la BD. Las consultas y reglas de negocio del admin (analíticas, dashboard, ventas, forecast, PDFs, visitas) están en `lib/admin/*`, separadas de las actions; hay módulos `*-core.ts` con la lógica pura (testeable sin dependencias) y su contraparte que hace I/O. Siempre usar el singleton `lib/prisma.ts`.

**Autorización admin**: `app/admin/layout.tsx` exige usuario autenticado (Stack Auth, config en `stack/`) y, si `ALLOWED_EMAILS` está definida, que el correo esté en la lista. Las descargas protegidas (p. ej. PDF de notas de entrega) re-validan la autorización en cada petición.

**Checkout y flujos de venta** (hay varios y no todos persisten):
- Checkout web (`procesarCompra` en `lib/actions/checkout.ts`): una sola transacción Prisma que valida/descuenta inventario, crea `Transaccion` + `DetalleCompra`, registra `Pago` y acumula `Fidelidad`.
- Venta manual admin (`lib/actions/admin-sales.ts`): también escribe `Transaccion` de forma atómica con descuentos (porcentaje o USD).
- `/venta-rapida`: solo arma el pedido y lo envía por WhatsApp; **no** crea `Transaccion` ni descuenta inventario (aunque existe un flujo de pedido directo desde checkout).
- `/cotizacion-rapida`: deliberadamente no persistida; genera un PNG en el navegador y solo relee precio/inventario para no emitir datos obsoletos.

**Estado cliente duplicado**: el estado del carrito/checkout vive en `store/appStore.ts` (Zustand persistido) y también en `context/checkoutContext.tsx`. Tenerlo en cuenta al modificar el checkout para no divergir.

**Catálogo unificado**: una sola experiencia para consumidores y mayoristas en `/productos/consumidores`; el contexto (`?contexto=consumidor|mayorista`) decide el precio (`precioDetal` / `precioMayorista`). `/productos/mayoristas` solo redirige.

**Modelo de pedidos**: `Transaccion.total` es canónico en USD; el Bs sale de la tasa (`hooks/useDolar.ts`, `Pago.tasaCambio`). Estados operativos: `por_cobrar`, `en_pedido`, `pagado`; `pendiente` (se muestra como "Por cobrar") y `cancelado` se conservan solo por compatibilidad histórica. Los cambios de estado pasan por `order-status.ts`/`admin-orders.ts` y se registran en `EstadoTransaccionHistorial` (append-only). Las analíticas excluyen canceladas.

**Notas de entrega** (mayoristas): guardan snapshots de líneas (`DetalleNotaEntrega`), no tocan inventario ni pagos, y el PDF se genera localmente con `pdf-lib`.

**Imágenes**: URLs de Cloudinary; los hosts remotos permitidos para `next/image` están en `next.config.ts`.
