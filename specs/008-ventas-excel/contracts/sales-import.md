# Contrato: carga de ventas desde Excel

**Feature**: `008-ventas-excel`
**Superficie**: Panel administrativo, `/admin/transactions/import` (ruta nueva, protegida por `app/admin/layout.tsx`).

## 1. Formato del archivo

### Aceptación

| Regla | Valor | Mensaje si no se cumple |
|---|---|---|
| Extensión / tipo | `.xlsx` (ZIP con `xl/workbook.xml`) | `El archivo no es un Excel (.xlsx) válido.` |
| Tamaño | ≤ 5 MB | `El archivo supera el límite de 5 MB.` |
| Firma `D0 CF 11 E0` (documento compuesto: `.xlsx` con contraseña o `.xls` antiguo) | — | `El archivo está protegido con contraseña o es un Excel antiguo (.xls). Guárdalo como .xlsx sin contraseña.` |
| ZIP cifrado o método distinto de 0/8 | — | `El archivo está protegido o no es un Excel válido.` |
| Entradas / tamaño descomprimido | ≤ 2.000 entradas y ≤ 50 MB | `El archivo es demasiado grande o está dañado.` |
| Líneas de venta (filas con datos) | ≤ 2.000 | `El archivo tiene más de 2.000 líneas. Divídelo en varias cargas.` |

### Localización de la tabla

Se recorren las hojas en orden y, en cada una, las primeras 10 filas. La tabla empieza en la primera fila que contiene **todos** los encabezados obligatorios. Si ninguna hoja los contiene: `No se encontraron las columnas obligatorias: {lista de las que faltan en la hoja más parecida}.`

### Encabezados

Antes de comparar, cada encabezado se normaliza: sin acentos, en mayúsculas, con la puntuación y los saltos de línea convertidos en espacios y los espacios colapsados.

| Encabezado normalizado | Campo | Obligatorio | Uso |
|---|---|---|---|
| `FECHA` | fecha | Sí | Serial de Excel (1900 o 1904) o texto `d/m/aaaa`. |
| `NOTA DE ENTREGA` | nota | Sí | Entero positivo. Es el número de pedido. |
| `CLIENTE` | cliente | Sí | Texto no vacío. |
| `PRODUCTO` | producto | Sí | Texto no vacío. |
| `CANT X PAQ` | cantidad | Sí | Número > 0 con ≤ 2 decimales. |
| `TIPO` | tipo | Sí | `DETAL`, `MAYOR` o `PROMO` (normalizado). |
| `PVP UND` | precio | Sí | Número > 0. |
| `PAGADO` | pagado | Sí | `SI` o `NO` (normalizado); vacío = `NO` con advertencia. |
| `GRUPO` | grupo | No | Forma parte de la clave del producto. |
| `SABOR` | sabor | No | Forma parte de la clave del producto. |
| `GR` | gramos | No | Se toma el número entero inicial del valor (`500`, `"500 g"` → 500). Si no hay número, queda vacío con la advertencia `GR no tiene un número; se ignora.` Forma parte de la clave del producto. |
| `ABONO` | abono | No | Si es número, es lo cobrado de la línea. |
| `VENTA` | venta | No | Solo se compara con `cantidad × precio` para emitir una advertencia. |
| `ORDEN CODIGO`, `DEUDA`, `X COBRAR` | — | No | Se ignoran. |

Las columnas sin encabezado y las demás columnas se ignoran. Una fila sin fecha, nota, cliente ni producto se ignora en silencio (por ejemplo, las filas que solo tienen fórmulas).

### Problemas por línea

`fila` es el número de fila de Excel (empieza en 1) y `columna` es el encabezado tal como aparece en el archivo.

| Nivel | Condición | Mensaje |
|---|---|---|
| error | Fecha vacía, no interpretable o posterior a hoy (Caracas) | `La fecha no es válida.` / `La fecha es posterior a hoy.` |
| error | Nota vacía o no entera positiva | `Falta el número de nota de entrega.` / `El número de nota no es válido.` |
| error | Cliente o producto vacío | `Falta el cliente.` / `Falta el producto.` |
| error | Cantidad no numérica, ≤ 0 o con más de 2 decimales | `La cantidad debe ser mayor que cero y tener como máximo 2 decimales.` |
| error | Tipo distinto de DETAL/MAYOR/PROMO | `El tipo debe ser DETAL, MAYOR o PROMO.` |
| error | Precio no numérico o ≤ 0 | `El precio unitario debe ser mayor que cero.` |
| error | PAGADO con otro valor | `PAGADO debe ser SI o NO.` |
| error | ABONO negativo o mayor que el importe | `El abono no puede ser negativo ni mayor que la venta de la línea.` |
| error (nota) | Líneas de la nota con fechas o clientes distintos | `La nota {n} tiene líneas con distinta fecha o cliente.` |
| error (nota) | Conflicto de número | `El número {n} ya pertenece al pedido de {cliente} del {fecha} por USD {total}.` |
| advertencia | VENTA ≠ cantidad × precio (diferencia > 0,005) | `La VENTA del archivo ({venta}) no coincide con CANT × PVP ({importe}); se usa {importe}.` |
| advertencia | PAGADO vacío | `PAGADO está vacío; se toma como NO.` |
| advertencia | PAGADO SI con ABONO 0, o NO con ABONO igual al importe | `PAGADO y ABONO no coinciden; se usa el ABONO ({abono}).` |
| información | Precio distinto del catálogo para el tipo | Se muestra junto a la línea, no como problema. |

