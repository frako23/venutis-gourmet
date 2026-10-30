---

description: "Task list for client profile, credit, balance in favor, loyalty points, rewards and customer accounts"
---

# Tasks: Perfil del cliente, crédito, saldo a favor y fidelización

**Input**: Design documents from `/specs/010-cuenta-cliente-fidelizacion/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/cuenta-cliente.md](./contracts/cuenta-cliente.md), [contracts/ficha-saldo-credito.md](./contracts/ficha-saldo-credito.md), [contracts/fidelidad.md](./contracts/fidelidad.md), [contracts/checkout-beneficios.md](./contracts/checkout-beneficios.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen porque la constitución (Principio V) exige pruebas para las reglas que tocan dinero, inventario, estados de pedido y autorización.

- Las reglas puras se prueban sin base de datos con `node:test`.
- Las transacciones se prueban en una base aislada (`RUN_ADMIN_INTEGRATION=1` y `ADMIN_TEST_DATABASE_URL`), con los helpers de `tests/admin/integration-helpers.ts` y `tests/checkout/test-helpers.ts`.
- Los tests importan con ruta relativa y extensión `.js` (por ejemplo `../../lib/saldo-a-favor.js`), como los existentes.
- Los módulos que se prueban (`lib/saldo-a-favor.ts`, `lib/fidelidad.ts`, `lib/checkout-core.ts`, `lib/cuenta-cliente-rules.ts`, `lib/admin/auth-rules.ts`, `lib/admin/abonos.ts` y `lib/admin/client-profile.ts`) **no usan `@/` ni `server-only`** e importan sus dependencias con `./x.ts` o `../x.ts`.
- La interfaz se valida a mano con [quickstart.md](./quickstart.md).

**Organization**: las tareas se agrupan por historia de usuario, en el orden de prioridad de la spec:

| Historia | Prioridad | Contenido |
|---|---|---|
| US1 | P1 | Ficha completa del cliente |
| US2 | P1 | Crédito y autorización de ventas |
| US3 | P1 | Saldo a favor |
| US4 | P2 | Acumulación de puntos |
| US5 | P2 | Premios y canjes |
| US6 | P2 | Cuenta del cliente en la tienda |
| US7 | P3 | Puntos y saldo a favor en el checkout |

La fase Foundational reúne tres cosas que usan varias historias: la migración única, el acceso al panel que falla cerrado y el bloqueo por cliente con la deuda derivada. El panel cerrado tiene que estar antes de abrir cualquier registro.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: historia de usuario de la tarea (US1 a US7).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fijar la línea base antes de tocar código.

- [X] T001 Fijar la línea base (`package.json`, `tests/admin/`, `tests/checkout/`):
  - Ejecutar `npm.cmd run test:admin`, `npm.cmd run test:checkout` y `npm.cmd run lint`, y anotar los fallos preexistentes para no confundirlos con regresiones.
  - Revisar `git status`. Hay una actualización a Next.js 16 sin commit (`package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`). No mezclarla con esta feature: confirmar con la usuaria si se commitea antes o se mantiene aparte.
  - Confirmar que `package.json` no requiere dependencias nuevas. **No añadir ninguna** (plan, Technical Context).
  - Confirmar que existe una base de desarrollo aislada para `DATABASE_URL` y otra para `ADMIN_TEST_DATABASE_URL`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migración única, panel que falla cerrado (R1), bloqueo por cliente (R8) y deuda derivada (R4).

**⚠️ CRITICAL**: No comenzar las historias de usuario hasta completar esta fase.

### Esquema

- [X] T002 Editar `prisma/schema.prisma` según [data-model.md](./data-model.md).

  **`Cliente`**:
  - `notasInternas String?`, con la regla "Hasta 2.000 caracteres. Nunca se envía a la tienda".
  - `creditoHabilitado Boolean @default(false)`.
  - `limiteCreditoUsd Float?`, con la regla "Mayor o igual que 0 y con 2 decimales. Es obligatorio si `creditoHabilitado`; se conserva al deshabilitar".
  - Relaciones `movimientosSaldo MovimientoSaldo[]` y `cuenta CuentaCliente?`.

  **Otros modelos existentes**:
  - `HistorialCliente`: `detalle String?`.
  - `Transaccion`: `montoDescuentoPuntos Float @default(0)` y la relación `movimientosSaldo MovimientoSaldo[]`.
  - `MetodoPago`: añadir `SaldoAFavor` al final.
  - `TipoMovimiento`: añadir `devolucion`, `reversion` y `ajuste`.
  - `Fidelidad`: añadir `motivo String?`, `actorId String?`, `actorEmail String?`, `premioId Int?` (relación con `Premio`), `descripcion String?`, `@@index([clienteId, fecha])` y `@@index([transaccionId])`. `puntos Int` se conserva y pasa a tener signo.
  - `Pago`: relación inversa opcional `movimientoSaldo MovimientoSaldo?`.
  - `Producto`: relación inversa `premios Premio[]`.

  **Enums nuevos**:
  - `EstadoCuentaCliente { vinculada pendiente }`.
  - `OrigenMovimientoSaldo { sobrepago pago_cuenta pedido_cancelado aplicacion_pedido anulacion ajuste }`.
  - `TipoPremio { descuento producto }`.

  **Modelos nuevos**:
  - `CuentaCliente`: `id`, `stackUserId String @unique`, `email String`, `clienteId Int @unique` (relación con `onDelete: Cascade`), `estado EstadoCuentaCliente`, `confirmadaPorEmail String?`, `confirmadaEn DateTime?`, `createdAt` y `updatedAt`.
  - `MovimientoSaldo`: `id`, `clienteId`, `montoUsd Float`, `origen OrigenMovimientoSaldo`, `transaccionId Int?`, `pagoId Int? @unique`, `metodoPago MetodoPago?`, `referencia String?`, `fechaPago DateTime?`, `montoBs Float?`, `tasaCambio Float?`, `motivo String?`, `actorId String?`, `actorEmail String?` y `createdAt`, con `@@index([clienteId, createdAt])` y `@@index([transaccionId])`.
  - `Premio`: `id`, `nombre String`, `descripcion String?`, `tipo TipoPremio`, `costoPuntos Int`, `montoDescuentoUsd Float?`, `productoId Int?`, `cantidad Int?`, `activo Boolean @default(true)`, la relación `movimientos Fidelidad[]`, `createdAt` y `updatedAt`.
- [X] T003 Crear la migración en `prisma/migrations/<timestamp>_cuenta_cliente_fidelizacion/` y regenerar el cliente:
  - `npx prisma migrate dev --name cuenta_cliente_fidelizacion` contra la base de desarrollo aislada, y después `npx prisma generate`.
  - Revisar el SQL generado: solo `ADD COLUMN`, `CREATE TABLE`, `CREATE TYPE` y `ALTER TYPE … ADD VALUE`. Ninguna columna existente cambia de tipo. Los pedidos existentes quedan con `montoDescuentoPuntos = 0`.

### Acceso al panel que falla cerrado (R1, FR-042)

- [X] T004 [P] Crear `lib/admin/auth-rules.ts` con `esCorreoAdministrador(email: string | null, lista: string[]): boolean`. Pura y sin imports:
  - devuelve `false` si `lista` está vacía o si `email` es nulo;
  - si no, compara `email.trim().toLowerCase()` contra la lista normalizada (con `trim`, en minúsculas y sin vacíos).
  - Exportar también `leerCorreosAdministradores(valor: string | undefined): string[]`, que separa por comas.
- [X] T005 [P] Crear `tests/admin/auth-rules.test.ts`. Casos:
  - lista vacía → `false` siempre;
  - `undefined` → `[]`;
  - correo nulo → `false`;
  - mayúsculas y espacios → `true`;
  - correo fuera de la lista → `false`.
- [X] T006 Actualizar `lib/admin/auth.ts`: `requireAdmin` usa `esCorreoAdministrador(email, leerCorreosAdministradores(process.env.ALLOWED_EMAILS))` y redirige a `/unauthorized` cuando es `false`, también si la lista está vacía. Conservar el atajo de `NODE_ENV === "development"` y la redirección a `/admin-login` sin sesión.
- [X] T007 Actualizar `app/admin-login/page.tsx` para que use las mismas dos funciones:
  - con sesión de administradora → `/admin/inventory`;
  - con cualquier otra sesión → `/unauthorized`;
  - eliminar `allowedEmails?.includes(user.primaryEmail!)`.

### Bloqueo por cliente y deuda derivada (R4, R8)

- [X] T008 Crear `lib/saldo-a-favor.ts`, solo con `bloquearCliente(tx: Prisma.TransactionClient, clienteId: number)`:
  - ejecuta ``tx.$queryRaw`SELECT "id" FROM "Cliente" WHERE "id" = ${clienteId} FOR UPDATE` ``;
  - si no devuelve filas, lanza `El cliente no existe.`;
  - imports relativos (`import type { Prisma } from "@prisma/client"` está permitido, igual que en `lib/inventory.ts`);
  - comentario de una línea sobre el orden de bloqueo Cliente → Transaccion.
- [X] T009 Añadir a `lib/admin/abonos.ts`:
  - `consultarDeudaCliente(db: Prisma.TransactionClient | PrismaClient, clienteId: number): Promise<number>`: lee los pedidos del cliente con `estado in ["por_cobrar", "pendiente", "en_pedido"]` y sus `pagos` (`esAbono`, `montoUsd`, `anuladoEn`), y devuelve `roundMoney(Σ calcularSaldo(pedido))`. Es el mismo filtro de `consultarCuentasPorCobrar` en `lib/admin/sales-query.ts`.
  - Exportar también `ESTADOS_CON_DEUDA = ["por_cobrar", "pendiente", "en_pedido"] as const` y usarlo en `consultarCuentasPorCobrar`, para que la regla viva en un solo lugar.

**Checkpoint**:
- La migración está aplicada y el cliente regenerado.
- El panel niega el acceso con la lista vacía (build de producción).
- `npm.cmd run test:admin` pasa.

---

## Phase 3: User Story 1 - Ver el perfil completo de un cliente (Priority: P1) 🎯 MVP

**Goal**: La ficha `/admin/clients/[id]` muestra datos, cuenta web, indicadores, pedidos con saldo, resumen financiero y notas internas (FR-001 a FR-006).

**Independent Test**: [quickstart.md](./quickstart.md) § US1: la deuda de la ficha coincide con las cuentas por cobrar y los indicadores excluyen los pedidos cancelados.

### Tests for User Story 1

- [X] T010 [P] [US1] Crear `tests/admin/client-profile.test.ts` para `calcularIndicadoresCliente` (T011). Casos:
  - sin pedidos → ceros y `ultimaCompra: null`;
  - los pedidos cancelados no cuentan en total, número, ticket ni productos;
  - el ticket promedio se redondea con `roundMoney`;
  - el top 5 se ordena por cantidad y suma cantidades decimales.

### Implementation for User Story 1

- [X] T011 [US1] Crear `lib/admin/client-profile.ts` con imports relativos.

  **`calcularIndicadoresCliente(pedidos)`** (pura): recibe `{ estado, montoTotal, fechaCompra, detalles: { productoId, nombre, cantidad }[] }[]` y devuelve `{ totalCompradoUsd, pedidos, ticketPromedioUsd, ultimaCompra, topProductos }`, excluyendo `cancelado`.

  **`getClientProfile(db, id)`** devuelve `ClientProfile`, según [contracts/ficha-saldo-credito.md](./contracts/ficha-saldo-credito.md) §1:
  - cliente con `notasInternas`, direcciones y `cuenta`;
  - todos los pedidos (más recientes primero), con `saldoUsd = calcularSaldo(...)`;
  - `deudaUsd = consultarDeudaCliente`;
  - `saldoAFavorUsd = roundMoney(aggregate _sum MovimientoSaldo.montoUsd)`;
  - `puntos = aggregate _sum Fidelidad.puntos`;
  - crédito con `disponibleUsd = max(0, limite − deuda)` si está habilitado, o `null`;
  - movimientos de saldo y de puntos con el `numeroOrden` relacionado;
  - `HistorialCliente` con `detalle`.

  Devuelve `null` si el cliente no existe.
- [X] T012 [US1] Añadir `guardarNotasCliente(formData)` en `lib/actions/admin-clients.ts`:
  - `requireAdmin()`;
  - Zod: `clienteId` entero positivo y `notasInternas` con `trim` y `max(2000)` ("Hasta 2.000 caracteres"). Una cadena vacía se guarda como `null`;
  - en una transacción, actualiza y escribe `HistorialCliente` (`accion: actualizado`, `camposModificados: ["notasInternas"]`, sin `detalle`, con el actor);
  - revalida `/admin/clients` y `/admin/clients/{id}`;
  - devuelve `{ success, message: "Notas guardadas." }`.
- [X] T013 [P] [US1] Crear las secciones de solo lectura de la ficha en `components/admin/clientes/ficha/`, con los tokens de `DESIGN.md` y las clases `admin-*` que ya existen:
  - `fichaDatos.tsx`: tipo, nombre, RIF ("Sin RIF" si falta), celular, correo, direcciones, alta y actualización;
  - `fichaResumenFinanciero.tsx`: deuda, saldo a favor, puntos y crédito (habilitado, límite y disponible);
  - `fichaIndicadores.tsx`;
  - `fichaPedidos.tsx`: número enlazado a `/admin/transactions/{id}`, fecha, total, estado con `getOrderStateLabel` y saldo;
  - `fichaHistorial.tsx`;
  - `fichaCuentaWeb.tsx`: estado "Vinculada", "Pendiente de confirmación" o "Sin cuenta", con correo; las acciones llegan en US6.

  Todas usables a 360 px.
- [X] T014 [P] [US1] Crear `components/admin/clientes/ficha/fichaNotas.tsx` (cliente):
  - textarea con contador de 2.000 caracteres;
  - "Guardar" con `useActionState` sobre `guardarNotasCliente`;
  - `toast.success` o `toast.error` de sonner;
  - aviso fijo: "Solo visible para el equipo".
- [X] T015 [US1] Crear `app/admin/clients/[id]/page.tsx` (Server Component, `dynamic = "force-dynamic"`):
  - `requireAdmin()`;
  - `params` como `Promise<{ id: string }>`;
  - `getClientProfile(prisma, id)`, con `notFound()` si es `null`;
  - compone las secciones de T013 y T014, con un enlace de regreso a `/admin/clients`.
- [X] T016 [US1] En `components/admin/clientes/clientsTable.tsx`, enlazar el nombre de cada fila (también en la vista móvil) a `/admin/clients/{id}`. En modo de edición masiva el enlace no se muestra, para no perder cambios pendientes.

**Checkpoint**: la ficha funciona sola y la deuda coincide con las cuentas por cobrar (SC-002).

---

## Phase 4: User Story 2 - Dar crédito y controlar lo que el cliente debe (Priority: P1)

**Goal**: Crédito con límite, disponible derivado, historial de cambios y autorización registrada para las ventas del panel que lo exceden (FR-008 a FR-011).

**Independent Test**: [quickstart.md](./quickstart.md) § US2.

### Tests for User Story 2

- [X] T017 [P] [US2] Ampliar `tests/admin/abonos.test.ts` con `evaluarCredito` (T019). Casos:
  - sin crédito y monto > 0 → requiere autorización, `disponible = 0`;
  - con crédito y monto ≤ disponible → no requiere;
  - monto que excede por 1 centavo → requiere, `exceso = 0,01`;
  - límite menor que la deuda → `disponible = 0`;
  - `montoSinCobrar = 0` → nunca requiere.
- [X] T018 [P] [US2] Crear `tests/admin/credito.integration.test.ts` (`skip: !integrationEnabled`), sobre los núcleos o acciones de T020 y T022. Casos:
  - venta manual por cobrar sin pago para un cliente sin crédito, sin `autorizarCredito` → no crea ningún pedido y devuelve `requiereAutorizacion` con deuda, límite, disponible y exceso;
  - la misma venta con `autorizarCredito` → la crea, y el historial inicial contiene "Autorizada sobre el crédito" y el actor;
  - una venta con `pago` declarado no pide autorización;
  - editor masivo: una fila nueva por cobrar sin la casilla → rechaza la tanda completa; con la casilla → la guarda.

  Si probar las acciones exige `requireAdmin`, extraer el núcleo transaccional (`registrarVentaManualEnTx(tx, input, actor)`) a `lib/admin/manual-sale.ts` sin `@/` y probar ese núcleo.

### Implementation for User Story 2

- [X] T019 [US2] Añadir `evaluarCredito({ habilitado, limiteUsd, deudaUsd, montoSinCobrarUsd })` (pura) a `lib/admin/abonos.ts`:
  - `disponible = habilitado ? max(0, limite − deuda) : 0`;
  - `requiereAutorizacion = montoSinCobrar > 0 && cents(montoSinCobrar) > cents(disponible)`;
  - `exceso = roundMoney(montoSinCobrar − disponible)`;
  - devuelve `{ disponibleUsd, requiereAutorizacion, excesoUsd }`.
- [X] T020 [US2] Añadir `actualizarCreditoCliente(formData)` en `lib/actions/admin-clients.ts`:
  - `requireAdmin()`;
  - Zod: `clienteId`, `habilitado` booleano y `limiteUsd` ≥ 0 con 2 decimales como máximo. Obligatorio si está habilitado; al deshabilitar se conserva el límite guardado;
  - transacción: lee los valores anteriores, actualiza y escribe `HistorialCliente` con `camposModificados: ["creditoHabilitado", "limiteCreditoUsd"]` y `detalle` `"Crédito: {deshabilitado | habilitado, límite USD x,xx} → {…}"` (formato `es-VE`);
  - devuelve `Crédito actualizado. Disponible: USD {x}.`, calculado con `consultarDeudaCliente` y `evaluarCredito`;
  - revalida la ficha.
- [X] T021 [P] [US2] Crear `components/admin/clientes/ficha/fichaCredito.tsx` (cliente):
  - interruptor "Crédito habilitado" y campo "Límite (USD)";
  - muestra la deuda y el disponible;
  - guarda con `actualizarCreditoCliente` y notifica con `toast`;
  - integrarlo en `app/admin/clients/[id]/page.tsx`.
- [X] T022 [US2] Ampliar `registrarVentaManual` en `lib/actions/admin-sales.ts` ([contracts/ficha-saldo-credito.md](./contracts/ficha-saldo-credito.md) §6):
  - nuevo campo `autorizarCredito` (`formData.get("autorizarCredito") === "true"`);
  - dentro de la transacción, `bloquearCliente(tx, clienteId)` antes de leer la deuda;
  - si `estadoInicial !== "pagado"` y no hay `pago`: `montoSinCobrar = totals.totalUsd` (US3 resta luego el saldo a favor aplicado), con `deuda = consultarDeudaCliente(tx, clienteId)` leída **antes** de crear el pedido y `evaluarCredito`;
  - si requiere autorización y falta, lanzar la clase local `CreditoRequiereAutorizacion` con los datos, capturarla fuera de la transacción y devolver `{ success: false, requiereAutorizacion: { deudaUsd, limiteUsd, disponibleUsd, excesoUsd }, message: "Esta venta excede el crédito disponible del cliente." }`;
  - con autorización, el motivo del historial inicial es `"Venta registrada manualmente · Autorizada sobre el crédito: excede USD {exceso} (deuda USD {deuda}, límite USD {limite | sin crédito})"`.

  Ampliar `ManualSaleState` en `lib/admin/types.ts` con `requiereAutorizacion?`.
- [X] T023 [US2] Ampliar `guardarEdicionMasivaVentas` en `lib/actions/admin-sales.ts`:
  - nuevo campo `autorizarCredito`, leído igual que `confirmarPagos`;
  - para las filas nuevas en `por_cobrar` o `en_pedido`, acumular por cliente dentro de la tanda (`deuda inicial = consultarDeudaCliente`, con `bloquearCliente` por cliente en orden ascendente de id) y evaluar cada fila con `evaluarCredito`;
  - si alguna requiere autorización y falta, lanzar `Las ventas {ordenes} exceden el crédito disponible. Marca "Autorizo las ventas que exceden el crédito" para guardarlas.`;
  - con autorización, añadir al motivo del historial de esa fila `" · Autorizada sobre el crédito: excede USD {exceso}"`.
- [X] T024 [P] [US2] En `components/admin/ventas/manualSaleForm.tsx`, al recibir `requiereAutorizacion`:
  - abrir un diálogo de confirmación con la deuda, el límite ("Sin crédito" si es nulo), el disponible y el exceso;
  - "Autorizar y registrar" reenvía el mismo formulario con `autorizarCredito = true`;
  - "Cancelar" no registra nada.
- [X] T025 [P] [US2] En `components/admin/ventas/bulkSalesEditor.tsx`, añadir la casilla "Autorizo las ventas que exceden el crédito", junto a la de confirmación de cobros, que envía `autorizarCredito`.

**Checkpoint**: crédito configurable y ventas sobre el crédito autorizadas y registradas (SC-012).

---

## Phase 5: User Story 3 - Guardar a favor lo que el cliente paga de más (Priority: P1)

**Goal**: Libro de saldo a favor: sobrepago, pago a cuenta, aplicación a pedidos, devolución al cancelar, anulación segura y ajustes (FR-012 a FR-018).

**Independent Test**: [quickstart.md](./quickstart.md) § US3.

### Tests for User Story 3

- [X] T026 [P] [US3] Crear `tests/admin/saldo-a-favor.test.ts` con las reglas puras de T028. Casos:
  - `dividirAbono(20, 18)` → `{ aplicadoUsd: 18, excedenteUsd: 2 }`;
  - monto igual al saldo → excedente 0;
  - comparación en centavos (`0.1 + 0.2`);
  - `repartirBs`: la suma es exacta y el último centavo va al excedente;
  - `calcularSaldoAFavor` con montos de signo mixto;
  - `validarAplicacionSaldo`: monto ≤ 0, monto > disponible (`Solo tienes USD {d} a favor.`), monto > saldo del pedido (`El pedido solo debe USD {s}.`) y caso válido.
- [X] T027 [P] [US3] Crear `tests/admin/saldo-a-favor.integration.test.ts` (`skip: !integrationEnabled`). Casos:
  - abono de USD 20 sobre un saldo de USD 18 con `permitirExcedente`: el `Pago` es de 18, hay un movimiento `sobrepago` de +2 enlazado al `pagoId` y el pedido queda `pagado`;
  - el mismo abono sin `permitirExcedente` → error y nada escrito;
  - `registrarPagoACuenta` en Bs, convertido con la tasa;
  - `aplicarSaldoAFavorEnPedido`: `Pago` `SaldoAFavor`, movimiento −monto y pedido pagado al saldar;
  - cancelación de un pedido por cobrar con USD 10 abonados → movimiento `pedido_cancelado` de +10;
  - cancelación de un pedido importado con abono → también devuelve;
  - anular un abono cuyo excedente ya se aplicó a otro pedido → rechazo con el mensaje de FR-017;
  - anular un abono `SaldoAFavor` → movimiento `anulacion` positivo;
  - dos `aplicarSaldoAFavorEnPedido` simultáneos (`Promise.allSettled`) que juntos superan el saldo → uno falla y el saldo nunca queda negativo;
  - `ajustarSaldoAFavor` que dejaría el saldo negativo → rechazo.

### Implementation for User Story 3

- [X] T028 [US3] Completar `lib/saldo-a-favor.ts` con las reglas puras de [contracts/ficha-saldo-credito.md](./contracts/ficha-saldo-credito.md) §3:
  - `calcularSaldoAFavor(movimientos)`;
  - `dividirAbono(montoUsd, saldoUsd)`;
  - `repartirBs(montoBs, aplicadoUsd, montoUsd)`;
  - `validarAplicacionSaldo({ montoUsd, disponibleUsd, saldoPedidoUsd })`, con los mensajes exactos del contrato;
  - `saldoAFavorDisponible(tx, clienteId)` (`aggregate _sum montoUsd`, redondeado).

  Reutilizar `roundMoney` de `./admin/sales-calculations.ts`.
- [X] T029 [US3] Añadir los núcleos a `lib/saldo-a-favor.ts`:
  - **`registrarPagoACuenta(tx, input, actor)`**: `bloquearCliente`; convierte a USD con `convertirAbonoAUsd`; crea el movimiento `pago_cuenta` (+) con `metodoPago`, `referencia` ("Hasta 120 caracteres"), `fechaPago`, `montoBs` y `tasaCambio`; devuelve el saldo nuevo.
  - **`aplicarSaldoAFavorEnPedido(tx, { transaccionId, montoUsd }, actor | null)`**:
    1. lee el `clienteId` del pedido sin bloquear y llama a `bloquearCliente`;
    2. valida con `validarAplicacionSaldo`, usando `saldoAFavorDisponible` y `calcularSaldo` del pedido;
    3. llama a `registrarAbonoEnPedido(tx, { transaccionId, moneda: "usd", monto: montoUsd, metodoPago: "SaldoAFavor", fechaPago: new Date() }, actor ?? { id: "cliente", email: null })`;
    4. crea el movimiento `aplicacion_pedido` (−montoUsd) con `pagoId` y `transaccionId`.
  - **`ajustarSaldoAFavor(tx, { clienteId, montoUsd, motivo }, actor)`**: motivo de 3 a 240 caracteres; rechaza con `El ajuste dejaría el saldo a favor en negativo.`
  - **`devolverAbonosDeCancelacion(tx, pedido, actor)`**: con `abonado = calcularAbonado(pedido.pagos)`, si es mayor que 0 crea el movimiento `pedido_cancelado` (+abonado) con `transaccionId`; devuelve el monto.

  Importar `registrarAbonoEnPedido`, `calcularSaldo`, `calcularAbonado` y `convertirAbonoAUsd` desde `./admin/abonos.ts`.
- [X] T030 [US3] Modificar `registrarAbonoEnPedido` en `lib/admin/abonos.ts`:
  - `AbonoInput` gana `permitirExcedente?: boolean`;
  - antes del `FOR UPDATE` del pedido, leer su `clienteId` y llamar a `bloquearCliente` (importado de `../saldo-a-favor.ts`). Si no se puede importar por dependencia circular, mover `bloquearCliente` a `lib/admin/abonos.ts` y reexportarlo desde `lib/saldo-a-favor.ts`;
  - calcular `dividirAbono`. Con excedente y sin `permitirExcedente`, mantener el error actual de `validarMontoAbono`;
  - con permiso, crear el `Pago` por `aplicadoUsd` (`montoBs = pagoBs` con `repartirBs` si es en Bs) y el `MovimientoSaldo` `sobrepago` (+`excedenteUsd`, `excedenteBs`, mismo método, referencia, fecha y tasa) con `pagoId`;
  - el resultado añade `pagoId` y `excedenteUsd`;
  - los métodos `SaldoAFavor` no aceptan excedente.
- [X] T031 [US3] Modificar `anularAbonoEnPedido` en `lib/admin/abonos.ts`:
  - `bloquearCliente` antes del `FOR UPDATE`;
  - si `pago.metodoPago === "SaldoAFavor"`, crear el movimiento `anulacion` (+montoUsd, `pagoId: null`, `transaccionId`, `motivo: "Anulación de saldo aplicado"`);
  - si existe un `MovimientoSaldo` `sobrepago` con ese `pagoId`, comprobar que `saldoAFavorDisponible − excedente ≥ 0` (si no: `No se puede anular: el excedente de este abono ya se usó. Revierte primero la aplicación de ese saldo.`) y crear el movimiento `anulacion` (−excedente).
- [X] T032 [US3] En `lib/admin/order-state-change.ts`, cuando la operación es una cancelación:
  - `bloquearCliente(tx, transaction.clienteId)` antes del `updateMany` condicionado;
  - después de la devolución de inventario, `devolverAbonosDeCancelacion(tx, transaction, actor)`, también si `importada`;
  - devolver `saldoDevueltoUsd` en el resultado.
- [X] T033 [US3] Etiqueta y exclusión en los selectores (`lib/admin/status.ts`, `components/admin/ventas/abonosPanel.tsx`, `components/admin/ventas/manualSaleForm.tsx`):
  - en `lib/admin/status.ts`, añadir `SaldoAFavor: "Saldo a favor"` a `paymentLabels`;
  - excluir `SaldoAFavor` y `NoEspecificado` de los selectores de método de cobro de `components/admin/ventas/abonosPanel.tsx` y `manualSaleForm.tsx`, y de los esquemas Zod de `registrarAbono` y `registrarPagoACuenta` (`refine`).
- [X] T034 [US3] Crear `lib/actions/admin-cuenta-corriente.ts` (`"use server"`), con tres acciones que llaman a `requireAdmin()` y Zod, ejecutan el núcleo en `prisma.$transaction` y devuelven `{ success, message }` con los mensajes de [contracts/ficha-saldo-credito.md](./contracts/ficha-saldo-credito.md) §3:
  - **`registrarPagoACuenta(formData)`**: `clienteId`, `moneda`, `monto` > 0 con 2 decimales, `tasaCambio` (obligatoria si es `bs`), `metodoPago`, `referencia?` y `fechaPago` ≤ hoy.
  - **`aplicarSaldoAFavor(formData)`**: `transaccionId` y `montoUsd`.
  - **`ajustarSaldoAFavor(formData)`**: `clienteId`, `montoUsd` ≠ 0 y `motivo` de 3 a 240.

  Cada una revalida `/admin/clients/{clienteId}`, `/admin/transactions/{id}` si aplica, `/admin/transactions` y `/mi-cuenta`.
- [X] T035 [US3] En `lib/actions/admin-orders.ts`:
  - `registrarAbono` lee `permitirExcedente` y, si `excedenteUsd > 0`, devuelve `Abono registrado. El pedido {n} quedó pagado y USD {e} quedaron a favor del cliente.`;
  - `actualizarEstadoPedido` añade `" USD {x} quedaron a favor del cliente."` al mensaje de cancelación cuando `saldoDevueltoUsd > 0`;
  - revalidar `/admin/clients/{clienteId}`.
- [X] T036 [US3] Actualizar `components/admin/ventas/abonosPanel.tsx`:
  - si el monto en USD supera el saldo, mostrar "USD {aplicado} saldan el pedido, USD {excedente} quedan a favor del cliente" (con `dividirAbono`) y pedir confirmación antes de enviar `permitirExcedente=true`;
  - añadir "Usar saldo a favor", visible si el cliente tiene saldo mayor que 0. La página pasa `saldoAFavorUsd` desde `app/admin/transactions/[id]/page.tsx`. El campo tiene como tope `min(saldo a favor, saldo del pedido)` y llama a `aplicarSaldoAFavor`;
  - toasts de sonner.
- [X] T037 [P] [US3] Crear en `components/admin/clientes/ficha/`:
  - `fichaSaldoAFavor.tsx`: tabla de movimientos con fecha, monto con signo, origen legible, pedido enlazado, método, referencia, autor y motivo;
  - modal `pagoACuentaModal.tsx` (moneda, monto, tasa con la de `hooks/useDolar.ts` por defecto, método, referencia y fecha);
  - modal `ajusteSaldoModal.tsx` (monto con signo y motivo obligatorio).

  Integrarlos en `app/admin/clients/[id]/page.tsx`.
- [X] T038 [US3] Aplicar saldo a favor en la venta manual (`lib/actions/admin-sales.ts` y `components/admin/ventas/manualSaleForm.tsx`):
  - nuevo campo `saldoAFavorUsd` (≥ 0, 2 decimales);
  - después de crear el pedido y sus líneas, si es mayor que 0, `aplicarSaldoAFavorEnPedido(tx, { transaccionId, montoUsd }, actor)`;
  - la regla de crédito de T022 pasa a `montoSinCobrar = total − saldoAFavorUsd`;
  - el formulario muestra el saldo a favor del cliente elegido, con una acción de servidor de lectura o con el dato que ya carga la página, y un campo "Usar saldo a favor" con tope `min(saldo, total)`.
- [X] T039 [US3] Proteger el cambio de cliente en `guardarEdicionMasivaVentas` (`lib/actions/admin-sales.ts`): si `row.clienteId !== transaction.clienteId` y el pedido tiene `Fidelidad` o `MovimientoSaldo` con su `transaccionId`, lanzar `La venta {n} tiene puntos o saldo a favor asociados y no puede cambiar de cliente.`

**Checkpoint**: el saldo a favor funciona de punta a punta (SC-003, SC-004 y la parte de saldo de SC-005).

---

## Phase 6: User Story 4 - Acumular puntos con cada compra (Priority: P2)

**Goal**: Los consumidores acumulan 1 punto por cada USD entero de productos al quedar pagado el pedido, una sola vez. Se revierte al cancelar y hay ajustes manuales (FR-019 a FR-025).

**Independent Test**: [quickstart.md](./quickstart.md) § US4 y US5, pasos 2, 3 y 5.

### Tests for User Story 4

- [X] T040 [P] [US4] Crear `tests/admin/fidelidad.test.ts` con las reglas de T042. Casos:
  - `participaEnFidelidad`: `detal` no importado → `true`; `mayorista` → `false`; importado → `false`;
  - `calcularPuntosGanados({ 25.80, 0, 0 })` → 25; con descuentos → base después de descuentos; montos que dan `x.9999…` por flotantes → entero correcto; nunca negativo;
  - `topeReversion`: sin uso → revierte todo; con puntos ya gastados → revierte hasta dejar 0.
- [X] T041 [P] [US4] Crear `tests/admin/fidelidad.integration.test.ts` (`skip: !integrationEnabled`). Casos:
  - acreditación única en cada camino: `registrarAbonoEnPedido` que salda, `aplicarCambioEstadoPedido` a `pagado`, venta manual con `estadoInicial = pagado` (núcleo de T022 si se extrajo) y editor masivo a `pagado`;
  - `pagado → por_cobrar → pagado` no vuelve a acreditar;
  - un pedido con `acumulacion` antigua no vuelve a acreditar;
  - mayorista → 0 puntos;
  - cancelar un pedido por cobrar con acumulación antigua → `reversion`; si el cliente ya gastó parte, el tope deja el saldo en 0 y el motivo es "Reversión parcial…";
  - `ajustarPuntos` que deja el saldo negativo → rechazo;
  - el checkout web ya no crea `acumulacion` al registrar el pedido.

### Implementation for User Story 4

- [X] T042 [US4] Crear `lib/fidelidad.ts` (imports relativos) con las reglas puras de [contracts/fidelidad.md](./contracts/fidelidad.md) §1: `participaEnFidelidad`, `calcularPuntosGanados`, `calcularPuntos` y `topeReversion`.
- [X] T043 [US4] Añadir los núcleos a `lib/fidelidad.ts` ([contracts/fidelidad.md](./contracts/fidelidad.md) §3):
  - **`acreditarPuntosPorPago(tx, transaccionId)`**: lee el pedido y el `tipoCliente`; termina si no está `pagado`, si no participa o si ya existe una `acumulacion` con ese `transaccionId`; si no, crea la `acumulacion` y devuelve los puntos.
  - **`revertirPuntosDePedido(tx, { transaccionId, clienteId }, actor)`**:
    - `devolucion` (+canjeados) con la descripción `"Devolución por cancelación del pedido {n}"`;
    - `reversion` (−`topeReversion`), con el motivo de reversión parcial cuando corresponde.
  - **`ajustarPuntos(tx, { clienteId, puntos, motivo }, actor)`**: `bloquearCliente`; motivo de 3 a 240; `El ajuste dejaría los puntos en negativo.`
- [X] T044 [US4] Llamar a `acreditarPuntosPorPago` en los caminos de pago del panel (`lib/admin/abonos.ts`, `lib/admin/order-state-change.ts`, `lib/actions/admin-sales.ts`):
  - `lib/admin/abonos.ts`: `registrarAbonoEnPedido`, después del historial "Saldado con abonos", lo que cubre también `aplicarSaldoAFavorEnPedido`;
  - `lib/admin/order-state-change.ts`: cuando `next === "pagado"`;
  - `lib/actions/admin-sales.ts`: `registrarVentaManual` con `estadoInicial === "pagado"`, y `guardarEdicionMasivaVentas` en filas existentes y nuevas que quedan `pagado`.

  Nunca en `lib/admin/sales-import.ts`.
- [X] T045 [US4] En `lib/admin/order-state-change.ts`, al cancelar y después de `devolverAbonosDeCancelacion`, llamar a `revertirPuntosDePedido(tx, { transaccionId, clienteId }, actor)`.
- [X] T046 [US4] En `lib/actions/checkout.ts`, eliminar el bloque que crea la `Fidelidad` `acumulacion` (`const puntosGanados = Math.floor(totals.montoTotal)` …) y ajustar `tests/checkout/checkout.integration.test.ts`, que hoy espera esos puntos ("…historial, puntos y descuenta stock"): ahora no debe existir una `acumulacion` para un pedido por cobrar.
- [X] T047 [US4] Añadir `ajustarPuntosCliente(formData)` en el nuevo `lib/actions/admin-fidelidad.ts` (`"use server"`):
  - `requireAdmin()`;
  - Zod: `clienteId`, `puntos` entero ≠ 0 y `motivo` de 3 a 240;
  - `ajustarPuntos` en una transacción;
  - mensaje `Ajuste registrado. Puntos disponibles: {n}.`;
  - revalida la ficha y `/mi-cuenta`.
- [X] T048 [P] [US4] Crear `components/admin/clientes/ficha/fichaPuntos.tsx`:
  - puntos disponibles y tabla de movimientos con fecha, puntos con signo, tipo legible (Acumulación, Canje, Devolución, Reversión, Ajuste), descripción, pedido enlazado, autor y motivo;
  - modal `ajustePuntosModal.tsx`;
  - integrarlos en la ficha.
- [X] T049 [P] [US4] Mensajes de puntos en la tienda (`app/confirmacion/page.tsx`, `components/finalizar-compra/orderSuccess.tsx`):
  - `app/confirmacion/page.tsx` y `components/finalizar-compra/orderSuccess.tsx`: si el cliente participa (`participaEnFidelidad`) y el pedido no está pagado, "Ganarás {calcularPuntosGanados} puntos cuando confirmemos tu pago"; si está pagado, "Ganaste {n} puntos", con la `acumulacion` del pedido;
  - eliminar el uso del antiguo `puntosGanados` si queda sin origen.

**Checkpoint**: los puntos se acumulan una sola vez en todos los caminos (SC-006).

---

## Phase 7: User Story 5 - Canjear puntos por descuentos o productos gratis (Priority: P2)

**Goal**: Catálogo de premios y canje en la venta manual y en pedidos pendientes, con descuento en `montoDescuentoPuntos`, producto gratis a precio 0 y devolución al cancelar (FR-026 a FR-031).

**Independent Test**: [quickstart.md](./quickstart.md) § US4 y US5, pasos 1 y 4.

### Tests for User Story 5

- [X] T050 [P] [US5] Ampliar `tests/admin/fidelidad.test.ts` con `validarCanjes`. Casos:
  - premio inactivo → error;
  - puntos insuficientes → `No tienes puntos suficientes para {nombre}.`;
  - descuento mayor que `subtotal − descuento` → `El descuento del premio supera el monto del pedido.`;
  - dos premios válidos → suma de descuentos y de costos, y `lineasGratis`.

  Ampliar `tests/admin/sales-calculations.test.ts` con `calculateSaleTotals(…, descuentoPuntosUsd)`: total = subtotal − descuento − descuento por puntos, y error si la suma supera el subtotal.
- [X] T051 [P] [US5] Ampliar `tests/admin/fidelidad.integration.test.ts`. Casos:
  - canje de descuento en la venta manual → `montoDescuentoPuntos`, `montoTotal` y movimiento `redencion` (−costo) con `descripcion`;
  - canje de producto en un pedido por cobrar (`canjearPremioEnPedido`) → línea con precio 0 y `tipoPrecio: promo`, inventario −cantidad y puntos −costo;
  - producto sin existencia → `No hay existencia para el premio {nombre}.` y nada escrito;
  - un descuento que deja el saldo en 0 → pedido pagado y acreditación sobre la base sin el descuento;
  - cancelar un pedido con canjes → `devolucion` e inventario devuelto;
  - `actualizarDescuentoVenta` conserva `montoDescuentoPuntos`;
  - dos canjes simultáneos que superan los puntos → uno falla.

### Implementation for User Story 5

- [X] T052 [US5] En `lib/admin/sales-calculations.ts`:
  - `calculateSaleTotals(lines, discount, tasaCambio, descuentoPuntosUsd = 0)`;
  - `descuentoUsd + descuentoPuntosUsd > subtotalUsd` lanza `El descuento no puede superar el subtotal`;
  - `totalUsd = roundMoney(subtotal − descuento − descuentoPuntos)`;
  - `SaleTotals` gana `descuentoPuntosUsd`.

  Actualizar las llamadas de `lib/actions/admin-sales.ts` (`actualizarDescuentoVenta` y las filas existentes de `guardarEdicionMasivaVentas`) para que pasen `transaction.montoDescuentoPuntos`.
- [X] T053 [US5] Añadir a `lib/fidelidad.ts`:
  - `validarCanjes` (pura);
  - `canjearPremios(tx, { clienteId, transaccionId, premioIds, subtotalUsd, descuentoUsd }, actor | null)`: exige que quien la llama haya bloqueado al cliente; crea los movimientos `redencion` con `premioId` y `descripcion`, llama a `ajustarInventario(tx, productoId, −cantidad, { exigirStock: true })` y crea `DetalleCompra` con `precioUnitario: 0` y `tipoPrecio: "promo"` para los premios de producto; convierte `StockInsuficienteError` en `No hay existencia para el premio {nombre}.`; devuelve `descuentoPuntosUsd`;
  - `canjearPremioEnPedido(tx, { transaccionId, premioId }, actor)`, según el contrato §3: estados admitidos, `montoDescuentoPuntos` y `montoTotal`, `validarTotalContraAbonado`, paso a pagado con el historial "Saldado con canje de puntos" más `acreditarPuntosPorPago`, e historial sin cambio de estado `"Canje: {premio} (−{costo} puntos)"`.
- [X] T054 [US5] Añadir a `lib/actions/admin-fidelidad.ts`:
  - **`crearPremio(prev, formData)`** y **`actualizarPremio(prev, formData)`**: Zod con `superRefine` por tipo, con las reglas literales del modelo: `nombre` "De 3 a 80 caracteres", `descripcion` "Hasta 240 caracteres", `costoPuntos` "Mayor que 0" (entero), `montoDescuentoUsd` "Obligatorio y mayor que 0 si `tipo = descuento`" (2 decimales), `productoId` "Obligatorio si `tipo = producto`" (existente) y `cantidad` "Entero mayor que 0, obligatorio si `tipo = producto`".
  - **`cambiarEstadoPremio(formData)`**.
  - **`canjearPremio(formData)`** (`transaccionId` y `premioId`, sobre `canjearPremioEnPedido`).

  Mensajes del contrato §2 y §4. Revalidan `/admin/clients/rewards`, `/admin/transactions/{id}`, la ficha y `/mi-cuenta`.
- [X] T055 [P] [US5] Crear `app/admin/clients/rewards/page.tsx` (`requireAdmin`) con `components/admin/clientes/premios/rewardsTable.tsx` y `rewardForm.tsx` (modal):
  - la tabla muestra nombre, tipo, costo, recompensa ("USD x" o "{cantidad} × {producto}"), estado, número de canjes y acciones de editar y activar o desactivar;
  - el formulario usa `useActionState` y toasts, y el selector de producto lista el catálogo con `ORDEN_CATALOGO`;
  - añadir el botón "Premios" en la cabecera de `app/admin/clients/page.tsx`.
- [X] T056 [US5] Canjes en la venta manual (`lib/actions/admin-sales.ts` y `components/admin/ventas/manualSaleForm.tsx`):
  - nuevo campo `canjes` (JSON `number[]`);
  - dentro de la transacción, después de `bloquearCliente`, validar con `validarCanjes` para conocer `descuentoPuntosUsd` y calcular `calculateSaleTotals(…, descuentoPuntosUsd)`;
  - crear el pedido con `montoDescuentoPuntos` y después llamar a `canjearPremios` con el `transaccionId`;
  - la regla de crédito y el saldo a favor usan el total ya descontado;
  - el formulario muestra los puntos del cliente elegido y los premios activos que puede pagar, como casillas, con el total actualizado.
- [X] T057 [US5] En `components/admin/ventas/abonosPanel.tsx` (o junto a él en `app/admin/transactions/[id]/page.tsx`), añadir el botón "Canjear premio":
  - lista los premios activos con `costoPuntos ≤` puntos del cliente;
  - llama a `canjearPremio` y notifica con toast.

  Mostrar en el detalle del pedido los canjes (movimientos `redencion` del pedido) y el `montoDescuentoPuntos` en el desglose de totales.

**Checkpoint**: premios y canjes funcionan en el panel y se revierten al cancelar (SC-005 completo).

---

## Phase 8: User Story 6 - Registrarme en la tienda y ver mis puntos y mi saldo (Priority: P2)

**Goal**: `/mi-cuenta` con registro, vinculación segura, resumen del cliente y compras asociadas a la sesión (FR-036 a FR-043).

**Independent Test**: [quickstart.md](./quickstart.md) § US6.

### Tests for User Story 6

- [X] T058 [P] [US6] Crear `tests/checkout/cuenta-cliente-rules.test.ts` con todas las filas de la tabla de `resolverVinculacion` de [contracts/cuenta-cliente.md](./contracts/cuenta-cliente.md) §3: `verificar_correo`, `vincular`, `conflicto` por correo, `pedir_datos`, `pendiente`, `conflicto` por teléfono y `crear_cliente`.
- [X] T059 [P] [US6] Mover el import de `tests/checkout/checkout.integration.test.ts` de `../../lib/actions/checkout.js` a `../../lib/checkout-core.js` (llamando a `registrarCompraWeb(datos, { clienteSesionId: null })`) y añadir el caso: con `clienteSesionId` definido, el pedido queda en ese cliente aunque `datos.clientId` sea otro (FR-041).

### Implementation for User Story 6

- [X] T060 [US6] Crear `lib/cuenta-cliente-rules.ts` con `resolverVinculacion(input)` (pura), según el contrato §3.
- [X] T061 [US6] Crear `lib/cuenta-cliente.ts` (`import "server-only"`):
  - **`obtenerSesionCliente(): Promise<SesionCliente>`**:
    1. lee `stackServerApp.getUser()`. Sin usuario → `anonimo`; con `!primaryEmailVerified` → `correo_sin_verificar`;
    2. busca `CuentaCliente` por `stackUserId`: si es `pendiente` → `pendiente`; si es `vinculada` → carga el cliente;
    3. sin cuenta, busca el `Cliente` por correo (`mode: "insensitive"`) y aplica `resolverVinculacion`. Con `vincular`, crea la `CuentaCliente` (`email` en minúsculas) en una transacción y captura el error de unicidad (P2002) para releer. Con `conflicto` o `pedir_datos` → `sin_vinculo`.
  - **`obtenerClienteDeSesion()`**: devuelve el `clienteId` solo si la sesión está `vinculada`.
  - **`obtenerResumenCuenta(clienteId): Promise<ResumenCuenta>`**, según el contrato §6:
    - `puntos.mostrar = tipoCliente === "detal" || disponibles > 0`;
    - premios activos con `faltan = max(0, costo − puntos)`;
    - deuda con `consultarDeudaCliente` y pedidos pendientes con su saldo;
    - movimientos de saldo con un concepto legible y **sin** autor ni motivo (los ajustes se muestran como "Ajuste");
    - los 50 movimientos y pedidos más recientes;
    - **nunca** incluye notas, límite de crédito, RIF ni `actorEmail`.
- [X] T062 [US6] Crear `lib/actions/cuenta-cliente.ts` (`"use server"`) con `completarRegistroCliente(prev, formData)`, según el contrato §4:
  - exige una sesión `sin_vinculo` con correo verificado;
  - Zod: `nombre` y `apellido` de 2 a 60, y `celular` normalizado como en `lib/actions/admin-clients.ts`, con mínimo 10 dígitos;
  - en una transacción, busca por correo y por teléfono, aplica `resolverVinculacion` y crea la `CuentaCliente` (`vinculada` o `pendiente`), o el `Cliente` `detal` (`email` de la sesión, `nombreBusqueda` con `normalizeSearchName`) más la `CuentaCliente` `vinculada` y un `HistorialCliente` `creado` con `actorId: "cliente:{stackUserId}"`;
  - mensajes del contrato;
  - revalida `/mi-cuenta`.
- [X] T063 [P] [US6] Crear los componentes de `components/mi-cuenta/`, móvil primero, con los tokens de la tienda (`DESIGN.md`) y toasts de sonner:
  - `accesoCliente.tsx`: enlaces "Ingresar" a `/handler/sign-in?after_auth_return_to=/mi-cuenta` y "Crear cuenta" a `/handler/sign-up?after_auth_return_to=/mi-cuenta`;
  - `verificarCorreo.tsx`: aviso y reenvío con el método de verificación del usuario de Stack en el cliente;
  - `registroCliente.tsx`: formulario con `useActionState` sobre `completarRegistroCliente`;
  - `vinculoPendiente.tsx`: sin ningún dato del cliente;
  - `resumenCuenta.tsx`, con tarjetas de puntos, deuda y saldo a favor, sin desplazamiento horizontal a 360 px, y secciones de movimientos de puntos, premios con "te faltan N", pedidos pendientes, movimientos de saldo e historial de pedidos;
  - "Cerrar sesión" con el cierre de sesión de Stack.
- [X] T064 [US6] Crear `app/mi-cuenta/page.tsx` (`dynamic = "force-dynamic"`):
  - `obtenerSesionCliente()` y renderizado por estado (contrato §5);
  - con `vinculada`, `obtenerResumenCuenta(sesion.clienteId)`;
  - `metadata` en español y la cabecera de la tienda.

  Verificar a mano que `after_auth_return_to` regresa a `/mi-cuenta`. Si no lo hace, usar los componentes `<SignIn/>` y `<SignUp/>` embebidos como en `components/auth/adminSignIn.tsx` (research R3).
- [X] T065 [US6] Cabecera de la tienda (`app/productos/layout.tsx`, `components/productos/header.tsx`, `components/productos/loginButton.tsx`):
  - `app/productos/layout.tsx` lee `obtenerSesionCliente()` y pasa `cuenta: { nombre } | null` a `components/productos/header.tsx` y de ahí a `components/productos/loginButton.tsx`;
  - el botón muestra el nombre o "Ingresar" y enlaza a `/mi-cuenta`;
  - eliminar la búsqueda por teléfono, el `console.log` y el uso de `getClientByPhone` y `setClient` en ese componente;
  - revisar los demás usos de `Header` (`grep -rn "productos/header"`) para pasar `cuenta` o `null`.
- [X] T066 [US6] Añadir a `lib/actions/admin-clients.ts`:
  - **`confirmarVinculacionCuenta(formData)`**: `pendiente → vinculada`, con `confirmadaPorEmail` y `confirmadaEn`; error si ya está vinculada; `HistorialCliente` con `camposModificados: ["cuenta"]` y `detalle: "Cuenta web vinculada ({email})"`.
  - **`desvincularCuenta(formData)`**: borra la `CuentaCliente`; `HistorialCliente` con `detalle: "Cuenta web desvinculada ({email})"`.

  Las dos llaman a `requireAdmin()` y revalidan la ficha y `/mi-cuenta`. Añadir los botones "Confirmar vinculación" y "Desvincular" (este con confirmación) en `components/admin/clientes/ficha/fichaCuentaWeb.tsx`.
- [X] T067 [US6] Extraer el núcleo del checkout a `lib/checkout-core.ts` (desde `lib/actions/checkout.ts`):
  - mover el cuerpo de `procesarCompra` a `registrarCompraWeb(datos, { clienteSesionId })` en el nuevo `lib/checkout-core.ts`, sin `"use server"` ni `server-only` y con imports relativos, incluidos los tipos `CheckoutData`, `CheckoutSuccess`, `CheckoutFailure` y `CheckoutError`;
  - con `clienteSesionId` no nulo, el cliente del pedido es ese y se ignora `datos.clientId` (FR-041);
  - `lib/actions/checkout.ts` queda como `procesarCompra(prev, datos) = registrarCompraWeb(datos, { clienteSesionId: await obtenerClienteDeSesion() })` y reexporta los tipos;
  - no cambiar los mensajes ni los códigos existentes.
- [X] T068 [US6] Rellenar el checkout desde la sesión (`app/finalizar-compra/page.tsx`, `components/finalizar-compra/personalInformation.tsx`):
  - `app/finalizar-compra/page.tsx` lee `obtenerSesionCliente()` y, si está `vinculada`, pasa `clienteSesion: { id, nombre, apellido, email, celular, tipoCliente }` (sin RIF);
  - en `components/finalizar-compra/personalInformation.tsx`, con `clienteSesion`: rellena los campos, bloquea el celular, omite `getClientByPhone` y fija `clientId` en el contexto y en el store como hoy.

**Checkpoint**: el cliente se registra y ve exactamente lo mismo que su ficha. El panel está cerrado para las cuentas de cliente (SC-007, SC-008, SC-009).

---

## Phase 9: User Story 7 - Usar mis puntos y mi saldo a favor al comprar en la tienda (Priority: P3)

**Goal**: En el paso de pago, el cliente con sesión canjea premios y aplica su saldo a favor. El servidor revalida todo en la misma transacción (FR-030 y FR-032 a FR-035).

**Independent Test**: [quickstart.md](./quickstart.md) § US7.

### Tests for User Story 7

- [X] T069 [P] [US7] Ampliar `tests/checkout/checkout.integration.test.ts` (sobre `registrarCompraWeb`). Casos:
  - con sesión, canje de descuento más saldo parcial → `montoDescuentoPuntos`, `Pago` `SaldoAFavor`, movimiento −saldo, `Pago` declarado por `montoAPagar` y estado `en_pedido`;
  - saldo que cubre todo con `pago: null` → `pagado`, historial "Pagado con saldo a favor" y `acumulacion`;
  - beneficios sin sesión → `BENEFITS_UNAVAILABLE` y nada escrito;
  - saldo gastado por otra operación antes de confirmar → `BENEFITS_CHANGED`, sin pedido ni movimientos, inventario intacto;
  - premio de producto sin existencia → `BENEFITS_CHANGED`;
  - reproducción idempotente de un pedido `pagado` → devuelve el mismo pedido.

### Implementation for User Story 7

- [X] T070 [US7] Ampliar `lib/checkout-core.ts` según [contracts/checkout-beneficios.md](./contracts/checkout-beneficios.md) §2 y §3:
  - `CheckoutData.beneficios?` y `pago` nulo;
  - `CheckoutSuccess.estado` con `"pagado"`;
  - los códigos `BENEFITS_UNAVAILABLE` y `BENEFITS_CHANGED` con sus mensajes;
  - el orden de 15 pasos del contrato: bloqueo del cliente, `validarCanjes`, `calculateCheckoutTotals(lineas, delivery, descuentoPuntosUsd)`, validación del saldo, `validatePaymentInput` contra `montoAPagar`, `canjearPremios`, `aplicarSaldoAFavorEnPedido(tx, …, null)`, pago declarado solo si `montoAPagar > 0`, historial y `acreditarPuntosPorPago` si es `pagado`;
  - la reproducción idempotente acepta `pagado`.

  Reexportar los tipos nuevos desde `lib/actions/checkout.ts`.
- [X] T071 [US7] Añadir `obtenerBeneficiosCheckout()` en `lib/actions/cuenta-cliente.ts`, según el contrato §4. Deriva el cliente **solo** de `obtenerClienteDeSesion()` y devuelve los puntos, el saldo a favor y los premios activos con `costoPuntos ≤ puntos`, con `unidadesDisponibles(inventario)` para los de producto.
- [X] T072 [P] [US7] Crear `components/finalizar-compra/beneficiosCliente.tsx` (cliente):
  - llama a `obtenerBeneficiosCheckout()` al montar y no renderiza nada si no está disponible;
  - casillas de premios (el costo acumulado no puede superar los puntos; los de producto se deshabilitan sin existencia);
  - campo "Usar USD" de saldo a favor, con tope `min(saldo, total − descuentos)`, y el botón "Usar todo";
  - `onChange({ premioIds, saldoAFavorUsd, descuentoPuntosUsd })`;
  - método `recargar` expuesto por prop o `key`.
- [X] T073 [US7] Integrar los beneficios en `components/finalizar-compra/paymentInformation.tsx`:
  - selección en `useState` local, **sin** escribir en `store/appStore.ts` ni en `context/checkoutContext.tsx`;
  - `montoAPagar = finalTotalUSD − descuentoPuntosUsd − saldoAFavorUsd` reemplaza a `finalTotalUSD` en las instrucciones, `createPaymentRecord`, `validatePaymentInput` y los textos de copia;
  - con `montoAPagar === 0`, ocultar los métodos y campos de pago, enviar `pago: null` y mostrar "Confirmar pedido";
  - enviar `beneficios` en `CheckoutData`;
  - ante `BENEFITS_CHANGED`, `toast.error(response.message)` y recargar los beneficios.
- [X] T074 [US7] Actualizar `app/confirmacion/page.tsx`:
  - mostrar el saldo a favor aplicado (pagos `SaldoAFavor`) y los premios canjeados (movimientos `redencion` del pedido);
  - el mensaje de WhatsApp añade `*BENEFICIOS:*` con esas líneas cuando los hay;
  - el "Total" del mensaje distingue el total del pedido del monto pagado declarado.

**Checkpoint**: todas las historias funcionan de forma independiente (SC-010, SC-011).

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, verificación completa y revisión del diff.

- [X] T075 [P] Actualizar `README.md`:
  - `ALLOWED_EMAILS` es **obligatoria en producción**: con la lista vacía nadie entra al panel;
  - configuración en el dashboard de Stack Auth para el registro de clientes (registro abierto, métodos de acceso y verificación de correo);
  - rutas nuevas (`/mi-cuenta`, `/admin/clients/[id]`, `/admin/clients/rewards`).
- [X] T076 [P] Actualizar `CLAUDE.md`, en la sección Arquitectura:
  - **Autorización admin**: el panel falla cerrado y la regla está en `lib/admin/auth-rules.ts`.
  - **Cuenta del cliente**: `/mi-cuenta`, `CuentaCliente`, vinculación solo con correo verificado y `clienteId` que siempre sale de la sesión.
  - **Saldo a favor**: libro `MovimientoSaldo`, aplicación como abono `SaldoAFavor` y cancelación que devuelve lo abonado.
  - **Puntos**: `Fidelidad` con signo, `acreditarPuntosPorPago` al quedar pagado (solo `detal`, una vez por pedido, nunca en cargas de Excel) y reversión con tope al cancelar.
  - **Canjes**: `Transaccion.montoDescuentoPuntos` y línea `promo` a precio 0.
  - **Crédito**: autorización en el historial.
  - **Concurrencia**: orden de bloqueo Cliente → Transaccion.
  - **Checkout**: el núcleo vive en `lib/checkout-core.ts`.
  - Revisar que la línea de la carga de Excel siga diciendo que no toca inventario ni fidelidad.
- [X] T077 [P] Actualizar `docs/descripcion-tecnica.md` con los modelos y flujos nuevos (resumen de [data-model.md](./data-model.md) y de los flujos de [plan.md](./plan.md)).
- [X] T078 Sobre `tests/admin/` y `tests/checkout/`, ejecutar `npm.cmd run test:admin`, `npm.cmd run test:checkout`, ambas con `RUN_ADMIN_INTEGRATION=1` contra la base aislada, `npm.cmd run lint` y `npm.cmd run build`. Corregir las regresiones y declarar cualquier verificación omitida.
- [ ] T079 Recorrer [quickstart.md](./quickstart.md) completo en escritorio y a 360 px, incluida la prueba de `/admin` con una cuenta de cliente y sin `ALLOWED_EMAILS` en un build de producción.
- [X] T080 Revisar el diff completo (`prisma/`, `lib/`, `app/`, `components/`, `tests/`, documentación):
  - sin secretos ni datos reales de clientes;
  - sin cambios de la actualización a Next.js 16 mezclados;
  - sin código muerto (el `puntosGanados` huérfano y la búsqueda por teléfono de la cabecera eliminados);
  - ninguna escritura nueva en `store/appStore.ts` ni `context/checkoutContext.tsx`;
  - todas las notificaciones con sonner;
  - ningún `clienteId` del navegador usado en lecturas o escrituras de la cuenta del cliente.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup y **bloquea todas las historias**. T002 → T003 → resto. T004 y T005 en paralelo; T006 y T007 después de T004. T008 y T009 después de T003.
- **Historias (Phases 3 a 9)**: dependen de Foundational.
- **Polish (Phase 10)**: depende de las historias que se entreguen.

### User Story Dependencies

| Historia | Depende de | Notas |
|---|---|---|
| US1 (P1) | Foundational | La ficha muestra saldo y puntos aunque aún sean 0. |
| US2 (P1) | Foundational | `fichaCredito` se integra en la página de US1; si US1 no está, se monta después. |
| US3 (P1) | Foundational | T038 retoca la regla de crédito de T022: si US2 no está, solo se omite ese ajuste. |
| US4 (P2) | Foundational | Es independiente. T044 toca los mismos archivos que US2 y US3 (`admin-sales.ts`, `abonos.ts`, `order-state-change.ts`): hacerla después de ellas evita conflictos. |
| US5 (P2) | US4 | Necesita `lib/fidelidad.ts` y `acreditarPuntosPorPago`. |
| US6 (P2) | Foundational | `obtenerResumenCuenta` lee deuda, saldo y puntos. Funciona con valores en 0 si US3 y US4 no están. T067 extrae el núcleo del checkout que usa US7. |
| US7 (P3) | US3, US5 y US6 | Usa `aplicarSaldoAFavorEnPedido`, `canjearPremios`, la sesión y `lib/checkout-core.ts`. |

### Within Each User Story

- Primero las pruebas de reglas puras, después las reglas, los núcleos con `tx`, las Server Actions y la interfaz.
- Las pruebas de integración se escriben junto con el núcleo y deben fallar antes de implementarlo.
- Las tareas sobre el mismo archivo (`lib/actions/admin-sales.ts`, `lib/admin/abonos.ts`, `lib/admin/order-state-change.ts`, `components/admin/ventas/manualSaleForm.tsx` y `abonosPanel.tsx`) van en serie, en el orden de los IDs.

### Parallel Opportunities

- **Foundational**: T004 y T005.
- **US1**: T010, T013 y T014 (componentes distintos) mientras se escribe T011.
- **US2**: T017 y T018; T021, T024 y T025 después de T019, T020 y T022.
- **US3**: T026 y T027; T037 en paralelo con T034, T035 y T036.
- **US4**: T040 y T041; T048 y T049 en paralelo con T044 a T047.
- **US5**: T050 y T051; T055 en paralelo con T056 y T057.
- **US6**: T058 y T059; T063 en paralelo con T061 y T062.
- **US7**: T069 y T072 en paralelo con T070 y T071.
- **Polish**: T075, T076 y T077.
- **Historias completas**: con varias personas, US1, US2, US3 y US6 pueden avanzar en paralelo después de Foundational, coordinando los archivos compartidos.

---

## Parallel Example: User Story 3

```bash
# Pruebas primero (archivos distintos):
Task: "T026 Reglas puras de saldo a favor en tests/admin/saldo-a-favor.test.ts"
Task: "T027 Integración de saldo a favor en tests/admin/saldo-a-favor.integration.test.ts"

