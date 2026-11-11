# Quickstart: validar el programa de puntos

**Feature**: 014-programa-puntos | **Contratos**: [reglas y acciones](./contracts/reglas-y-acciones.md) · [interfaz](./contracts/ui.md) | **Datos**: [data-model.md](./data-model.md)

## Requisitos previos

- `.env` con `DATABASE_URL` de una base de **desarrollo** (nunca la de producción), tu correo en `ALLOWED_EMAILS` y Stack Auth configurado.
- `npm.cmd install`. No hay dependencias nuevas.
- Dos correos de prueba que puedas verificar, para las cuentas de cliente.

## 0. Migraciones

```powershell
npx prisma migrate dev
npx prisma generate
```

**Resultado esperado**: se aplican `programa_puntos` y `bono_bienvenida_inicial`, en ese orden.

Comprueba el bono inicial (FR-034) con Prisma Studio (`npx prisma studio`) o con SQL:

- cada consumidor que ya tenía cuenta `vinculada` tiene exactamente un movimiento `bono` de 25 puntos;
- ningún mayorista ni cliente sin cuenta lo tiene;
- los pedidos existentes tienen `montoDescuentoDelivery = 0` y su total no cambió.

## 1. Verificaciones automáticas

```powershell
npm.cmd run lint
npm.cmd run test:admin      # fidelidad, points-core, sales-calculations, order-edit, admin-clients
npm.cmd run test:checkout   # checkout con delivery gratis
npm.cmd run build
```

**Resultado esperado**: todo en verde. Los casos están numerados en [contracts/reglas-y-acciones.md](./contracts/reglas-y-acciones.md) (V, F, C, E, P, T e I). El `build` confirma además que `lib/fidelidad.ts` se puede importar desde el paso de pago.

## 2. Preparación manual

Arranca con `npm.cmd run dev`. En el panel:

- un producto "Salsa de prueba" a USD 7,00 al detal y otro a USD 12,00, ambos con existencia;
- una zona de delivery activa de USD 4;
- un consumidor **Ana** con cuenta web vinculada (regístrala en `/mi-cuenta` con el primer correo);
- un mayorista **Bodegón** sin cuenta.

Dale puntos a Ana desde su ficha con "Ajustar puntos" (+135, motivo "Prueba") para no depender de pedidos.

## 3. Historia 4: catálogo de premios con costos propuestos

En `/admin/clients/rewards` → "Nuevo premio":

1. Tipo "Producto gratis", elige "Salsa de prueba", cantidad 1 → el costo se rellena con **140** y la ayuda dice "Sugerido: 140 puntos…".
2. Cambia la cantidad a 2 → **280**. Vuelve a 1.
3. Escribe 150 en el costo y cambia de producto → el costo **sigue en 150**. Guarda con "Salsa de prueba".
4. "Nuevo premio", tipo "Delivery gratis" → propone **100** puntos y **15** de compra mínima. Nómbralo "Delivery gratis" y guarda.
5. La tabla muestra "Delivery gratis" con "El delivery del pedido" y "Compra mínima USD 15,00".
6. Edita "Salsa de prueba": los campos muestran 150; la ayuda sugiere 140 pero no cambia el valor.
7. Cambia el precio del producto en el inventario → el premio sigue costando 150 (FR-030).

## 4. Historia 1: sección "Puntos" del panel

1. La barra lateral tiene "Puntos"; abre `/admin/points`.
2. La fila de Ana muestra Ganados **25** (el bono), Canjeados **0**, Ajustes **+135**, Disponibles **160**, y coincide con su ficha.
3. Indicadores: "Puntos en circulación" es la suma de la columna Disponibles; "Ya pueden canjear" cuenta a Ana (160 ≥ 100).
4. Busca `ana`, luego parte de su teléfono → aparece. Busca `zzz` → "No hay clientes con puntos que coincidan con «zzz»."
5. Cambia "Ordenar por" a cada opción → la tabla se reordena y la URL conserva `q` y `orden`.
6. Pulsa el nombre → llegas a su ficha, donde está "Ajustar puntos".
7. "Bodegón" no aparece (no tiene movimientos).
8. Cierra sesión y abre `/admin/points` con una cuenta de cliente → acceso denegado (SC-010).

## 5. Historia 2: "Mis puntos"

Con la sesión de Ana en la tienda:

