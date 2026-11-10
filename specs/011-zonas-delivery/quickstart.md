# Quickstart: validar las zonas de delivery

**Feature**: `011-zonas-delivery`

Guía para comprobar de punta a punta que la función cumple la [spec](./spec.md). El modelo está en [data-model.md](./data-model.md) y las acciones, reglas e interfaz en [contracts/delivery-zones.md](./contracts/delivery-zones.md).

## Requisitos previos

- Una base de desarrollo **aislada** (nunca la de producción) en `DATABASE_URL`, con al menos:
  - un cliente con una dirección en "Chuao";
  - otro cliente con una dirección cuya `urbanizacion` sea "Chacaíto". Va con acento, distinta de la zona "Chacaito", y se crea a mano para probar la clave.
- `npm install` hecho. En desarrollo, `requireAdmin()` deja pasar sin sesión.

## 1. Zonas iniciales (FR-003, SC-004)

1. Aplica la migración y regenera el cliente:

   ```powershell
   npx prisma migrate dev
   npx prisma generate
   ```

2. Revisa el resultado:

   ```sql
   SELECT "costoUsd", COUNT(*) FROM "ZonaDelivery" GROUP BY "costoUsd" ORDER BY 1;
   SELECT COUNT(*) FROM "ZonaDelivery" WHERE NOT "activa";
   ```

   **Esperado**: 64 a 3, 16 a 4, 6 a 5 y 4 a 6 (90 en total), y 0 inactivas.
3. Comprueba que el código ya no usa la lista fija: `rg DELIVERY_ZONES` no devuelve resultados.

## 2. Ver y editar en el panel (Historia 1)

Con `npm.cmd run dev`, abre `/admin/delivery` desde la entrada "Delivery" del menú.

1. **Tabla**: muestra 90 zonas ordenadas por costo y luego por nombre, con "90 zonas · 90 activas". "Ávila" o "Altamira" quedan antes que "Baruta" dentro de su grupo.
2. **Cambiar un costo**: cambia Chuao a `3.5` y pulsa Enter.
   - **Esperado**: aviso "Costo de «Chuao» actualizado a $3.50.", la fila pasa detrás de las de $3 y conserva el valor al recargar.
3. **Escape**: escribe `9` en el costo de Altamira y pulsa Escape. **Esperado**: vuelve a 3 sin aviso ni guardado.
4. **Valores inválidos**: prueba costo `0`, `-1`, `3.555` y vacío, y nombre vacío.
   - **Esperado**: aviso de error con el motivo, el campo marcado en rojo con el borrador visible y nada guardado (recarga para confirmarlo).
5. **Nombre duplicado**: renombra Altamira a `altamíra ` (otra grafía de su propio nombre).
   - **Esperado**: se guarda como "altamíra", porque es la misma zona.
   - Después renombra "Chacao" a `Chacaíto`. **Esperado**: "Ya existe una zona llamada «Chacaito»." Devuelve Altamira a su nombre original.
6. **Teléfono** (DevTools a ~390 px): la tabla se desplaza en horizontal y cualquier fila se puede editar sin que se corte.

## 3. Agregar zonas (Historia 2)

1. Pulsa "Agregar zona". **Esperado**: fila nueva al principio, con el cursor en el nombre.
2. Escribe `Santa Sofía` y `4`, y pulsa Enter.
   - **Esperado**: aviso "Zona «Santa Sofía» agregada a $4.00.", la zona aparece entre las de $4 y el conteo sube a 91.
3. Agrega `santa sofia` a 5. **Esperado**: rechazo por duplicado y la fila sigue editable. Pulsa Escape: la fila desaparece sin crear nada.
4. Pulsa "Agregar zona" otra vez, escribe solo el nombre y sal del campo. **Esperado**: no se crea nada hasta pulsar Enter o "Guardar".

## 4. Una sola lista en toda la tienda (Historia 3, SC-003)

1. **Checkout** (`/productos/consumidores` → carrito → `/finalizar-compra`), con el cliente de Chuao:
   - la dirección muestra delivery $3,50 y el total lo suma;
   - "Agregar otra" → el buscador de sector encuentra "Santa Sofía" escribiendo `sofia` y agrupa en "Zona delivery $3.50" y "Zona delivery $4.00".
2. **Confirmar** un pedido con delivery a Chuao:

   ```sql
   SELECT "zonaEntrega", "montoDelivery" FROM "Transaccion" ORDER BY id DESC LIMIT 1;
   ```

   **Esperado**: `Chuao` y `3.5`.
