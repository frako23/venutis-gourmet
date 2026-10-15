# Guía de validación: Checkout directo desde Venta Rápida

## Precondiciones

1. Trabajar en una copia de desarrollo aislada; no ejecutar fixtures, migraciones de
   prueba ni compras contra el `DATABASE_URL` productivo.
2. Tener PostgreSQL local disponible y la variable de entorno de desarrollo apuntando
   a esa base.
3. Tener al menos dos productos con inventario positivo, un cliente detal y una zona
   de delivery configurada.
4. Aplicar la migración de la feature y regenerar el cliente de datos.

## Preparar y comprobar el proyecto

Desde la raíz del repositorio:

```powershell
npm.cmd install
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run test:admin
npx.cmd tsc --noEmit
npm.cmd run lint
```

Los comandos de base de datos deben apuntar únicamente a la instancia aislada. Si el
servidor remoto no responde, se detiene la validación funcional y se documenta la
limitación; no se cambia el código para ocultar el fallo de conectividad.

## Validación automatizada esperada

- Las pruebas de reglas de checkout cubren cálculo de subtotal, delivery, total,
  métodos de pago, estado inicial e idempotencia.
- Las pruebas de integración aislada cubren una venta confirmada, el descuento exacto
  de inventario, snapshot de dirección, pago declarado e historial inicial.
- Las pruebas de rechazo cubren carrito vacío, precio cambiado, stock insuficiente,
  zona inválida, dirección de otro cliente, referencia faltante y reintento duplicado.
- La suite administrativa existente continúa pasando, especialmente estados de pedido
  y confirmación de pago.

## Validación manual móvil

Iniciar el entorno con `npm.cmd run dev` y abrir `/venta-rapida` en un navegador con
ancho móvil.

### Escenario A: WhatsApp sin persistencia

1. Agregar dos productos y cambiar cantidades.
2. Abrir el resumen y elegir enviar por WhatsApp.
3. Comprobar que el mensaje contiene productos, cantidades, precios, tasa y total.
4. Comprobar en la base aislada que no apareció una venta, pago ni descuento de stock.

### Escenario B: cliente existente, retiro y pago digital

1. Crear o elegir un carrito válido y seleccionar proceso directo.
2. Introducir el teléfono de un cliente existente.
3. Verificar que nombre, apellido y correo se reutilizan sin crear otro cliente.
4. Elegir retiro, seleccionar un método digital y verificar sus datos, instrucciones,
   fecha, montos, referencia y tasa.
5. Confirmar y verificar el número de orden, estado `en_pedido`, detalle de venta,
   pago declarado y descuento de inventario.
6. Abrir la venta desde el panel interno y comprobar que todos los datos coinciden.

### Escenario C: cliente nuevo, delivery y efectivo

1. Usar un teléfono no registrado y completar nombre, apellido y correo opcional.
2. Elegir delivery, registrar una dirección en una zona válida y comprobar el cargo.
3. Elegir efectivo USD y verificar que el total incluye delivery y que no se exige
   referencia.
4. Confirmar y comprobar que la venta conserva zona, alias, dirección histórica,
   cargo, total y estado `por_cobrar`.
5. Editar la dirección del cliente y comprobar que la venta anterior conserva su
   snapshot.

### Escenario D: protección de errores y reintentos

1. Cambiar el inventario o precio en la base aislada después de cargar el carrito.
2. Intentar confirmar y comprobar que se muestra un error comprensible, no se crea
   una venta parcial y el carrito sigue disponible.
3. Pulsar confirmar repetidamente o repetir la misma solicitud con la misma clave.
4. Comprobar que solo existe una venta, un pago y un descuento de inventario.

## Evidencia a conservar

- Salida de `git diff --check` y de los comandos de calidad.
- Resultado de pruebas automatizadas con conteos por suite.
- Número de orden de cada escenario exitoso en la base aislada.
- Capturas o registro manual de la experiencia a ancho móvil, sin incluir secretos ni
  datos reales de clientes.

## Evidencia de esta implementación

Ejecutado el 15-10-2026 desde la raíz del proyecto, sin tocar `.env` ni ejecutar
compras o migraciones contra la base configurada:

- `npx.cmd prisma validate`: PASS.
- `npm.cmd run test:checkout`: 14 PASS, 3 SKIP. Los tres casos omitidos son de
  integración porque no existe `RUN_CHECKOUT_INTEGRATION=1` con una URL de base
  aislada en esta sesión.
- `npm.cmd run test:admin`: 31 PASS, 7 SKIP por la misma condición de base aislada.
- `npx.cmd tsc --noEmit`: PASS.
- `npm.cmd run lint`: PASS con advertencias preexistentes de componentes no usados.
- `npm.cmd run build`: PASS al reintentarlo con acceso de red para descargar las
  fuentes configuradas por `next/font`; una ejecución sin red falló únicamente por
  esa descarga externa.
- `git diff --check`: pendiente de ejecutar en la revisión final.

`npx.cmd prisma generate` había sido ejecutado correctamente después de actualizar el
esquema y el cliente generado contiene `montoDelivery` y `claveIdempotencia`. Un
reintento posterior encontró `EPERM` al reemplazar el DLL del engine de Prisma,
bloqueado por otro proceso de Windows; no se eliminó `node_modules` ni se forzó una
operación destructiva.

La migración `20261015000000_checkout_venta_rapida` queda lista para aplicarse con
`prisma migrate deploy` únicamente cuando `DATABASE_URL` apunte a una base aislada de
desarrollo. Los escenarios manuales A-D y la comprobación visual a 360 px quedan
pendientes porque no se ejecutó un navegador ni se configuró esa base en esta sesión.