Las líneas de una nota **ya registrada** solo se validan en lo necesario para identificarla (nota, fecha, cliente, cantidad y precio). Sus demás problemas se muestran, pero no bloquean la carga.

## 2. Server Action `previsualizarCargaVentas(formData)`

Ubicación: `lib/actions/sales-import.ts` (`"use server"`). **No escribe nada.**

### Entrada (`FormData`)

| Campo | Tipo | Regla |
|---|---|---|
| `archivo` | `File` | Obligatorio. Ver §1. |

### Orden de evaluación

1. `requireAdmin()`.
2. Validar que `archivo` es un `File` de hasta 5 MB.
3. `leerLibroXlsx(bytes)` (`lib/admin/xlsx-reader.ts`) y `construirCarga(hojas, hoy)` (`lib/admin/sales-import-core.ts`), ambos puros.
4. `prepararVistaPrevia(prisma, carga)` (`lib/admin/sales-import.ts`): carga el catálogo, los clientes (`id`, nombre, `nombreBusqueda`, `tipoCliente`), las equivalencias y los pedidos con los números del archivo. Luego resuelve las coincidencias y la situación de cada nota con funciones puras.

### Resultado

```ts
type PrevisualizacionState =
  | { success: true; message: string; vista: VistaPreviaCarga }
  | { success: false; message: string };

type VistaPreviaCarga = {
  archivo: { nombre: string; hoja: string; filaEncabezados: number };
  resumen: {
    notasNuevas: number;
    notasYaRegistradas: number;
    notasConError: number;   // incluye los conflictos
    lineas: number;
    totalUsd: number;        // solo notas nuevas
    porCobrarUsd: number;    // solo notas nuevas
  };
  notas: Array<{
    numero: string;
    fecha: string;           // AAAA-MM-DD
    claveCliente: string;
    textoCliente: string;
    totalUsd: number;
    abonadoUsd: number;
    saldoUsd: number;
    estadoResultante: "pagado" | "por_cobrar";
    situacion: "nueva" | "ya_registrada" | "conflicto" | "con_error";
    pedidoExistente: { id: number; cliente: string; fecha: string; totalUsd: number } | null;
    lineas: Array<{
      fila: number;
      claveProducto: string;
      descripcion: string;   // "RAVIOLI ESPINACA 500 g"
      cantidad: number;
      tipoPrecio: "detal" | "mayor" | "promo";
      precioUnitarioUsd: number;
      importeUsd: number;
      abonadoUsd: number;
    }>;
  }>;
  productos: Array<{        // una entrada por clave distinta de notas nuevas
    clave: string;
    grupo: string | null; producto: string; sabor: string | null; gramos: number | null;
    lineas: number;
    resolucion:
      | { tipo: "equivalencia" | "exacta"; productoId: number; nombre: string }
      | { tipo: "sugerida"; productoId: number; nombre: string }  // requiere confirmación
      | { tipo: "pendiente" };
    preciosCatalogo: { detal: number; mayor: number } | null;   // del producto resuelto o sugerido
  }>;
  clientes: Array<{         // una entrada por clave distinta de notas nuevas
    clave: string;
    texto: string;
    tipoPropuesto: "mayorista" | "detal";
    resolucion:
      | { tipo: "equivalencia" | "exacta"; clienteId: number; nombre: string }
      | { tipo: "pendiente"; coincidencias: Array<{ clienteId: number; nombre: string }> };
  }>;
  catalogo: Array<{ id: number; nombre: string; categoria: string; precioDetal: number; precioMayorista: number }>;
  problemas: Array<{ fila: number | null; columna: string | null; nivel: "error" | "advertencia"; mensaje: string; nota: string | null }>;
  puedeConfirmar: boolean;  // sin errores bloqueantes (sin contar las resoluciones pendientes)
};
```

La lista de clientes para vincular se obtiene en la página (Server Component) y se pasa al componente; no viaja en la vista previa.

| Caso | `success` | `message` |
|---|---|---|
| Archivo leído (aunque tenga errores de línea) | `true` | `Revisa la vista previa antes de confirmar.` |
| Archivo inválido (§1) | `false` | Mensaje de §1 |
| Error inesperado | `false` | `No se pudo leer el archivo.` |

## 3. Server Action `confirmarCargaVentas(formData)`

### Entrada (`FormData`)

