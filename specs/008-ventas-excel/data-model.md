# Data Model: Control de ventas desde Excel

**Feature**: `008-ventas-excel`
**Persistencia**: PostgreSQL con Prisma. **Una migración**: `prisma/migrations/20261029000000_control_ventas_excel`, seguida de `npx prisma generate`. Las razones de cada cambio están en [research.md](./research.md).

## Resumen de cambios de esquema

| Modelo / enum | Cambio | Motivo |
|---|---|---|
| `enum TipoPrecio` | **Nuevo**: `detal`, `mayor`, `promo` | Tipo de precio por línea (FR-024). |
| `enum MetodoPago` | **+ `NoEspecificado`** | Lo cobrado según el Excel, sin método (FR-018). |
| `DetalleCompra` | `cantidad Int → Float`; **+ `tipoPrecio TipoPrecio?`** | Cantidades con decimales (FR-017) y tipo de precio. |
| `Producto` | `inventario Int → Float` | Inventario con decimales (FR-017). |
| `Transaccion` | **+ `importada Boolean @default(false)`** | Las cancelaciones de pedidos importados no devuelven inventario (FR-016). |
| `Pago` | **+ `esAbono`, `actorId`, `actorEmail`, `anuladoEn`** | Abonos, saldo y anulación (FR-030 a FR-035). |
| `Cliente` | `celular String → String?` (sigue `@unique`); **+ `equivalencias`** | Clientes creados desde la carga sin teléfono (FR-012). |
| `EquivalenciaProducto` | **Nuevo** | Equivalencias de productos recordadas (FR-011) y columnas de la exportación (FR-040). |
| `EquivalenciaCliente` | **Nuevo** | Equivalencias de clientes recordadas (FR-011). |

## Esquema propuesto (solo lo que cambia)

```prisma
enum TipoPrecio {
  detal
  mayor
  promo
}

enum MetodoPago {
  TransferenciaBs
  EfectivoUsd
  Zelle
  PagoMovil
  TransferenciaUsd
  NoEspecificado
}

model Producto {
  // ...
  inventario   Float                  @default(0)
  equivalencias EquivalenciaProducto[]
}

model Cliente {
  // ...
  celular       String?               @unique
  equivalencias EquivalenciaCliente[]
}

model Transaccion {
  // ...
  importada Boolean @default(false)
}

model DetalleCompra {
  // ...
  cantidad   Float
  tipoPrecio TipoPrecio?
}

model Pago {
  // ...
  esAbono    Boolean   @default(false)
  actorId    String?
  actorEmail String?
  anuladoEn  DateTime?
}

model EquivalenciaProducto {
  id         Int      @id @default(autoincrement())
  clave      String   @unique
  productoId Int
  grupo      String?
  producto   String
  sabor      String?
  gramos     Int?
  actorEmail String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  productoRef Producto @relation(fields: [productoId], references: [id], onDelete: Cascade)

  @@index([productoId])
}

model EquivalenciaCliente {
  id         Int      @id @default(autoincrement())
  clave      String   @unique
  clienteId  Int
  actorEmail String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  cliente Cliente @relation(fields: [clienteId], references: [id], onDelete: Cascade)

  @@index([clienteId])
}
```

**Notas de la migración**:

- `ALTER TYPE "MetodoPago" ADD VALUE 'NoEspecificado'` funciona dentro de la transacción de la migración. El valor no se usa en la misma migración.
- `ALTER COLUMN … TYPE DOUBLE PRECISION` convierte los enteros sin pérdida.
- `ALTER COLUMN "celular" DROP NOT NULL` conserva el índice único.
- No hay migración de datos: las líneas existentes quedan con `tipoPrecio = NULL` ("Sin especificar"), los pagos existentes con `esAbono = false` y los pedidos con `importada = false`.

## Entidades y reglas

### Transaccion (pedido)

