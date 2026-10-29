# Research: Control de ventas desde Excel

**Feature**: `008-ventas-excel`
**Fecha**: 2026-10-29

La spec quedó sin aclaraciones pendientes: las ventas importadas no tocan inventario, los clientes nuevos se crean sin teléfono y las cantidades admiten hasta 2 decimales en todos los pedidos del panel. Esta investigación fija las decisiones técnicas a partir del código actual y del archivo de muestra.

## Hallazgos del código actual

- **No hay lector de Excel.** `lib/admin/sales-export.ts` *escribe* `.xlsx` a mano (XML + ZIP sin compresión, con su propio `crc32`), sin dependencias. No existe ninguna librería de hojas de cálculo en `package.json`.
- **Las Server Actions tienen un límite de 1 MB por petición** (valor por defecto de Next 15) y `next.config.ts` no lo cambia.
- **Cantidades e inventario son enteros**: `DetalleCompra.cantidad Int`, `Producto.inventario Int`. `calculateSubtotal` rechaza cantidades no enteras; `admin-sales.ts`, `products.ts` y el checkout validan con `.int()` o `Number.isInteger`. Hay cuatro escritores de inventario: checkout (`decrement`), venta manual (`decrement`), filas nuevas del editor masivo (`decrement`) y cancelación (`increment` en `order-state-change.ts`), más la edición directa en `products.ts`.
- **`Pago` mezcla dos conceptos**: el checkout crea un `Pago` con el monto *declarado* por el cliente aunque el pedido quede "Por cobrar" (efectivo al entregar) o "En pedido" (pago móvil sin verificar). El detalle del pedido lo titula "Pago declarado" y muestra solo el último. No existe la noción de abono ni de saldo.
- **`Cliente.celular` es obligatorio y único** (migración `20260122191824_add_unique_celular`). `nombreBusqueda` ya guarda el nombre normalizado con `normalizeSearchName` (`lib/client-rules.ts`), que sirve para reconocer clientes del Excel.
- **El correlativo de órdenes empieza en 1300** (`orden_correlativo_seq`, `MINVALUE 1300`). Las notas del archivo de muestra van de 1200 a 1227, así que no chocan hoy; `nextOrderNumber` no verifica si el número ya existe.
- **`MetodoPago` no tiene un valor para "desconocido"** y el Excel no informa el método.
- **Los nombres del catálogo no coinciden con los del Excel**: el catálogo usa "RAVIOLI DE RICOTTA Y ESPINACA", "BERENJENA A LA PARMESSANA", "SALSA NAPOLI"; el Excel separa PRODUCTO ("RAVIOLI", "PARMEGGIANA", "TOMATE") y SABOR ("ESPINACA", "BERENJENA", "NAPOLI"), y además trae el gramaje (200, 300, 450, 500, 650 g), que el catálogo no modela.
- **Las pruebas** (`node:test`) no pueden importar módulos con `@/`, `server-only` ni Stack Auth. Los núcleos que se prueban reciben `tx` y usan imports relativos con extensión (`./status.ts`); el precedente es `aplicarCambioEstadoPedido(tx, …)` y `nextOrderNumber(tx)`.

## Hallazgos del archivo de muestra

- Libro con dos hojas: "VENTAS" (datos) y "Hoja1" (vacía). En "VENTAS", la fila 1 es el título "CONTROL DE VENTAS", la fila 2 los encabezados y la columna A está vacía.
- Encabezados con saltos de línea: `ORDEN\nCODIGO`, `CANT\nX PAQ.`, `PVP\nUND`, `X\nCOBRAR`.
- FECHA son fechas de Excel (número de serie). VENTA, ABONO, DEUDA y X COBRAR son fórmulas con valor calculado guardado (`=+L3*I3`, `=+IF(N3="si",M3,0)`).
- La fila 57 tiene solo fórmulas (VENTA 0, X COBRAR "-") y ningún dato.
- Textos con espacios sobrantes ("ARAGITXA ", "RAVIOLI ") y acentos ("CHAMPIÑON", "CHACÓN").
- 54 líneas, 27 notas, 16 clientes, total USD 2.901,05 y deuda USD 33,00 (nota 1225, PAGADO "NO" en sus dos líneas). Una cantidad fraccionaria: 16,5 en la nota 1203. La nota 1212 repite el mismo producto con dos precios.

