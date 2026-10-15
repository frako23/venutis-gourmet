---

description: "Tareas de implementación del checkout directo desde Venta Rápida"
---

# Tasks: Checkout directo desde Venta Rápida

**Input**: Documentos de diseño de `/specs/005-checkout-venta-rapida/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/checkout-directo.md` y `quickstart.md`

**Organization**: Las tareas están agrupadas por historia de usuario y ordenadas por dependencia. Las tareas de prueba aparecen antes de la implementación de cada historia.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar comandos y utilidades de prueba sin modificar todavía el flujo comercial.

- [X] T001 [P] Agregar el script `test:checkout` en `package.json` para ejecutar `tests/checkout/*.test.ts` con `node --loader ts-node/esm`.
- [X] T002 [P] Crear `tests/checkout/test-helpers.ts` con constructores de datos deterministas y utilidades de limpieza para una base PostgreSQL aislada, sin fixtures ni escrituras contra el `DATABASE_URL` real.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establecer las invariantes compartidas de datos, entrega, pago e idempotencia antes de implementar las historias.

**⚠️ CRITICAL**: Ninguna historia puede darse por completa hasta terminar esta fase.

- [X] T003 [P] Escribir las pruebas iniciales de reglas en `tests/checkout/checkout-rules.test.ts` para subtotal, delivery, total final, métodos habilitados, estados iniciales y claves de idempotencia; las pruebas deben fallar antes de implementar las reglas.
- [X] T004 [P] Actualizar `prisma/schema.prisma` y crear `prisma/migrations/20261015000000_checkout_venta_rapida/migration.sql` con los campos aditivos `montoDelivery` (por defecto `0`), `zonaEntrega`, `aliasEntrega`, `direccionEntrega` y `claveIdempotencia` única opcional en `Transaccion`; conservar datos históricos existentes y hacer `claveIdempotencia` nullable para ventas anteriores.
- [X] T005 Implementar las reglas puras en `lib/checkout-rules.ts` para que se cumplan literalmente estas invariantes: `montoTotal = montoSubtotal + montoDelivery - descuento`; `tipodeRetiro = envio` exige snapshot de entrega; `recogida` exige delivery cero; efectivo inicia `por_cobrar`; métodos digitales inician `en_pedido`; y una misma `claveIdempotencia` no puede producir dos efectos.
- [X] T006 Ejecutar `npx.cmd prisma validate`, `npx.cmd prisma generate` y las pruebas de `tests/checkout/checkout-rules.test.ts` contra la base aislada, documentando cualquier limitación en `specs/005-checkout-venta-rapida/quickstart.md`.

**Checkpoint**: El esquema, las reglas monetarias, los estados y la protección de idempotencia están definidos y verificables.

---

## Phase 3: User Story 1 - Elegir el canal y conservar el pedido (Priority: P1) 🎯 MVP

**Goal**: Mantener WhatsApp sin persistencia y permitir que el mismo carrito de `/venta-rapida` inicie el checkout directo.

**Independent Test**: Desde un carrito con dos productos, WhatsApp genera el mensaje actual sin escribir datos; el canal directo conserva cantidades y precios, reemplaza el carrito persistido anterior y abre `/finalizar-compra` sin crear todavía una venta.

### Tests for User Story 1

- [X] T007 [P] [US1] Escribir `tests/checkout/quick-sale-channel.test.ts` para comprobar que el mensaje de WhatsApp conserva productos, cantidades, precios, tasa y total, y que la conversión del carrito rápido no ejecuta persistencia.

### Implementation for User Story 1

- [X] T008 [P] [US1] Añadir en `lib/pos.ts` el tipo y la transformación testeable que convierte las líneas de `ProductoVentaRapida` en `CartItem` del contexto `consumidor`, conservando `id`, nombre, precio detal, inventario, imagen y cantidad.
- [X] T009 [US1] Integrar en `components/venta-rapida/puntoDeVenta.tsx` dos acciones explícitas del resumen: WhatsApp conserva `mensajeWhatsapp` y el canal directo reemplaza el carrito del `store/appStore.ts` y navega a `/finalizar-compra`; no mezclar productos persistidos anteriores.
- [X] T010 [US1] Ajustar `store/appStore.ts` para que la carga desde venta rápida reinicie cliente, dirección, modalidad, cargo de delivery y paso de checkout sin borrar accidentalmente el carrito hasta que la venta sea confirmada.

