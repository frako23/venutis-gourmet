# Quickstart: Validar cancelación de pedidos y cambio de estado desde la tabla

**Feature**: `007-cancelacion-pedidos`

Esta guía valida el comportamiento visible y las reglas de estado e inventario. No describe el código interno; los detalles están en [data-model.md](./data-model.md) y [contracts/order-state.md](./contracts/order-state.md).

## Prerrequisitos

- Dependencias instaladas y cliente Prisma generado (no hay migraciones nuevas).
- Base de desarrollo con al menos:
  - un pedido en "Por cobrar" con dos líneas de productos distintos;
  - un pedido en "En pedido" con un pago parcial registrado;
  - un pedido en "Pagado";
  - un pedido histórico en `cancelado` o en `pendiente`, si existe.
- Anotar el inventario de los productos de esos pedidos antes de empezar, en `/admin/inventory` o con `npx prisma studio`.
- Para las pruebas de integración, una base **aislada**: `ADMIN_TEST_DATABASE_URL` y `RUN_ADMIN_INTEGRATION=1`. Nunca usar datos reales.

## Verificación automática

```powershell
npm.cmd run test:admin
$env:RUN_ADMIN_INTEGRATION = "1"; npm.cmd run test:admin
npm.cmd run lint
npm.cmd run build
```

**Esperado**:

- Las pruebas unitarias de `order-status.test.ts` cubren los estados siguientes por estado actual, qué estados pueden cancelarse, la normalización de la razón y la agrupación de cantidades a devolver.
- La prueba de integración muestra que una cancelación devuelve exactamente las cantidades, que una segunda cancelación falla sin volver a devolver inventario y que un pedido pagado no puede cancelarse.
- Si se omite alguna verificación (por ejemplo, la integración sin una base aislada), se declara en la entrega.

## Arranque

```powershell
npm.cmd run dev
```

Abrir `http://localhost:3000/admin/transactions`.

## Escenarios funcionales

### 1. Cambio inmediato desde la tabla (Historia 2, FR-012 a FR-014)

1. Sin abrir el editor masivo, cambiar el pedido "Por cobrar" a "En pedido" desde su fila.
2. Volver a "Por cobrar".

**Esperado**: se guarda sin modal, aparece una notificación de éxito, el control se bloquea mientras guarda y el detalle del pedido muestra ambos cambios en el historial, con responsable y fecha.

### 2. Confirmación de cobro (FR-015)

1. Elegir "Pagado" en el pedido "Por cobrar".
2. Pulsar "Volver" y comprobar que el estado no cambió.
3. Repetir, escribir una nota y pulsar "Marcar como pagado".

**Esperado**: el pedido queda "Pagado" y el historial muestra la nota.

### 3. Cancelación con razón y devolución de inventario (Historia 1, FR-002 a FR-007)

1. Elegir "Cancelado" en el pedido "Por cobrar" con dos líneas.
2. Verificar que la modal muestra la orden y el cliente, y que la razón es opcional y cuenta los caracteres.
3. Cerrar con Escape, luego con un clic fuera y luego con "Volver". En los tres casos el estado no cambia.
4. Abrir de nuevo, escribir una razón y pulsar "Confirmar cancelación".

**Esperado**: el estado queda "Cancelado" con el tono de peligro y sin control para cambiarlo. El historial muestra la razón. El inventario de cada producto aumentó exactamente en la cantidad de su línea.

### 4. Cancelación sin razón y con pagos registrados (FR-003, caso límite de pagos)

1. Cancelar el pedido "En pedido" que tiene un pago parcial, dejando la razón vacía o solo con espacios.

**Esperado**: la modal advierte que hay pagos registrados, la cancelación se aplica, el historial no muestra razón y el pago sigue visible en el detalle.

### 5. Pedidos pagados (FR-001)

1. Abrir el control de estado del pedido "Pagado".

**Esperado**: "Cancelado" no aparece entre las opciones. Para cancelarlo, primero se pasa a "Por cobrar".

### 6. Detalle del pedido (FR-002, FR-018)

1. Abrir `/admin/transactions/{id}` de un pedido activo y cambiar su estado desde "Seguimiento".

**Esperado**: es el mismo control que en la tabla, con notificaciones de éxito y de error.

### 7. Móvil (Historia 2, escenario 5)

1. Con un viewport estrecho (≈ 390 px), repetir los escenarios 1 y 3 desde las tarjetas.

**Esperado**: el control y la modal caben en pantalla y se pueden usar sin desplazamiento horizontal.

### 8. Concurrencia (FR-020, casos límite)

1. Abrir la tabla en dos pestañas.
2. Cancelar un pedido en la primera.
3. En la segunda, sin recargar, intentar pasarlo a "En pedido" o volver a cancelarlo.

**Esperado**: notificación de error ("El pedido ya está cancelado…" o "El pedido cambió mientras lo editabas…"), la fila se actualiza a "Cancelado" y el inventario no vuelve a aumentar.

### 9. Editor masivo (FR-011)

1. Abrir el editor masivo y comprobar que "Cancelado" no se ofrece para pedidos activos y que el aviso indica usar el control de la tabla.
2. Guardar una edición normal y confirmar que sigue funcionando.

### 10. Filtros y analíticas (Historia 3, FR-010, FR-021)

1. Filtrar por "Cancelado".
2. Con el filtro "Por cobrar" activo, pasar un pedido a "En pedido".
3. Comparar las ventas del panel principal y de las analíticas antes y después de cancelar un pedido del periodo.

**Esperado**: el filtro lista solo pedidos cancelados. En el paso 2, el pedido sale de la lista filtrada tras la notificación. En el paso 3, las ventas, los ingresos y las unidades bajan en lo que sumaba el pedido cancelado.