## Decisión 1: Leer el `.xlsx` con un lector propio, sin dependencias

**Decisión**: Crear `lib/admin/xlsx-reader.ts`, un lector mínimo que recibe los bytes del archivo y devuelve, por hoja, una matriz de celdas (`string | number | boolean | null`). Usa:

- el directorio central del ZIP para localizar las entradas, y `node:zlib.inflateRawSync` con `maxOutputLength` para las comprimidas (métodos 0 y 8);
- `xl/workbook.xml` y su `.rels` para el nombre y la ruta de cada hoja, y el indicador `date1904`;
- `xl/sharedStrings.xml` (incluido texto enriquecido `<r><t>`) y las celdas `t="s" | "str" | "inlineStr" | "b" | "e"` y numéricas de cada hoja. De las celdas con fórmula se lee el valor guardado en `<v>`;
- decodificación de las cinco entidades XML y de las referencias numéricas (`&#10;`, `&#xA;`).

No lee estilos: la columna FECHA se interpreta por su significado (un número es un serial de Excel), no por su formato.

**Razonamiento**: El Principio I prohíbe añadir dependencias si el stack resuelve el caso, y el proyecto ya tiene el precedente inverso (el escritor de `sales-export.ts`). El formato a leer es acotado: una tabla de valores sin estilos, combinaciones ni gráficos. Node trae el descompresor. El lector es puro (bytes de entrada, celdas de salida), así que se prueba con `node:test` sin base de datos. Leer XML con expresiones regulares evita la expansión de entidades y las referencias externas (XXE), porque no se interpreta ningún DTD.

**Alternativas consideradas**:

- **SheetJS (`xlsx`)**: descartada. La versión publicada en npm (0.18.5) tiene vulnerabilidades conocidas sin corregir, y las corregidas solo se distribuyen fuera del registro de npm.
- **`exceljs`**: descartada. Añade una dependencia pesada, con su propio árbol de dependencias, para leer una sola tabla.
- **Pedir CSV a la dueña**: descartada. La spec pide cargar "estos archivos en Excel", y exportar a CSV desde Excel pierde las fechas y los acentos según la configuración regional.

**Límites de seguridad**: archivo de hasta 5 MB (FR-002), como máximo 2.000 entradas en el ZIP, 50 MB descomprimidos en total y 2.000 líneas de venta. Si se superan, el lector lanza un error controlado ("El archivo es demasiado grande o está dañado."). Un ZIP cifrado (bit 0 del indicador) o un método distinto de 0 y 8 se rechaza con "El archivo está protegido o no es un Excel válido.".

## Decisión 2: Procesar el archivo en el servidor con Server Actions

**Decisión**: Dos Server Actions en `lib/actions/sales-import.ts`: `previsualizarCargaVentas(formData)`, que recibe el `File` y devuelve la vista previa sin escribir nada, y `confirmarCargaVentas(formData)`, que recibe **el mismo archivo otra vez** junto con las resoluciones de la persona. `next.config.ts` sube `experimental.serverActions.bodySizeLimit` a `"6mb"`.

**Razonamiento**: Las mutaciones del proyecto son Server Actions con `requireAdmin` y Zod (Principio II). Reenviar el archivo al confirmar permite volver a validarlo todo contra los datos vigentes (FR-020) sin guardar borradores en el servidor: no hay estado intermedio que limpiar ni que pueda quedar desactualizado. Leer en el servidor mantiene el lector en un solo entorno (Node) y fuera del bundle del navegador.

**Alternativas consideradas**:

