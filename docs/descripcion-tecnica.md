# Venuti's Gourmet — Descripción técnica

## 1. Resumen

Venuti's Gourmet es una aplicación web para la venta de pastas, salsas y productos gourmet. El sistema combina:

- Catálogo público para consumidores y clientes mayoristas.
- Carrito persistente y flujo de checkout.
- Registro de clientes, direcciones, pedidos, pagos, puntos de fidelidad y reseñas.
- Panel administrativo protegido para gestionar productos, inventario y transacciones.
- Punto de venta rápido orientado a crear pedidos y enviarlos por WhatsApp.

La interfaz está localizada principalmente en español y utiliza una identidad visual propia con fuentes, colores y recursos gráficos de la marca.

## 2. Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 15.5.9 con App Router y Turbopack |
| Lenguaje | TypeScript 5.9, modo estricto |
| UI | React 19.1, Tailwind CSS 4, componentes propios |
| Estado cliente | Zustand 5 con persistencia local y React Context para checkout |
| Datos | PostgreSQL mediante Prisma ORM 6.17 |
| Validación | Zod 4 |
| Autenticación | Stack Auth (`@stackframe/stack`) |
| Imágenes | Cloudinary y `next/image` |
| Editor | Tiptap |
| Visualización | Recharts |
| UI auxiliar | Lucide React, Sonner, `react-to-print`, `@dnd-kit` |
| Documentos | `pdf-lib` para notas de entrega locales |

## 3. Organización del código

```text
app/                  Rutas, layouts y páginas del App Router
components/           Componentes reutilizables agrupados por dominio
context/              Contextos React, incluido el flujo de checkout
hooks/                Hooks personalizados, como la consulta de tasa de cambio
lib/                  Prisma, autenticación, utilidades y Server Actions
prisma/               Esquema, tipos generados y migraciones de base de datos
stack/                Configuración cliente y servidor de Stack Auth
store/                Estado global persistido con Zustand
public/               Imágenes, logos, íconos y recursos estáticos
```

El alias `@/*` apunta a la raíz del proyecto y se utiliza para imports absolutos.

## 4. Rutas principales

### Sitio público

- `/`: página principal.
- `/about-us`: información de la marca.
- `/productos/consumidores`: catálogo para clientes detallistas.
- `/productos/consumidores/[id]`: detalle de un producto.
- `/productos/mayoristas`: catálogo para clientes mayoristas.
- `/finalizar-compra`: checkout por pasos.
- `/confirmacion`: confirmación posterior a la compra.

### Administración

- `/admin-login`: acceso al panel administrativo.
- `/admin/products`: gestión de productos.
- `/admin/inventory`: inventario, precios e imágenes.
- `/admin/inventory/sort`: ordenar manualmente el catálogo (arrastrar o elegir posición); el orden vale para todas las vistas.
- `/admin/add-product`: alta de productos.
- `/admin/edit-product/[id]`: edición de productos.
- `/admin/transactions`: listado de transacciones.
- `/admin/transactions/[id]`: detalle de una transacción.
- `/admin/add-transaction`: alta de transacciones desde administración.
- `/admin/transactions/import`: carga masiva de ventas desde el Excel "Control de ventas" (vista previa, conciliación de productos y clientes, confirmación atómica).
- `/admin/transactions/export?formato=control`: descarga del control de ventas con las columnas del Excel.
- `/admin`: dashboard operativo con ventas del periodo, pedidos abiertos y alertas.
- `/admin/analytics`: agregados semanales/mensuales, productos y predictor explicable.
- `/admin/delivery-notes`: listado y descarga de notas para mayoristas.
- `/admin/delivery-notes/new`: formulario con vista previa.
- `/admin/delivery-notes/[id]/pdf`: descarga PDF protegida.

El layout de `/admin` valida que exista un usuario autenticado y, si está definido `ALLOWED_EMAILS`, que su correo pertenezca a la lista autorizada.

### Operación rápida