**Checkpoint**: El canal WhatsApp sigue operativo y el canal directo inicia el checkout con el carrito correcto, sin efectos persistentes prematuros.

---

## Phase 4: User Story 2 - Registrar o reutilizar los datos del cliente (Priority: P1)

**Goal**: Asociar una venta directa a un cliente existente por teléfono o crear uno nuevo con datos válidos.

**Independent Test**: Un teléfono existente precarga un único cliente; un teléfono nuevo permite crear cliente; ambos quedan seleccionados para el siguiente paso sin duplicados.

### Tests for User Story 2

- [X] T011 [P] [US2] Escribir `tests/checkout/client-checkout.test.ts` para cubrir teléfono existente, alta de cliente nuevo, nombre/apellido/teléfono obligatorios, correo opcional válido y conflicto de correo sin vaciar datos existentes.

### Implementation for User Story 2

- [X] T012 [P] [US2] Endurecer la validación y respuesta de cliente en `lib/actions/clients.ts`: teléfono con mínimo de 10 caracteres, nombre y apellido no vacíos, correo opcional válido, tipo `detal`, búsqueda por teléfono y ningún duplicado.
- [X] T013 [US2] Actualizar `components/finalizar-compra/personalInformation.tsx` y `store/appStore.ts` para reutilizar el cliente encontrado, limpiar datos no confirmados al cambiar de teléfono, mostrar errores de campos y conservar el `clientId` seleccionado.
- [X] T014 [US2] Verificar en `components/finalizar-compra/checkoutForm.tsx` y `context/checkoutContext.tsx` que el paso de cliente solo avance con un cliente válido y que el checkout directo no se salte el registro por un estado persistido de una compra anterior.

**Checkpoint**: El pedido tiene un cliente válido y único antes de permitir entrega o pago.

---

## Phase 5: User Story 3 - Definir entrega y dirección (Priority: P1)

**Goal**: Permitir delivery o retiro, calcular el cargo por zona y conservar la dirección usada en el pedido.

**Independent Test**: Delivery exige zona y detalle, calcula el cargo y guarda snapshot; retiro no exige dirección ni cargo; una zona desconocida ofrece WhatsApp sin crear venta directa.

### Tests for User Story 3

- [X] T015 [P] [US3] Escribir `tests/checkout/delivery-rules.test.ts` para cubrir `envio` con zona válida, dirección faltante, dirección ajena, zona no configurada, `recogida` sin dirección y cálculo de cargo cero para retiro.

### Implementation for User Story 3

- [X] T016 [P] [US3] Actualizar `components/finalizar-compra/deliveryInformation.tsx` y `store/appStore.ts` para mostrar la selección `envio`/`recogida`, reiniciar el cargo al cambiar a retiro y habilitar el avance solo cuando la modalidad y la dirección cumplen sus reglas.
- [X] T017 [US3] Corregir `lib/actions/address.ts` y `components/finalizar-compra/addressManager.tsx` para validar `clienteId`, alias, zona configurada y detalle, verificar propiedad de la dirección, seleccionar explícitamente la dirección y calcular el cargo también al cargar la selección inicial.
- [X] T018 [US3] Actualizar `components/finalizar-compra/zoneSelector.tsx` y `app/finalizar-compra/page.tsx` para mostrar zonas válidas, ofrecer fallback por WhatsApp cuando la zona no existe y reflejar subtotal, delivery, total y tasa de forma consistente.
- [X] T019 [US3] Preparar en `lib/actions/checkout.ts` la entrada `direccionId` y la validación server-side de pertenencia, zona y cargo para que el navegador no pueda enviar una dirección o precio de delivery de otro cliente.

**Checkpoint**: El pedido tiene modalidad de entrega válida y, cuando aplica, una dirección histórica y cargo verificable.

---

## Phase 6: User Story 4 - Consultar y registrar el pago (Priority: P1)

**Goal**: Mostrar instrucciones completas para los métodos existentes y registrar el pago declarado con el total final.

**Independent Test**: Cada método visible muestra sus datos, moneda, instrucciones y total con delivery; los métodos digitales validan fecha, montos y referencia; efectivo no exige referencia.

### Tests for User Story 4

- [X] T020 [P] [US4] Escribir `tests/checkout/payment-rules.test.ts` para cubrir Pago Móvil, Zelle, Transferencia Bs y Efectivo USD, monto final con delivery, tasa, referencia obligatoria para métodos digitales y estado inicial correcto.

