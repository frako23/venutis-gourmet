# Data Model: Gestión administrativa de clientes

**Feature**: [spec.md](./spec.md)

## Entidad existente: Cliente

El registro existente `Cliente` seguirá siendo la identidad única para checkout público, ventas administrativas, notas de entrega, fidelidad y reseñas.

| Field | Type / rule | Change |
|------|-------------|--------|
| `id` | Integer, stable identifier | Existing; never changed by this feature |
| `tipoCliente` | `mayorista` o `detal` | Existente; la interfaz muestra `detal` como “Consumidor” |
| `nombre` | Required trimmed text | Existing; updated by create/bulk edit |
| `apellido` | Required trimmed text | Existing; updated by create/bulk edit |
| `rif` | Texto canónico nullable, único cuando no es nulo | Nuevo; obligatorio para mayoristas, opcional para consumidores |
| `nombreBusqueda` | Texto derivado obligatorio, en minúsculas y sin diacríticos | Nuevo; nunca se edita directamente |
| `celular` | Texto obligatorio y único | Existente; normalizado/validado por escrituras administrativas |
| `email` | Texto opcional y único | Existente; normalizado/validado por escrituras administrativas |
| `createdAt` | Fecha de creación | Existente |
| `updatedAt` | Fecha de última actualización del perfil | Existente; se usa como token de concurrencia optimista |

Las relaciones existentes no cambian:

- `direcciones`: cero o más direcciones de entrega.
- `transacciones`: ventas y pedidos históricos.
- `notasEntrega`: documentos de entrega.
- `fidelidades` y `resenas`: relaciones operativas existentes.

## Entidad nueva: HistorialCliente

Traza administrativa de cambios de perfil. Se escribe en la misma transacción que el cambio del cliente.

| Field | Type / rule |
|------|-------------|
| `id` | Integer primary key |
| `clienteId` | Required relation to `Cliente` |
| `actorId` | Texto nullable de la identidad administrativa autenticada |
| `actorEmail` | Correo nullable de la identidad administrativa autenticada |
| `accion` | `creado` o `actualizado` |
| `camposModificados` | Arreglo de nombres de campos; no guarda snapshots de datos personales anteriores |
| `createdAt` | Fecha del evento administrativo |

Índice `(clienteId, createdAt)` para futuras consultas del historial de perfil. Esta feature no añade una pantalla de historial.

## Derived values

### RIF

La entrada puede contener letras en mayúscula/minúscula, espacios y guiones. Normalización:

1. Trim and convert to uppercase.
2. Remove spaces and hyphens.
3. Require one prefix from `V`, `E`, `J`, `G`, `P` followed by nine digits.
4. Validate the final digit with the local modulo-11 rule defined in `research.md`.
5. Store the compact value; format as `X-12345678-9` only for display.

Para un RIF vacío de consumidor se guarda `null`. Un mayorista no puede crearse ni actualizarse sin un RIF válido. Los valores nulos existentes siguen siendo datos históricos válidos.

### Search name

`nombreBusqueda` se deriva de `${nombre} ${apellido}`:

- trim and collapse whitespace;
- lowercase;
- remove Unicode diacritics;
- preserve letters and digits separated by single spaces.

La misma función se usa en el backfill de la migración, las escrituras públicas, el alta administrativa y las actualizaciones masivas.

## Address creation

La modal acepta una primera dirección opcional:

- `urbanizacion`: obligatoria si se completa algún campo de dirección;
- `direccion`: obligatoria si se completa algún campo de dirección;
- `tipo`: obligatorio si se completa algún campo de dirección.

El cliente y la dirección se crean en una única transacción. Las direcciones existentes se seleccionan para el detalle del perfil, pero no se incluyen en los parches masivos.

## Bulk update invariants

Cada fila enviada contiene:

```text
id: positive integer
updatedAt: ISO timestamp read from the table
changes: subset of tipoCliente, nombre, apellido, rif, celular, email
```

La validación del servidor debe:

1. Reject duplicate row IDs and more than 100 rows.
2. Load every referenced client and reject missing rows.
3. Compare the submitted `updatedAt` with the current value.
4. Merge changes with current values and validate the complete row.
5. Detect duplicate RIF, phone or email within the submitted result and against unedited clients.
6. Recompute `nombreBusqueda`.
7. Update all rows and create one `HistorialCliente` event per changed row in the same transaction.

Si falla cualquier paso, no se persiste ninguna fila ni evento de historial.

## Migration notes

La migración debe ser aditiva y segura para los datos existentes:

1. Add nullable `rif`.
2. Add `nombreBusqueda` with a temporary empty default.
3. Backfill `nombreBusqueda` from existing `nombre` and `apellido` using lowercasing, whitespace normalization and the supported Spanish accent translation.
4. Remove the temporary default and create a unique nullable index for `rif`.
5. Create `HistorialCliente`, its enum and its `(clienteId, createdAt)` index.
6. Add the relation from `Cliente` without changing or deleting existing client/order/address rows.

Antes de aplicar la migración a un entorno compartido, se debe ejecutar en una base aislada con clientes representativos con acentos, correo/RIF nulos, direcciones, transacciones, notas y ambos tipos de cliente.
