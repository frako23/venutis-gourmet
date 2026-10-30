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

**Autorización admin**: `app/admin/layout.tsx` exige usuario autenticado (Stack Auth, config en `stack/`) y que el correo esté en `ALLOWED_EMAILS`. La regla es `esCorreoAdministrador` (`lib/admin/auth-rules.ts`) y **falla cerrado**: sin lista, nadie entra (los clientes comparten el proveedor de identidad). Las descargas protegidas (p. ej. PDF de notas de entrega) re-validan la autorización en cada petición.

**Checkout y flujos de venta** (hay varios y no todos persisten):
- Checkout web (`procesarCompra` → `registrarCompraWeb` en `lib/checkout-core.ts`): una sola transacción Prisma que valida/descuenta inventario, crea `Transaccion` + `DetalleCompra`, registra `Pago` y, con sesión vinculada, canjea premios y aplica saldo a favor. Los puntos (`Fidelidad`) se acreditan cuando el pedido queda pagado, no al crearlo.
- Venta manual admin (`lib/actions/admin-sales.ts`): también escribe `Transaccion` de forma atómica con descuentos (porcentaje o USD).
- `/venta-rapida`: solo arma el pedido y lo envía por WhatsApp; **no** crea `Transaccion` ni descuenta inventario (aunque existe un flujo de pedido directo desde checkout).
- Carga de Excel (`/admin/transactions/import`, `lib/actions/sales-import.ts`): convierte el "Control de ventas" de la dueña en pedidos (nota de entrega = `numeroOrden`, único, así que recargar no duplica). Es atómica, marca `Transaccion.importada` y **no toca inventario ni fidelidad**; cancelar un pedido importado tampoco devuelve stock. Lee `.xlsx` con `lib/admin/xlsx-reader.ts` (sin dependencias) y recuerda las decisiones de productos y clientes en `EquivalenciaProducto`/`EquivalenciaCliente`. La exportación `/admin/transactions/export?formato=control` genera el mismo formato.
- `/cotizacion-rapida`: deliberadamente no persistida; genera un PNG en el navegador y solo relee precio/inventario para no emitir datos obsoletos.

**Estado cliente duplicado**: el estado del carrito/checkout vive en `store/appStore.ts` (Zustand persistido) y también en `context/checkoutContext.tsx`. Tenerlo en cuenta al modificar el checkout para no divergir.

**Catálogo unificado**: una sola experiencia para consumidores y mayoristas en `/productos/consumidores`; el contexto (`?contexto=consumidor|mayorista`) decide el precio (`precioDetal` / `precioMayorista`). `/productos/mayoristas` solo redirige.

**Orden del catálogo**: `Producto.orden` (opcional; `null` va al final) es el único orden de las listas de productos. Toda consulta que liste productos usa `ORDEN_CATALOGO` (`lib/catalog-order.ts`) y ninguna vista reordena en memoria. Solo `guardarOrdenProductos` (`lib/actions/products.ts`) lo escribe, desde `/admin/inventory/sort`. Las líneas de pedidos, notas de entrega, exportaciones y rankings no siguen este orden.

**Modelo de pedidos**: `Transaccion.total` es canónico en USD; el Bs sale de la tasa (`hooks/useDolar.ts`, `Pago.tasaCambio`). Estados operativos: `por_cobrar`, `en_pedido`, `pagado` y `cancelado`. `cancelado` es final: solo se aplica a pedidos no cobrados, devuelve el inventario en la misma transacción, guarda la razón opcional en `EstadoTransaccionHistorial.motivo` y no se ofrece en el editor masivo. `pendiente` (se muestra como "Por cobrar") se conserva por compatibilidad histórica. Los cambios de estado pasan por `order-status.ts`/`admin-orders.ts` y se registran en `EstadoTransaccionHistorial` (append-only). Las analíticas excluyen canceladas.

**Cantidades e inventario**: `DetalleCompra.cantidad` y `Producto.inventario` admiten hasta 2 decimales. Todo cambio de inventario de ventas y cancelaciones pasa por `ajustarInventario` (`lib/inventory.ts`), que bloquea la fila y redondea. La tienda, la venta rápida y la cotización ven `unidadesDisponibles(inventario)` (enteros).

**Tipo de precio y abonos**: cada línea nueva guarda `DetalleCompra.tipoPrecio` (`detal`/`mayor`/`promo`; `null` = anterior a la función). `Pago.esAbono = true` es un cobro recibido; los demás `Pago` son pagos *declarados*. El saldo no se guarda: `calcularSaldo` (`lib/admin/abonos.ts`) = total − abonos vigentes (0 si está pagado). Un abono que salda pasa el pedido a `pagado` ("Saldado con abonos"). Los clientes creados desde una carga pueden no tener `celular`.

**Cuenta del cliente, saldo a favor y fidelización** (spec `010-*`):
- `/mi-cuenta` (tienda): el cliente se registra con Stack Auth. `CuentaCliente` lo vincula como máximo a un `Cliente`: el correo **verificado** vincula solo; el teléfono solo deja la vinculación `pendiente` hasta que se confirme en la ficha (`/admin/clients/[id]`). El `clienteId` de la tienda siempre sale de la sesión (`obtenerClienteDeSesion`), nunca de un id enviado por el navegador. No exponer `notasInternas` ni el crédito a la tienda (`CAMPOS_INTERNOS_CLIENTE`).
- **Deuda**: no se guarda; `consultarDeudaCliente` suma `calcularSaldo` (misma regla que las cuentas por cobrar). **Crédito**: `Cliente.creditoHabilitado`/`limiteCreditoUsd`; una venta manual sin cobrar que lo excede exige `autorizarCredito` y la autorización queda en el historial del pedido. Tienda y cargas de Excel no piden autorización.
- **Saldo a favor**: libro `MovimientoSaldo` (solo inserciones, saldo = suma). Un abono mayor que el saldo con `permitirExcedente` deja el excedente a favor; aplicar saldo a un pedido es un abono con método `SaldoAFavor`; cancelar un pedido devuelve lo abonado. Anular un abono cuyo excedente ya se usó se rechaza.
- **Puntos**: `Fidelidad` con signo. `acreditarPuntosPorPago` (1 punto por USD entero de productos, sin delivery) se llama cuando el pedido queda `pagado`, solo para `detal`, una vez por pedido y nunca en cargas de Excel. Cancelar devuelve los canjes y revierte los ganados con tope (nunca negativo). El checkout web ya no acredita al crear el pedido.
- **Premios**: `Premio` (descuento USD o producto gratis). El descuento va en `Transaccion.montoDescuentoPuntos` (parte del total); el producto gratis es un `DetalleCompra` a precio 0 (`promo`) que descuenta inventario. Los recálculos de total ignoran las líneas a precio 0.
- **Concurrencia**: toda operación de dinero/puntos bloquea primero el cliente (`bloquearCliente`, `lib/cliente-lock.ts`) y luego el pedido.
- **Checkout**: la transacción vive en `lib/checkout-core.ts` (`registrarCompraWeb`, sin `@/` para poder probarla); `procesarCompra` solo resuelve la sesión. Con sesión vinculada puede canjear premios y usar saldo; la selección es estado local del paso de pago (no se amplía el estado duplicado).

**Notas de entrega** (mayoristas): guardan snapshots de líneas (`DetalleNotaEntrega`), no tocan inventario ni pagos, y el PDF se genera localmente con `pdf-lib`.

**Imágenes**: URLs de Cloudinary; los hosts remotos permitidos para `next/image` están en `next.config.ts`.