### Implementation for User Story 4

- [X] T021 [P] [US4] Actualizar `components/finalizar-compra/paymentInformation.tsx` para usar un solo registro de pago coherente con el método elegido, incluir delivery en montos USD/Bs, exigir referencia solo cuando corresponda, mostrar fecha/tasa y enviar `direccionId`, `claveIdempotencia` y datos completos a la acción.
- [X] T022 [P] [US4] Revisar `lib/constants/constants.ts` y `components/finalizar-compra/paymentInformation.tsx` para que los cuatro métodos habilitados tengan datos e instrucciones visibles, sin exponer métodos no configurados ni introducir pasarela o comprobantes.
- [X] T023 [US4] Corregir `context/checkoutContext.tsx`, `components/finalizar-compra/checkoutForm.tsx` y `components/global/checkoutButton.tsx` para que los pasos `client-details`, `delivery-method`, `payment-method` y `confirmation` sean consistentes y el botón solo confirme cuando los datos del pago sean válidos.

**Checkpoint**: El pedido está listo para confirmarse con pago declarado válido, total final y tasa asociada.

---

## Phase 7: User Story 5 - Confirmar el pedido y dejarlo operativo (Priority: P1)

**Goal**: Crear una única venta consistente, actualizar inventario, mostrar confirmación y hacer visible el pedido en la operación interna.

**Independent Test**: Una confirmación válida crea venta, detalles, pago, historial y fidelidad cuando corresponde, descuenta stock una vez, muestra número de orden y aparece en el panel; un reintento devuelve la misma venta.

### Tests for User Story 5

- [X] T024 [P] [US5] Escribir `tests/checkout/checkout.integration.test.ts` para una compra directa aislada con cliente, delivery, snapshot de dirección, líneas, pago declarado, estado `en_pedido`, inventario decrementado y fidelidad.
- [X] T025 [P] [US5] Escribir `tests/checkout/checkout-idempotency.test.ts` para doble confirmación con la misma `claveIdempotencia`, precio cambiado, stock insuficiente, carrito vacío y rollback sin venta, pago o descuento parcial.

### Implementation for User Story 5

- [X] T026 [US5] Reestructurar `lib/actions/checkout.ts` conforme a `contracts/checkout-directo.md`: validar cliente/dirección/carrito/pago, recalcular precios y delivery, resolver estado inicial, consultar idempotencia y ejecutar venta, detalles, pago, historial, fidelidad e inventario en una sola transacción.
- [X] T027 [US5] Integrar en `components/finalizar-compra/paymentInformation.tsx` el resultado de `procesarCompra`, limpiar el carrito solo después de éxito, conservarlo ante error y redirigir usando `transactionId` y `numeroOrden` sin permitir doble creación.
- [X] T028 [US5] Actualizar `app/confirmacion/page.tsx` y `components/finalizar-compra/orderSuccess.tsx` para leer el snapshot de entrega de la venta, mostrar cliente, productos, subtotal, delivery, total, tasa, método, importes, referencia y estado real, y mantener la notificación opcional por WhatsApp.
- [X] T029 [US5] Actualizar `app/admin/transactions/page.tsx`, `app/admin/transactions/[id]/page.tsx` y `lib/admin/types.ts` para mostrar ventas de venta rápida con estado, cargo, dirección histórica, cliente y pago declarado sin consultar una dirección mutable como fuente principal.
- [X] T030 [US5] Ajustar `lib/admin/status.ts`, `components/admin/ventas/orderStatusForm.tsx` y las pruebas administrativas existentes para que `por_cobrar` y `en_pedido` requieran confirmación explícita antes de `pagado` y conserven el historial de cambios.

**Checkpoint**: Una venta directa es trazable, operativa y consistente en público, inventario y panel administrativo.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validar la feature completa, la experiencia móvil y la ausencia de regresiones.

