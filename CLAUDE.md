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
- **Fechas y horas**: siempre en hora de Caracas (`ZONA_HORARIA` en `lib/format.ts`), tanto al mostrar como al proponer valores por defecto, interpretar lo que se ingresa y cortar por día/mes en filtros, reportes, exportaciones y PDFs. Nunca depender de la zona del servidor ni del navegador (p. ej., `new Date().toISOString().slice(0, 16)` da UTC).
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
- **Editar y eliminar pedidos** (spec `012-*`): "Editar" abre `/admin/add-transaction?editar=<id>` (mismo formulario, precargado; `editarVentaManual` → `editarPedidoEnTx` en `lib/admin/order-edit.ts`, reglas puras en `order-edit-rules.ts`). Se edita todo menos `cancelado`; el estado, los abonos, los canjes y el saldo no se tocan desde ahí. El inventario se ajusta solo por diferencia (`diferenciasInventario`; los importados no lo mueven), el total se recalcula con `recalcularTotalPedido` (regla única, **incluye el delivery guardado**), no puede quedar bajo lo abonado, y un pedido `pagado` cuyo total sube exige confirmar el cobro y ajusta sus puntos (`acumulacion`/`reversion`). `versionPedido` (huella, sin columna) rechaza ediciones concurrentes y cada edición queda como evento en `EstadoTransaccionHistorial`. "Eliminar" (`eliminarPedido`) es **borrado definitivo** y solo aplica a pedidos no pagados sin abonos (ni anulados), puntos, saldo, notas de entrega ni reseñas; devuelve inventario salvo en importados y cancelados. Lo demás se cancela. El alta de clientes (`ClientCreateModal`) se puede abrir desde el formulario de venta, y el cliente se busca con `filtrarClientes` sobre `nombreBusqueda`.
- `/venta-rapida`: solo arma el pedido y lo envía por WhatsApp; **no** crea `Transaccion` ni descuenta inventario (aunque existe un flujo de pedido directo desde checkout). Puede agregar delivery al mensaje (zona activa + nombre, teléfono y dirección de quien recibe); esos datos solo viajan en el texto de WhatsApp y no se persisten.
- Carga de Excel (`/admin/transactions/import`, `lib/actions/sales-import.ts`): convierte el "Control de ventas" de la dueña en pedidos (nota de entrega = `numeroOrden`, único, así que recargar no duplica). Es atómica, marca `Transaccion.importada` y **no toca inventario ni fidelidad**; cancelar un pedido importado tampoco devuelve stock. Lee `.xlsx` con `lib/admin/xlsx-reader.ts` (sin dependencias) y recuerda las decisiones de productos y clientes en `EquivalenciaProducto`/`EquivalenciaCliente`. La exportación `/admin/transactions/export?formato=control` genera el mismo formato.
- `/cotizacion-rapida`: deliberadamente no persistida; genera un PNG en el navegador y solo relee precio/inventario para no emitir datos obsoletos.

**Estado cliente duplicado**: el estado del carrito/checkout vive en `store/appStore.ts` (Zustand persistido) y también en `context/checkoutContext.tsx`. Tenerlo en cuenta al modificar el checkout para no divergir.

**Resumen del panel** (`/admin`, spec `013-*`): cuatro indicadores y cuatro gráficos de solo lectura. Ventas por mes (12 meses, Recharts) y, para los últimos 30 días, top 5 de productos por unidades, ventas por tipo de cliente (el tipo del cliente, no el de precio) y visitas por día. Una "venta" es todo pedido no cancelado (incluye importados) y los cortes por día y mes son en hora de Caracas (`ventanasResumen` en `lib/admin/dashboard-core.ts`, lógica pura). "Ventas acumuladas" sale de la suma por tipo de cliente, así que siempre coincide con ese gráfico. `resumirPorProducto` (`lib/admin/sales-calculations.ts`) es la regla única de unidades y monto por producto, compartida con las analíticas de ventas. Las visitas (`consultarVisitasDiarias`, Vercel `by=day`) llegan por streaming con `<Suspense>` y nunca lanzan; sus días los corta Vercel en UTC.

**Catálogo unificado**: una sola experiencia para consumidores y mayoristas en `/productos/consumidores`; el contexto (`?contexto=consumidor|mayorista`) decide el precio (`precioDetal` / `precioMayorista`). `/productos/mayoristas` solo redirige.

