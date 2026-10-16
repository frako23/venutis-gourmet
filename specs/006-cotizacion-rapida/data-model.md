# Data Model: Cotización rápida para compartir

**Feature**: `006-cotizacion-rapida`
**Persistencia**: Ninguna para la cotización. El catálogo continúa en PostgreSQL mediante Prisma.

## ProductProjection

Proyección de solo lectura que la página recibe del catálogo para no exponer campos innecesarios en el estado de cotización.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | entero positivo | Identifica el producto fuente. |
| `nombre` | texto no vacío | Se muestra en tarjetas, resumen e imagen. |
| `categoria` | texto no vacío | Se usa para búsqueda y presentación. |
| `precioUsd` | número finito no negativo | Corresponde al precio detal vigente. |
| `inventario` | entero no negativo | Solo productos mayores que cero se ofrecen inicialmente. |
| `imagenUrl` | texto opcional | Se usa en la tarjeta; la imagen de cotización no depende de ella. |

## QuoteLine

Línea temporal seleccionada por la operadora.

| Campo | Tipo | Reglas |
|---|---|---|
| `productId` | entero positivo | Debe existir en la proyección vigente. |
| `nombre` | texto | Snapshot del nombre mostrado. |
| `categoria` | texto | Snapshot para la revisión. |
| `precioUnitarioUsd` | número finito mayor o igual a cero | Snapshot del precio vigente al cargar/revalidar. |
| `cantidad` | entero positivo | No supera el inventario vigente confirmado antes de generar. |
| `subtotalUsd` | número calculado | `precioUnitarioUsd * cantidad`; no se acepta como entrada independiente. |

## QuoteRecipient

Datos opcionales del destinatario, no vinculados a `Cliente`.

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | texto opcional | Se recorta; si está vacío no aparece en la imagen. |
| `telefono` | texto opcional | Se recorta; se valida como dato no vacío cuando se proporciona, sin crear un cliente. |

## QuoteDraft

Estado temporal completo de la cotización.

| Campo | Tipo | Reglas |
|---|---|---|
| `lines` | `QuoteLine[]` | Debe contener al menos una línea para generar. |
| `recipient` | `QuoteRecipient` | Opcional. |
| `exchangeRate` | número finito positivo | Requerido para mostrar o generar el total Bs. |
| `subtotalUsd` | número calculado | Suma de los subtotales de línea. |
| `totalBs` | número calculado | `subtotalUsd * exchangeRate`. |
| `issuedAt` | fecha temporal | Se captura al generar, no es vencimiento. |
| `fingerprint` | texto calculado | Identifica líneas, precios, cantidades, destinatario y tasa usados para la imagen. |
| `status` | `empty \| draft \| generated \| stale \| error` | Controla si la imagen actual puede compartirse. |

## QuoteImageArtifact

Artefacto efímero derivado de un `QuoteDraft`.

| Campo | Tipo | Reglas |
|---|---|---|
| `blob` | `Blob` | PNG generado en el navegador; no se sube ni persiste. |
| `file` | `File` | Nombre identificable y MIME `image/png` para compartir. |
| `objectUrl` | texto | Se revoca al reemplazar o desmontar el componente. |
| `fingerprint` | texto | Debe coincidir con el `QuoteDraft` actual para compartir. |
| `generatedAt` | fecha | Fecha/hora de generación del archivo. |

## Relaciones y límites

- `ProductProjection` origina una o más `QuoteLine`.
- `QuoteDraft` contiene las líneas y calcula sus totales.
- `QuoteImageArtifact` pertenece únicamente al snapshot representado por su `fingerprint`.
- No existe relación persistente con `Cliente`, `Direccion`, `Transaccion`, `Pago` o inventario.
- La revalidación puede reemplazar el snapshot de una línea; si la cantidad deja de ser válida, la interfaz la reduce o solicita corrección antes de generar.

## Transiciones

```text
empty --agregar producto--> draft
draft --generar imagen con datos vigentes--> generated
generated --editar línea/destinatario/tasa--> stale
stale --generar nuevamente--> generated
draft/generated/stale --error de cálculo o imagen--> error
error --corregir/reintentar--> draft o generated
generated --descargar/compartir--> generated
```

Compartir o descargar no cambia el estado comercial del negocio. Recargar o abandonar la página elimina el estado temporal.
