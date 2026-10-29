# Quickstart: Validar el control de ventas desde Excel

**Feature**: `008-ventas-excel`

Esta guía valida el comportamiento visible y las reglas de dinero, inventario y estados. No describe el código interno; los detalles están en [data-model.md](./data-model.md) y en los contratos de [contracts/](./contracts/).

## Prerrequisitos

- Dependencias instaladas, migración aplicada y cliente generado:

  ```powershell
  npx prisma migrate dev
  npx prisma generate
  ```

- Base de desarrollo **aislada**, nunca la de producción, con al menos:
  - productos del catálogo equivalentes a los del archivo de agosto: raviolis (carne, espinaca, ajoporro, champiñones), tortelloni de espinaca, tortellini de carne, gnocchi de papas, mezzaluna de camarones, berenjena a la parmesana, pasticho y las salsas Napoli y Bologna;
  - un cliente con el mismo nombre que uno del archivo (por ejemplo, "Deli de la Nonna"), para probar la coincidencia exacta;
  - un pedido existente de la tienda en "Por cobrar" y otro en "Pagado".
- El archivo real de la clienta (`Ventas PASTAS para la Web.xlsx`) solo se usa en esta validación manual; **no se copia al repositorio**. Las pruebas automáticas usan el libro sintético que genera `tests/admin/xlsx-fixture.ts`.
- Anotar el inventario de los productos anteriores antes de empezar (`/admin/inventory`).
- Para las pruebas de integración: `ADMIN_TEST_DATABASE_URL` apuntando a una base aislada y `RUN_ADMIN_INTEGRATION=1`.

## Verificación automática

```powershell
npm.cmd run test:admin
npm.cmd run test:checkout
$env:RUN_ADMIN_INTEGRATION = "1"; npm.cmd run test:admin
npm.cmd run lint
npm.cmd run build
```

**Esperado**:

- **Lector de Excel**: lee la hoja "VENTAS" del libro sintético (título, encabezados con saltos de línea, fórmulas con valor guardado y fila final vacía) y un archivo generado por la exportación.
- **Núcleo de la carga**:
  - agrupa por nota;
  - detecta notas con fecha o cliente distintos;
  - calcula lo cobrado según ABONO o PAGADO;
  - distingue "Ya registrada" de "Conflicto";
  - sugiere "RAVIOLI DE RICOTTA Y ESPINACA" para RAVIOLI + ESPINACA y acepta GNOCCHI + PAPAS como coincidencia exacta.
- **Inventario**: `isValidQuantity(16.5)` es verdadero y `isValidQuantity(1.005)` es falso; `ajustarInventario` no deja restos binarios (`3.3 − 3 = 0.3`).
- **Abonos**: un abono parcial deja saldo, uno que salda pasa el pedido a "Pagado", uno mayor que el saldo se rechaza y una anulación recalcula el saldo.
- **Integración**:
  - la carga crea los pedidos sin tocar el inventario;
  - una segunda carga crea 0;
  - un conflicto revierte todo;
  - un número ≥ 1300 avanza el correlativo;
  - cancelar un pedido importado no devuelve inventario y cancelar una venta manual de 16,5 devuelve 16,5.
- **Checkout**: el pedido web guarda `tipoPrecio` (`detal` o `mayor`) según el contexto.
- Toda verificación omitida (por ejemplo, la integración sin base aislada) se declara en la entrega.

## Arranque

```powershell
npm.cmd run dev
```

Abrir `http://localhost:3000/admin/transactions`.

## Escenarios funcionales

### 1. Carga del archivo de agosto (Historia 1, SC-001, SC-002)

1. En "Ventas y pedidos", pulsar "Cargar Excel" y elegir `Ventas PASTAS para la Web.xlsx`.
2. Revisar el resumen de la vista previa.
3. Conciliar los productos: confirmar las sugerencias y elegir manualmente los que queden pendientes (por ejemplo, PARMEGGIANA BERENJENA → "BERENJENA A LA PARMESSANA" y TOMATE NAPOLI → "SALSA NAPOLI").
4. Conciliar los clientes: el que ya existe aparece reconocido; para el resto, elegir "Crear", con el tipo propuesto.
5. Confirmar.

**Esperado**:

- **Antes de confirmar**: el resumen muestra 27 notas nuevas, 54 líneas, USD 2.901,05 en total y USD 33,00 por cobrar. Aparece la advertencia de la nota 1203 si su VENTA no coincide; no hay errores. La nota 1212 muestra dos líneas de Tortelloni con precios 8,00 y 7,50.
- **Después de confirmar**:
  - la notificación dice "Se crearon 27 pedidos por USD 2901.05";
  - la tabla tiene los pedidos 1200 a 1227 (sin 1219);
  - 26 están en "Pagado" y el 1225 en "Por cobrar", con saldo USD 33,00;
  - el inventario anotado **no cambió**.
