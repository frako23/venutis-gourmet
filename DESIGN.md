# DESIGN.md — Sistema de diseño de Venuti's Gourmet

Guía visual y de UI del proyecto. Describe lo que **existe hoy en el código** (Tailwind 4 con `@theme` en [app/globals.css](app/globals.css), fuentes en [app/layout.tsx](app/layout.tsx)) y señala las inconsistencias detectadas. Para arquitectura y comandos ver [CLAUDE.md](CLAUDE.md).

## 1. Principios

- **Gourmet artesanal, oscuro y cálido**: la tienda pública es una experiencia oscura (carbón/espresso) con acentos dorados y tipografía caligráfica de marca.
- **Dos lenguajes visuales separados**:
  - *Tienda / checkout / cotización*: tema oscuro de marca (`bg-background-dark`, `text-cream`, acentos `gold`).
  - *Panel admin*: tema claro tipo "papel" encapsulado bajo `[data-admin-shell]` para no alterar la tienda.
- **Todo en español** (UI, mensajes, nombres de dominio).
- **Notificaciones solo con `sonner`** (`toast`); el `<Toaster>` ya existe en los layouts raíz, `productos` y `admin`. Estilo: `position="top-right"`, `theme="dark"`, `borderRadius: 1.2rem`, fuente Century Gothic.
- **Móvil primero** en la tienda y venta rápida (la mayoría de pedidos llegan por WhatsApp); el admin es responsive pero optimizado para escritorio.

## 2. Color

### 2.1 Tokens de marca (tienda) — `@theme`

| Token Tailwind | Valor | Uso |
|---|---|---|
| `primary` | `#5d4037` | Marrón café: texto/botones sobre superficies claras (`text-primary`, `bg-primary`) |
| `gold` | `#d4af37` | Acento principal: bordes de header, CTAs, enlaces hover, iconos (`text-gold`, `bg-gold`, `border-gold`) |
| `charcoal` | `#302d2b` | Superficies oscuras secundarias |
| `cream` | `#faf7ed` | Texto sobre fondo oscuro, superficies claras cálidas |
| `parchment` | `#f5eee5` | Fondos claros suaves (tarjetas/secciones claras) |
| `background-dark` | `#1c1a17` | **Fondo base del sitio** (`body`) |
| `background-light` | `#f8f9fa` | Fondo claro neutro |
| `background-alt` | `#ffffff` | Superficie blanca |

Patrones de uso frecuentes: `text-gold` (≈44 usos), `bg-gold` (≈32), `text-primary` (≈26), bordes `border-gold`, `border-gold/20-50`, `border-primary/10`, fondos con opacidad `bg-gold/10`, `bg-primary/5`, `bg-background-dark/80` + `backdrop-blur-md` en header.

### 2.2 Tokens del panel admin — `[data-admin-shell]`

| Variable | Valor | Rol |
|---|---|---|
| `--admin-ink` | `#18211d` | Texto principal y botón primario |
| `--admin-ink-soft` | `#23302a` | Hover del botón primario |
| `--admin-paper` | `#f4f1e8` | Fondo de página (con cuadrícula de 32px al 3.5%) |
| `--admin-panel` | `#fffdf8` | Paneles/tarjetas |
| `--admin-line` | `#dedfd6` | Bordes y divisores |
| `--admin-muted` | `#707970` | Texto secundario, etiquetas |
| `--admin-brass` | `#c8a45d` | Acento (hover, foco, scrollbar, botón brass) |
| `--admin-olive` | `#66735f` | Eyebrows |
| `--admin-danger` | `#b85f49` | Errores/acciones destructivas |

### 2.3 Cotización rápida (PNG)

[quoteArtwork.tsx](components/cotizacion-rapida/quoteArtwork.tsx) usa valores literales porque se rasteriza fuera del tema: fondo `#14110f`, tarjeta `#1d1814`, borde `#d4af37/45`, título en `font-reklame`. Mantenerlo alineado con `gold` y `background-dark`.

### 2.4 Estados