- **Leer en el navegador y enviar JSON**: descartada. Obliga a un lector que funcione en dos entornos y el servidor tendría que validar igualmente todo lo recibido.
- **Route Handler para la subida**: descartada. Duplica la autorización y el manejo de errores que ya resuelven las Server Actions.
- **Guardar la vista previa como borrador en la base**: descartada. Requiere un modelo y una limpieza nuevos para ahorrar una segunda subida de pocos KB (el archivo de un mes pesa unos 18 KB).

## Decisión 3: Reconocer productos por descripción normalizada, tokens y equivalencias

**Decisión**: La "clave de producto" de una línea es `normalizar(GRUPO) | normalizar(PRODUCTO) | normalizar(SABOR) | GR`, donde normalizar quita acentos, pasa a mayúsculas, convierte la puntuación en espacios y colapsa los espacios. Para cada clave distinta, en este orden:

1. **Equivalencia guardada** (`EquivalenciaProducto.clave`): se aplica sola.
2. **Coincidencia exacta**: el conjunto de palabras de PRODUCTO + SABOR, sin las palabras vacías (DE, DEL, Y, A, AL, LA, LAS, LOS, CON, EN), es igual al conjunto de palabras del nombre de un único producto del catálogo. Por ejemplo, "GNOCCHI" + "PAPAS" coincide con "GNOCCHI DE PAPAS". Se aplica sola.
3. **Sugerencia**: se puntúa cada producto del catálogo por las palabras que comparte con PRODUCTO + SABOR. Dos palabras coinciden si son iguales o si una empieza por las primeras 5 letras de la otra ("CHAMPINON" y "CHAMPINONES"). Se propone el de mayor puntaje si es único y mayor que cero; la persona debe confirmarlo.
4. **Sin coincidencia**: la persona elige el producto.

**Razonamiento**: Cubre los casos reales del archivo ("RAVIOLI" + "ESPINACA" → "RAVIOLI DE RICOTTA Y ESPINACA" como sugerencia única) sin un algoritmo de similitud general. Las decisiones de la persona se guardan como equivalencias, así que el segundo mes casi todo se reconoce solo (SC-005). El gramaje forma parte de la clave para que 200 g y 500 g tengan equivalencias propias, como pide la spec.

**Alternativas consideradas**:

- **Distancia de Levenshtein o similitud difusa**: descartada. Es más código y tampoco resuelve "PARMEGGIANA" frente a "PARMESSANA" con seguridad; la confirmación humana sigue siendo necesaria.
- **Añadir sabor y gramaje como campos del producto**: descartada. Cambia el catálogo, la tienda y el inventario para resolver un problema que solo existe en la carga.

**Clientes**: la clave es `normalizeSearchName(CLIENTE)`, la misma función que llena `Cliente.nombreBusqueda`. Primero se busca una equivalencia guardada y después un único cliente con ese `nombreBusqueda`. Si hay varios clientes con el mismo nombre o ninguno, la persona decide: vincular uno existente o crear uno nuevo. No hay sugerencias difusas de clientes.

## Decisión 4: Dos modelos de equivalencias con clave foránea

**Decisión**: `EquivalenciaProducto` (`clave` única → `productoId`, más el grupo, producto, sabor y gramos originales, que usa la exportación) y `EquivalenciaCliente` (`clave` única → `clienteId`). Ambos con `onDelete: Cascade` y la persona que la creó o cambió por última vez. Se guardan (con upsert) **al confirmar** la carga, dentro de la misma transacción.

**Razonamiento**: Las claves foráneas reales garantizan que una equivalencia nunca apunte a un registro inexistente. Guardar al confirmar evita equivalencias de cargas abandonadas y deja todo en una sola operación.

**Alternativas consideradas**:

- **Un único modelo con `tipo` y dos FK opcionales**: descartada. Exige una restricción de verificación para que solo una FK esté llena y no ahorra código.
- **Guardar la equivalencia en cuanto la persona la elige**: descartada. Obliga a una acción más y deja equivalencias de cargas que nunca se confirmaron.

## Decisión 5: El número de nota es el número de pedido; avanzar el correlativo si hace falta