1. `/mi-cuenta`: la tarjeta "Puntos" muestra 160 y lleva a "Mis puntos". Ya no hay bloques de premios ni de movimientos de puntos en esta página.
2. `/mi-cuenta/puntos`: saldo **160**, igual que en el panel (SC-002).
3. "Delivery gratis" (100) y "Salsa de prueba" (150) dicen "¡Ya lo puedes canjear!" y tienen "Canjear".
4. Crea en el panel un premio de 240 puntos → en "Mis puntos" dice "Te faltan 80 puntos" y la barra de próximo premio lo nombra.
5. Deja "Salsa de prueba" sin existencia → su premio dice "Sin existencia por ahora", sin botón. Repón la existencia.
6. El historial muestra "Bono de bienvenida +25" y "Ajuste +135", **sin** el motivo "Prueba" ni tu correo (FR-012).
7. "Canjear" lleva al catálogo.
8. A 360 px de ancho no hay desplazamiento horizontal (SC-004).
9. Sin sesión, `/mi-cuenta/puntos` redirige a `/mi-cuenta` y muestra el acceso.

## 6. Historia 3: delivery gratis

### En la tienda

Con la sesión de Ana (160 puntos):

1. Carrito con **1 "Salsa de prueba" (USD 7)**, delivery a la zona de USD 4. En el paso de pago, "Delivery gratis" está deshabilitado: "Agrega USD 8,00 más en productos para usar Delivery gratis."
2. Sube el carrito a **USD 21** (3 salsas). Ahora se puede marcar: el total a pagar baja de USD 25 a **USD 21**.
3. Vuelve al paso de entrega y elige **retiro en tienda** → en el paso de pago el premio está deshabilitado: "Delivery gratis solo aplica a pedidos con delivery." Vuelve a delivery.
4. Marca "Delivery gratis", declara el pago de USD 21 y confirma.
5. Confirmación: Subtotal 21,00 · Delivery 4,00 · **Delivery gratis (premio) −4,00** · Total 21,00. "Premios canjeados: Delivery gratis".
6. "Mis puntos": saldo **60**; el historial tiene "Delivery gratis −100".
7. Panel, detalle del pedido: mismas líneas de totales. Márcalo como pagado → Ana gana **21** puntos (SC-005). Saldo 81.

### Cancelación

8. Repite los pasos 2 a 5 con un ajuste previo de +100 puntos y **cancela** el pedido desde el panel → Ana recupera los 100 puntos ("Devolución por cancelación…") (SC-006).

### En el panel

9. Haz un pedido de Ana en la tienda con delivery y **sin** canjear. En su detalle, canjea "Delivery gratis" → el total baja USD 4 y aparece la línea del premio.
10. En ese mismo pedido, "Delivery gratis" ya no se ofrece.
11. En un pedido con retiro en tienda, "Delivery gratis" no se ofrece.
12. Edita el pedido del paso 9 (cambia una cantidad) → el total nuevo es productos + delivery − delivery gratis; el resumen del formulario muestra "Delivery gratis (premio)".
13. En "Registrar venta manual", la lista de premios no incluye "Delivery gratis".

## 7. Historia 5: bono de bienvenida

1. Registra una cuenta nueva con el segundo correo y un teléfono que no exista → mensaje "¡Listo! Te regalamos 25 puntos de bienvenida."; "Mis puntos" muestra 25.
2. En el panel, desvincula esa cuenta desde la ficha y vuelve a entrar con el mismo correo (se vincula sola por correo) → sigue habiendo **un solo** movimiento "Bono de bienvenida" (SC-008).
3. Crea un consumidor en el panel con un teléfono, y registra una cuenta que indique ese teléfono → queda pendiente y **sin** bono. Confírmala desde la ficha → "Cuenta vinculada. Se acreditaron 25 puntos de bienvenida."
4. Cambia un cliente a mayorista antes de vincular su cuenta → no recibe bono.

## 8. Regresión rápida

- Un pedido de la tienda sin premios y otro con un premio de descuento se registran como antes.
- La edición de un pedido sin delivery gratis da el mismo total que antes.
- El editor de descuento del detalle de un pedido con delivery gratis conserva el delivery cubierto en el total.
- "Mi cuenta" sigue mostrando deuda, saldo a favor y pedidos.

## Si algo no coincide

- **El total de un pedido editado no descuenta el delivery gratis**: falta `descuentoDeliveryUsd` en una llamada a `recalcularTotalPedido` (contrato, §3).
- **La migración de datos falla con "unsafe use of new value"**: el `INSERT` quedó en la misma migración que el `ALTER TYPE` ([research.md](./research.md), Decisión 5).
- **El `build` falla al importar `lib/fidelidad.ts` en el navegador**: alguna importación dejó de ser solo de tipos; revisa la Decisión 8.
