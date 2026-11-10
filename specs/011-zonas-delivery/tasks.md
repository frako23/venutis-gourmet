---

description: "Task list for admin-managed delivery zones and delivery in the quick sale"
---

# Tasks: Zonas de delivery administrables y delivery en la venta rápida

**Input**: Design documents from `/specs/011-zonas-delivery/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/delivery-zones.md](./contracts/delivery-zones.md), [quickstart.md](./quickstart.md)

**Tests**: El plan las pide porque el costo del delivery es dinero (Principio V; research.md, Decisión 12):

- pruebas puras de las reglas de zonas y de los datos de entrega (`tests/checkout/delivery-zones.test.ts`);
- prueba del mensaje de WhatsApp (`tests/checkout/quick-sale-channel.test.ts`);
- dos casos de integración del checkout (`tests/checkout/checkout.integration.test.ts`).

La interfaz, el renombre con direcciones y la autorización se validan a mano con [quickstart.md](./quickstart.md).

**Organization**: Las tareas se agrupan por historia de usuario de la spec:

- **US1 (P1)**: ver, editar, desactivar y reactivar zonas en `/admin/delivery`.
- **US2 (P1)**: agregar zonas desde la tabla.
- **US3 (P1)**: las zonas de la base de datos son la única lista de la tienda (checkout, direcciones, cotización) y desaparece `DELIVERY_ZONES`.
- **US4 (P2)**: delivery con datos de quien recibe en el mensaje de WhatsApp de `/venta-rapida`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: Historia de usuario de la tarea (US1, US2, US3, US4).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fijar la línea base. No se añaden dependencias.

- [X] T001 Preparar la línea base:
  - Confirmar que `DATABASE_URL` apunta a una base de desarrollo **aislada** (nunca la de producción).
  - Crear en ella los datos de prueba de quickstart.md ("Requisitos previos"): un cliente con una dirección cuya `urbanizacion` sea "Chuao" y otro con una dirección cuya `urbanizacion` sea "Chacaíto" (con acento).
  - Ejecutar `npm.cmd run test:checkout`, `npm.cmd run test:admin` y `npm.cmd run lint` y anotar los fallos preexistentes, para no confundirlos con regresiones.
  - Confirmar con `rg -n DELIVERY_ZONES` los siete usos que lista research.md: `lib/checkout-core.ts`, `lib/actions/address.ts`, `components/finalizar-compra/addressManager.tsx`, `components/finalizar-compra/zoneSelector.tsx`, `components/cotizacion-rapida/quickQuote.tsx` y la definición en `lib/constants/constants.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Las reglas puras de zonas, el modelo `ZonaDelivery` con las 90 zonas actuales y la lectura de zonas activas. Las usan todas las historias.

**⚠️ CRITICAL**: No comenzar las historias de usuario hasta completar esta fase.

- [X] T002 Crear `lib/delivery-zone-rules.ts` sin `server-only` ni imports `@/`, porque lo cargan `lib/checkout-core.ts` y los tests. Importar `roundMoney` desde `"./checkout-rules.ts"`. Exportar, según contracts/delivery-zones.md §1:
  - **Tipos**:
    - `ZonaDeliveryVista = { id: number; nombre: string; costoUsd: number }`;
    - `ZonaDeliveryPanel = ZonaDeliveryVista & { activa: boolean }`;
    - el tipo genérico `Resultado<T, C>` (`{ ok: true; value: T } | { ok: false; campo: C; message: string }`).
  - **`normalizarNombreZona(nombre)`**: recorta y colapsa los espacios repetidos en uno.
  - **`claveZona(texto)`**: `normalize("NFD")`, elimina `[̀-ͯ]`, pasa a minúsculas, reemplaza `[^a-z0-9]+` por un espacio y recorta. Por ejemplo, `"Av. Victoria (Presidente Medina)"` da `"av victoria presidente medina"`.
  - **`validarNombreZona(nombre)`**: aplica la regla de data-model.md, "Obligatorio. Se recorta y se colapsan los espacios repetidos; de 1 a 80 caracteres.", con estos mensajes:
    - vacío: "Escribe el nombre de la zona.";
    - más de 80: "El nombre de la zona admite hasta 80 caracteres.";
    - clave vacía: "El nombre de la zona debe tener letras o números.".

    Si es válido, devuelve `{ nombre, clave }`.
  - **`validarCostoZona(costo)`**: aplica "Mayor que 0, con 2 decimales como máximo. Se guarda redondeado con `roundMoney`.", con estos mensajes:
    - no finito: "Escribe un costo válido en dólares.";
    - `<= 0`: "El costo del delivery debe ser mayor que cero.";
    - `Math.abs(roundMoney(costo) - costo) > 1e-9`: "El costo admite hasta 2 decimales.".

    Si es válido, devuelve `roundMoney(costo)`.
  - **`ordenarZonas(zonas)`**: devuelve una copia ordenada por `costoUsd` ascendente y luego por `nombre` con `localeCompare(b, "es", { sensitivity: "base" })`.
  - **`filtrarZonas(zonas, texto)`**: devuelve las zonas cuya `claveZona(nombre)` incluye `claveZona(texto)`, conservando el orden. Un texto vacío devuelve todas.
  - **`agruparPorCosto(zonas)`**: agrupa una lista ya ordenada en `{ costoUsd, zonas }[]` por costo ascendente, sin grupos vacíos.
  - **`buscarZona(zonas, urbanizacion)`**: devuelve la zona con `claveZona(nombre) === claveZona(urbanizacion)`, o `null`.