**Decisión**:

- `Transaccion.numeroOrden = String(NOTA DE ENTREGA)`.
- Al previsualizar y al confirmar se buscan los números del archivo que ya existen. Si el pedido existente es del mismo cliente (mismo `clienteId` resuelto o mismo nombre normalizado), del mismo día (en Caracas) y del mismo importe de productos (Σ cantidad × PVP del archivo frente a `montoSubtotal`, o `montoTotal` si el subtotal es 0, con ±0,01), la nota es **"Ya registrada"** y se omite. Si no, es un **conflicto** bloqueante. Se compara el importe de productos y no el total porque el Excel no tiene columnas de descuento ni de delivery; así un pedido del panel exportado y vuelto a cargar también se reconoce.
- Las líneas de las notas ya registradas solo se validan en lo necesario para identificarlas (número, fecha, cliente y total); sus demás errores no bloquean la carga.
- Si algún número importado es ≥ 1300, al final de la transacción se ejecuta `setval('orden_correlativo_seq', GREATEST(máximo_importado, último_emitido))`, para que el correlativo nunca emita un número que ya existe. El "último emitido" se lee de la secuencia teniendo en cuenta `is_called`, para no saltar el 1300 si nunca se usó.
- Una carga concurrente del mismo archivo choca con la unicidad de `numeroOrden` (P2002), la transacción completa se revierte y se responde "Algunas notas ya fueron registradas. Vuelve a previsualizar el archivo.".

**Razonamiento**: La unicidad que ya existe en `numeroOrden` hace que la recarga sea idempotente sin una tabla de cargas (SC-003). Avanzar la secuencia evita un fallo futuro del checkout, que hoy no comprueba si el número existe.

**Alternativas consideradas**:

- **Rechazar números ≥ 1300**: descartada. La dueña podría seguir numerando en Excel durante la transición.
- **Generar un número nuevo y guardar la nota como referencia**: descartada. Pierde la identidad que la dueña usa con sus clientes y complica la detección de duplicados.

## Decisión 6: Fechas a las 12:00 de Caracas

**Decisión**: Un número en FECHA es un serial de Excel (sistema 1900, o 1904 si el libro lo indica). Un texto se acepta como `d/m/aaaa` o `dd/mm/aaaa`. La fecha resultante se guarda a las **12:00 de America/Caracas (16:00 UTC)**. Una fecha posterior a "hoy" en Caracas es un error bloqueante.

**Razonamiento**: Guardar el mediodía evita que el día cambie si una vista interpreta la fecha en UTC o en la hora local; `sales-query.ts` filtra por día con horas locales y la exportación usa America/Caracas.

**Alternativa considerada**: **medianoche UTC**: descartada, porque en Caracas (UTC−4) se muestra como el día anterior.

## Decisión 7: Abonos sobre `Pago`, con un indicador explícito

**Decisión**: Un abono es un `Pago` con `esAbono = true`. Se añaden a `Pago` los campos `esAbono` (por defecto `false`), `actorId`, `actorEmail` y `anuladoEn`, y a `MetodoPago` el valor `NoEspecificado`. Las reglas son:

- **Saldo**: `estado === "pagado" ? 0 : max(0, montoTotal − Σ montoUsd de los abonos no anulados)`, redondeado a centavos.
- **Solo crean abonos** el flujo nuevo de registro de abonos y la carga de Excel (lo cobrado según el archivo, con método `NoEspecificado` y la fecha de la venta). El checkout, la venta manual y el cambio de estado siguen creando `Pago` con `esAbono = false`: son pagos declarados, no cobros recibidos.
- **Registrar un abono** bloquea la fila del pedido (`SELECT … FOR UPDATE`), valida el estado y el saldo y crea el `Pago`. Si el saldo llega a cero, pasa el pedido a "Pagado" con escritura condicionada al estado leído y escribe el historial "Saldado con abonos".
- **Anular un abono** bloquea la fila del pedido, exige que el pedido no esté "Pagado" ni "Cancelado", fija `anuladoEn` y escribe en el historial una fila sin cambio de estado (`estadoAnterior = estadoNuevo`) con el motivo `Abono anulado: USD {monto} ({método})`. El abono nunca se borra.
- `actualizarDescuentoVenta` rechaza un descuento que deje el total por debajo de lo abonado.

