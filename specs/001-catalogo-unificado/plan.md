# Implementation Plan: Catálogo público unificado

**Branch**: `001-catalogo-unificado` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-catalogo-unificado/spec.md`

## Summary

La aplicación conservará una sola superficie pública y convertirá `/productos/consumidores` en el catálogo canónico. La entrada `/` redirigirá directamente al contexto consumidor; el selector del catálogo permitirá cambiar a `contexto=mayorista` sin abrir otra aplicación. El contexto seleccionará los precios existentes (`precioDetal` o `precioMayorista`), se conservará en el carrito y se propagará al detalle y al checkout. La ruta mayorista actual se convertirá en una entrada de compatibilidad hacia el catálogo unificado.

La implementación no requiere cambios en Prisma. Se añadirá una proyección de catálogo compartida, estado de contexto en Zustand, enlaces públicos consistentes y validación server-side del precio vigente antes de crear la transacción. El panel administrativo, `/venta-rapida`, autenticación y WhatsApp permanecen fuera de alcance.

## Technical Context

**Language/Version**: TypeScript estricto, Next.js 15.5.9, React 19.1.0

**Primary Dependencies**: Next.js App Router, `@prisma/client` 6.17.1, Prisma, Zustand 5, Zod 4, Tailwind CSS 4, Lucide React

**Storage**: PostgreSQL mediante Prisma para productos, imágenes, inventario, clientes y transacciones; `localStorage` mediante Zustand persistido para carrito y contexto temporal

**Testing**: `npm run lint`, `npm run build`, escenarios manuales de catálogo/carrito/checkout y validación con base de datos de desarrollo aislada; no existe actualmente un script de pruebas automatizadas en `package.json`

**Target Platform**: Aplicación web responsive en navegadores de escritorio y móvil; páginas públicas server-rendered con interacción cliente para filtros, selector y carrito

**Project Type**: Aplicación web Next.js de monolito modular con catálogo público, checkout, administración y vista rápida separadas por superficie

**Performance Goals**: Una consulta de catálogo con imágenes por render de listado, sin consultas por tarjeta; cambiar de contexto debe actualizar la vista y el carrito sin recargar datos producto por producto; mantener la transacción existente para validación y confirmación

**Constraints**: No añadir dependencias ni migraciones Prisma; no duplicar el checkout; no mostrar precios inventados; conservar permisos administrativos, la vista rápida, el canal WhatsApp y las variables de entorno; soportar 360 px de ancho sin desplazamiento horizontal

**Scale/Scope**: Una entrada pública, un catálogo canónico, una ficha de producto, una ruta mayorista de compatibilidad, navegación compartida, carrito persistido y validación del checkout; sin nuevas entidades persistentes ni cambios al panel administrativo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Separación de las tres aplicaciones — PASS**: El cambio se limita al e-commerce público. `/admin` y `/venta-rapida` conservan sus rutas, permisos, datos y responsabilidades.
- **II. Fuente única y consistencia operacional — PASS**: Se reutiliza PostgreSQL/Prisma y el modelo `Producto`; no se crea una fuente paralela. El checkout resolverá precio e inventario en servidor dentro de la transacción existente.
- **III. Seguridad, privacidad y control administrativo — PASS**: No se añaden accesos ni integraciones de identidad. El contexto es una preferencia pública, no un permiso; las acciones administrativas permanecen protegidas.
- **IV. Calidad verificable y cambios trazables — PASS**: La especificación define escenarios, invariantes y criterios medibles; el plan incluye lint, build, escenarios móviles y validación de precio/inventario con base aislada.
- **V. Simplicidad, experiencia móvil y canales reales — PASS**: Se elimina la superficie mayorista duplicada, se reutiliza el checkout existente, se mantiene WhatsApp donde ya corresponde y se diseña el selector para móvil sin añadir pasarelas ni webhooks.

## Project Structure

### Documentation (this feature)

```text
specs/001-catalogo-unificado/
├── spec.md                         # Requisitos y escenarios aprobados
├── plan.md                         # Este plan de implementación
├── research.md                     # Decisiones y alternativas investigadas
├── data-model.md                   # Estado temporal, carrito e invariantes
├── quickstart.md                   # Guía de validación funcional
├── contracts/
│   └── public-catalog.md           # Contrato de navegación y estado público
└── checklists/
    └── requirements.md             # Checklist de calidad de requisitos
