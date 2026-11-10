# Contrato: zonas de delivery

**Feature**: `011-zonas-delivery`

## 1. Reglas puras — `lib/delivery-zone-rules.ts`

Módulo sin `server-only` ni imports `@/`: lo cargan el checkout (`lib/checkout-core.ts`), las acciones, los componentes cliente y las pruebas. Importa `roundMoney` de `./checkout-rules.ts`.

```ts
export type ZonaDeliveryVista = { id: number; nombre: string; costoUsd: number };
export type ZonaDeliveryPanel = ZonaDeliveryVista & { activa: boolean };

type Resultado<T, C extends string> =
  | { ok: true; value: T }
  | { ok: false; campo: C; message: string };

export function normalizarNombreZona(nombre: string): string;   // recorta y colapsa espacios
export function claveZona(texto: string): string;               // NFD sin acentos, minúsculas, signos → espacio, colapsa
export function validarNombreZona(nombre: string): Resultado<{ nombre: string; clave: string }, "nombre">;
export function validarCostoZona(costo: number): Resultado<number, "costoUsd">;  // devuelve el costo redondeado
export function ordenarZonas<T extends { nombre: string; costoUsd: number }>(zonas: T[]): T[];
export function filtrarZonas<T extends { nombre: string }>(zonas: T[], texto: string): T[];
export function agruparPorCosto<T extends { nombre: string; costoUsd: number }>(zonas: T[]): Array<{ costoUsd: number; zonas: T[] }>;
export function buscarZona<T extends { nombre: string }>(zonas: T[], urbanizacion: string): T | null;
export function validarDatosEntrega(datos: { nombre: string; telefono: string; direccion: string }):
  Resultado<{ nombre: string; telefono: string; direccion: string }, "nombre" | "telefono" | "direccion">;
```

### `claveZona`

| Entrada | Clave |
|---|---|
| `"Club Hípico"` | `club hipico` |
| `"  Chacaíto "` | `chacaito` |
| `"Av. Victoria (Presidente Medina)"` | `av victoria presidente medina` |
| `"Montalban  II"` | `montalban ii` |
| `"..."` | `""` (vacía; `validarNombreZona` la rechaza) |

### `validarNombreZona` / `validarCostoZona`

| Entrada | Resultado |
|---|---|
| nombre `"  Santa   Sofía "` | ok: `{ nombre: "Santa Sofía", clave: "santa sofia" }` |
| nombre `""` o solo espacios | "Escribe el nombre de la zona." |
| nombre de más de 80 caracteres (tras normalizar) | "El nombre de la zona admite hasta 80 caracteres." |
| nombre `"..."` | "El nombre de la zona debe tener letras o números." |
| costo `3.5` | ok: `3.5` |
| costo `NaN`, `Infinity` | "Escribe un costo válido en dólares." |
| costo `0`, `-1` | "El costo del delivery debe ser mayor que cero." |
| costo `3.555` | "El costo admite hasta 2 decimales." |

### `ordenarZonas`, `filtrarZonas`, `agruparPorCosto`, `buscarZona`

- **`ordenarZonas`**: devuelve una copia ordenada por `costoUsd` ascendente y luego por `nombre`, con `localeCompare("es", { sensitivity: "base" })`. "Ávila" va entre "Altamira" y "Baruta".
- **`filtrarZonas`**: devuelve las zonas cuya `claveZona(nombre)` contiene `claveZona(texto)`, conservando el orden de entrada. Un texto vacío devuelve todas.
  - `"hipico"` → "Club Hípico" y "Terrazas del Club Hípico".
  - `"AV.  lib"` → "Av. Libertador".
  - `"zzz"` → `[]`.
- **`agruparPorCosto`**: agrupa una lista ya ordenada en grupos por `costoUsd` ascendente; un costo con decimales (3,5) forma su propio grupo. No devuelve grupos vacíos.
- **`buscarZona`**: devuelve la zona cuya clave es igual a `claveZona(urbanizacion)`, o `null`. "Chacaito" encuentra "Chacaíto".

### `validarDatosEntrega`

Recorta los tres campos; los tres son obligatorios.