**Razonamiento**: Los pagos siguen en una sola tabla (Principio II), así que la exportación de ventas existente y el detalle los incluyen sin código adicional. El indicador separa lo declarado de lo cobrado, y sin él un pedido "Por cobrar" del checkout mostraría saldo cero. El bloqueo de fila impide que dos abonos simultáneos superen el total. Reutilizar `EstadoTransaccionHistorial` para la anulación evita una tabla de auditoría nueva.

**Alternativas consideradas**:

- **Modelo nuevo `Abono`**: descartada. Dos tablas de pagos con la misma forma obligarían a unir ambas en la exportación y en el detalle.
- **Contar todos los `Pago` como abonos**: descartada por el problema de los pagos declarados del checkout.
- **Borrar el abono anulado**: descartada. Es un registro financiero y la spec pide dejar constancia.

## Decisión 8: Cantidades e inventario como `Float` con redondeo y un único ajustador

**Decisión**:

- `DetalleCompra.cantidad` y `Producto.inventario` pasan de `Int` a `Float` (`DOUBLE PRECISION`); la conversión de los enteros existentes es exacta.
- Un módulo nuevo, `lib/inventory.ts` (sin `@/`, como `lib/order-number.ts`), concentra la regla:
  - `isValidQuantity(x)`: finito, mayor que 0 y con 2 decimales como máximo.
  - `roundQuantity(x)`: redondea a 2 decimales.
  - `unidadesDisponibles(inventario)`: `Math.floor(roundQuantity(inventario))`, que es lo que ven la tienda, la venta rápida y la cotización.
  - `ajustarInventario(tx, productoId, delta, { exigirStock })`: bloquea la fila (`SELECT inventario … FOR UPDATE`), calcula `roundQuantity(actual + delta)`, rechaza un resultado negativo si `exigirStock` y escribe el valor redondeado.
- Los cuatro escritores (checkout, venta manual, filas nuevas del editor masivo y cancelación) usan `ajustarInventario`. Cada flujo ordena los productos por `id` antes de ajustarlos, para evitar bloqueos cruzados.
- La edición de inventario (`products.ts`, editor masivo de inventario) acepta 2 decimales y guarda el valor redondeado.

**Razonamiento**: Con `Float`, el tipo en TypeScript sigue siendo `number` y ningún lector cambia, igual que los precios (que ya son `Float` y se redondean con `roundMoney`). La imprecisión binaria (0,1 + 0,2) no se acumula porque cada escritura guarda el valor redondeado, y las comparaciones de stock se hacen sobre valores redondeados. El bloqueo de fila sustituye a la condición `inventario >= cantidad` sin falsos rechazos por concurrencia.

**Alternativas consideradas**:

- **`Decimal(10,2)`**: es exacto, pero Prisma devuelve objetos `Decimal` que no se pueden pasar a componentes cliente ni operar como `number`. Obligaría a convertir en más de 15 lugares (tienda, venta rápida, cotización, inventario, analíticas) y cada lugar olvidado falla en tiempo de ejecución.
- **Enteros en centésimas**: exacto, pero cambia el significado de cada lectura de inventario y de cantidad en todo el sistema.
- **`Float` con `increment`/`decrement` sin redondear**: descartada. Acumula restos binarios (3,3 − 3 = 0,2999…) que acaban rechazando ventas válidas.

## Decisión 9: La tienda sigue vendiendo unidades enteras