```

### Source Code (repository root)

```text
app/
├── page.tsx                         # Entrada y selector inicial de contexto
├── about-us/page.tsx                # Enlaces públicos hacia el catálogo canónico
├── productos/
│   ├── layout.tsx                   # Layout público compartido
│   ├── consumidores/page.tsx        # Catálogo canónico y filtros
│   ├── consumidores/[id]/page.tsx   # Detalle con contexto y precio aplicable
│   └── mayoristas/page.tsx          # Compatibilidad hacia el catálogo unificado
└── finalizar-compra/page.tsx        # Carrito persistido y checkout existente

components/
├── productos/
│   ├── header.tsx                   # Navegación pública y selector/contexto
│   ├── footer.tsx                   # Enlaces canónicos
│   ├── sidebar.tsx                  # Categorías conservando contexto
│   ├── productCard.tsx              # Tarjeta, etiqueta, precio y enlace contextual
│   └── shoppingCartButton.tsx       # Carrito con total actualizado
├── producto/addToCart.tsx           # Añadir con ambos precios disponibles
└── finalizar-compra/paymentInformation.tsx # Contexto y líneas al checkout

lib/
├── catalog-context.ts               # Normalización y resolución de precio
├── actions/checkout.ts              # Validación server-side de precio/inventario
└── constants/constants.ts           # Categorías y reglas existentes

store/appStore.ts                    # Contexto y carrito persistidos
prisma/schema.prisma                 # Sin cambios previstos
```

**Structure Decision**: Se mantiene el monolito Next.js existente y se centraliza la lógica nueva en una utilidad de contexto compartida, el store de Zustand y las superficies públicas ya existentes. No se crea una aplicación, paquete, endpoint ni modelo de datos nuevo.

## Implementation Approach

### Phase A — Normalización y catálogo canónico

1. Crear un tipo `PurchaseContext` y utilidades para normalizar `contexto`, resolver la etiqueta, elegir el precio (`precioDetal`/`precioMayorista`) y determinar si una oferta mayorista es válida.
2. Adaptar la entrada pública para que redirija al catálogo consumidor canónico sin mostrar una pantalla de selección.
3. Adaptar el catálogo y el layout público para leer el contexto y ofrecer un selector persistente dentro de la misma experiencia.
4. Mantener categoría y contexto al cambiar filtros, enlaces de tarjeta y navegación.
5. Reemplazar el portal mayorista "en construcción" por una redirección de compatibilidad.

### Phase B — Detalle, carrito y continuidad

1. Hacer que el detalle lea `contexto`, muestre el precio correcto y conserve el contexto en el enlace de regreso y en la acción de carrito.
2. Extender `CartItem` con ambos precios y contexto, actualizar el total al cambiar contexto y versionar la persistencia de Zustand para no borrar carritos existentes.
3. Actualizar tarjetas, detalle, mini-carrito y checkout para trabajar con el precio derivado del contexto activo.
4. Corregir enlaces públicos existentes, incluido el typo actual del enlace mayorista del header, sin reintroducir una vista separada.

### Phase C — Confirmación segura y validación

1. Propagar el contexto desde el store hasta `procesarCompra`.
2. Resolver cada producto y precio en servidor, comprobar inventario y rechazar líneas desactualizadas antes de crear transacción, pago o detalle.
3. Conservar la transacción atómica y los modelos de pedido existentes, registrando en `DetalleCompra.precioUnitario` el precio validado.
4. Ejecutar lint, build y los escenarios de `quickstart.md`, incluyendo cambio de contexto, compatibilidad mayorista, móvil y error de precio/inventario.

## Post-Design Constitution Check

- **I — PASS**: El árbol de cambios solo toca e-commerce público, carrito y validación compartida del checkout; no cambia administración ni vista rápida.
- **II — PASS**: No hay nueva persistencia. El catálogo usa el `Producto` existente y la confirmación sigue siendo atómica en Prisma, con precio server-side.
- **III — PASS**: El contexto no es autorización; no se exponen secretos ni se amplían rutas administrativas.
- **IV — PASS**: Los contratos y la guía de validación cubren los flujos críticos. Se deja explícito que lint/build no sustituyen la prueba con datos aislados.
- **V — PASS**: La solución elimina el portal duplicado, mantiene el canal operativo actual y prioriza selector, precios y acciones legibles en móvil.

## Complexity Tracking

No hay violaciones de la constitución que requieran justificar complejidad adicional.
