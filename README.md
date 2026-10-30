# Venuti's Gourmet

Aplicación web para la comercialización de pastas, salsas y productos gourmet. Incluye catálogo público, carrito de compras, checkout, gestión administrativa, inventario, pedidos, fidelidad de clientes y un punto de venta rápido integrado con WhatsApp.

## Características

- Catálogo público unificado para consumidores y clientes mayoristas.
- Detalle de productos con imágenes, descripción y reseñas.
- Carrito persistente en el navegador.
- Checkout por pasos con cliente, dirección, tipo de retiro y pago.
- Registro de pedidos, pagos, inventario y puntos de fidelidad.
- Panel administrativo protegido por autenticación.
- Gestión de productos, imágenes, precios e inventario.
- Consulta de transacciones y detalles de pedidos.
- Registro manual de ventas en una hoja operativa con descuentos porcentuales o en USD.
- Seguimiento de pedidos por cobrar, en pedido y pagados, con historial administrativo.
- Analíticas semanales/mensuales por producto y predictor basado en media móvil histórica.
- Notas de entrega para clientes mayoristas con vista previa y descarga PDF local.
- Punto de venta rápido en `/venta-rapida`.
- Conversión de totales USD/Bs y envío de órdenes por WhatsApp.

## Tecnologías

- Next.js 15 con App Router y Turbopack.
- React 19 y TypeScript en modo estricto.
- Tailwind CSS 4.
- PostgreSQL con Prisma ORM.
- Zustand y React Context para el estado del cliente y checkout.
- Zod para validación de formularios.
- Stack Auth para autenticación.
- Cloudinary para imágenes de productos.
- Tiptap, Recharts, Lucide React, Sonner y `pdf-lib` para documentos locales.

## Requisitos

- Node.js compatible con Next.js 15.
- npm.
- PostgreSQL.
- Credenciales de Stack Auth.
- Credenciales de Cloudinary para gestionar imágenes.

## Instalación

```bash
npm install
```

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
DATABASE_URL="postgresql://usuario:contraseña@host:5432/base_de_datos"
ALLOWED_EMAILS="admin@ejemplo.com"