| Campo | Regla en esta feature |
|---|---|
| `numeroOrden` | En los importados es `String(NOTA DE ENTREGA)`. Es único, y esa unicidad hace la carga idempotente. |
| `fechaCompra` | En los importados: la fecha del archivo a las 12:00 de America/Caracas (16:00 UTC). |
| `montoSubtotal` = `montoTotal` | En los importados es la suma de `cantidad × precioUnitario` redondeada a centavos. `montoDescuento = 0`, `montoDelivery = 0`, `tasaCambio = null`. |
| `estado` | En los importados: `pagado` si lo abonado ≥ total, `por_cobrar` si no. Un abono que deja el saldo en 0 lo pasa a `pagado`. |
| `tipodeRetiro` | En los importados: el valor por defecto (`envio`), sin dirección ni zona. |
| `importada` | `true` solo en los creados por la carga. No cambia nunca. |

**Valor derivado (no se guarda)**:

```text
abonadoUsd = roundMoney(Σ pago.montoUsd  para pago.esAbono && pago.anuladoEn == null)
saldoUsd   = estado == pagado ? 0 : max(0, roundMoney(montoTotal − abonadoUsd))
```

`cancelado` conserva sus abonos y queda fuera de las cuentas por cobrar.

### DetalleCompra (línea de pedido)

| Campo | Regla |
|---|---|
| `cantidad` | Mayor que 0 y con 2 decimales como máximo (`isValidQuantity`), en la carga, la venta manual y las filas nuevas del editor masivo. En el checkout sigue siendo un entero. |
| `precioUnitario` | Mayor que 0. En la carga es el PVP del archivo, aunque difiera del catálogo. |
| `tipoPrecio` | Obligatorio en las líneas nuevas (checkout, venta manual, editor masivo y carga). `null` = "Sin especificar" (líneas anteriores). |

### Producto

| Campo | Regla |
|---|---|
| `inventario` | Siempre se guarda redondeado a 2 decimales y nunca negativo. Solo se modifica con `ajustarInventario(tx, …)` (ventas y cancelaciones) o con la edición de inventario (que valida 2 decimales). La tienda, la venta rápida y la cotización ven `unidadesDisponibles = floor(inventario)`. |

### Pago (pago declarado o abono)

| Campo | Regla |
|---|---|
| `esAbono` | `true` en los abonos del panel y en lo cobrado según la carga. `false` en los pagos del checkout, la venta manual y el cambio de estado (pagos declarados). |
| `montoUsd` | En un abono es obligatorio y mayor que 0. Si se pagó en Bs, es `roundMoney(montoBs / tasaCambio)`. |
| `montoBs`, `tasaCambio` | Solo si el abono se registró en Bs. |
| `metodoPago` | Un abono del panel no puede usar `NoEspecificado`; ese valor es exclusivo de la carga. |
| `referencia` | Opcional, hasta 120 caracteres. |
| `fechaPago` | Fecha del abono. En la carga, la fecha de la venta. |
| `actorId`, `actorEmail` | Quién registró el abono (`requireAdmin`). En la carga, quién confirmó. |
| `anuladoEn` | `null` mientras está vigente. Una vez fijado, no se modifica ni se borra el registro. |

**Invariantes de los abonos**:

1. Un abono nuevo cumple `0 < montoUsd ≤ saldoUsd` en el momento de registrarlo, evaluado con la fila del pedido bloqueada.
2. Solo se registran abonos en pedidos `por_cobrar`, `pendiente` o `en_pedido`.
3. Solo se anulan abonos de pedidos que no están `pagado` ni `cancelado`.
4. Si `saldoUsd` llega a 0 tras un abono, en la misma transacción el pedido pasa a `pagado` (escritura condicionada al estado leído) y se inserta el historial con el motivo `Saldado con abonos`.
5. `actualizarDescuentoVenta` rechaza un total nuevo menor que `abonadoUsd`.

### Cliente