- [X] T031 [P] Actualizar `specs/005-checkout-venta-rapida/quickstart.md` con los comandos y evidencias reales de la migración, pruebas y escenarios manuales ejecutados en la base aislada.
- [ ] T032 [P] Revisar `components/venta-rapida/puntoDeVenta.tsx`, `components/finalizar-compra/*.tsx` y `app/confirmacion/page.tsx` para eliminar logs de depuración, mejorar mensajes accesibles y comprobar la experiencia a 360 px sin perder acceso horizontal ni acciones.
- [X] T033 Ejecutar `npm.cmd run test:checkout`, `npm.cmd run test:admin`, `npx.cmd tsc --noEmit`, `npm.cmd run lint` y `npm.cmd run build`; registrar en `specs/005-checkout-venta-rapida/quickstart.md` qué verificaciones pasaron y cuáles quedaron limitadas por infraestructura.
- [ ] T034 Ejecutar de extremo a extremo los escenarios A-D de `specs/005-checkout-venta-rapida/quickstart.md` con base aislada y revisar `git diff --check`, `git status --short` y que no se hayan tocado `.env`, `.env.local` ni secretos.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 y T002 no dependen de otras fases; pueden ejecutarse en paralelo.
- **Foundational (Phase 2)**: T003 y T004 dependen de los helpers de T002 cuando los usen; T005 depende de las pruebas de T003 y del esquema de T004; T006 cierra la base antes de las historias.
- **User Stories (Phase 3-7)**: Todas dependen de Phase 2. Dentro del flujo público, US2 depende de US1, US3 de US2, US4 de US3 y US5 de US4, aunque sus pruebas de reglas pueden prepararse en paralelo.
- **Polish (Phase 8)**: Depende de las historias implementadas y de que los checkpoints anteriores pasen.

### User Story Dependencies

- **US1 (P1)**: Depende de la base de reglas y del esquema; es el MVP de selección de canal y puente al checkout.
- **US2 (P1)**: Depende de US1 para recibir el carrito en `/finalizar-compra`; no requiere delivery ni pago para probar el registro de cliente.
- **US3 (P1)**: Depende de US2 porque la dirección pertenece al cliente seleccionado.
- **US4 (P1)**: Depende de US3 porque el pago usa el total definitivo después del delivery.
- **US5 (P1)**: Depende de US2, US3 y US4; es la confirmación persistente de todo el flujo.

### Within Each User Story

- Las pruebas se escriben antes de la implementación correspondiente y deben fallar por la razón esperada.
- Las reglas puras y el modelo se completan antes de las acciones de persistencia.
- Las acciones server-side se completan antes de declarar terminada la integración visual.
- Cada checkpoint debe probar la historia sin requerir una historia posterior.

### Parallel Opportunities

- T001 y T002 pueden ejecutarse en paralelo.
- T003 y T004 pueden ejecutarse en paralelo; T005 espera ambos cuando necesite los nombres finales del modelo.
- Dentro de cada historia, los archivos de pruebas y los componentes que no compartan archivo pueden trabajarse en paralelo.
- T024 y T025 pueden ejecutarse en paralelo antes de T026.
- T031 y T032 pueden ejecutarse en paralelo antes de la validación final T033-T034.

## Parallel Example: User Story 1

```text
T007: pruebas de mensaje y conversión en tests/checkout/quick-sale-channel.test.ts
T008: transformación de líneas en lib/pos.ts
```

Después de ambas, T009 y T010 integran la salida visual y el reset controlado del
store. No se debe ejecutar T009 en paralelo con T010 porque ambos coordinan el estado
persistido del checkout.

## Implementation Strategy

### MVP First

1. Completar Setup y Foundational.
2. Completar US1 para conservar WhatsApp y abrir el checkout con el carrito correcto.
3. Validar el checkpoint de US1 en móvil.
4. Continuar con US2-US5 para que el canal directo registre y procese ventas reales.

### Incremental Delivery

1. Entregar primero el selector de canal sin cambiar el comportamiento de WhatsApp.
2. Agregar cliente y entrega, verificando que los datos no se pierden entre pasos.
3. Agregar pago declarado e instrucciones con total final.
4. Activar la persistencia atómica, inventario, confirmación y visibilidad administrativa.
5. Ejecutar la guía completa y revisar regresiones antes de integrar.

### Notes

- `[P]` indica tareas que pueden ejecutarse en paralelo sin compartir archivos modificados ni depender de una tarea incompleta.
- `[US1]` a `[US5]` enlazan cada tarea con una historia de usuario de `spec.md`.
- Las pruebas de integración deben usar una base aislada y nunca insertar fixtures en el entorno configurado por secretos reales.
- No se debe añadir una pasarela, webhook, cola, microservicio o integración bancaria fuera de esta lista.