# Con los núcleos listos (T028–T032), la interfaz de la ficha va en paralelo con las acciones:
Task: "T037 fichaSaldoAFavor.tsx, pagoACuentaModal.tsx y ajusteSaldoModal.tsx en components/admin/clientes/ficha/"
Task: "T034 Server Actions en lib/actions/admin-cuenta-corriente.ts"
```

## Parallel Example: User Story 6

```bash
Task: "T058 Tabla de vinculación en tests/checkout/cuenta-cliente-rules.test.ts"
Task: "T059 Importar el núcleo en tests/checkout/checkout.integration.test.ts"
Task: "T063 Componentes de components/mi-cuenta/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) y Phase 2 (Foundational). El panel queda cerrado sin `ALLOWED_EMAILS`: es un cambio de seguridad que conviene desplegar solo.
2. Phase 3 (US1): la ficha.
3. **Parar y validar** con quickstart § US1. Desplegar.

### Incremental Delivery (las fases del plan)

1. **Fase 1 del plan (P1)**: Foundational, US1, US2 y US3. Ficha, crédito y saldo a favor. Validar y desplegar.
2. **Fase 2 del plan (P2)**: US4, US5 y US6. Puntos, premios y "Mi cuenta". Desplegar US6 solo después de confirmar `ALLOWED_EMAILS` en producción y el registro en Stack Auth.
3. **Fase 3 del plan (P3)**: US7. Beneficios en el checkout.

Cada fase deja el sistema consistente: los saldos y puntos que aún no se usan quedan en 0 y no alteran los flujos existentes.

### Parallel Team Strategy

1. El equipo completa Setup y Foundational.
2. Después:
   - **Persona A**: US1, luego US2.
   - **Persona B**: US3, luego US4 y US5.
   - **Persona C**: US6, luego US7, cuando US3 y US5 estén listas.

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- La etiqueta [USn] relaciona cada tarea con su historia.
- Hacer un commit por tarea o por grupo lógico, solo cuando la usuaria lo pida (rama `010-cuenta-cliente-fidelizacion` o la que indique).
- Toda notificación se hace con `toast` de `"sonner"`; la UI y los mensajes van en español.
- No añadir dependencias, capas ni frameworks de prueba (constitución, Principio I y V).