NEXT_PUBLIC_STACK_PROJECT_ID=""
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=""
STACK_SECRET_SERVER_KEY=""

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
NEXT_PUBLIC_CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Web Analytics de Vercel para /admin/analytics/visits
VERCEL_ANALYTICS_TOKEN=""
VERCEL_ANALYTICS_PROJECT_ID=""
# Usa solo una de las dos variables si el proyecto pertenece a un equipo.
VERCEL_ANALYTICS_TEAM_ID=""
VERCEL_ANALYTICS_TEAM_SLUG=""
```

No publiques valores reales de secretos ni subas el archivo `.env` al repositorio. El
token de Vercel se consume únicamente en el servidor y nunca debe copiarse a variables
`NEXT_PUBLIC_*`. Para mostrar visitas, habilita Web Analytics en el proyecto de Vercel
de producción. `VERCEL_ANALYTICS_TOKEN` y `VERCEL_ANALYTICS_PROJECT_ID` son obligatorias;
si el proyecto pertenece a un equipo, configura `VERCEL_ANALYTICS_TEAM_ID` o
`VERCEL_ANALYTICS_TEAM_SLUG`, pero no ambas.

## Base de datos

El esquema se encuentra en [`prisma/schema.prisma`](prisma/schema.prisma) y utiliza PostgreSQL. Las migraciones existentes están en `prisma/migrations`.

Para aplicar migraciones en desarrollo:

```bash
npx prisma migrate dev
```

Para regenerar el cliente Prisma:

```bash
npx prisma generate
```

El script `postinstall` ejecuta automáticamente `prisma generate` después de instalar dependencias.

## Desarrollo y producción

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

Validar el código:

```bash
npm run lint
```

Crear la compilación de producción:

```bash
npm run build
```

Iniciar la compilación:

```bash
npm run start
```

## Estructura principal

```text
app/                  Rutas y layouts de Next.js
components/           Componentes organizados por funcionalidad
context/              Contextos React del checkout
hooks/                Hooks personalizados
lib/                  Prisma, autenticación, utilidades y Server Actions
prisma/               Esquema y migraciones de base de datos
public/               Logos, imágenes y recursos estáticos
stack/                Configuración de Stack Auth
store/                Estado global persistido con Zustand
docs/                 Documentación técnica del proyecto
```

El alias de imports `@/*` apunta a la raíz del proyecto.

## Rutas principales

### Sitio público

- `/`: página principal.
- `/about-us`: información de la marca.
- `/productos/consumidores`: catálogo público canónico; admite `?contexto=consumidor` o `?contexto=mayorista`.
- `/productos/consumidores/[id]`: detalle de producto.
- `/productos/mayoristas`: entrada de compatibilidad que redirige al catálogo unificado con contexto mayorista.
- `/finalizar-compra`: flujo de checkout.
- `/confirmacion`: confirmación de compra.
- `/mi-cuenta`: cuenta del cliente. Permite registrarse con correo verificado y ver puntos de fidelización, lo que debe o tiene a favor y sus pedidos.

### Administración

- `/admin-login`: inicio de sesión.
- `/admin/products`: productos.
- `/admin/inventory`: inventario y precios.
- `/admin/add-product`: creación de productos.
- `/admin/edit-product/[id]`: edición de productos.
- `/admin/transactions`: transacciones.
- `/admin/transactions/[id]`: detalle de una transacción.
- `/admin/add-transaction`: creación administrativa de transacciones.
- `/admin`: dashboard operativo.
- `/admin/analytics`: entrada compatible que redirige a las analíticas de ventas.
- `/admin/analytics/sales`: ventas semanales/mensuales, desglose por producto y predictor.
- `/admin/analytics/visits`: visitas agregadas de Web Analytics en producción.
- `/admin/clients`: directorio de clientes (alta, edición masiva y enlace a la ficha).
- `/admin/clients/[id]`: ficha del cliente con datos, compras, deuda, crédito, saldo a favor, puntos, notas internas y cuenta web.
- `/admin/clients/rewards`: premios canjeables con puntos (descuentos o productos gratis).
- `/admin/delivery-notes`: listado de notas de entrega.
- `/admin/delivery-notes/new`: creación de notas para clientes mayoristas.
- `/admin/delivery-notes/[id]/pdf`: descarga protegida del PDF.

El área administrativa requiere autenticación **y** que el correo del usuario esté en `ALLOWED_EMAILS` (lista separada por comas). La tienda comparte el mismo proveedor de identidad con los clientes, así que esta variable es **obligatoria en producción**: si está vacía o ausente, nadie accede al panel (falla cerrado). En desarrollo (`NODE_ENV=development`) el panel no pide inicio de sesión.

#### Cuentas de clientes (Stack Auth)

Para que los clientes puedan registrarse en `/mi-cuenta`, en el dashboard de Stack Auth hay que habilitar el registro de usuarios, configurar los métodos de acceso (Google y/o correo con contraseña) y mantener la verificación de correo activa. Una cuenta solo se vincula a un cliente existente con el correo verificado; si solo coincide el teléfono, la vinculación queda pendiente hasta que alguien del equipo la confirme desde la ficha del cliente.

### Punto de venta

`/venta-rapida` muestra los productos con inventario disponible, permite buscar por nombre o categoría, calcula el total en USD y bolívares y genera un pedido para enviarlo por WhatsApp.

El catálogo público usa una sola experiencia para consumidores y mayoristas. El contexto elegido en la entrada determina la presentación y el precio vigente (`precioDetal` o `precioMayorista`) sin crear una aplicación ni un checkout separado.

Este flujo no registra actualmente una `Transaccion` en la base de datos ni descuenta inventario; el registro persistente de ventas se realiza mediante el checkout web.

## Modelo de datos

Las entidades principales de Prisma son:

- `Cliente`: datos del comprador, tipo, notas internas y condiciones de crédito (`creditoHabilitado`, `limiteCreditoUsd`).
- `CuentaCliente`: acceso del cliente a la tienda, vinculado como máximo a un cliente (`vinculada` o `pendiente`).
- `MovimientoSaldo`: libro del saldo a favor (solo inserciones; el saldo es la suma de los movimientos).
- `Premio`: premios canjeables con puntos (descuento en USD o producto gratis).
- `Direccion`: direcciones asociadas al cliente.
- `Producto` e `Imagen`: catálogo, precios, inventario e imágenes.
- `Transaccion` y `DetalleCompra`: pedidos y líneas de productos.
- `Pago`: método, referencia, montos y tasa de cambio.
- `EstadoTransaccionHistorial`: auditoría de cambios de estado y actor administrativo.
- `NotaEntrega` y `DetalleNotaEntrega`: documento mayorista con snapshots de líneas.
- `Fidelidad`: libro de puntos con signo (acumulación, canje, devolución, reversión y ajuste). Los puntos se acreditan cuando el pedido queda pagado.
- `Resena`: valoración de productos asociada a una compra.

El checkout utiliza una transacción de Prisma para validar y descontar inventario, crear el pedido, registrar el pago y, si hay sesión, aplicar premios y saldo a favor de forma atómica. Los puntos se acreditan después, cuando el pedido queda pagado.

## Server Actions

Las operaciones de escritura se concentran en `lib/actions`:

- `clients.ts`: clientes.
- `address.ts`: direcciones.
- `products.ts`: productos e inventario.
- `checkout.ts`: pedidos, pagos e inventario.
- `review.ts`: reseñas.
- `admin-sales.ts`: ventas manuales, cálculos y descuentos validados.
- `admin-orders.ts` / `order-status.ts`: cambios de estado con historial.
- `delivery-notes.ts`: notas mayoristas y consultas protegidas.

Los formularios utilizan esquemas Zod para validar datos antes de acceder a la base de datos.

## Documentación adicional

Consulta la [descripción técnica completa](docs/descripcion-tecnica.md) para conocer la arquitectura, el modelo de datos, los flujos internos y las consideraciones técnicas identificadas.