| Entrada | Resultado |
|---|---|
| nombre vacío | campo `nombre`: "Escribe el nombre de quien recibe." |
| teléfono vacío | campo `telefono`: "Escribe el teléfono de quien recibe." |
| `"0414-123-4567"`, `"+58 414 1234567"` | ok |
| `"414123456"` (9 dígitos), `"+58 4141 2345 678901"` (16 dígitos) | campo `telefono`: "El teléfono debe tener entre 10 y 15 dígitos." |
| `"0414/1234567"` (carácter no admitido) | campo `telefono`: "El teléfono solo admite números, +, espacios y guiones." |
| dirección vacía | campo `direccion`: "Escribe la dirección de entrega." |

## 2. Lectura pública — `lib/delivery-zones.ts` y `getZonasDelivery`

```ts
// lib/delivery-zones.ts  (import "server-only"; usa "@/lib/prisma")
export async function listarZonasActivas(): Promise<ZonaDeliveryVista[]>;
// where: { activa: true }, select: { id, nombre, costoUsd }, resultado pasado por ordenarZonas
```

| Consumidor | Uso |
|---|---|
| `app/venta-rapida/page.tsx` | Prop `zonas` de `PuntoDeVenta`. Si falla, `zonas = []` y `zonasError = true`. |
| `app/cotizacion-rapida/page.tsx` | Prop `zonas` de `QuickQuote`. Si falla, `zonas = []` y solo se ofrece "Sin delivery". |
| `lib/actions/address.ts` → `getZonasDelivery()` | Server Action pública que devuelve `listarZonasActivas()`, o `[]` si falla. La llama `AddressManager`. |

## 3. Escrituras del panel — `lib/actions/delivery-zones.ts`

Archivo `"use server"`. Cada acción ejecuta `requireAdmin()` antes de leer la entrada.

```ts
type ResultadoZona =
  | { success: true; message: string; zona: ZonaDeliveryPanel }
  | { success: false; message: string; campo?: "nombre" | "costoUsd" };

export async function crearZonaDelivery(input: { nombre: string; costoUsd: number }): Promise<ResultadoZona>;
export async function actualizarZonaDelivery(
  id: number,
  cambios: { nombre?: string; costoUsd?: number; activa?: boolean },
): Promise<ResultadoZona>;
```

**Validación**:

1. Zod comprueba la forma:
   - `id`: entero positivo.
   - `cambios`: objeto estricto con al menos un campo.
   - `nombre`: texto de hasta 200 caracteres antes de normalizar.
   - `costoUsd`: número.
   - `activa`: booleano.
2. Después, `validarNombreZona` y `validarCostoZona` validan solo los campos presentes. La `clave` siempre la calcula el servidor.

**`crearZonaDelivery`**: crea la zona con `activa = true`.

**`actualizarZonaDelivery`** ejecuta, en una `prisma.$transaction`:

1. Lee la zona. Si no existe: "La zona ya no existe. Recarga la página."
2. Aplica solo los campos recibidos.
3. Si cambió `nombre`, reescribe las direcciones de esa zona:
   1. lee los valores distintos de `Direccion.urbanizacion`;
   2. se queda con los que cumplen `claveZona(valor) === claveAnterior`;
   3. ejecuta `direccion.updateMany({ where: { urbanizacion: { in: valores } }, data: { urbanizacion: nombreNuevo } })`.

**Duplicados**: un `P2002` sobre `clave` responde con `campo: "nombre"`:

- "Ya existe una zona llamada «Chacaíto»."
- Si la existente está inactiva, el mensaje termina en "Está inactiva: reactívala en lugar de crearla."

**Después de un éxito**: `revalidatePath("/", "layout")`.

**Mensajes de éxito**:

| Operación | Mensaje |
|---|---|
| Crear | "Zona «Santa Sofía» agregada a $4.00." |
| Renombrar | "Zona renombrada a «Chacaíto»." Si se reescribieron direcciones, se añade " Se actualizaron N direcciones." |
| Cambiar costo | "Costo de «Chuao» actualizado a $3.50." |
| Desactivar | "«Chuao» desactivada: ya no se ofrece en la tienda." |
| Reactivar | "«Chuao» reactivada." |