- `/venta-rapida`: punto de venta compacto. Consulta productos disponibles, filtra por nombre o categoría, calcula totales en USD/Bs y genera un mensaje de WhatsApp.
- `/cotizacion-rapida`: herramienta temporal para preparar cotizaciones, generar un PNG y compartirlo por WhatsApp. Mantiene la selección, el destinatario y la imagen únicamente en el navegador; no crea pedidos, ventas, clientes, pagos o direcciones, no descuenta inventario y no usa el checkout persistido. Si el navegador no permite compartir archivos, descarga la imagen y abre WhatsApp con texto preparado para que la operadora adjunte el PNG manualmente.

## 5. Modelo de datos

La base de datos PostgreSQL está definida en `prisma/schema.prisma`.

- `Cliente`: datos personales, tipo de cliente (`mayorista` o `detal`) y relaciones con direcciones, compras, fidelidad y reseñas.
- `Direccion`: direcciones de entrega asociadas a un cliente.
- `Producto`: nombre, precios detal/mayorista, categoría, descripción, inventario, ubicación, `orden` (posición manual en el catálogo; nulo = sin posición, va al final) e imágenes.
- `Imagen`: URLs de imágenes asociadas a productos; se eliminan en cascada con el producto.
- `Transaccion`: número de orden, cliente, subtotal, descuento, total canónico en USD, tasa, estado y tipo de retiro (`envio` o `recogida`).
- `DetalleCompra`: productos, cantidades (hasta 2 decimales), precio unitario y `tipoPrecio` (`detal`, `mayor`, `promo`; nulo en líneas anteriores) de cada transacción.
- `Pago`: montos en bolívares/dólares, tasa de cambio, método y referencia. `esAbono` distingue un cobro recibido (con `actorEmail` y `anuladoEn` si se anuló) de un pago declarado en el checkout; el método `NoEspecificado` es exclusivo de las cargas de Excel.
- `EquivalenciaProducto` / `EquivalenciaCliente`: decisiones recordadas al conciliar una carga (texto del Excel → producto o cliente).
- `EstadoTransaccionHistorial`: estado anterior/nuevo, actor, fecha y motivo.
- `NotaEntrega` / `DetalleNotaEntrega`: nota mayorista y snapshot de líneas, sin mutar inventario ni pagos.
- `Fidelidad`: movimientos de puntos por acumulación o redención.
- `Resena`: valoración de 1 a 5 estrellas vinculada a cliente, producto y transacción.

Los estados operativos son `por_cobrar`, `en_pedido` y `pagado`. `cancelado` también es un estado operativo, final y solo aplicable a pedidos no cobrados: al cancelar se devuelve el inventario en la misma transacción y la razón opcional se guarda en `EstadoTransaccionHistorial.motivo`; el editor masivo no permite cancelar. Se conserva `pendiente` por compatibilidad histórica y se presenta como “Por cobrar”. Los métodos de pago contemplados son transferencia en Bs, efectivo USD, Zelle, Pago Móvil y transferencia USD.

## 6. Flujo de checkout

1. El carrito se administra con Zustand y se conserva en el almacenamiento local del navegador.
2. El cliente se identifica o registra mediante las acciones de clientes.
3. Se selecciona envío o recogida y, según la configuración, se muestra el paso de pago.
4. `procesarCompra` ejecuta una transacción Prisma que:
   - valida y descuenta inventario;
   - crea la transacción y sus detalles;
   - registra el pago;
   - acumula puntos de fidelidad según el total.
5. Si cualquier operación falla, la transacción de base de datos se revierte.

Las validaciones de formularios se realizan principalmente con esquemas Zod dentro de `lib/actions`.

## 7. Acciones de servidor

`lib/actions` contiene operaciones `use server` para:

- clientes: alta, edición, eliminación y búsqueda por teléfono;
- productos: alta, edición, eliminación, actualización de inventario/precios y `guardarOrdenProductos` (reescribe las posiciones `1..N` del catálogo en una transacción);
- direcciones: alta, edición, eliminación y consulta por cliente;
- checkout: creación atómica de pedidos, pagos e inventario;
- reseñas: alta y eliminación.
- admin-sales: venta manual atómica, descuento y stock.
- admin-orders / order-status: estado operativo e historial append-only; `registrarAbono` y `anularAbono` (abonos y saldo).
- sales-import: `previsualizarCargaVentas` (no escribe) y `confirmarCargaVentas` (vuelve a leer el archivo y crea los pedidos en una transacción; no toca inventario).
- delivery-notes: validación mayorista, snapshots y consultas para PDF.