**Decisión**: El checkout conserva `Number.isInteger` en las líneas del carrito. Las consultas que alimentan la tienda, la venta rápida y la cotización rápida exponen `unidadesDisponibles(inventario)` en lugar del valor crudo: `app/productos/consumidores/page.tsx`, `app/productos/consumidores/[id]/page.tsx`, `app/venta-rapida/page.tsx`, `app/cotizacion-rapida/page.tsx` y `lib/actions/cotizacion-rapida.ts`.

**Razonamiento**: Con 12,5 paquetes en stock, la tienda debe ofrecer 12, no mostrar "12.5 unidades" ni permitir agregar 13 al carrito para que luego el servidor lo rechace. Se cambia solo el punto donde se lee el dato, no los componentes.

## Decisión 10: Tipo de precio como enum opcional en la línea

**Decisión**: `enum TipoPrecio { detal mayor promo }` y `DetalleCompra.tipoPrecio TipoPrecio?`. `null` significa "Sin especificar" (líneas anteriores a la feature). Asignación:

- **Checkout**: `consumidor → detal` y `mayorista → mayor`, derivado de `normalizePurchaseContext` en el servidor.
- **Venta manual y filas nuevas del editor masivo**: el valor es obligatorio en el esquema Zod. La interfaz lo propone según `Cliente.tipoCliente` y rellena el precio de catálogo para detal y mayor; para promo deja el precio vacío y la persona debe escribirlo.
- **Carga**: DETAL, MAYOR y PROMO del archivo.

**Razonamiento**: Un enum en la línea es el dato mínimo que permite el desglose de FR-029. Usar `null` en lugar de un valor "sin_especificar" deja claro que no hubo información.

**Alternativa considerada**: **precio promo en el catálogo**: descartada, porque la spec asume que no existe.

## Decisión 11: Marcar los pedidos importados con un booleano

**Decisión**: `Transaccion.importada Boolean @default(false)`. En `aplicarCambioEstadoPedido`, la rama de cancelación solo devuelve inventario si `!transaction.importada`.

**Razonamiento**: Es el dato mínimo que exige FR-016. La trazabilidad de la carga (persona, fecha y archivo) ya queda en el historial de cada pedido.

**Alternativas consideradas**:

- **Enum `origen` (web, panel, importación)**: descartada. No hay manera fiable de clasificar los pedidos existentes entre web y panel, y no hay ningún requisito que lo use.
- **Modelo `CargaVentas`**: descartada. La spec no pide un historial de cargas ni deshacerlas.

## Decisión 12: `Cliente.celular` opcional

**Decisión**: `celular String? @unique`. PostgreSQL admite varios `NULL` en una columna única. Las altas desde el módulo de clientes y desde la tienda siguen exigiendo teléfono en su Zod; solo la carga crea clientes con `celular = null`, `apellido = ""` y `nombreBusqueda = normalizeSearchName(nombre)`, y registra `HistorialCliente` con la acción `creado`.

**Ajustes de tipos**: `ClientRow.celular` pasa a `string | null`; el editor masivo de clientes muestra un campo vacío y no permite guardar un teléfono vacío en clientes que ya tenían uno (regla actual). El PDF de notas de entrega omite el teléfono si falta. `app/confirmacion` no cambia, porque los pedidos web siempre tienen cliente con teléfono.

## Decisión 13: Cuentas por cobrar dentro de "Ventas y pedidos"

**Decisión**: Se añade el filtro `saldo=pendiente` a `/admin/transactions`, que equivale a los estados `por_cobrar`, `pendiente` y `en_pedido`. Con ese filtro activo, sobre la tabla aparece el resumen de cuentas por cobrar: el total y, por cliente, la deuda, la cantidad de pedidos y la fecha más antigua, ordenados por deuda. Las filas con saldo 0 (por ejemplo, un pedido vuelto a "Por cobrar" ya cubierto por abonos) se excluyen del resumen. Cada fila de la tabla muestra lo abonado y el saldo.

**Razonamiento**: Un pedido abierto siempre tiene saldo positivo, salvo el caso límite descrito, porque al saldarse pasa a "Pagado" (FR-033). El filtro por estado conserva la paginación en la base de datos. El resumen se calcula sobre los pedidos abiertos, que son pocos (decenas), sin una ruta nueva.

