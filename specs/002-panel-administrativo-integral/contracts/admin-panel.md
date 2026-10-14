# Contrato interno del panel administrativo

Este documento define el comportamiento observable de las rutas y acciones del panel.
No expone una API pública ni autoriza accesos desde el e-commerce o `/venta-rapida`.

## Reglas comunes

- Toda ruta y acción exige una sesión administrativa válida y el correo autorizado
  por la configuración existente.
- Las respuestas de mutación deben distinguir `success` y `error`, devolver mensajes
  en español y conservar errores de campos sin imprimir secretos ni datos sensibles.
- Los importes se presentan en USD como referencia canónica y en Bs solo cuando
  existe una tasa asociada a la operación.
- Las fechas se muestran en el formato local del negocio, pero se guardan como fechas
  completas para que los filtros no pierdan precisión.
- Una acción inválida no produce escrituras parciales.

## Rutas administrativas

| Ruta | Responsabilidad | Datos mínimos de salida |
|---|---|---|
| `/admin` | Dashboard operativo | Ventas del periodo, estados pendientes, inventario relevante y accesos rápidos |
| `/admin/transactions` | Hoja de ventas y pedidos | Filas paginadas, filtros, subtotal, descuento, total, moneda y estado |
| `/admin/add-transaction` | Registro manual | Cliente, líneas, descuento, cobro disponible, tasa y estado inicial |
| `/admin/transactions/[id]` | Detalle y seguimiento | Cliente, líneas, importes, pago, estado actual, historial y acciones autorizadas |
| `/admin/analytics` | Analíticas y predictor | Total/cantidad, desglose por producto, periodo histórico y estimación o insuficiencia |
| `/admin/delivery-notes` | Lista de documentos | Número, fecha, cliente mayorista, origen y acción de descarga |
| `/admin/delivery-notes/new` | Alta de nota | Formulario validable y vista previa antes de guardar |
| `/admin/delivery-notes/[id]` | Consulta de nota | Datos guardados, líneas snapshot, observaciones y descarga |
| `/admin/delivery-notes/[id]/pdf` | Descarga de documento | Respuesta PDF descargable; nunca modifica inventario o pago |

Las rutas existentes de productos e inventario conservan sus URLs y permisos. Las
etiquetas de navegación pueden cambiar a español sin cambiar el contrato de sus
operaciones actuales.

## Acción `registrarVentaManual`

### Entrada

```text
clienteId: entero positivo
fechaCompra: fecha válida
numeroOrden: texto opcional; se genera si está vacío
tipodeRetiro: envio | recogida
tasaCambio: número positivo opcional
estadoInicial: por_cobrar | en_pedido | pagado
lineas: lista no vacía de {
  productoId: entero positivo
  cantidad: entero positivo
  precioUnitarioUsd: número positivo
}
descuento: nulo o {
  tipo: porcentaje | usd
  valor: número no negativo
}
pago: opcional con montos, método, referencia y fecha disponibles
confirmacionPago: booleano requerido cuando estadoInicial = pagado
```

### Resultado exitoso

```text
{
  success: true,
  transactionId: entero,
  numeroOrden: texto,
  subtotalUsd: número,
  descuentoUsd: número,
  totalUsd: número,
  estado: estado operativo,
  message: texto
}
```

La acción valida nuevamente productos, precios manuales, stock y cliente dentro de
la transacción de persistencia. Si el stock falla, no crea transacción, detalles,
pago ni historial incompleto.

## Acción `actualizarEstadoPedido`

### Entrada

```text
transaccionId: entero positivo
estadoNuevo: por_cobrar | en_pedido | pagado
motivo: texto opcional
confirmacionPago: booleano requerido para pagado cuando la operación no tiene pago suficiente
datosPago: opcional, si el administrador dispone de método, monto, referencia, fecha o tasa
```

### Resultado

```text
{
  success: booleano,
  transactionId: entero,
  estadoAnterior: texto,
  estadoNuevo: texto,
  changedAt: fecha,
  message: texto
}
```

Cada cambio autorizado agrega una fila al historial con actor, fecha y estados. Los
registros históricos `pendiente` y `cancelado` se consultan, pero no se ofrecen como
opciones activas de la acción.

## Consulta `consultarAnaliticas`

### Parámetros

```text
periodo: semana ISO (YYYY-Www) o mes calendario (YYYY-MM)
productoId: entero opcional
incluirPredictor: booleano
```

### Resultado

```text
{
  periodo: { tipo, valor, desde, hasta, etiqueta },
  totalUsd: número,
  cantidadVentas: entero,
  porProducto: [
    { productoId, nombre, cantidadVendida, totalUsd, porcentajeDelTotal }
  ],
  predictor: null | {
    valorUsd: número,
    periodoObjetivo: texto,
    historialUsado: texto,
    estado: disponible | datos_insuficientes
  }
}
```

Solo se incluyen transacciones no canceladas. Los filtros se aplican antes de
agregar y el predictor usa la media móvil definida en `research.md`.

## Acción `crearNotaEntrega`

### Entrada

```text
clienteId: entero positivo y de tipo mayorista
transaccionId: entero opcional
fechaEntrega: fecha válida
direccionEntrega: texto opcional
personaRecibe: texto opcional
observaciones: texto opcional
lineas: lista no vacía de {
  productoId: entero opcional
  productoNombre: texto no vacío
  cantidad: entero positivo
  precioUnitarioUsd: número opcional no negativo
}
```

### Resultado exitoso

```text
{
  success: true,
  notaEntregaId: entero,
  numeroNota: texto,
  pdfUrl: ruta interna,
  message: texto
}
```

La acción verifica el tipo de cliente, guarda snapshots de líneas y no cambia stock,
estado de pago ni inventario. La descarga posterior vuelve a validar autorización y
usa únicamente los datos guardados de la nota.

## Contrato del PDF

El documento descargado debe incluir, en este orden visual:

1. Marca de Venuti's Gourmet y título “Nota de entrega”.
2. Número, fecha, cliente mayorista y datos de entrega.
3. Tabla de productos con nombre, cantidad y precio/importe cuando fueron registrados.
4. Totales disponibles, sin inventar impuestos ni convertir la nota en factura fiscal.
5. Observaciones, persona que recibe y espacio de recepción.

El documento debe mantener encabezados y filas legibles cuando ocupe varias páginas.
La ruta responde con tipo de contenido PDF, nombre de archivo estable y sin revelar
credenciales o información de otros clientes.