Los estados de pedido (`por_cobrar`, `en_pedido`, `pagado`; `cancelado` es operativo y final; `pendiente` solo histórico) deben tener un color consistente en tienda y admin; hoy se resuelven por componente. Usar `--admin-danger` para cancelado/errores, `--admin-olive` para confirmado/pagado y `--admin-brass` para pendiente de acción.

## 3. Tipografía

Cargadas con `next/font/local` en el `<html>` (variables CSS) desde [app/fonts/](app/fonts):

| Variable / clase | Fuente | Rol |
|---|---|---|
| `font-century-gothic` | Century Gothic | **Fuente base** del body: textos, navegación, formularios |
| `font-reklame` | Reklame Script (DEMO) | Display de marca: títulos hero, cotización |
| `font-good-brush` | Good Brush | Acentos manuscritos tipo pincel |
| `font-dk-coal-brush` | DK Coal Brush | Títulos con textura/pincel |
| `font-cascadia-code` | Cascadia Code | Datos técnicos/números en la tienda |
| `font-sans` | Inter (Google Fonts) | Admin / interfaz tipo dashboard |
| `font-mono` | JetBrains Mono (Google Fonts) | Cifras en admin (`.admin-mono`) |

Convenciones:
- Navegación: `text-sm font-medium uppercase tracking-widest`.
- Eyebrow admin: `0.68rem`, peso 800, `letter-spacing 0.14em`, mayúsculas, color olive.
- Título admin: `clamp(1.8rem, 3vw, 2.6rem)`, peso 850, `letter-spacing -0.045em`, `line-height 1`.
- Subtítulo admin: `0.9rem`, `line-height 1.55`, color muted.
- Importes y tasas en USD/Bs: usar fuente mono (`admin-mono` en admin, `font-cascadia-code` en tienda) para alineación.

## 4. Espaciado, forma y elevación

- **Radios**: tienda con esquinas generosas (`rounded-full` para pills y botones de contexto; tarjetas ~`rounded-2xl`; toasts `1.2rem`). Admin: paneles `1.1rem`, botones/inputs `0.7rem`. La imagen de cotización usa `28px`/`22px`.
- **Header de tienda**: `sticky top-0 z-50`, `px-6 lg:px-12 py-4`, borde inferior `border-b-2 border-gold`, desenfoque de fondo.
- **Admin**: contenedor `.admin-content` máx. `78rem` centrado; `.admin-page` con padding `1.25rem` (mayor en ≥768px).
- **Sombras**: admin `0 10px 30px rgba(24,33,29,.055)`; en tienda preferir bordes dorados de baja opacidad antes que sombras fuertes.
- **Tamaño táctil mínimo**: botones admin `min-height: 2.75rem`.

## 5. Componentes

### Tienda ([components/productos/](components/productos))
- **Header**: logo (`/logo-venutis.avif`), navegación en mayúsculas (Nuestra historia, Mayoristas), `PurchaseContextSwitcher` (consumidor/mayorista, pill), login y carrito. Hover de enlaces: `hover:text-gold transition-colors`.
- **ProductCard**: carrusel de imágenes con swipe (umbral 48px), badge (`Disponible para mayoristas` / etiqueta de contexto), estrellas doradas (12px), precio según `contexto`, botón de agregar deshabilitado sin inventario o sin precio válido. Imagen de respaldo: `/food-avatar.png`.
- **Footer, Sidebar, ShoppingCartButton, CopyToClipboard**: seguir el mismo vocabulario oscuro + dorado.

### Checkout ([components/finalizar-compra/](components/finalizar-compra))
Pasos: datos personales → entrega (zona/dirección) → pago → confirmación. Skeleton/carga con la animación `loading-slide` (`--animation-loading-slide`, 1.8s ease-in-out).

