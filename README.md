# Venuti's Gourmet

Aplicación web para la comercialización de pastas, salsas y productos gourmet. Incluye catálogo público, carrito de compras, checkout, gestión administrativa, inventario, pedidos, fidelidad de clientes y un punto de venta rápido integrado con WhatsApp.

## Características

- Catálogo para consumidores y clientes mayoristas.
- Detalle de productos con imágenes, descripción y reseñas.
- Carrito persistente en el navegador.
- Checkout por pasos con cliente, dirección, tipo de retiro y pago.
- Registro de pedidos, pagos, inventario y puntos de fidelidad.
- Panel administrativo protegido por autenticación.
- Gestión de productos, imágenes, precios e inventario.
- Consulta de transacciones y detalles de pedidos.
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
- Tiptap, Recharts, Lucide React y Sonner.

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
```

No publiques valores reales de secretos ni subas el archivo `.env` al repositorio.

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
- `/productos/consumidores`: catálogo para clientes detallistas.
- `/productos/consumidores/[id]`: detalle de producto.
- `/productos/mayoristas`: catálogo mayorista.
- `/finalizar-compra`: flujo de checkout.
- `/confirmacion`: confirmación de compra.

### Administración

- `/admin-login`: inicio de sesión.
- `/admin/products`: productos.
- `/admin/inventory`: inventario y precios.
- `/admin/add-product`: creación de productos.
- `/admin/edit-product/[id]`: edición de productos.
- `/admin/transactions`: transacciones.
- `/admin/transactions/[id]`: detalle de una transacción.
- `/admin/add-transaction`: creación administrativa de transacciones.

El área administrativa requiere autenticación. Si `ALLOWED_EMAILS` está configurada, el correo del usuario también debe estar incluido en esa lista separada por comas.

### Punto de venta

`/venta-rapida` muestra los productos con inventario disponible, permite buscar por nombre o categoría, calcula el total en USD y bolívares y genera un pedido para enviarlo por WhatsApp.

Este flujo no registra actualmente una `Transaccion` en la base de datos ni descuenta inventario; el registro persistente de ventas se realiza mediante el checkout web.

## Modelo de datos

Las entidades principales de Prisma son:

- `Cliente`: datos del comprador y tipo de cliente.
- `Direccion`: direcciones asociadas al cliente.
- `Producto` e `Imagen`: catálogo, precios, inventario e imágenes.
- `Transaccion` y `DetalleCompra`: pedidos y líneas de productos.
- `Pago`: método, referencia, montos y tasa de cambio.
- `Fidelidad`: acumulación o redención de puntos.
- `Resena`: valoración de productos asociada a una compra.

El checkout utiliza una transacción de Prisma para validar y descontar inventario, crear el pedido, registrar el pago y acumular puntos de fidelidad de forma atómica.

## Server Actions

Las operaciones de escritura se concentran en `lib/actions`:

- `clients.ts`: clientes.
- `address.ts`: direcciones.
- `products.ts`: productos e inventario.
- `checkout.ts`: pedidos, pagos e inventario.
- `review.ts`: reseñas.

Los formularios utilizan esquemas Zod para validar datos antes de acceder a la base de datos.

## Documentación adicional

Consulta la [descripción técnica completa](docs/descripcion-tecnica.md) para conocer la arquitectura, el modelo de datos, los flujos internos y las consideraciones técnicas identificadas.

