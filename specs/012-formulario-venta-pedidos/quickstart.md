# Quickstart: validar el formulario de venta, la edición y la eliminación de pedidos

**Feature**: 012-formulario-venta-pedidos | **Contratos**: [server-actions](./contracts/server-actions.md) · [ui](./contracts/ui.md)

## Requisitos previos

- `.env` con `DATABASE_URL` de una base de **desarrollo** y tu correo en `ALLOWED_EMAILS`.
- `npm.cmd install`. No hay migraciones nuevas.
- Para la integración: `ADMIN_TEST_DATABASE_URL` apuntando a una base **aislada** y `RUN_ADMIN_INTEGRATION=1`.

## 1. Verificaciones automáticas

```powershell
npm.cmd run lint
npm.cmd run test:admin          # reglas puras: order-edit-rules, client-rules, fechas, sales-calculations
$env:RUN_ADMIN_INTEGRATION = "1"; npm.cmd run test:admin   # además, order-edit.integration
npm.cmd run build
```

**Resultado esperado**: todo en verde. Las integraciones se omiten (`skip`) sin la variable.

## 2. Validación manual

Arranca con `npm.cmd run dev`, entra al panel e inicia sesión con un correo autorizado. Prepara estos datos en la base de desarrollo:

- un producto A con existencia 10;
- un cliente consumidor "María Pérez" y otro "Marcos Díaz".

### Historia 1: buscar al cliente

1. Abre `/admin/add-transaction` y escribe `maria` en el buscador. Debe aparecer "María Pérez" con su teléfono.
2. Escribe `mar pe`. Debe aparecer solo "María Pérez".
3. Usa ↓ y Enter. María queda seleccionada y las líneas usan el precio detal.
4. Pulsa "Cambiar". El buscador queda vacío y con el foco.

### Historia 2: registrar un cliente nuevo

1. Carga 2 unidades de A y escribe `Lucía Rojas` en el buscador. Debe decir "No hay clientes…".
2. Pulsa "Registrar «Lucía Rojas» como cliente nuevo". El nombre (Lucía) y el apellido (Rojas) vienen precargados.
3. Usa un teléfono que ya exista. Debe aparecer el error en el campo de teléfono y no se crea nada.
4. Cambia el teléfono y guarda. Aparece el aviso de éxito, Lucía queda seleccionada y las 2 unidades de A siguen en la venta.
5. Abre de nuevo el alta y ciérrala sin guardar. La venta sigue intacta.

### Fechas en hora de Caracas (FR-010, SC-008)

1. La fecha propuesta debe coincidir con la hora actual de Caracas, no con la UTC. Si estás en otra zona, compárala con `Get-Date` convertida a UTC−4.
2. Escribe `2026-11-10T21:30` y confirma la venta. En la tabla y en el detalle el pedido aparece el 10/11/2026 a las 21:30, no el 11/11.

### Historia 3: editar un pedido

1. Registra un pedido de María por 3 unidades de A, en "Por cobrar". Anota la existencia de A (7).
2. En `/admin/transactions`, pulsa "Editar" en esa fila. El formulario muestra el título "Editar pedido …" y los mismos datos, incluida la fecha y hora exactas.
3. Cambia la cantidad a 5 y guarda. Debe aparecer el aviso, se abre el detalle con el total de 5 unidades, la existencia de A queda en 5 y el historial muestra "Evento · Por cobrar" con "Pedido editado: … 3 → 5".
4. Vuelve a editar y pide 50 unidades. Debe aparecer un error que nombra A, y el pedido y la existencia no cambian.
5. Abre la edición en dos pestañas. Guarda en la primera y luego en la segunda. La segunda debe responder "El pedido cambió mientras lo editabas…".
6. Pasa el pedido a "Pagado" (con la confirmación de cobro) y edítalo subiendo a 6 unidades. "Guardar cambios" queda desactivado hasta marcar "Confirmo que cobré la diferencia de $X". Al guardar, la ficha de María muestra puntos extra por la diferencia.
7. Edita el mismo pedido bajando a 2 unidades. Los puntos se revierten sin quedar en negativo.
8. Edita un pedido web con delivery y cambia el descuento. El total conserva el costo del delivery. Repite cambiando solo el descuento desde el detalle (`DiscountEditor`): el delivery tampoco desaparece.
9. Cancela un pedido. En la tabla, "Editar" ya no aparece en esa fila.

### Historia 4: eliminar un pedido

1. Registra un pedido duplicado de María por 1 unidad de A (la existencia baja 1).
2. Pulsa "Eliminar" en su fila. La ventana muestra el número, el cliente, la fecha y el total, con el foco en "Volver".
3. Pulsa Escape. No se elimina nada.
4. Vuelve a abrir la ventana y pulsa "Eliminar pedido". Aparece el aviso, el pedido desaparece de la tabla y la existencia de A sube 1. Además:
   - las analíticas y las cuentas por cobrar ya no lo cuentan;
   - si era la única fila de una página mayor que 1, se navega a la página anterior.
5. En un pedido con un abono, en uno pagado o en uno con nota de entrega, "Eliminar" no aparece y, al pasar el cursor por sus acciones, se ve el motivo.
6. Cancela otro pedido duplicado y luego elimínalo. Desaparece y la existencia no vuelve a subir.

### Teléfono

Repite las historias 1, 3 y 4 con un ancho de 390 px:

- el buscador y la modal de alta caben sin desplazamiento horizontal;
- las tarjetas de la tabla muestran Ver, Editar y Eliminar;
- la ventana de confirmación se lee completa.

## 3. Verificaciones omitidas

Declara en la entrega cualquier verificación que no se haya ejecutado. Por ejemplo, la integración sin base aislada disponible.