Los errores inesperados responden "No se pudo guardar la zona. Intenta de nuevo." y se registran con `console.error`.

## 4. Checkout — `registrarCompraWeb` (`lib/checkout-core.ts`)

Reemplaza la búsqueda en `DELIVERY_ZONES`:

```ts
const zona = await tx.zonaDelivery.findUnique({ where: { clave: claveZona(address.urbanizacion) } });
if (!zona || !zona.activa) {
  throw new CheckoutError("INVALID_ADDRESS", "Tu sector ya no tiene delivery. Elige otro sector o retira en tienda.");
}
montoDelivery = zona.costoUsd;
snapshot = { zonaEntrega: zona.nombre, aliasEntrega: address.tipo, direccionEntrega: address.direccion.trim() };
```

- `CheckoutData` no cambia.
- `validateDeliveryInput` y `validatePaymentInput` se aplican igual que hoy. Si el pago declarado no coincide porque el costo cambió, el pedido se rechaza con "El pago no coincide con el total final.".

## 5. Direcciones — `lib/actions/address.ts`

- `AddressSchema` deja de usar `DELIVERY_ZONES`: `urbanizacion` pasa a ser un texto recortado no vacío.
- Tras validar, `addAddress` y `editAddress` buscan la zona por `clave`:
  - si no existe o está inactiva, responden "Selecciona una zona de delivery disponible";
  - si existe, guardan `zona.nombre` en `urbanizacion`.
- Se añade `getZonasDelivery()` (sección 2).

## 6. Mensaje de WhatsApp — `mensajeWhatsapp` (`lib/pos.ts`)

```ts
export type DeliveryVentaRapida = {
  zona: string;
  costoUsd: number;
  recibe: { nombre: string; telefono: string; direccion: string };
};

export function mensajeWhatsapp(opts: {
  negocio: string;
  lineas: LineaCarrito[];
  tasa: number;
  totalUsd: number;                       // total de productos (como hoy)
  delivery?: DeliveryVentaRapida | null;
}): string;
```

**Sin `delivery`**: el texto es idéntico al actual y termina en `*NO INCLUYE DELIVERY*`.

**Con `delivery`**: el bloque de productos no cambia. Después se añade:

```text
*Delivery*
Zona: Club Hípico
Costo: $3.00 / Bs 105,00
Recibe: María Pérez
Teléfono: 0414-123-4567
Dirección: Calle 2, casa 5, Los Palos Grandes

*Total a pagar*
Productos: $10.00
Delivery: $3.00
Total USD: *$13.00*
Total Bs: *Bs 455,00*

Tasa de referencia: *Bs 35,00 por 1 $*
```

- `Total USD` es `roundMoney(totalUsd + costoUsd)`.
- No aparece `*NO INCLUYE DELIVERY*`.

## 7. Interfaz

### `/admin/delivery` — `app/admin/delivery/page.tsx` + `components/admin/delivery/deliveryZonesTable.tsx`

- **Página**: Server Component bajo el layout del panel, que exige autenticación y `ALLOWED_EMAILS`. Consulta todas las zonas (`id`, `nombre`, `costoUsd`, `activa`) y las pasa por `ordenarZonas`.
- **Encabezado**:
  - título "Zonas de delivery";
  - conteo "N zonas · M activas";
  - botón "Agregar zona";
  - ayuda: "Los cambios se guardan con Enter o al salir de la celda. Escape deshace."
- **Columnas**: "Zona" (campo de texto), "Costo (USD)" (campo numérico, `step 0.01`, `min 0.01`), "Estado" (etiqueta "Activa" o "Inactiva") y la acción ("Desactivar" o "Reactivar"). Las filas inactivas se ven atenuadas.
- **Edición**:
  - Enter, o salir del campo con un valor distinto del guardado, valida con las reglas puras y luego llama a `actualizarZonaDelivery(id, { campo })`. Escape restaura el valor guardado.
  - Mientras guarda, la fila queda deshabilitada.
  - Si se acepta: `toast.success`, la fila toma la zona devuelta y la tabla se reordena con `ordenarZonas`.
  - Si se rechaza: `toast.error`, el campo conserva el borrador con `aria-invalid` y borde de error.