- El detalle del pedido 1203 muestra la cantidad 16,5, el tipo "Mayor" y un abono de USD 132,00 con método "No especificado". Su historial dice "Importado desde Excel: Ventas PASTAS para la Web.xlsx".
- Las analíticas de agosto incluyen esos USD 2.901,05 y el desglose por tipo muestra Detal, Mayor y Promo.

### 2. Recarga e idempotencia (SC-003, SC-005)

1. Volver a cargar el mismo archivo.

**Esperado**: las 27 notas aparecen como "Ya registrada", no queda nada por conciliar y confirmar responde "Todas las notas del archivo ya estaban registradas.". Las equivalencias elegidas en el escenario 1 aparecen ya resueltas.

### 3. Errores y conflictos (FR-007, FR-019, SC-004)

1. Copiar el archivo y, en la copia:
   - escribir "abc" en una cantidad;
   - poner "TIPO = OFERTA" en otra fila;
   - cambiar el cliente de una sola línea de la nota 1209;
   - cambiar el cliente de la nota 1200 (ya registrada).
2. Cargarla.

**Esperado**: cada error aparece con su fila, columna y motivo; la nota 1209 queda "con error"; la 1200 queda como **conflicto** y muestra el pedido existente. "Confirmar carga" está deshabilitado. No se crea nada.

### 4. Tipo de precio y decimales en la venta manual (Historia 2, FR-017, FR-025)

1. En `/admin/add-transaction`, elegir un cliente mayorista.
2. Agregar tres líneas:
   - un producto con el tipo propuesto "Mayor", cuyo precio es el mayorista;
   - otro con el tipo cambiado a "Detal", cuyo precio pasa al detal;
   - un pasticho con el tipo "Promo": el precio queda vacío y no se puede guardar hasta escribirlo (7,00).
3. Poner la cantidad 16,5 en la primera línea y guardar.

**Esperado**: el detalle muestra el tipo, el precio y el importe de cada línea; el inventario del primer producto baja exactamente 16,5. Al cancelar el pedido desde la tabla, sube exactamente 16,5.

### 5. Tienda con stock fraccionario (Decisión 9)

1. Con un producto en 12,5 de inventario, abrir su ficha en `/productos/consumidores`.

**Esperado**: muestra 12 unidades disponibles y no deja agregar 13 al carrito. Al comprar, el pedido web queda con el tipo "Detal" (contexto consumidor) o "Mayor" (contexto mayorista).

### 6. Abonos y cuentas por cobrar (Historia 3, SC-006, SC-007)

1. Abrir el pedido 1225 (saldo USD 33,00) y registrar un abono de USD 20,00 por Zelle.
2. En la tabla, filtrar "Con saldo pendiente".
3. Volver al pedido y registrar un abono de USD 20,00.
4. Registrar un abono de USD 13,00.
5. En otro pedido "Por cobrar", registrar un abono en Bs con la tasa del día y luego anularlo.

**Esperado**:

- **Paso 1**: el saldo queda en USD 13,00 y el pedido sigue en "Por cobrar".
- **Paso 2**: el resumen de cuentas por cobrar muestra a ese cliente con USD 13,00 de deuda, un pedido y la fecha 27/08/2026. La fila muestra lo abonado y el saldo.
- **Paso 3**: se rechaza con "…no superar el saldo pendiente (USD 13.00)".
- **Paso 4**: el pedido pasa a "Pagado", el historial dice "Saldado con abonos" y el cliente desaparece del resumen.
- **Paso 5**: se guarda el equivalente en USD; al anularlo, el abono queda tachado como "Anulado", el saldo vuelve a su valor anterior y el historial registra la anulación. En un pedido "Pagado" no se ofrece "Anular".
- Un pedido web "Por cobrar" (efectivo al entregar) muestra su saldo igual al total, aunque tenga un pago declarado.

### 7. Descarga del control de ventas (Historia 4, SC-009)

1. Filtrar la tabla del 01/08/2026 al 31/08/2026 y pulsar "Descargar control de ventas".
2. Abrir el archivo en Excel.
3. Volver a cargarlo en "Cargar Excel".

**Esperado**: el archivo tiene el título y las columnas del formato de la dueña, y fechas que Excel reconoce como fechas. Contiene 49 líneas de 25 notas: las notas 1200 y 1201 son de julio y quedan fuera del rango. La suma de VENTA es USD 2.734,55, igual al total del panel para agosto, y la de DEUDA es USD 0,00 si ya se saldó el 1225 en el escenario 6 (USD 33,00 si no). Al cargarlo, todas las notas aparecen como "Ya registrada".

### 8. Seguridad (FR-001)

1. Cerrar sesión, o usar un correo fuera de `ALLOWED_EMAILS`, y abrir `/admin/transactions/import` y `/admin/transactions/export?formato=control`.

**Esperado**: se redirige al inicio de sesión o se niega el acceso. Las acciones de carga y abonos responden sin ejecutar nada.

### 9. Móvil

Repetir los escenarios 1 (vista previa) y 6 (abonos) en un viewport estrecho (≤ 390 px).

**Esperado**: las notas y los abonos se muestran como tarjetas legibles y los controles se pueden usar sin desplazamiento horizontal de la página.