**Orden del catálogo**: `Producto.orden` (opcional; `null` va al final) es el único orden de las listas de productos. Toda consulta que liste productos usa `ORDEN_CATALOGO` (`lib/catalog-order.ts`) y ninguna vista reordena en memoria. Solo `guardarOrdenProductos` (`lib/actions/products.ts`) lo escribe, desde `/admin/inventory/sort`. Las líneas de pedidos, notas de entrega, exportaciones y rankings no siguen este orden.

**Zonas de delivery**: `ZonaDelivery` (nombre, `clave` única, `costoUsd`, `activa`) es la única lista de zonas y costos; ya no existe `DELIVERY_ZONES`. La dueña la edita celda por celda en `/admin/delivery` (`lib/actions/delivery-zones.ts`, con `requireAdmin`); las zonas se desactivan, no se borran. `claveZona` (`lib/delivery-zone-rules.ts`: sin acentos, minúsculas, signos como espacio) decide unicidad, búsqueda y la zona de cada `Direccion.urbanizacion` (texto, sin clave foránea); renombrar una zona reescribe sus direcciones en la misma transacción. Fuera del panel solo se ofrecen las activas (`listarZonasActivas`). El checkout lee `costoUsd` dentro de su transacción, rechaza zonas inactivas y guarda su copia en `Transaccion.zonaEntrega`/`montoDelivery`, que no cambia si luego se edita la zona.

**Modelo de pedidos**: `Transaccion.total` es canónico en USD; el Bs sale de la tasa (`hooks/useDolar.ts`, `Pago.tasaCambio`). Estados operativos: `por_cobrar`, `en_pedido`, `pagado` y `cancelado`. `cancelado` es final: solo se aplica a pedidos no cobrados, devuelve el inventario en la misma transacción, guarda la razón opcional en `EstadoTransaccionHistorial.motivo` y no se ofrece en el editor masivo. `pendiente` (se muestra como "Por cobrar") se conserva por compatibilidad histórica. Los cambios de estado pasan por `order-status.ts`/`admin-orders.ts` y se registran en `EstadoTransaccionHistorial` (append-only). Las analíticas excluyen canceladas.

**Cantidades e inventario**: `DetalleCompra.cantidad` y `Producto.inventario` admiten hasta 2 decimales. Todo cambio de inventario de ventas y cancelaciones pasa por `ajustarInventario` (`lib/inventory.ts`), que bloquea la fila y redondea. La tienda, la venta rápida y la cotización ven `unidadesDisponibles(inventario)` (enteros).

**Tipo de precio y abonos**: cada línea nueva guarda `DetalleCompra.tipoPrecio` (`detal`/`mayor`/`promo`; `null` = anterior a la función). `Pago.esAbono = true` es un cobro recibido; los demás `Pago` son pagos *declarados*. El saldo no se guarda: `calcularSaldo` (`lib/admin/abonos.ts`) = total − abonos vigentes (0 si está pagado). Un abono que salda pasa el pedido a `pagado` ("Saldado con abonos"). Los clientes creados desde una carga pueden no tener `celular`.