| Campo | Tipo | Regla |
|---|---|---|
| `archivo` | `File` | El mismo archivo de la vista previa. Se vuelve a leer y validar entero. |
| `resoluciones` | JSON | Zod: ver abajo. |

```ts
type ResolucionesCarga = {
  productos: Record<string /* clave */, number /* productoId */>;
  clientes: Record<string /* clave */,
    | { accion: "vincular"; clienteId: number }
    | { accion: "crear"; tipoCliente: "mayorista" | "detal" }>;
};
```

Para cada clave de una nota nueva, la resolución de la persona tiene prioridad. Si no hay, se usa la automática (`equivalencia` o `exacta`). Una sugerencia **no** se aplica sola: la interfaz la envía como resolución cuando la persona la confirma.

### Orden de evaluación

1. `requireAdmin()`, validar el archivo y Zod sobre `resoluciones`.
2. Leer y construir la carga como en la vista previa.
3. `prisma.$transaction(tx => aplicarCargaVentas(tx, carga, resoluciones, actor, nombreArchivo), { maxWait: 10000, timeout: 60000 })`. El núcleo (`lib/admin/sales-import.ts`, recibe `tx`):
   1. Vuelve a calcular la situación de cada nota contra los pedidos vigentes. Si hay notas `con_error` o `conflicto`, o claves sin resolver, lanza `CargaError` con el detalle.
   2. Verifica que los `productoId` y `clienteId` de las resoluciones existen.
   3. Crea los clientes con `accion: "crear"` (`celular = null`) y su `HistorialCliente`.
   4. Por cada nota nueva, en orden de número:
      - `transaccion.create` con `importada: true`, el número de la nota, la fecha a las 12:00 de Caracas, los montos y el estado;
      - `detalleCompra.createMany` con `cantidad`, `precioUnitario` y `tipoPrecio`;
      - si `abonadoUsd > 0`, un `pago.create` con `esAbono: true`, `metodoPago: "NoEspecificado"`, `montoUsd = abonadoUsd`, `fechaPago` = fecha de la venta y el actor;
      - `estadoTransaccionHistorial.create` con `estadoAnterior: null` y el motivo `Importado desde Excel: {archivo}`.
   5. Hace upsert de `EquivalenciaProducto` y `EquivalenciaCliente` según [data-model.md](../data-model.md).
   6. Si `max(números importados) ≥ 1300`, avanza `orden_correlativo_seq` (research, Decisión 5).
   7. **No** toca `Producto.inventario` ni crea `Fidelidad`.
4. `revalidatePath("/admin")`, `"/admin/transactions"`, `"/admin/clients"` y `"/admin/analytics/sales"`.

### Resultado

```ts
type ConfirmacionState =
  | { success: true; message: string; creados: number; omitidos: number; totalUsd: number }
  | { success: false; message: string; problemas?: VistaPreviaCarga["problemas"] };
```

| Caso | `success` | `message` |
|---|---|---|
| Carga aplicada | `true` | `Se crearon {creados} pedidos por USD {totalUsd}. {omitidos} notas ya estaban registradas.` |
| Nada nuevo | `true` | `Todas las notas del archivo ya estaban registradas.` (`creados: 0`) |
| Errores, conflictos o claves sin resolver | `false` | `La carga tiene problemas sin resolver. Revisa la vista previa.` + `problemas` |
| Producto o cliente elegido ya no existe | `false` | `Un producto o cliente elegido ya no existe. Vuelve a previsualizar el archivo.` |
| P2002 sobre `numeroOrden` (carga concurrente) | `false` | `Algunas notas ya fueron registradas. Vuelve a previsualizar el archivo.` |
| Error inesperado | `false` | `No se pudo guardar la carga. No se registró ningún pedido.` |

Cualquier fallo revierte la transacción completa: no queda ningún pedido, cliente, pago ni equivalencia de esa carga (FR-020).

## 4. Interfaz (`components/admin/ventas/salesImport.tsx`)

- **Paso 1**: selector de archivo (`accept=".xlsx"`) y botón "Previsualizar". Mientras se procesa, el botón queda deshabilitado.
- **Paso 2**:
  - Resumen (notas nuevas, ya registradas y con error; total y por cobrar).
  - Lista de problemas.
  - Conciliación de productos: un `<select>` del catálogo por clave, con la sugerencia marcada para confirmar y el precio de catálogo junto al del archivo.
  - Conciliación de clientes: vincular a un cliente existente o crear uno nuevo con el tipo propuesto y editable.
  - Tabla de notas agrupada, con la situación de cada una.
  - "Confirmar carga" se habilita solo si `puedeConfirmar` y no quedan claves pendientes.
- **Paso 3**: `toast.success` con el resultado y un enlace a `/admin/transactions?desde=…&hasta=…` con el rango de fechas cargado. Un error se muestra con `toast.error` y la vista previa se conserva.
- En móvil, las notas se muestran como tarjetas, igual que en la tabla de ventas.