| Campo | Regla |
|---|---|
| `celular` | Opcional solo en los clientes creados por la carga. Las altas del módulo de clientes y de la tienda siguen exigiéndolo. Es único cuando existe. |
| `nombre`, `apellido` | En la carga: `nombre` = texto de CLIENTE recortado y `apellido = ""`. |
| `tipoCliente` | Propuesto: `mayorista` si alguna línea de sus notas es MAYOR y `detal` si no. La persona puede cambiarlo antes de confirmar. |
| `nombreBusqueda` | `normalizeSearchName(nombre, apellido)`. También es la clave para reconocer al cliente en la carga. |

La carga registra `HistorialCliente { accion: creado }` para cada cliente que crea.

### EquivalenciaProducto

| Campo | Regla |
|---|---|
| `clave` | `normalizar(GRUPO) \| normalizar(PRODUCTO) \| normalizar(SABOR) \| GR`, con las celdas vacías como cadena vacía. Única. |
| `productoId` | Producto del catálogo elegido o confirmado por la persona. |
| `grupo`, `producto`, `sabor`, `gramos` | Texto original recortado de la última carga que fijó la equivalencia. La exportación lo usa (FR-040). |
| `actorEmail` | Persona que la creó o cambió por última vez. |

Se escribe con upsert al confirmar, solo para las claves cuya resolución vino de la persona (sugerencia confirmada, elección manual o cambio). Las coincidencias exactas no se guardan. Para exportar un producto con varias equivalencias se usa la de `updatedAt` más reciente.

### EquivalenciaCliente

| Campo | Regla |
|---|---|
| `clave` | `normalizeSearchName(CLIENTE)`. Única. |
| `clienteId` | Cliente vinculado por la persona. |

Se escribe al confirmar cuando la persona vincula un nombre a un cliente cuyo `nombreBusqueda` es distinto de la clave. Los clientes creados por la carga no la necesitan: los reconoce la coincidencia exacta.

### EstadoTransaccionHistorial (sin cambios de esquema, solo inserción)

| Evento | `estadoAnterior` | `estadoNuevo` | `motivo` |
|---|---|---|---|
| Pedido importado | `null` | `pagado` o `por_cobrar` | `Importado desde Excel: {nombre del archivo, hasta 120 caracteres}` |
| Abono que salda | estado leído | `pagado` | `Saldado con abonos` |
| Abono anulado | estado leído | el mismo | `Abono anulado: USD {monto} ({método})` |

## Datos de una carga (en memoria, no se guardan)

La vista previa y la confirmación trabajan sobre estas estructuras, producidas por funciones puras en `lib/admin/sales-import-core.ts`. La forma exacta está en [contracts/sales-import.md](./contracts/sales-import.md).

```text
FilaLeida       fila, fecha, nota, cliente, grupo, producto, sabor, cantidad, tipo, gramos, precio, venta, pagado, abono
LineaCarga      FilaLeida normalizada + claveProducto + importeUsd + abonadoUsd
NotaCarga       numero, fecha, claveCliente, textoCliente, lineas[], totalUsd, abonadoUsd, saldoUsd, estadoResultante,
                situacion: nueva | ya_registrada | conflicto | con_error
Problema        fila | null, columna | null, nivel: error | advertencia, mensaje
```

### Transiciones de la situación de una nota

```text
                    ┌─ algún error de línea o de nota ───────────────► con_error   (bloquea)
leída y agrupada ───┼─ número existe, mismo cliente/día/importe ─────► ya_registrada (se omite)
                    ├─ número existe con otros datos ─────────────────► conflicto   (bloquea)
                    └─ en otro caso ──────────────────────────────────► nueva       (se crea al confirmar)
```

La confirmación solo procede si no hay notas `con_error` ni `conflicto`, y si todas las claves de producto y de cliente de las notas `nueva` están resueltas.

### Cálculo de lo cobrado en una línea importada

```text
abonadoLinea = ABONO es número            ? ABONO
             : PAGADO normalizado == "SI" ? importe
             : 0
error si abonadoLinea < 0 o abonadoLinea > importe + 0,005
advertencia si PAGADO == "SI" y ABONO == 0, o PAGADO == "NO" y ABONO == importe
```