**Cuenta del cliente, saldo a favor y fidelización** (spec `010-*`):
- `/mi-cuenta` (tienda): el cliente se registra con Stack Auth. `CuentaCliente` lo vincula como máximo a un `Cliente`: el correo **verificado** vincula solo; el teléfono solo deja la vinculación `pendiente` hasta que se confirme en la ficha (`/admin/clients/[id]`). El `clienteId` de la tienda siempre sale de la sesión (`obtenerClienteDeSesion`), nunca de un id enviado por el navegador. No exponer `notasInternas` ni el crédito a la tienda (`CAMPOS_INTERNOS_CLIENTE`).
- **Deuda**: no se guarda; `consultarDeudaCliente` suma `calcularSaldo` (misma regla que las cuentas por cobrar). **Crédito**: `Cliente.creditoHabilitado`/`limiteCreditoUsd`; una venta manual sin cobrar que lo excede exige `autorizarCredito` y la autorización queda en el historial del pedido. Tienda y cargas de Excel no piden autorización.
- **Saldo a favor**: libro `MovimientoSaldo` (solo inserciones, saldo = suma). Un abono mayor que el saldo con `permitirExcedente` deja el excedente a favor; aplicar saldo a un pedido es un abono con método `SaldoAFavor`; cancelar un pedido devuelve lo abonado. Anular un abono cuyo excedente ya se usó se rechaza.
- **Puntos**: `Fidelidad` con signo. `acreditarPuntosPorPago` (1 punto por USD entero de productos, sin delivery) se llama cuando el pedido queda `pagado`, solo para `detal`, una vez por pedido y nunca en cargas de Excel. Cancelar devuelve los canjes y revierte los ganados con tope (nunca negativo). El checkout web ya no acredita al crear el pedido.
- **Premios**: `Premio` (descuento USD, producto gratis o delivery gratis). El descuento va en `Transaccion.montoDescuentoPuntos` (parte del total); el producto gratis es un `DetalleCompra` a precio 0 (`promo`) que descuenta inventario. Los recálculos de total ignoran las líneas a precio 0.
- **Delivery gratis y compra mínima** (spec `014-*`): el premio `delivery` cubre el delivery completo del pedido y se guarda en `Transaccion.montoDescuentoDelivery`, aparte de `montoDescuentoPuntos`: no entra en la base de puntos ni en la del descuento, y `montoDelivery` conserva el costo real. Regla del total: `subtotal + delivery − descuento − descuentoPuntos − descuentoDelivery`; `recalcularTotalPedido` recibe `descuentoDeliveryUsd` (obligatorio). Un pedido admite un solo delivery gratis y solo con delivery; se canjea en la tienda y en el detalle del pedido, no en la venta manual (no tiene delivery). `Premio.compraMinimaUsd` (opcional, cualquier tipo) se compara con productos después de descuentos, sin delivery. **Todas las condiciones de un canje viven en `validarCanjes`** (`lib/fidelidad.ts`); el paso de pago la usa en el navegador y el servidor decide. `PROGRAMA_PUNTOS` guarda los valores del programa y `describirRecompensa` es el texto único de un premio.
- **Sección "Puntos" y "Mis puntos"** (spec `014-*`): `/admin/points` (solo lectura, `requireAdmin`) calcula ganados/canjeados/ajustes/disponibles por cliente desde `Fidelidad` (`lib/admin/points-core.ts`, puro; `points.ts` lee) y corta "el mes" en hora de Caracas. `/mi-cuenta/puntos` solo muestra datos con cuenta vinculada y nunca expone autor ni motivo de los movimientos; "Mi cuenta" solo enlaza a ella.
- **Bono de bienvenida**: movimiento `bono` de 25 puntos, una vez por cliente consumidor (`acreditarBonoBienvenida`), acreditado dentro de la transacción de los tres lugares donde una cuenta queda vinculada (vínculo automático por correo, registro y confirmación de la administradora). Desvincular y volver a vincular no lo repite.
- **Concurrencia**: toda operación de dinero/puntos bloquea primero el cliente (`bloquearCliente`, `lib/cliente-lock.ts`) y luego el pedido.
- **Checkout**: la transacción vive en `lib/checkout-core.ts` (`registrarCompraWeb`, sin `@/` para poder probarla); `procesarCompra` solo resuelve la sesión. Con sesión vinculada puede canjear premios y usar saldo; la selección es estado local del paso de pago (no se amplía el estado duplicado).

**Notas de entrega** (mayoristas): ya no se crean sueltas; toda nota sale de un pedido existente (botón "Crear nota de entrega" en Ventas y pedidos y en el detalle del pedido → `/admin/delivery-notes/new?transaccionId=`). `numeroNota` = `numeroOrden` (único, así que un pedido tiene una sola nota; las notas viejas conservan su `NE-...`), las líneas se copian del pedido como snapshot (`DetalleNotaEntrega`) y `numeroFactura` es opcional. Reglas en `lib/admin/delivery-note-rules.ts` (`motivoSinNota`: solo mayoristas, no canceladas, una por pedido). No tocan inventario ni pagos, y el PDF se genera localmente con `pdf-lib`.

**Imágenes**: URLs de Cloudinary; los hosts remotos permitidos para `next/image` están en `next.config.ts`.