- [X] T003 [P] Crear `tests/checkout/delivery-zones.test.ts` con `node:test` y `node:assert/strict`, importando desde `"../../lib/delivery-zone-rules.ts"`. Cubrir cada fila de las tablas de contracts/delivery-zones.md §1:
  - **`claveZona`**: "Club Hípico", "  Chacaíto ", "Av. Victoria (Presidente Medina)", "Montalban  II" y "...".
  - **`validarNombreZona`**: "  Santa   Sofía ", vacío, solo espacios, 81 caracteres y "...".
  - **`validarCostoZona`**: 3.5, NaN, Infinity, 0, -1 y 3.555.
  - **`ordenarZonas`**: "Ávila" queda entre "Altamira" y "Baruta"; el costo manda sobre el nombre.
  - **`filtrarZonas`**:
    - "hipico" da exactamente "Club Hípico" y "Terrazas del Club Hípico" sobre una muestra que incluya otras zonas;
    - "AV.  lib" da "Av. Libertador";
    - "zzz" da `[]`;
    - "" da todas.
  - **`agruparPorCosto`**: con 3, 3.5 y 4 forma tres grupos en ese orden.
  - **`buscarZona`**: "Chacaito" encuentra "Chacaíto"; "Zona desconocida" da `null`.

  Ejecutar `node --loader ts-node/esm --test tests/checkout/delivery-zones.test.ts` y confirmar que pasa.