**Alternativa considerada**: **página `/admin/receivables`**: descartada. Sería una superficie más para mostrar los mismos pedidos que la tabla ya lista y filtra.

## Decisión 14: Exportación con el escritor existente y la misma ruta

**Decisión**: `lib/admin/sales-export.ts` separa la parte genérica (ZIP, estilos, `textCell`/`numberCell`) de cada hoja y añade `buildSalesControlWorkbook(lines)`, con la hoja "VENTAS", el título "CONTROL DE VENTAS" en la fila 1 y los encabezados del formato de carga en la fila 2. La ruta `app/admin/transactions/export/route.ts` acepta `formato=control`: en ese caso consulta líneas de pedidos no cancelados del periodo (`desde`/`hasta`). La deuda del pedido se reparte desde la última línea hacia la primera y ABONO es la diferencia con la VENTA. En pedidos sin descuento ni delivery, que son todos los importados, esto equivale a repartir lo abonado en orden (FR-040). Con descuento o delivery, que el formato del Excel no puede expresar, mantiene la suma de DEUDA igual al saldo. Las fechas se escriben como serial de Excel con formato de fecha.

**Razonamiento**: Se reutiliza el escritor y la autorización de la ruta existente, sin rutas ni dependencias nuevas. El archivo resultante lo lee el mismo lector de la Decisión 1, y una recarga marca todas las notas como "Ya registrada".

## Decisión 15: Página de carga dentro del módulo de ventas

**Decisión**: La ruta nueva `/admin/transactions/import` tiene un componente cliente `components/admin/ventas/salesImport.tsx` con tres pasos: elegir el archivo, revisar la vista previa y la conciliación, y confirmar. Se llega desde un botón "Cargar Excel" en la cabecera de "Ventas y pedidos". El resultado se notifica con sonner.

**Razonamiento**: La vista previa de cientos de líneas no cabe en una modal. Una ruta hija del módulo de ventas, protegida por `app/admin/layout.tsx`, no crea una superficie nueva (Principio III): sigue siendo el Panel administrativo.

## Decisión 16: Pruebas

- **Unitarias (`tests/admin`)**:
  - `xlsx-reader.test.ts`, con un libro sintético que genera el helper de prueba `tests/admin/xlsx-fixture.ts`. El helper arma un ZIP con deflate (`zlib.deflateRawSync`), `sharedStrings` con texto enriquecido, celdas `str`/`inlineStr`/booleanas, fórmulas con valor guardado y la misma estructura que el archivo real con nombres ficticios: título, encabezados con saltos de línea, fila final solo con fórmulas y una segunda hoja vacía. También se prueba con un archivo generado por `buildSalesControlWorkbook`. Se genera en código y no se guarda un binario, para que la fixture sea reproducible y revisable.
  - `sales-import-core.test.ts`: encabezados, normalización, agrupación, validaciones, cobro, coincidencias y sugerencias, y ya registrada frente a conflicto.
  - `inventory.test.ts`, `abonos.test.ts`, y ampliaciones de `sales-calculations.test.ts` y `sales-export.test.ts`.
- **Integración** (`RUN_ADMIN_INTEGRATION=1`, base aislada):
  - `sales-import.integration.test.ts`: crea pedidos sin tocar inventario, es idempotente, revierte todo ante un conflicto, avanza la secuencia y guarda equivalencias.
  - `abonos.integration.test.ts`: abono parcial, abono que salda, sobrepago rechazado y anulación.
  - Ampliación de `order-status.integration.test.ts`: cancelar un pedido importado no devuelve inventario y cancelar una venta con 16,5 devuelve 16,5.
- **Checkout** (`tests/checkout`): el pedido web guarda `tipoPrecio` según el contexto y el stock fraccionario se respeta.
- El archivo real de la clienta **no se compromete** en el repositorio, porque contiene datos personales de sus clientes. Se usa solo en la validación manual del quickstart.