3. **Pedidos anteriores**: vuelve a poner Chuao a 3. El pedido del paso 2 sigue con `3.5`.
4. **Clave y renombre con direcciones**:
   1. Antes de renombrar, el checkout del cliente con "Chacaíto" ya muestra el costo de la zona "Chacaito" ($3).
   2. Renombra la zona "Chacaito" a `Chacaito Centro`.
   - **Esperado**: aviso con "Se actualizaron 1 direcciones" (o más). La dirección ahora dice "Chacaito Centro" en la ficha del cliente y en su checkout, con su costo.
5. **Desactivar**: desactiva Chuao.
   - **Esperado**: la fila queda atenuada como "Inactiva" y Chuao desaparece del buscador del checkout, de `/venta-rapida` y de `/cotizacion-rapida`.
   - En el checkout del cliente de Chuao, su dirección dice "Sin delivery en este sector" y "Continuar" no se habilita.
   - Forzar la confirmación (por ejemplo, con el checkout abierto desde antes) responde "Tu sector ya no tiene delivery. Elige otro sector o retira en tienda." y no crea el pedido.
6. **Reactivar** Chuao. **Esperado**: vuelve a ofrecerse con su nombre y su costo.
7. **Costo cambiado a mitad del checkout**: abre el pago del cliente de Chuao, cambia en otra pestaña el costo de Chuao a 4 y confirma.
   - **Esperado**: "El pago no coincide con el total final." y ningún pedido creado. Al recargar, el total muestra $4.

## 5. Delivery en la venta rápida (Historia 4, SC-005, SC-006)

En `/venta-rapida` (teléfono o ~390 px), agrega productos por $10 y abre el resumen.

1. **Sin delivery**: "Agregar delivery" está apagado. "Enviar Orden por WhatsApp" abre un mensaje idéntico al de antes, con `*NO INCLUYE DELIVERY*`.
2. **Encender el delivery**: aparecen el buscador y las zonas agrupadas por costo.
   - Escribe `hipico`. **Esperado**: solo "Club Hípico" y "Terrazas del Club Hípico".
   - Escribe `zzz`. **Esperado**: "No hay zonas con ese nombre."
3. **Elegir "Club Hípico"**:
   - la lista y el buscador desaparecen; queda "Club Hípico · $3.00" con "Cambiar" y se despliega el formulario;
   - el resumen muestra Productos $10.00, Delivery $3.00 y Total $13.00 con su equivalente en Bs.
4. **Validación**: con el formulario vacío, pulsa "Enviar Orden por WhatsApp". **Esperado**: aviso "Escribe el nombre de quien recibe." y no se abre WhatsApp.
   - Teléfono `414123456`: aviso de 10 a 15 dígitos.
5. **Cambiar de zona**: escribe nombre, teléfono y dirección, pulsa "Cambiar" y elige otra zona. **Esperado**: el formulario conserva lo escrito.
6. **Persistencia**: cierra el resumen y ábrelo de nuevo: la zona y los datos siguen ahí. Pulsa "Vaciar": el delivery se reinicia.
7. **Enviar** con todo completo. **Esperado**: el mensaje incluye el bloque "*Delivery*" (zona, costo, quien recibe, teléfono, dirección), Productos, Delivery y Total, y no dice "NO INCLUYE DELIVERY".
8. **Apagar el interruptor**: el total vuelve a $10 y el mensaje vuelve al formato sin delivery.
9. **Procesar pedido en la app**: lleva al checkout como antes, sin arrastrar la zona elegida.
10. **Sin zonas activas** (desactívalas en una base de prueba o simula un error de lectura): el interruptor aparece deshabilitado con el aviso, y el envío sin delivery funciona.

## 6. Cotización rápida

En `/cotizacion-rapida`, el selector "Delivery (opcional)" muestra las zonas activas agrupadas por costo (incluida "Santa Sofía"; no Chuao mientras esté inactiva), y la cotización suma el costo de la zona.

## 7. Seguridad (FR-008)

En producción o con `NODE_ENV=production` y un correo fuera de `ALLOWED_EMAILS`:

- `/admin/delivery` redirige a `/unauthorized`;
- invocar `crearZonaDelivery` o `actualizarZonaDelivery` también redirige y no escribe nada.

## 8. Pruebas automáticas y verificación

```powershell
npm.cmd run test:checkout
npm.cmd run test:admin
npm.cmd run lint
npm.cmd run build
```

Las pruebas de integración del checkout (zona de la base, zona inactiva y la prueba existente con "Altamira") necesitan una base migrada y aislada:

```powershell
$env:RUN_CHECKOUT_INTEGRATION = "1"; $env:CHECKOUT_TEST_DATABASE_URL = "<url aislada>"; npm.cmd run test:checkout
```

**Esperado**: todo en verde. Las pruebas de integración se omiten (no fallan) sin esas variables.
