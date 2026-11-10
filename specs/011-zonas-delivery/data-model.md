# Data Model: Zonas de delivery administrables

**Feature**: `011-zonas-delivery`

Un modelo nuevo (`ZonaDelivery`) y ningún cambio de columnas en los modelos existentes. Las decisiones están en [research.md](./research.md).

## ZonaDelivery (nuevo)

```prisma
model ZonaDelivery {
  id        Int      @id @default(autoincrement())
  nombre    String
  clave     String   @unique
  costoUsd  Float
  activa    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

| Campo | Significado | Reglas |
|---|---|---|
| `nombre` | Nombre que ven la dueña y los clientes ("Club Hípico"). | Obligatorio. Se recorta y se colapsan los espacios repetidos; de 1 a 80 caracteres. |
| `clave` | `claveZona(nombre)`: sin acentos, en minúsculas, con los signos convertidos en espacio y sin espacios repetidos ("club hipico"). | Única. La calcula el servidor; nunca viene del navegador. |
| `costoUsd` | Costo del delivery a esa zona, en USD. | Mayor que 0, con 2 decimales como máximo. Se guarda redondeado con `roundMoney`. |
| `activa` | Si la zona se ofrece fuera del panel. | `true` al crearla. Solo cambia con `actualizarZonaDelivery`. |

**Escritores**: solo `crearZonaDelivery` y `actualizarZonaDelivery` (`lib/actions/delivery-zones.ts`), además de la migración inicial.

**Lectores**:

- `listarZonasActivas()` (`lib/delivery-zones.ts`): la usan la venta rápida, la cotización rápida y `getZonasDelivery`.
- La página `/admin/delivery`: lee todas las zonas, activas e inactivas.
- `registrarCompraWeb` (`lib/checkout-core.ts`): busca la zona por `clave` dentro de la transacción.
- `addAddress` y `editAddress` (`lib/actions/address.ts`): validan contra las zonas activas.

### Estados

```text
         desactivar
activa ─────────────▶ inactiva
   ▲                     │
   └─────────────────────┘
          reactivar
```

- Las dos transiciones son reversibles y conservan el nombre y el costo.
- Una zona inactiva sigue contando para la unicidad de `clave`.
- No hay estado "eliminada": las zonas no se borran.

### Orden

`ordenarZonas` ordena por `costoUsd` ascendente y luego por `nombre` con `localeCompare("es", { sensitivity: "base" })`. Es el único orden de la tabla del panel y de las listas de zonas. No hay orden manual.

## Relaciones con modelos existentes (sin cambios de esquema)

### Direccion.urbanizacion → ZonaDelivery (por clave, sin clave foránea)

- Una dirección pertenece a la zona cuya `clave` es igual a `claveZona(direccion.urbanizacion)`.
- `addAddress` y `editAddress` guardan en `urbanizacion` el `nombre` canónico de la zona activa encontrada, y rechazan la dirección si no hay zona activa con esa clave.
- **Renombrar una zona**: en la misma transacción que actualiza la zona, se reescribe `urbanizacion` con el nombre nuevo en las direcciones cuya `claveZona(urbanizacion)` coincide con la clave anterior. Si el renombre solo cambia acentos, mayúsculas o signos, la clave no cambia y no hace falta reescribir.
- Las direcciones creadas con texto libre desde el modal de clientes del panel que no coinciden con ninguna zona siguen sin poder usarse para delivery, igual que hoy.

### Transaccion.zonaEntrega / Transaccion.montoDelivery (copia, sin cambios)

- Al confirmar un pedido con delivery, `zonaEntrega = zona.nombre` y `montoDelivery = zona.costoUsd`, leídos dentro de la transacción del checkout.
- Editar, renombrar o desactivar una zona después **no** modifica pedidos registrados (FR-013).

## Datos de entrega de la venta rápida (no persistidos)

Viven solo en el estado de `PuntoDeVenta` y en el texto del mensaje de WhatsApp.

```ts
type EntregaVentaRapida = {
  activo: boolean;          // interruptor "Agregar delivery"
  zonaId: number | null;    // zona elegida (una de las activas cargadas con la página)
  nombre: string;           // quien recibe
  telefono: string;         // 10–15 dígitos; admite "+", espacios y guiones
  direccion: string;
};
```

- Se conservan al cerrar y reabrir el resumen.
- Se reinician al pulsar "Vaciar".
- Desactivar el interruptor oculta la zona y el formulario y quita el costo del total, pero conserva lo escrito.

## Migración `<timestamp>_zonas_delivery`

1. `CREATE TABLE "ZonaDelivery"` con el índice único de `clave`.
2. Un `INSERT` con las 90 zonas de `DELIVERY_ZONES`: `nombre`, `clave` (literal calculada con `claveZona`), `costoUsd` igual al `price` actual, `activa = true` y `updatedAt = now()`.
3. Una comprobación que aborta la migración si la tabla no queda con 90 filas.

Se aplica antes de desplegar el código que elimina `DELIVERY_ZONES`. Después se regenera el cliente con `npx prisma generate`.
