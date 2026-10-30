# Quickstart: validar perfil, crédito, saldo a favor y fidelización

**Feature**: [spec.md](./spec.md) | **Contratos**: [contracts/](./contracts/) | **Modelo**: [data-model.md](./data-model.md)

## Prerrequisitos

1. Base de desarrollo **aislada** (nunca la de producción) en `DATABASE_URL`, y otra base para integración en `ADMIN_TEST_DATABASE_URL`.
2. Aplicar el esquema y regenerar el cliente:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. Variables de entorno:
   - `ALLOWED_EMAILS` con al menos un correo de administradora. **Sin esta variable, en producción nadie entra al panel** (R1).
   - Las de Stack Auth que ya existen (ver [README.md](../../README.md)).
4. Dashboard de Stack Auth: registro de usuarios habilitado y los métodos de acceso de los clientes configurados (Google, y/o correo y contraseña con verificación de correo).
5. Datos de prueba:
   - un cliente consumidor **A** con correo, con dos pedidos por cobrar (USD 30 y USD 20) y uno cancelado;
   - un cliente mayorista **B**;
   - un cliente consumidor **C** sin correo, con teléfono `04140000000`;
   - un producto con existencia 5.

## Pruebas automáticas

```bash
npm run test:admin       # unitarias: saldo-a-favor, fidelidad, abonos (crédito), auth-rules
npm run test:checkout    # unitarias: cuenta-cliente-rules, totales con beneficios
RUN_ADMIN_INTEGRATION=1 ADMIN_TEST_DATABASE_URL=... npm run test:admin     # integración (base aislada)
RUN_ADMIN_INTEGRATION=1 ADMIN_TEST_DATABASE_URL=... npm run test:checkout
npm run lint
npm run build
```

**Resultado esperado**: todo en verde. Las pruebas de integración cubren:

- sobrepago;
- pago a cuenta;
- aplicación de saldo a favor;
- anulación bloqueada;
- cancelación con abonos y con canjes;
- acreditación única en cada uno de los seis caminos de pago;
- canjes con stock;
- dos aplicaciones o canjes simultáneos que no dejan saldos negativos;
- autorización de crédito en la venta manual y en el editor masivo;
- checkout con beneficios: total, parcial, cambio concurrente y sin sesión.

## Validación manual

Con `npm run dev`, en escritorio y en un teléfono (o en una ventana de 360 px).

### US1: ficha del cliente (SC-001, SC-002)

1. En `/admin/clients`, abrir **A**. Debe llevar menos de 30 segundos encontrar su deuda, su saldo a favor y sus puntos.
2. Comprobar:
   - deuda = USD 50, igual que el resumen de cuentas por cobrar en `/admin/transactions`;
   - los indicadores no cuentan el pedido cancelado.
3. Escribir notas internas y guardarlas. Aparece la notificación y las notas siguen ahí al recargar.

### US2: crédito (SC-012)

1. Habilitar el crédito de **A** con un límite de USD 60. Disponible: USD 10. El historial de la ficha muestra el cambio, con el valor anterior y el nuevo.
2. En `/admin/add-transaction`, crear una venta por cobrar de USD 25 para **A**, sin pago. Aparece la confirmación con deuda 50, límite 60 y exceso 15.
   - Cancelar: no se crea ningún pedido.
   - Confirmar: el pedido se crea y su historial dice "Autorizada sobre el crédito…" con la autora.
3. La misma venta con un pago declarado no pide autorización.
4. En el editor masivo, una fila nueva por cobrar para **B** (sin crédito) se rechaza hasta marcar la casilla de autorización.

### US3: saldo a favor (SC-003, SC-005)

1. En un pedido de **A** con saldo USD 18, abonar USD 20. La pantalla muestra "USD 18 saldan el pedido, USD 2 quedan a favor". Al confirmar, el pedido queda pagado y la ficha muestra USD 2 a favor, con origen sobrepago.
2. En la ficha de **B**, registrar un pago a cuenta de USD 50 en Bs con la tasa del día. Queda a favor el equivalente en USD.
3. En un pedido nuevo de **B** por USD 35, usar "Usar saldo a favor" por USD 35. El pedido queda pagado y a **B** le quedan USD 15.
4. Abonar USD 10 a un pedido por cobrar y cancelarlo. El mensaje dice "USD 10 quedaron a favor del cliente".
5. Intentar anular el abono de USD 20 del paso 1 después de haber gastado el excedente. Se rechaza con el mensaje de FR-017.

### US4 y US5: puntos y premios (SC-006)

1. En `/admin/clients/rewards`, crear "USD 5 de descuento" por 200 puntos y "1 frasco gratis" (el producto de prueba, cantidad 1) por 150.
2. Ajustar +250 puntos a **A** con un motivo. Aparece en sus movimientos.
3. Marcar como pagado un pedido de **A** con USD 25,80 en productos y USD 3 de delivery. Se acreditan 25 puntos.
   - Pasarlo a "Por cobrar" y de nuevo a pagado no acredita más.
4. En un pedido por cobrar de **A**, canjear "1 frasco gratis". Aparece una línea a USD 0, la existencia baja 1 y los puntos bajan 150.
   - Cancelar el pedido: los puntos y la existencia vuelven.
5. Un pedido pagado de **B** (mayorista) no acredita puntos.

### US6: cuenta del cliente (SC-007, SC-008, SC-009)

1. En una ventana privada, abrir `/mi-cuenta` y crear una cuenta con el correo de **A**. Tras verificar el correo, debe ver en menos de 3 minutos los mismos puntos, deuda, saldo y pedidos que su ficha.
2. Crear otra cuenta con un correo nuevo y el teléfono de **C**. Queda "pendiente" y no se ve ningún dato de **C**.
   - En la ficha de **C**, confirmar la vinculación. Al recargar, la cuenta ve los datos de **C**.
3. Crear una cuenta con un correo y un teléfono nuevos. Se crea un consumidor con puntos y saldo en 0.
4. Con cualquier cuenta de cliente, abrir `/admin`. Redirige a `/unauthorized`. Repetir sin `ALLOWED_EMAILS` en un build de producción: el resultado es el mismo.
5. A 360 px, los puntos, la deuda y el saldo se ven sin desplazamiento horizontal.

### US7: beneficios en la tienda (SC-010, SC-011)

1. Con la sesión de **A** (250 puntos, USD 10 a favor), comprar USD 30 en productos. En el paso de pago:
   - canjear "USD 5 de descuento" y usar USD 10;
   - el total a pagar es USD 15;
   - declarar el pago.

   El pedido queda por verificar, con 50 puntos y USD 0 a favor.
2. Con USD 40 a favor y un pedido de USD 30, usar USD 30. No se piden datos de pago, el pedido nace pagado y acredita puntos.
3. Abrir el checkout. Mientras tanto, desde el panel, aplicar el saldo de **A** a otro pedido, y luego confirmar. Aparece "Tus puntos, tu saldo a favor… cambiaron", no se descuenta nada y el carrito sigue.
4. Sin sesión, el checkout no muestra beneficios y funciona como antes.