### Admin ([app/globals.css](app/globals.css), [components/admin/](components/admin))
Clases utilitarias propias dentro de `[data-admin-shell]`:
- `.admin-page`, `.admin-content`, `.admin-eyebrow`, `.admin-title`, `.admin-subtitle`
- `.admin-panel` (con sombra) / `.admin-panel-flat` (translúcido)
- `.admin-button-primary` (tinta oscura, `translateY(-1px)` en hover), `.admin-button-brass` (variante dorada), `.admin-button-secondary` (borde que pasa a brass en hover)
- `.admin-field`, `.admin-label`, `.admin-table`, `.admin-sheet` / `.admin-sheet-input` (edición masiva tipo hoja de cálculo), `.admin-horizontal-scroll` (scrollbar brass), `.admin-mono`
- **Foco accesible**: `outline: 3px` de brass al 55% con `outline-offset: 2px` en `a, button, input, select, textarea`.
- Respeta `prefers-reduced-motion`.

### Utilidades globales
`gold-border`, `text-shadow-elegant`, `custom-gradient-overlay` (degradado `#1c1a17` 75→95%), `blur-bg` (fondos desenfocados en héroes) y estilos `print-*` / `@page` para impresión (notas de entrega y PDFs).

### Iconos y notificaciones
- Iconos: `lucide-react` (tamaños 12–20px típicos).
- Toasts: `sonner` únicamente.

## 6. Imágenes y marca

- Logos: `public/logo-venutis.avif` (header) y `logo_Venutis.png`. Favicon `app/icon.avif` con respaldo `icon.png`.
- Fotografía de producto desde Cloudinary (hosts permitidos en [next.config.ts](next.config.ts)); fotos estáticas de categorías en `public/*.avif`.
- Preferir `next/image`; AVIF como formato por defecto en assets locales.

## 7. Interacción y movimiento

- Transiciones cortas: `transition-colors` en enlaces; `160ms ease` en botones admin.
- Header con `backdrop-blur-md` y fondo translúcido.
- Cursor `pointer` global en `a` y `button`.
- Carrusel de producto: swipe táctil + controles; evitar que el swipe dispare navegación.

## 8. Inconsistencias conocidas (deuda de diseño)

1. **Token inexistente**: `ProductCard` y varios componentes usan `bg-accent-gold` / `text-accent-gold`, pero `@theme` solo define `gold`. Unificar a `gold` (o definir `--color-accent-gold`).
2. **Fuentes sin definir en el layout**: `--font-display` ("Noto Serif") y `--font-artisan` ("Pinyon Script") se declaran en `@theme` pero nunca se cargan; `font-display` se usa 2 veces y `font-artisan` 1. Cargarlas o migrarlas a Reklame/Century Gothic.
3. **Variables RGB obsoletas**: `--primary-rgb: 108,19,37` y `--gold-rgb: 198,153,79` en `:root` no coinciden con `primary` (#5d4037) ni `gold` (#d4af37). Eliminar o corregir.
4. **Reklame Script es versión DEMO**: licenciar la fuente completa antes de uso comercial.
5. **Dos paletas doradas**: `gold #d4af37` (tienda) vs `--admin-brass #c8a45d` (admin). Es intencional por contexto, pero documentar cualquier componente compartido que cruce ambos temas.
6. **Colores literales** en `quoteArtwork.tsx` (`#14110f`, `#1d1814`, `#d4af37`) y radios arbitrarios (`rounded-[28px]`): aceptable por el render a PNG, evitar en otros lugares.
7. **Carga duplicada de Inter/JetBrains Mono** por `@import` de Google Fonts en CSS; considerar `next/font/google` para evitar el bloqueo de render.

## 9. Reglas para nuevos cambios de UI

- Tienda/checkout/venta rápida: usar tokens `gold`, `primary`, `cream`, `charcoal`, `background-dark`; no introducir hex sueltos.
- Admin: usar las clases `.admin-*` y variables `--admin-*`; no mezclar con tokens de tienda.
- Toda notificación → `toast` de `sonner`.
- Textos en español, con mayúsculas por CSS (`uppercase`) y no escritas en el literal.
- Verificar contraste: `text-gold` sobre `background-dark` cumple; `text-gold` sobre `cream`/`parchment` **no** — usar `text-primary` allí.