Las acciones de productos y direcciones utilizan revalidación o redirecciones para actualizar las vistas administrativas después de una mutación.

### Control de ventas desde Excel

- `lib/admin/xlsx-reader.ts` lee el `.xlsx` (ZIP + XML, `node:zlib`) con límites de tamaño; no hay librería de hojas de cálculo.
- `lib/admin/sales-import-core.ts` es puro: localiza la tabla por nombre de columna, valida cada línea, agrupa por nota y reconoce productos y clientes (equivalencia guardada, coincidencia exacta o sugerencia).
- `lib/admin/sales-import.ts` hace la vista previa y la creación de pedidos (`aplicarCargaVentas(tx, …)`). Las fechas se guardan a las 12:00 de Caracas y, si una nota es mayor o igual a 1300, avanza `orden_correlativo_seq`.
- Las cantidades e inventario usan `lib/inventory.ts`; el saldo y los abonos, `lib/admin/abonos.ts`.
- `experimental.serverActions.bodySizeLimit` es 6 MB para permitir archivos de hasta 5 MB.

## 8. Imágenes y presentación

Las imágenes de productos se almacenan como URLs, normalmente provenientes de Cloudinary. `next.config.ts` permite hosts remotos de Cloudinary, Googleusercontent y Unsplash para su uso con `next/image`.

El layout raíz registra fuentes locales de la marca y configura el proveedor de Stack Auth, el tema global y las notificaciones Sonner. Los recursos estáticos se encuentran en `public/`.

## 9. Variables de entorno

El proyecto requiere las siguientes variables, definidas localmente en `.env`:

```env
DATABASE_URL
ALLOWED_EMAILS
NEXT_PUBLIC_STACK_PROJECT_ID
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
STACK_SECRET_SERVER_KEY
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

No se deben versionar valores reales de secretos. `DATABASE_URL` debe apuntar a una base PostgreSQL compatible con el esquema Prisma.

## 10. Comandos de desarrollo

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

El script `postinstall` ejecuta `prisma generate`. Las migraciones existentes están en `prisma/migrations`; para aplicar migraciones en un entorno de desarrollo se puede utilizar el flujo estándar de Prisma (`npx prisma migrate dev`) con `DATABASE_URL` configurada.

## 11. Consideraciones técnicas observadas

- El orden de los productos tiene una sola definición, `ORDEN_CATALOGO` (`lib/catalog-order.ts`), usada por toda consulta que liste productos; las vistas solo filtran. El orden inicial se migró desde el antiguo `PRODUCT_ORDER` de la tienda. Líneas de pedidos, notas de entrega, exportaciones y rankings no siguen este orden.
- El checkout web y el registro manual administrativo escriben `Transaccion`; el punto de venta rápido actualmente solo prepara el pedido y lo envía por WhatsApp, por lo que no actualiza inventario ni crea una `Transaccion` por sí mismo.
- La cotización rápida reutiliza la lectura del catálogo y la tasa vigente, pero es deliberadamente no persistida: la revalidación previa a la generación solo lee precio, inventario y existencia para evitar producir una imagen con datos obsoletos. Generar, descargar o compartir la imagen no representa una reserva, venta, pago ni cambio de inventario.
- Existen dos representaciones de estado relacionadas con checkout: `store/appStore.ts` y `context/checkoutContext.tsx`. Conviene mantener una única fuente de verdad a futuro para reducir posibles divergencias.
- Las lecturas administrativas de esta feature reutilizan la instancia singleton de `lib/prisma.ts` para evitar conexiones duplicadas.
- Las analíticas excluyen transacciones canceladas antes de agregar. El predictor es una media móvil de cuatro semanas completas o tres meses completos y declara insuficiencia cuando no hay historia mínima.
- El PDF se genera localmente con snapshots guardados, requiere autorización administrativa en cada descarga y no es una factura fiscal.
- La autorización administrativa depende de `ALLOWED_EMAILS`; si la variable no está definida, el layout valida autenticación pero no aplica una lista adicional de correos.
- Las migraciones constituyen la fuente de historial de cambios del modelo; cualquier modificación del esquema debe acompañarse de una migración y de la regeneración del cliente Prisma.