- **Fila nueva**:
  - "Agregar zona" inserta una fila editable al principio, con el foco en el nombre.
  - Enter en cualquiera de sus campos o el botón "Guardar" llama a `crearZonaDelivery`; salir del campo no crea nada.
  - Escape o "Descartar" la quitan.
  - Tras crearla, la fila se cierra y la zona aparece en su posición.
- **Teléfono**: la tabla vive en una región con desplazamiento horizontal, como `BulkInventoryEditor`.
- **Navegación**: entrada "Delivery" con icono `Truck` en `adminNavigation`, después de "Notas de entrega", y título "Delivery" para `/admin/delivery` en `components/admin/header.tsx`.

### Venta rápida — `components/venta-rapida/deliverySelector.tsx`

**Props**:

```ts
{
  zonas: ZonaDeliveryVista[];
  zonasError: boolean;
  entrega: EntregaVentaRapida;
  onChange: (entrega: EntregaVentaRapida) => void;
}
```

El estado vive en `PuntoDeVenta`.

**Ubicación**: dentro del resumen, entre la lista de productos y el total, junto al botón "Enviar Orden por WhatsApp". "Procesar pedido en la app" queda debajo, sin cambios.

**Estados de la interfaz**:

| Estado | Se ve |
|---|---|
| Interruptor apagado | "Agregar delivery" (ayuda: "Solo para el pedido por WhatsApp"). |
| Sin zonas o `zonasError` | Interruptor deshabilitado y "El delivery no está disponible en este momento. Puedes enviar el pedido sin delivery." |
| Encendido, sin zona | Buscador ("Busca tu zona, ej. Chacao") y la lista agrupada por costo ("Delivery $3.00"), con altura máxima y desplazamiento propio. Cada zona es un botón con nombre y costo. Sin coincidencias: "No hay zonas con ese nombre." |
| Encendido, con zona | Solo "Club Hípico · $3.00" con el botón "Cambiar", más el formulario: "Nombre de quien recibe", "Teléfono" (`inputMode="tel"`) y "Dirección" (2 líneas). |

**Totales**: con zona elegida, el resumen muestra "Productos", "Delivery (zona)" y "Total a pagar" (USD y Bs, con `tasaActiva`).

**Enviar por WhatsApp**:

- Con el interruptor encendido:
  - sin zona: `toast.error("Elige la zona del delivery.")` y no se abre WhatsApp;
  - si `validarDatosEntrega` falla: `toast.error(message)`, se enfoca el campo y no se abre WhatsApp.
- Si todo es válido, llama a `mensajeWhatsapp({ ..., delivery })`.

**Vaciar**: reinicia el carrito y `entrega`.

**Altura**: el contenido del `Sheet` se desplaza en vertical para que el formulario quepa en el teléfono.

### Checkout — `ZoneSelector` y `AddressManager`

- **`ZoneSelector`**:
  - recibe `zonas: ZonaDeliveryVista[]` por props;
  - filtra con `filtrarZonas` y agrupa con `agruparPorCosto` (encabezado "Zona delivery $3.00");
  - elimina los grupos fijos `[3, 4, 5, 6]`.
- **`AddressManager`**:
  - llama una vez a `getZonasDelivery()` y guarda las zonas;
  - el costo de cada dirección es `buscarZona(zonas, urbanizacion)?.costoUsd`;
  - una dirección sin zona activa muestra "Sin delivery en este sector", fija `deliveryPrice` en 0 y no habilita "Continuar";
  - mientras las zonas cargan, "Continuar" sigue deshabilitado.

### Cotización rápida — `QuickQuote`

- Recibe `zonas: ZonaDeliveryVista[]` por props en lugar de importar `DELIVERY_ZONES`.
- El `<select>` agrupa con `agruparPorCosto` y conserva el nombre como valor.
- `QuoteDelivery` y `buildQuoteDraft` no cambian.
