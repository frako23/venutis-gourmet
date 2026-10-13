# Quickstart de validación: Panel administrativo integral

## Prerrequisitos

- Node.js compatible con la versión actual del proyecto y `npm`.
- PostgreSQL local aislado para desarrollo, con una base exclusiva para Venuti's
  Gourmet. No usar la base remota ni datos de producción para esta validación.
- Variables de entorno locales existentes (`DATABASE_URL`, Stack Auth y las demás
  necesarias), conservadas fuera de Git y sin imprimir sus valores.
- Usuario administrativo autorizado por la configuración actual.

## Preparación local

Desde la raíz del repositorio:

```powershell
npm.cmd install
npx.cmd prisma validate
npx.cmd prisma migrate dev
npx.cmd prisma generate
```

La migración debe ejecutarse únicamente contra la base local aislada. Antes de
aplicarla, comprobar que `DATABASE_URL` apunta al destino de desarrollo correcto. La
implementación debe dejar disponible una fixture local con productos, inventario,
clientes detal/mayorista y transacciones en estados activos, históricos y cancelados.

## Validaciones automatizadas

Ejecutar después de aplicar la migración y regenerar Prisma:

```powershell
npm.cmd run test:admin
npx.cmd tsc --noEmit
npm.cmd run lint
npx.cmd prisma validate
npm.cmd run build
```

Se espera que:

- Los tests de dominio cubran redondeo, descuentos porcentuales y USD, conversión,
  total cero/no negativo, estados, predictor sin historial y validación de notas.
- TypeScript, lint y compilación terminen sin errores introducidos por la feature.
- Prisma valide el esquema y la migración pueda reproducirse en la base local.

## Validaciones funcionales

### 1. Acceso y navegación

1. Abrir `/admin-login` con un usuario no autorizado y comprobar que no entra al panel.
2. Abrir el panel con un usuario autorizado.
3. Comprobar que `/admin` muestra dashboard, navegación en español y accesos a
   inventario, ventas/pedidos, analíticas y notas de entrega.
4. Repetir la navegación en una ventana de 360 píxeles de ancho; no debe aparecer
   desplazamiento horizontal para las acciones principales.

### 2. Venta manual y descuento

1. Abrir `/admin/add-transaction` y crear una venta con dos productos, cantidades y
   estado inicial “Por cobrar”.
2. Comprobar que el subtotal, el total y el inventario se actualizan juntos.
3. Repetir con descuento de 10% y comprobar que el importe descontado equivale al
   subtotal multiplicado por 0,10.
4. Repetir con descuento de 5 USD y una tasa de cambio conocida; comprobar el total
   USD y su presentación en Bs.
5. Intentar guardar un descuento negativo, superior al subtotal y no numérico. Cada
   intento debe mostrar validación y no crear una venta parcial.
6. Simular stock insuficiente antes de confirmar y comprobar que no se persiste la
   transacción ni se decrementa parcialmente el inventario.

### 3. Hoja de ventas y estados

1. Abrir `/admin/transactions` y verificar una fila por venta con filtros por fecha,
   cliente, orden y estado.
2. Abrir el detalle de una operación y cambiarla entre “Por cobrar”, “En pedido” y
   “Pagado”.
3. Comprobar que cada cambio se refleja en la lista, el detalle y el historial con
   fecha y administrador responsable.
4. Confirmar que los registros históricos `pendiente` y `cancelado` siguen visibles y
   que `cancelado` no se ofrece como estado activo nuevo.

### 4. Analíticas y predictor

1. Abrir `/admin/analytics` y seleccionar una semana con datos conocidos.
2. Comparar total, cantidad de operaciones y desglose por producto contra las ventas
   no canceladas de la fixture.
3. Cambiar a un mes y repetir la comparación.
4. Solicitar el predictor semanal y mensual; comprobar que muestra el periodo
   histórico usado y la media móvil definida en `research.md`.
5. Seleccionar un periodo sin historial suficiente y comprobar que aparece “Datos
   insuficientes”, sin una cifra inventada.

### 5. Nota de entrega y PDF

1. Abrir `/admin/delivery-notes/new` y seleccionar un cliente mayorista.
2. Agregar productos, cantidades, fecha, dirección, persona que recibe y observaciones.
3. Intentar seleccionar un cliente detal; la acción debe bloquearse antes de guardar.
4. Guardar la nota, verificar su número en `/admin/delivery-notes` y abrir el detalle.
5. Descargar `/admin/delivery-notes/[id]/pdf` y comprobar marca, número, fecha,
   cliente, líneas, cantidades, totales disponibles, observaciones y espacio de
   recepción.
6. Confirmar que crear o descargar la nota no cambia inventario ni estado de pago.
7. Repetir con suficientes líneas para forzar una segunda página y comprobar que el
   encabezado, filas y totales siguen legibles.

### 6. Regresión de superficies separadas

Comprobar que el catálogo público, `/finalizar-compra`, `/confirmacion` y
`/venta-rapida` conservan sus rutas, permisos y comportamiento. La vista rápida debe
seguir preparando el pedido para WhatsApp sin crear una `Transaccion` ni descontar
inventario como consecuencia de esta feature.

## Evidencia esperada

- Salida de comandos de validación sin errores.
- Capturas o registro de cada flujo funcional, sin datos personales reales.
- Conteo de registros antes y después de la migración en la base local.
- Un PDF de prueba guardado fuera del repositorio o en una carpeta temporal ignorada.
- Confirmación de que `git status` no incluye `.env`, secretos, dumps ni artefactos
  generados.