- [X] T004 [P] En `prisma/schema.prisma`, después de `model Direccion`, añadir `model ZonaDelivery` exactamente como en data-model.md, con estos campos:
  - `id Int @id @default(autoincrement())`
  - `nombre String`
  - `clave String @unique`
  - `costoUsd Float`
  - `activa Boolean @default(true)`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`

  Añadir comentarios de una línea:
  - sobre el modelo: "Única lista de zonas de delivery; las direcciones la referencian por clave (sin acentos ni mayúsculas).";
  - sobre `clave`: "claveZona(nombre); la calcula el servidor.".

  No tocar `Direccion` ni `Transaccion`.
- [X] T005 Crear la migración con `npx prisma migrate dev --create-only --name zonas_delivery`. Después de lo que genera Prisma (`CREATE TABLE "ZonaDelivery"` y `CREATE UNIQUE INDEX "ZonaDelivery_clave_key"`), añadir en `prisma/migrations/<timestamp>_zonas_delivery/migration.sql`:
  1. **Comentario en español**: carga las 90 zonas que antes vivían en `DELIVERY_ZONES` (`lib/constants/constants.ts`) con su costo actual; la `clave` va como literal, calculada con `claveZona`, para no depender de `unaccent` (research.md, Decisión 5).
  2. **`INSERT`**: `INSERT INTO "ZonaDelivery" ("nombre", "clave", "costoUsd", "activa", "updatedAt") VALUES …` con las 90 filas (`activa` en `true` y `"updatedAt"` en `CURRENT_TIMESTAMP`).
     - Generar las filas con un script temporal en el directorio scratchpad, fuera del repo. El script importa `DELIVERY_ZONES` desde `lib/constants/constants.ts` y `claveZona` desde `lib/delivery-zone-rules.ts` y escapa las comillas simples.
     - Pegar el resultado; el script no se versiona.
  3. **Comprobación**: un bloque `DO $$ BEGIN IF (SELECT COUNT(*) FROM "ZonaDelivery") <> 90 THEN RAISE EXCEPTION 'Se esperaban 90 zonas de delivery'; END IF; END $$;`.
- [X] T006 Aplicar la migración con `npx prisma migrate dev` y regenerar el cliente con `npx prisma generate`. Verificar con las consultas de quickstart.md §1:
  - 64 zonas a 3, 16 a 4, 6 a 5 y 4 a 6;
  - 0 inactivas;
  - `SELECT "nombre", "clave" FROM "ZonaDelivery" WHERE "nombre" IN ('Club Hípico', 'Av. Victoria (Presidente Medina)');` devuelve `club hipico` y `av victoria presidente medina`.
- [X] T007 Crear `lib/delivery-zones.ts` con `import "server-only";`, `import { prisma } from "@/lib/prisma";` y los imports de `ordenarZonas` y `ZonaDeliveryVista` desde `@/lib/delivery-zone-rules`. Exportar `async function listarZonasActivas(): Promise<ZonaDeliveryVista[]>`:
  - consulta `prisma.zonaDelivery.findMany({ where: { activa: true }, select: { id: true, nombre: true, costoUsd: true } })`;
  - devuelve el resultado pasado por `ordenarZonas`.

  Añadir el comentario: "Única regla de qué zonas se ofrecen fuera del panel (solo activas, en orden)."

**Checkpoint**: Las reglas están probadas, la tabla existe con las 90 zonas, el cliente está regenerado y `listarZonasActivas` está disponible. Las historias pueden empezar.

---

## Phase 3: User Story 1 - Ver y editar las zonas de delivery desde el panel (Priority: P1) 🎯 MVP

**Goal**: La dueña ve las 90 zonas en `/admin/delivery`, cambia nombre y costo en la celda (Enter o al salir; Escape deshace) y desactiva o reactiva zonas.

**Independent Test**: Cambiar Chuao de $3 a $3,50 en la tabla y pulsar Enter. Aparece el aviso, la fila pasa detrás de las de $3 y, al recargar, Chuao sigue a $3,50 (quickstart.md §2).

### Implementation for User Story 1

- [X] T008 [US1] Crear `lib/actions/delivery-zones.ts` con `"use server"`, que importa `requireAdmin` de `@/lib/admin/auth`, `prisma` de `@/lib/prisma`, `revalidatePath`, `z` y las reglas de `@/lib/delivery-zone-rules`.
  - Exportar el tipo `ResultadoZona` de contracts/delivery-zones.md §3.
  - Implementar `export async function actualizarZonaDelivery(id: number, cambios: { nombre?: string; costoUsd?: number; activa?: boolean }): Promise<ResultadoZona>`:
    1. `await requireAdmin()`.
    2. Validar con Zod:
       - `id`: `z.number().int().positive()`;
       - `cambios`: `z.object({ nombre: z.string().max(200).optional(), costoUsd: z.number().optional(), activa: z.boolean().optional() }).strict()`, con un `refine` de al menos un campo.

       Si falla: `{ success: false, message: "Los cambios enviados no son válidos. Recarga la página." }`.
    3. Validar solo los campos presentes con `validarNombreZona` y `validarCostoZona`. Si fallan, devolver `{ success: false, message, campo }`. La `clave` siempre la calcula el servidor (data-model.md: "Única. La calcula el servidor; nunca viene del navegador.").
    4. Dentro de `prisma.$transaction(async (tx) => …)`:
       1. leer la zona; si no existe, devolver "La zona ya no existe. Recarga la página.";
       2. actualizar solo los campos recibidos (`nombre` y `clave` juntos);
       3. si cambió `nombre`:
          1. leer `tx.direccion.findMany({ distinct: ["urbanizacion"], select: { urbanizacion: true } })`;
          2. quedarse con los valores cuya `claveZona(valor) === claveAnterior`;
          3. si hay alguno, ejecutar `tx.direccion.updateMany({ where: { urbanizacion: { in: valores } }, data: { urbanizacion: nombreNuevo } })` y guardar el `count`.
    5. **Duplicados**: capturar `Prisma.PrismaClientKnownRequestError` con `code === "P2002"`.
       - Buscar la zona existente por la nueva clave y devolver `campo: "nombre"` con "Ya existe una zona llamada «X»."
       - Si la existente está inactiva, el mensaje termina en " Está inactiva: reactívala en lugar de crearla.".
       - Otros errores: `console.error` y "No se pudo guardar la zona. Intenta de nuevo.".
    6. Tras un éxito: `revalidatePath("/", "layout")` y devolver `{ success: true, message, zona }` (`id`, `nombre`, `costoUsd`, `activa`), con los mensajes de la tabla del contrato:
       - renombrar: "Zona renombrada a «X»." más " Se actualizaron N direcciones." si `count > 0`;
       - costo: "Costo de «X» actualizado a $3.50." (formato `toFixed(2)`);
       - desactivar: "«X» desactivada: ya no se ofrece en la tienda.";
       - reactivar: "«X» reactivada.".
- [X] T009 [P] [US1] En `components/admin/sidebar.tsx`, importar `Truck` de `lucide-react` y añadir `{ icon: Truck, label: "Delivery", link: "/admin/delivery" }` a `adminNavigation`, después de "Notas de entrega". En `components/admin/header.tsx`, añadir `"/admin/delivery": "Delivery"` al mapa `titles`. Comprobar que `/admin/delivery-notes` sigue mostrando "Notas de entrega".
- [X] T010 [P] [US1] Crear `app/admin/delivery/page.tsx` como Server Component `async`:
  - consulta `prisma.zonaDelivery.findMany({ select: { id: true, nombre: true, costoUsd: true, activa: true } })` (todas, activas e inactivas);
  - las pasa por `ordenarZonas`;
  - renderiza `<DeliveryZonesTable zonas={...} />`.

  La autorización la da `app/admin/layout.tsx`; no añadir otra.
- [X] T011 [US1] Crear `components/admin/delivery/deliveryZonesTable.tsx` (`"use client"`) según contracts/delivery-zones.md §7 ("/admin/delivery"):
  - **Estructura**:
    - sección `admin-panel` con el título "Zonas de delivery";
    - el conteo "N zonas · M activas";
    - la ayuda "Los cambios se guardan con Enter o al salir de la celda. Escape deshace.";
    - una región con desplazamiento horizontal (`role="region"`, `tabIndex={0}`, `admin-horizontal-scroll`, como `components/admin/inventario/bulkInventoryEditor.tsx`);
    - una `table` `admin-table admin-sheet` con las columnas "Zona", "Costo (USD)", "Estado" y la acción.
  - **Estado**:
    - `zonas` (inicializado desde props);
    - un borrador por celda (`Record<string, string>`, con claves `${id}:nombre` y `${id}:costoUsd`);
    - los errores por celda;
    - la fila pendiente.
  - **Cada celda**: es un `input` `admin-sheet-input` (texto para el nombre; `type="number" step="0.01" min="0.01"` para el costo) con `aria-label` que incluye el nombre de la zona.
    - **Enter**, o `onBlur` con un valor distinto del guardado:
      1. valida en el cliente con `validarNombreZona` o `validarCostoZona`;
      2. si pasa, llama a `actualizarZonaDelivery(id, { campo })` dentro de `useTransition`, con la fila deshabilitada mientras guarda.
    - **Si se acepta**: `toast.success(message)`, reemplaza la zona con la devuelta, limpia el borrador y reordena con `ordenarZonas`.
    - **Si se rechaza**: `toast.error(message)` y conserva el borrador con `aria-invalid` y borde de error.
    - **Escape**: restaura el valor guardado, limpia el error y quita el foco.
  - **Columna Estado**: etiqueta "Activa" o "Inactiva"; las filas inactivas se ven atenuadas.
  - **Acción**: botón "Desactivar" o "Reactivar" que llama a `actualizarZonaDelivery(id, { activa })`, sin confirmación.
  - **Notificaciones**: solo con `toast` de `sonner`.
  - Dejar preparado en el encabezado el lugar del botón "Agregar zona" (lo implementa T014).
- [X] T012 [US1] Validar la historia con quickstart.md §2: tabla y orden; cambio de costo; Escape; valores inválidos; duplicado al renombrar ("Chacao" → "Chacaíto" se rechaza con «Chacaito»); teléfono a ~390 px. Además, desactivar y reactivar Chuao desde su fila: queda atenuada como "Inactiva" y luego vuelve con su nombre y su costo.

**Checkpoint**: US1 funciona por sí sola: la dueña edita, desactiva y reactiva zonas desde el panel.

---

## Phase 4: User Story 2 - Agregar zonas nuevas desde la misma tabla (Priority: P1)

**Goal**: La dueña agrega una zona desde una fila nueva dentro de la tabla, sin salir de la vista.

**Independent Test**: Agregar "Santa Sofía" a $4 con Enter. Aparece el aviso, la zona queda entre las de $4 y el conteo sube a 91 (quickstart.md §3).

### Implementation for User Story 2

- [X] T013 [US2] En `lib/actions/delivery-zones.ts`, añadir `export async function crearZonaDelivery(input: { nombre: string; costoUsd: number }): Promise<ResultadoZona>`:
  1. `await requireAdmin()`.
  2. Validar con Zod `z.object({ nombre: z.string().max(200), costoUsd: z.number() }).strict()`.
  3. Aplicar `validarNombreZona` y `validarCostoZona`.
  4. Ejecutar `prisma.zonaDelivery.create({ data: { nombre, clave, costoUsd, activa: true } })`, según data-model.md: "`true` al crearla. Solo cambia con `actualizarZonaDelivery`.".
  5. Manejar `P2002` igual que en T008, extrayendo esa traducción a una función local compartida por las dos acciones.
  6. Tras un éxito: `revalidatePath("/", "layout")` y el mensaje "Zona «X» agregada a $4.00.".
- [X] T014 [US2] En `components/admin/delivery/deliveryZonesTable.tsx`, añadir el botón "Agregar zona" (`admin-button-primary`) y la fila nueva:
  - **Al pulsar el botón**: inserta una fila editable al principio del `tbody`, con el foco en el nombre (`autoFocus` o `ref`).
  - **Crear**: Enter en cualquiera de sus dos campos, o el botón "Guardar", valida en el cliente y llama a `crearZonaDelivery`. Salir del campo **no** crea nada.
  - **Si se acepta**: `toast.success`, cierra la fila, añade la zona devuelta, reordena con `ordenarZonas` y actualiza el conteo.
  - **Si se rechaza**: `toast.error` y la fila sigue editable con el campo marcado.
  - **Descartar**: Escape o el botón "Descartar" quitan la fila sin llamar al servidor.
  - Solo puede haber una fila nueva abierta a la vez; con ella abierta, el botón queda deshabilitado.
- [X] T015 [US2] Validar la historia con quickstart.md §3: crear "Santa Sofía" a 4; rechazar "santa sofia" a 5 como duplicado y descartarla con Escape; salir del campo sin crear; agregar otra zona seguida.

**Checkpoint**: US1 y US2 funcionan: la tabla permite ver, editar, desactivar, reactivar y agregar.

---

## Phase 5: User Story 3 - Las zonas del panel son las que usa toda la tienda (Priority: P1)

**Goal**: El checkout cobra con la zona de la base de datos y rechaza las inactivas; las direcciones validan contra las zonas activas; el selector de sector y la cotización usan las zonas de la base de datos. `DELIVERY_ZONES` desaparece.

**Independent Test**: Con Chuao a $3,50 (desde el panel o con `UPDATE "ZonaDelivery" SET "costoUsd" = 3.5 WHERE "clave" = 'chuao'`):
- el checkout muestra y cobra $3,50 y el pedido guarda `zonaEntrega = 'Chuao'` y `montoDelivery = 3.5`;
- al desactivarla, el checkout muestra "Sin delivery en este sector" y no la ofrece;
- la cotización rápida ofrece las zonas de la base de datos.

Ver quickstart.md §4 y §6.

### Tests for User Story 3

> Escribirlas primero. El caso del costo de la base de datos debe fallar con el código actual (la zona creada en la prueba no está en `DELIVERY_ZONES`).

- [X] T016 [P] [US3] En `tests/checkout/checkout.integration.test.ts`, añadir dos `test` con `{ skip: !integrationEnabled }`, siguiendo la estructura de la prueba existente (cliente, dirección, producto con `uniqueValue`, `procesarCompra` y limpieza en `finally`):
  1. **Cobra la zona de la base de datos**:
     - crea una `zonaDelivery` con `nombre` único (`uniqueValue("Zona prueba")`), su `clave` (calculada con `claveZona` importado de `"../../lib/delivery-zone-rules.js"`) y `costoUsd: 4.5`;
     - crea una dirección con `urbanizacion` en mayúsculas de ese nombre, para probar la resolución por clave;
     - paga `montoUsd: 14.5` sobre un producto de 10;
     - comprueba `success`, `transaccion.montoDelivery === 4.5` y `zonaEntrega` igual al nombre canónico de la zona.
  2. **Rechaza una zona inactiva**: igual, pero con `activa: false`. Comprueba:
     - `success === false` y `code === "INVALID_ADDRESS"`;
     - el mensaje "Tu sector ya no tiene delivery. Elige otro sector o retira en tienda.";
     - ninguna `Transaccion` con esa `claveIdempotencia`;
     - el inventario del producto sin cambios.

  Borrar las zonas creadas en el `finally`. La prueba existente con "Altamira" a $3 no se toca: la migración la deja disponible.

### Implementation for User Story 3

- [X] T017 [US3] En `lib/checkout-core.ts`, reemplazar el import de `DELIVERY_ZONES` por `import { claveZona } from "./delivery-zone-rules.ts";`. En `registrarCompraWeb`, cambiar la búsqueda de zona por el bloque de contracts/delivery-zones.md §4:
  - `tx.zonaDelivery.findUnique({ where: { clave: claveZona(address.urbanizacion) } })`;
  - si no existe o `!zona.activa`, `CheckoutError("INVALID_ADDRESS", "Tu sector ya no tiene delivery. Elige otro sector o retira en tienda.")`;
  - si existe, `montoDelivery = zona.costoUsd` y `snapshot.zonaEntrega = zona.nombre`.

  No cambiar `CheckoutData`, `validateDeliveryInput` ni `validatePaymentInput`. Ejecutar T016 con la base aislada y confirmar que pasa.
- [X] T018 [US3] En `lib/actions/address.ts`:
  - **Validación del sector**:
    - quitar el import de `DELIVERY_ZONES` y el `refine` de `urbanizacion` (que pasa a `z.string().trim().min(1, "Selecciona una zona de delivery disponible")`);
    - crear una función local `async function zonaActiva(urbanizacion: string)` que hace `prisma.zonaDelivery.findUnique({ where: { clave: claveZona(urbanizacion) } })` y devuelve la zona solo si `activa`.
  - **`addAddress`**: tras validar, si no hay zona activa devolver `{ message: "Selecciona una zona de delivery disponible", status: "error", clientId: null }`; si la hay, guardar `zona.nombre` en `urbanizacion`.
  - **`editAddress`**: igual, lanzando el mismo `Error` que ya usa para datos inválidos.
  - **Lectura pública**: añadir `export async function getZonasDelivery(): Promise<ZonaDeliveryVista[]>`, que devuelve `listarZonasActivas()` y, ante un error, `console.error` y `[]`. No añadir `requireAdmin`: es una lectura pública de las zonas activas (plan.md, Principio IV).
- [X] T019 [P] [US3] En `components/finalizar-compra/zoneSelector.tsx`:
  - quitar el import de `DELIVERY_ZONES`;
  - tipar las props como `{ zonas: ZonaDeliveryVista[]; newAddress: { tipo: string; urbanizacion: string; direccion: string }; setNewAddress: (value: …) => void }` en lugar de `any`;
  - filtrar con `filtrarZonas(zonas, query)` y agrupar con `agruparPorCosto(...)`, eliminando la lista fija `[3, 4, 5, 6]`;
  - encabezado de grupo "Zona delivery " + costo con `toFixed(2)` y `$`;
  - `handleSelect` recibe un `ZonaDeliveryVista` y guarda `zona.nombre`.
- [X] T020 [US3] En `components/finalizar-compra/addressManager.tsx`:
  - **Imports**: quitar `DELIVERY_ZONES` del import de constantes; importar `getZonasDelivery` y `buscarZona`.
  - **Carga de zonas**: añadir el estado `zonas: ZonaDeliveryVista[] | null` (null mientras cargan), cargado una vez con `getZonasDelivery()` en un `useEffect` con bandera `cancelled`.
  - **Costo**: reemplazar los tres cálculos de `DELIVERY_ZONES.find(...)` por `buscarZona(zonas ?? [], urbanizacion)?.costoUsd ?? 0` en `setDeliveryPrice`, recalculándolo cuando cargan las zonas.
  - **"Continuar"**: `setCanContinue` exige además que `zonas` haya cargado y que `buscarZona` encuentre la zona de la dirección elegida.
  - **Tarjeta de dirección**: si las zonas cargaron y `buscarZona` da `null`, mostrar "Sin delivery en este sector" en lugar del costo.
  - **Selector**: pasar `zonas={zonas ?? []}` a `ZoneSelector`.
  - No tocar el flujo de WhatsApp de "Mi sector no aparece".
- [X] T021 [P] [US3] En `app/cotizacion-rapida/page.tsx`, cargar `listarZonasActivas()` en su propio `try/catch` (si falla, `console.error` y `zonas = []`) y pasar `zonas` a `QuickQuote`. En `components/cotizacion-rapida/quickQuote.tsx`:
  - quitar el import de `DELIVERY_ZONES` y añadir la prop `zonas: ZonaDeliveryVista[]`;
  - `selectedZone` = `zonas.find((zona) => zona.nombre === deliveryZone) ?? null`, pasando `{ zona: selectedZone.nombre, precioUsd: selectedZone.costoUsd }` a `buildQuoteDraft`;
  - el `<select>` agrupa con `agruparPorCosto(zonas)` (`optgroup` con la etiqueta "Zona delivery $X.XX") y conserva el nombre como valor;
  - no tocar `lib/cotizacion-rapida.ts`.
- [X] T022 [US3] En `lib/constants/constants.ts`, eliminar `DELIVERY_ZONES` (líneas 63–161) y su comentario. Confirmar que `rg -n DELIVERY_ZONES` no devuelve nada fuera de `specs/`, y que `npm.cmd run lint` no reporta imports sin usar en los archivos tocados.
- [X] T023 [US3] Validar la historia:
  - ejecutar `npm.cmd run test:checkout`, y con `RUN_CHECKOUT_INTEGRATION=1` y `CHECKOUT_TEST_DATABASE_URL` aislada, las pruebas de integración (incluida la existente con "Altamira");
  - recorrer quickstart.md §4: checkout con Chuao a $3,50; pedido registrado; pedido anterior intacto; clave y renombre de "Chacaito" a "Chacaito Centro" con la dirección "Chacaíto" actualizada; desactivar y reactivar; costo cambiado a mitad del checkout;
  - recorrer §6, la cotización rápida.

**Checkpoint**: US1, US2 y US3 funcionan: lo que la dueña edita en el panel es lo que la tienda muestra y cobra.

---

## Phase 6: User Story 4 - Elegir delivery al enviar la venta rápida por WhatsApp (Priority: P2)

**Goal**: En `/venta-rapida`, quien compra activa el delivery, busca y elige su zona (y en pantalla queda solo esa), completa nombre, teléfono y dirección de quien recibe, y el mensaje de WhatsApp lleva zona, costo, total con delivery y esos datos. No se persiste nada.

**Independent Test**: Con productos por $10, activar el delivery, buscar "hipico", elegir "Club Hípico" ($3), completar los datos y enviar. El mensaje muestra Productos $10.00, Delivery $3.00, Total $13.00 con su equivalente en Bs y los datos de quien recibe (quickstart.md §5).

### Tests for User Story 4

> Escribirlas primero; deben fallar hasta implementar T026 y T027.

- [X] T024 [P] [US4] En `tests/checkout/delivery-zones.test.ts`, añadir un `describe("validarDatosEntrega")` con cada fila de la tabla de contracts/delivery-zones.md §1:
  - nombre vacío;
  - teléfono vacío;
  - `"0414-123-4567"` y `"+58 414 1234567"` válidos;
  - `"414123456"` (9 dígitos) y un teléfono de 16 dígitos rechazados por el rango;
  - `"0414/1234567"` rechazado por un carácter no admitido;
  - dirección vacía;
  - los valores válidos se devuelven recortados.

  Comprobar en cada caso el `campo` y el `message`.
- [X] T025 [P] [US4] En `tests/checkout/quick-sale-channel.test.ts`, añadir dos casos a `describe("canales de venta rápida")`:
  1. **Sin `delivery`**: el mensaje contiene `*NO INCLUYE DELIVERY*` y no contiene `*Delivery*`.
  2. **Con `delivery`**: `{ zona: "Club Hípico", costoUsd: 3, recibe: { nombre: "María Pérez", telefono: "0414-123-4567", direccion: "Calle 2, casa 5" } }`, `tasa: 35` y `totalUsd: 13` (2 × 6.5). El mensaje contiene:
     - `*Delivery*`, `Zona: Club Hípico` y `Costo: $3.00`;
     - `Recibe: María Pérez`, `Teléfono: 0414-123-4567` y `Dirección: Calle 2, casa 5`;
     - `Productos: $13.00`, `Delivery: $3.00` y `Total USD: *$16.00*`;
     - no contiene `NO INCLUYE DELIVERY`.

### Implementation for User Story 4

- [X] T026 [US4] En `lib/delivery-zone-rules.ts`, añadir `validarDatosEntrega({ nombre, telefono, direccion })` según contracts/delivery-zones.md §1. Recorta los tres campos y valida en este orden, devolviendo el primer error con su `campo`:
  1. nombre vacío: "Escribe el nombre de quien recibe.";
  2. teléfono vacío: "Escribe el teléfono de quien recibe.";
  3. teléfono que no cumple `/^[+\d\s-]+$/`: "El teléfono solo admite números, +, espacios y guiones.";
  4. dígitos (`telefono.replace(/\D/g, "").length`) fuera de 10–15: "El teléfono debe tener entre 10 y 15 dígitos.";
  5. dirección vacía: "Escribe la dirección de entrega.".

  Si todo es válido, devuelve los valores recortados. Ejecutar T024 y confirmar que pasa.
- [X] T027 [US4] En `lib/pos.ts`:
  - exportar el tipo `DeliveryVentaRapida = { zona: string; costoUsd: number; recibe: { nombre: string; telefono: string; direccion: string } }`;
  - extender `mensajeWhatsapp` con `delivery?: DeliveryVentaRapida | null`;
  - **sin `delivery`**: el texto queda idéntico al actual;
  - **con `delivery`**: según el ejemplo de contracts/delivery-zones.md §6:
    1. después del detalle de productos, añadir el bloque `*Delivery*` con `Zona:`, `Costo: $X / Bs Y` (con `fmtUsd` y `fmtBs`), `Recibe:`, `Teléfono:` y `Dirección:`;
    2. en `*Total a pagar*`, mostrar `Productos: ${fmtUsd(totalUsd)}`, `Delivery: ${fmtUsd(costoUsd)}`, `Total USD: *${fmtUsd(total)}*` y `Total Bs: *${fmtBs(total * tasa)}*`, con `total = Math.round((totalUsd + costoUsd) * 100) / 100`;
    3. omitir `*NO INCLUYE DELIVERY*`.

  Ejecutar T025 y confirmar que pasa.
- [X] T028 [P] [US4] En `app/venta-rapida/page.tsx`, cargar `listarZonasActivas()` en un `try/catch`: si falla, `console.error`, `zonas = []` y `zonasError = true`. Pasar `zonas` y `zonasError` a `PuntoDeVenta`. No cambiar la consulta de productos.
- [X] T029 [US4] Crear `components/venta-rapida/deliverySelector.tsx` (`"use client"`).
  - **Tipo**: exportar `EntregaVentaRapida = { activo: boolean; zonaId: number | null; nombre: string; telefono: string; direccion: string }` (data-model.md) y `ENTREGA_INICIAL`.
  - **Props**: `{ zonas: ZonaDeliveryVista[]; zonasError: boolean; entrega: EntregaVentaRapida; onChange: (entrega: EntregaVentaRapida) => void }`.
  - **Estados**, según la tabla de contracts/delivery-zones.md §7 ("Venta rápida"):
    - **Interruptor**: casilla o `switch` accesible con la etiqueta "Agregar delivery" y la ayuda "Solo para el pedido por WhatsApp".
    - **Sin zonas o con `zonasError`**: interruptor deshabilitado y el texto "El delivery no está disponible en este momento. Puedes enviar el pedido sin delivery.".
    - **Encendido y sin zona**:
      - buscador (estado local `busqueda`, placeholder "Busca tu zona, ej. Chacao");
      - lista con `max-h` y `overflow-y-auto`, agrupada con `agruparPorCosto(filtrarZonas(zonas, busqueda))`, encabezados "Delivery $X.XX";
      - cada zona es un `button` con nombre y costo (`fmtUsd` de `@/lib/pos`);
      - sin coincidencias: "No hay zonas con ese nombre.".
    - **Encendido y con zona**:
      - solo "Nombre · $X.XX" con el botón "Cambiar", que pone `zonaId` en `null` y conserva nombre, teléfono y dirección;
      - el formulario con "Nombre de quien recibe", "Teléfono" (`inputMode="tel"`, `autoComplete="tel"`) y "Dirección" (`textarea` de 2 filas), usando `Label` e inputs como los de `components/venta-rapida/`.
  - **Estilo**: tokens de la venta rápida (`bg-muted/40`, `text-muted-foreground`); móvil primero. Cada input tiene un `id` estable (`entrega-nombre`, `entrega-telefono`, `entrega-direccion`) para poder enfocarlo desde `PuntoDeVenta`.
- [X] T030 [US4] En `components/venta-rapida/puntoDeVenta.tsx`:
  - **Props y estado**:
    - recibir `zonas: ZonaDeliveryVista[]` y `zonasError: boolean` en las props;
    - añadir `const [entrega, setEntrega] = useState<EntregaVentaRapida>(ENTREGA_INICIAL)`;
    - derivar `zonaEntrega = entrega.activo ? zonas.find((z) => z.id === entrega.zonaId) ?? null : null` y `totalConDelivery = totalUsd + (zonaEntrega?.costoUsd ?? 0)`.
  - **Dentro del `Sheet`**:
    - renderizar `<DeliverySelector …/>` entre la lista de productos y el total;
    - con `zonaEntrega`, el bloque de total muestra "Productos", "Delivery (nombre)" y "Total a pagar" (USD y Bs con `tasaActiva`); sin ella, se ve igual que hoy;
    - hacer que `SheetContent` se desplace en vertical (`max-h-[90vh] overflow-y-auto`) conservando la lista de productos con su `max-h`.
  - **`enviarWhatsapp`**, si `entrega.activo`:
    1. sin `zonaEntrega`: `toast.error("Elige la zona del delivery.")` y `return`;
    2. aplicar `validarDatosEntrega`; si falla, `toast.error(message)`, enfocar `document.getElementById("entrega-" + campo)` y `return`;
    3. si es válido, llamar a `mensajeWhatsapp({ negocio, lineas, tasa: tasaActiva, totalUsd, delivery: { zona: zonaEntrega.nombre, costoUsd: zonaEntrega.costoUsd, recibe: value } })`.

    Sin delivery, la llamada queda igual que hoy.
  - **"Vaciar"**: además de `setCarrito({})`, ejecutar `setEntrega(ENTREGA_INICIAL)`.
  - **"Procesar pedido en la app"**: no cambia.
  - **Notificaciones**: solo con `toast` de `sonner`. Confirmar que el `Toaster` cubre `/venta-rapida` (el de `app/layout.tsx`).
- [X] T031 [US4] Validar la historia con quickstart.md §5, a ~390 px y en un teléfono si es posible:
  - sin delivery, el mensaje es idéntico;
  - buscador "hipico" y "zzz";
  - al elegir zona queda solo la selección;
  - validación del formulario;
  - "Cambiar" conserva los datos;
  - cerrar y abrir conserva el estado; "Vaciar" lo reinicia;
  - mensaje completo;
  - apagar el interruptor;
  - "Procesar pedido en la app" sin cambios;
  - estado "no disponible".

**Checkpoint**: Las cuatro historias funcionan por separado.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, verificación completa y revisión del diff.

- [X] T032 [P] Actualizar `CLAUDE.md`:
  - en "Arquitectura", añadir un párrafo **Zonas de delivery**:
    - `ZonaDelivery` es la única lista (sin `DELIVERY_ZONES`) y se edita en `/admin/delivery` (`lib/actions/delivery-zones.ts`);
    - las direcciones la referencian por `claveZona` (`lib/delivery-zone-rules.ts`) y renombrar reescribe sus `urbanizacion`;
    - solo las activas se ofrecen fuera del panel (`listarZonasActivas`);
    - el checkout cobra `costoUsd` dentro de la transacción y rechaza las inactivas;
    - los pedidos guardan su copia en `zonaEntrega`/`montoDelivery`;
  - en el punto de `/venta-rapida`, mencionar que el delivery solo viaja en el mensaje de WhatsApp (zona, costo y datos de quien recibe) y no se persiste.
- [X] T033 [P] Actualizar `docs/descripcion-tecnica.md` con:
  - el modelo `ZonaDelivery` y su migración inicial (90 zonas);
  - la sección "Delivery" del panel;
  - la resolución de direcciones por clave;
  - el delivery por WhatsApp de la venta rápida.

  Revisar que `README.md` y `DESIGN.md` no citen la lista fija de zonas (hoy no lo hacen).
- [X] T034 Ejecutar `npm.cmd run test:checkout`, `npm.cmd run test:admin`, `npm.cmd run lint` y `npm.cmd run build`, y las pruebas de integración con la base aislada (`RUN_CHECKOUT_INTEGRATION=1`, `CHECKOUT_TEST_DATABASE_URL`). Comparar con la línea base de T001 y declarar cualquier verificación omitida.
- [ ] T035 Validar quickstart.md §7 (seguridad): con `NODE_ENV=production` y un correo fuera de `ALLOWED_EMAILS`, `/admin/delivery` redirige a `/unauthorized` e invocar las acciones no escribe nada. Recorrer de nuevo el quickstart completo.
- [X] T036 Revisar el diff (`git diff`) en busca de:
  - secretos;
  - cambios fuera de alcance: `CheckoutData`, `appStore`, `checkoutContext`, venta manual, Excel y notas de entrega no deben cambiar;
  - código muerto: imports de `DELIVERY_ZONES` o grupos fijos `[3, 4, 5, 6]`;
  - el script temporal de T005 dentro del repo.

  Confirmar que la migración se aplicará antes de desplegar (`npx prisma migrate deploy`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de T001. Bloquea todas las historias. Orden interno:
  - T002 (reglas) antes de T003 (pruebas) y de T005 (la migración usa `claveZona`);
  - T004 (esquema) antes de T005;
  - T005 antes de T006;
  - T006 antes de T007 (necesita el cliente regenerado).
- **US1 (Phase 3)**: depende de la fase 2.
- **US2 (Phase 4)**: depende de US1, porque comparte `lib/actions/delivery-zones.ts` (T008 → T013) y `deliveryZonesTable.tsx` (T011 → T014).
- **US3 (Phase 5)**: depende solo de la fase 2. Se puede probar cambiando la base de datos con SQL si US1 no está lista. Su paso de renombre (T023) usa `actualizarZonaDelivery` de US1.
- **US4 (Phase 6)**: depende solo de la fase 2 (`listarZonasActivas` y las reglas). T026 y T024 tocan los mismos archivos que T002 y T003, así que van después de ellos.
- **Polish (Phase 7)**: depende de las historias que se entreguen. T022 (eliminar `DELIVERY_ZONES`) debe ir después de T017–T021.

### Within Each User Story

- Las pruebas (T016, T024, T025) se escriben antes que la implementación y deben fallar primero.
- Las acciones (T008, T013) van antes de los componentes que las llaman (T011, T014).
- Las reglas y el mensaje (T026, T027) van antes de `PuntoDeVenta` (T030); el selector (T029) también va antes de T030.
- Cada historia termina con su validación (T012, T015, T023, T031).

### Parallel Opportunities

- **Fase 2**: T003 (pruebas de reglas) y T004 (esquema) en paralelo, una vez hecho T002.
- **US1**: T009 (navegación) y T010 (página) en paralelo con T008.
- **US3**: T016 (pruebas), T019 (`ZoneSelector`) y T021 (cotización) en paralelo; T017, T018 y T020 van en secuencia (T020 usa `getZonasDelivery` de T018).
- **US4**: T024, T025 y T028 en paralelo.
- **Entre historias**: con la fase 2 hecha, US3 y US4 pueden avanzar en paralelo con US1 → US2 (archivos distintos).
- **Polish**: T032 y T033 en paralelo.

---

## Parallel Example: User Story 3

```bash
# Con la fase 2 terminada, lanzar juntas:
Task: "T016 Pruebas de integración del checkout (zona de BD y zona inactiva) en tests/checkout/checkout.integration.test.ts"
Task: "T019 ZoneSelector con zonas por props y agrupado dinámico en components/finalizar-compra/zoneSelector.tsx"
Task: "T021 Cotización rápida con zonas de BD en app/cotizacion-rapida/page.tsx y components/cotizacion-rapida/quickQuote.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "T024 Pruebas de validarDatosEntrega en tests/checkout/delivery-zones.test.ts"
Task: "T025 Pruebas de mensajeWhatsapp con y sin delivery en tests/checkout/quick-sale-channel.test.ts"
Task: "T028 Cargar zonas activas en app/venta-rapida/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1 (T001) y fase 2 (T002–T007).
2. Fase 3 (US1, T008–T012).
3. **Parar y validar**: la dueña ya ve y edita las zonas en el panel.

**Advertencia**: hasta completar US3, la tienda sigue cobrando con `DELIVERY_ZONES` y no con la base de datos. No desplegar US1 sola a producción: desplegar como mínimo US1 + US3 juntas, para que lo que la dueña edita sea lo que se cobra (FR-011).

### Incremental Delivery

1. Setup + Foundational: tabla con las 90 zonas.
2. US1 + US3: el panel edita y la tienda cobra lo editado. **Primer despliegue seguro.**
3. US2: agregar zonas desde la tabla.
4. US4: delivery en la venta rápida.
5. Polish: documentación y verificación completa.

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes.
- Las notificaciones son exclusivamente con `sonner`; la UI y los mensajes, en español.
- Hacer commit después de cada tarea o grupo lógico; aplicar la migración antes de desplegar el código que elimina `DELIVERY_ZONES`.
- Las pruebas de integración se omiten (no fallan) sin `RUN_CHECKOUT_INTEGRATION=1` y una base aislada; nunca correrlas contra datos reales.
