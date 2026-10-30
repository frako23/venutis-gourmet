# Implementation Plan: Perfil del cliente, crédito, saldo a favor y fidelización

**Branch**: `010-cuenta-cliente-fidelizacion` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-cuenta-cliente-fidelizacion/spec.md`

## Summary

Cada cliente pasa a tener una cuenta completa en el sistema.

**En el panel**:

- una **ficha** con datos, indicadores, pedidos, deuda, crédito, saldo a favor, puntos e historial;
- **crédito** con límite, y una autorización registrada cuando una venta lo excede;
- un **saldo a favor** que nace de sobrepagos, pagos a cuenta y pedidos cancelados con abonos, y que se aplica a pedidos;
- un programa de **puntos** (solo consumidores, al quedar pagado el pedido) con un **catálogo de premios** canjeables por descuentos o productos gratis.

**En la tienda**:

- **"Mi cuenta"**, donde el cliente se registra con correo verificado y ve sus puntos, su deuda, su saldo a favor y sus pedidos;
- puntos y saldo a favor que el cliente puede usar al finalizar su compra.

**Enfoque técnico**: reutiliza el stack sin dependencias nuevas.

- **Deuda**: se sigue derivando de `calcularSaldo`.
- **Saldo a favor**: un libro de movimientos que solo admite inserciones (`MovimientoSaldo`). Aplicarlo es un abono con el método nuevo `SaldoAFavor`, así que salda pedidos con la regla de siempre.
- **Puntos**: la tabla `Fidelidad` que ya existe pasa a ser un libro con signo. Una sola función acredita los puntos, con su propia guarda, desde los seis caminos que dejan un pedido pagado.
- **Canjes**: son movimientos de puntos. El descuento va en `Transaccion.montoDescuentoPuntos` y el producto gratis en una línea a precio 0.
- **Concurrencia**: toda operación de dinero o puntos bloquea la fila del cliente antes que la del pedido.
- **Identidad**: los clientes usan la misma instancia de Stack Auth. El panel deja de aceptar a cualquier usuario autenticado cuando `ALLOWED_EMAILS` está vacía: falla cerrado.
- **Checkout**: su transacción se mueve a un núcleo que se puede probar, y el cliente del pedido sale de la sesión cuando la hay.

## Technical Context

**Language/Version**: TypeScript estricto, React 19.1 y Next.js 15.5 (App Router). Hay una actualización a Next.js 16 sin commit en el árbol de trabajo; el diseño no depende de APIs que cambien entre versiones (R15).

**Primary Dependencies**: Prisma 6, Zod 4, Stack Auth (`@stackframe/stack` 2.8), sonner y lucide-react. **Sin dependencias nuevas.**

**Storage**: PostgreSQL con Prisma. Una migración (`<timestamp>_cuenta_cliente_fidelizacion`):

- **Modelos nuevos**: `CuentaCliente`, `MovimientoSaldo` y `Premio`.
- **Campos nuevos**: `notasInternas`, `creditoHabilitado` y `limiteCreditoUsd` en `Cliente`; `detalle` en `HistorialCliente`; `montoDescuentoPuntos` en `Transaccion`; `motivo`, `actor`, `premioId` y `descripcion` en `Fidelidad`.
- **Enums**: valores nuevos en `TipoMovimiento` y `MetodoPago`, y tres enums nuevos.

Detalle en [data-model.md](./data-model.md).

**Testing**:

- `node:test` con `npm run test:admin` y `npm run test:checkout`.
- **Unitarias**: reglas de saldo a favor, fidelidad, crédito, vinculación y acceso al panel.
- **Integración** (`RUN_ADMIN_INTEGRATION=1`, base aislada): núcleos con bloqueo, cancelación, seis caminos de acreditación, concurrencia y checkout con beneficios.
- `npm run lint`, `npm run build` y [quickstart.md](./quickstart.md) en escritorio y en móvil.

**Target Platform**: Panel y tienda en navegadores modernos de escritorio y teléfono; servidor Node (Server Components y Server Actions).

**Project Type**: Aplicación web monolítica Next.js.

**Performance Goals**:

- La ficha de un cliente con hasta 500 pedidos carga en menos de 1 s.
- "Mi cuenta" carga en menos de 2 s en un teléfono.
- Confirmar una compra con beneficios agrega como mucho unas pocas consultas a la transacción actual.

**Constraints**:

- Cada operación de dinero o puntos es atómica junto con el cambio del pedido (FR-045).
- Ni el saldo a favor ni los puntos pueden quedar negativos, ni siquiera con operaciones simultáneas (bloqueo por cliente, R8).
- USD con 2 decimales.
- El cliente nunca ve notas internas, límite de crédito ni autores.
- Notificaciones solo con sonner y UI en español.
- Móvil primero en "Mi cuenta" y en el checkout.

**Scale/Scope**:

- Cientos de clientes y decenas de pedidos al mes; pocos premios.
- Movimientos de saldo y puntos del orden de los pedidos.
- Toca el **Panel administrativo** (ficha, premios, abonos, cancelación, venta manual y editor masivo) y la **Tienda pública** (`/mi-cuenta`, cabecera, checkout y confirmación).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la Constitución v2.0.0.

- [x] **I. Simplicidad ante todo (puerta de simplicidad)**:
  - **Alternativa más simple que cumple la spec**:
    - la deuda se deriva, no se guarda;
    - el saldo a favor es una tabla de movimientos, y aplicarlo es un abono que ya existe con un método más;
    - los puntos reutilizan `Fidelidad`, y los canjes son movimientos (sin tabla `Canje`);
    - el producto gratis es una línea a precio 0;
    - la autorización de crédito se registra en el historial de estado que ya existe;
    - "Mi cuenta" es una sola página y el inicio de sesión usa las páginas de Stack que ya existen;
    - la selección de beneficios del checkout es estado local del paso de pago.
  - **Qué se reutiliza**:
    - `requireAdmin`, Zod y sonner;
    - `calcularSaldo`, `calcularAbonado`, `registrarAbonoEnPedido`, `anularAbonoEnPedido` y `validarTotalContraAbonado`;
    - `aplicarCambioEstadoPedido`, `ajustarInventario` y su patrón de bloqueo;
    - `calculateSaleTotals` y `calculateCheckoutTotals` (su parámetro `descuento` ya existe);
    - `EstadoTransaccionHistorial`, `HistorialCliente` y `normalizeSearchName`;
    - el patrón `confirmarPagos` del editor masivo;
    - `/handler/[...stack]` y `stackServerApp`.
  - **Qué se añade**:
    - siete módulos de lógica:
      - `lib/saldo-a-favor.ts`, `lib/fidelidad.ts` y `lib/checkout-core.ts` (movido desde la acción);
      - `lib/cuenta-cliente.ts` y `lib/cuenta-cliente-rules.ts`;
      - `lib/admin/auth-rules.ts` y `lib/admin/client-profile.ts`;
    - tres archivos de acciones;
    - tres rutas (`/mi-cuenta`, `/admin/clients/[id]` y `/admin/clients/rewards`);
    - tres modelos;
    - los componentes de la ficha, de "Mi cuenta" y del bloque de beneficios.

    No hay dependencias, servicios externos ni capas nuevas. Cada adición está en *Complexity Tracking*.
  - **Complejidad existente que no se amplía**: el estado duplicado del checkout no se toca (R12). La simulación de sesión por teléfono de la cabecera se **elimina** (R3).
- [x] **II. Una sola fuente de verdad**:
  - **Escrituras**: son Server Actions con Zod, y sus núcleos (`tx`) viven en `lib/*`.
  - **Una regla, un lugar**:
    - deuda: `consultarDeudaCliente` sobre `calcularSaldo`, la misma que usan las cuentas por cobrar;
    - acreditación de puntos: `acreditarPuntosPorPago`;
    - canje: `canjearPremios`;
    - aplicación de saldo: `aplicarSaldoAFavorEnPedido`, sobre `registrarAbonoEnPedido`;
    - inventario: `ajustarInventario`.
  - **El checkout no abre otro camino de escritura**: su transacción se mueve a un núcleo y la acción la sigue invocando. El navegador no decide el cliente (si hay sesión), ni los puntos, ni el saldo, ni el total; el servidor revalida todo dentro de la transacción.
  - **Esquema**: el cambio va con su migración y `prisma generate`.
- [x] **III. Superficies con límites claros**:
  - **Tienda pública**: `/mi-cuenta` es una ruta nueva **dentro** de esta superficie, autorizada por esta spec. Cambia lo que persiste el checkout (canjes, saldo aplicado, estado `pagado` posible), como exige el principio.
  - **Panel administrativo**: ficha, premios, saldo a favor, crédito, canjes y ajustes. Las rutas nuevas son hijas de `/admin/clients`.
  - **Venta rápida**: sin cambios propios. Sus pedidos directos pasan por el mismo checkout.
  - **Cotización rápida**: sin cambios.
- [x] **IV. Seguridad del lado del servidor**:
  - **Registro público** de clientes y tipo de usuario "cliente": es una **excepción documentada** en la spec (Assumptions) y en *Complexity Tracking*.
  - **El panel falla cerrado**: en producción, si `ALLOWED_EMAILS` está vacía, nadie entra (R1, FR-042).
  - **Datos del cliente**: toda lectura y escritura de "Mi cuenta" y de los beneficios del checkout deriva el `clienteId` de la sesión, nunca del navegador.
  - **Vinculación**: solo con correo verificado, y el teléfono nunca vincula solo.
  - **Datos que se exponen**: los mínimos (§6 de [contracts/cuenta-cliente.md](./contracts/cuenta-cliente.md)).
  - **Riesgos que ya existen** (`getClientByPhone`, `/confirmacion?id=`): se documentan en R14 y esta feature no los amplía.
- [x] **V. Pruebas proporcionales al riesgo**:
  - **Unitarias**: el dinero, los puntos, el crédito, la vinculación y el acceso al panel tienen pruebas en `node:test`.
  - **Integración** (base aislada): núcleos con bloqueo y concurrencia, cancelación, seis caminos de acreditación, crédito y checkout con beneficios.
  - Sin frameworks nuevos.

**Resultado de la puerta previa**: APROBADA. La excepción de registro público y las adiciones están registradas en *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/010-cuenta-cliente-fidelizacion/
├── spec.md
├── plan.md                         # Este archivo
├── research.md                     # Phase 0
├── data-model.md                   # Phase 1
├── quickstart.md                   # Phase 1
├── contracts/
│   ├── cuenta-cliente.md           # Sesión, vinculación, /mi-cuenta y acceso al panel
│   ├── ficha-saldo-credito.md      # Ficha, crédito, saldo a favor, abonos, cancelación y venta manual
│   ├── fidelidad.md                # Puntos, premios y canjes
│   └── checkout-beneficios.md      # Núcleo del checkout y beneficios en la tienda
├── checklists/requirements.md
└── tasks.md                        # Phase 2 ($speckit-tasks, no lo crea este comando)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                   # modelos, campos y enums (data-model.md)
└── migrations/<timestamp>_cuenta_cliente_fidelizacion/

lib/
├── saldo-a-favor.ts            (nuevo)  reglas puras + núcleos del saldo a favor y bloquearCliente
├── fidelidad.ts                (nuevo)  reglas puras + acreditación, canje, reversión y ajuste de puntos
├── checkout-core.ts            (nuevo)  transacción del checkout (movida) + beneficios
├── cuenta-cliente.ts           (nuevo, server-only)  sesión del cliente, vinculación automática y resumen
├── cuenta-cliente-rules.ts     (nuevo)  resolverVinculacion (pura)
├── admin/
│   ├── auth-rules.ts           (nuevo)  esCorreoAdministrador (pura, falla cerrada)
│   ├── auth.ts                          usa auth-rules
│   ├── client-profile.ts       (nuevo)  getClientProfile (ficha)
│   ├── abonos.ts                        excedente, bloqueo del cliente, consultarDeudaCliente, evaluarCredito y anulación con saldo
│   ├── order-state-change.ts            cancelación: devuelve abonos y revierte puntos; acredita al pagar
│   ├── sales-calculations.ts            calculateSaleTotals(…, descuentoPuntosUsd)
│   └── status.ts                        etiqueta "Saldo a favor"
└── actions/
    ├── checkout.ts                      envoltorio: sesión → registrarCompraWeb
    ├── cuenta-cliente.ts       (nuevo)  completarRegistroCliente y obtenerBeneficiosCheckout
    ├── admin-clients.ts                 notas, crédito, confirmar y desvincular cuenta
    ├── admin-cuenta-corriente.ts (nuevo) pago a cuenta, aplicar saldo y ajuste de saldo
    ├── admin-fidelidad.ts      (nuevo)  premios, ajuste de puntos y canje en pedido
    ├── admin-orders.ts                  registrarAbono con permitirExcedente
    └── admin-sales.ts                   crédito, canjes y saldo en la venta manual; editor masivo

app/
├── mi-cuenta/page.tsx          (nuevo)
├── productos/layout.tsx                 pasa la sesión a la cabecera
├── finalizar-compra/page.tsx            pasa el cliente de la sesión al paso de datos
├── confirmacion/page.tsx                beneficios aplicados y mensaje de puntos
├── admin-login/page.tsx                 usa esCorreoAdministrador
└── admin/clients/
    ├── page.tsx                         botón "Premios" y enlace a la ficha
    ├── [id]/page.tsx           (nuevo)  ficha
    └── rewards/page.tsx        (nuevo)  premios

components/
├── mi-cuenta/                  (nuevo)  resumen, registro, avisos y movimientos
├── productos/loginButton.tsx            enlace a /mi-cuenta (sin búsqueda por teléfono)
├── productos/header.tsx                 recibe la cuenta
├── finalizar-compra/beneficiosCliente.tsx (nuevo)
├── finalizar-compra/paymentInformation.tsx    montoAPagar, beneficios y pago nulo
├── finalizar-compra/personalInformation.tsx   rellenado desde la sesión
├── finalizar-compra/orderSuccess.tsx           mensaje de puntos
└── admin/
    ├── clientes/ficha/         (nuevo)  secciones y modales de la ficha
    ├── clientes/premios/       (nuevo)  tabla y formulario de premios
    ├── clientes/clientsTable.tsx        enlace a la ficha
    └── ventas/
        ├── abonosPanel.tsx              reparto del excedente, usar saldo y canjear premio
        ├── manualSaleForm.tsx           canjes, saldo y confirmación de crédito
        └── bulkSalesEditor.tsx          casilla de autorización de crédito

tests/
├── admin/
│   ├── saldo-a-favor.test.ts              (nuevo)
│   ├── fidelidad.test.ts                  (nuevo)
│   ├── auth-rules.test.ts                 (nuevo)
│   ├── abonos.test.ts                     + excedente y evaluarCredito
│   ├── saldo-a-favor.integration.test.ts  (nuevo)
│   ├── fidelidad.integration.test.ts      (nuevo)
│   ├── credito.integration.test.ts        (nuevo)
│   └── order-status.integration.test.ts   + cancelación con abonos y canjes
└── checkout/
    ├── cuenta-cliente-rules.test.ts       (nuevo)
    └── checkout.integration.test.ts       importa el núcleo; + beneficios
```

**Structure Decision**: monolito Next.js. Siguiendo el patrón de `lib/inventory.ts`, los dos libros nuevos (`saldo-a-favor`, `fidelidad`) viven en `lib/`, porque los usan el panel y la tienda. Contienen reglas puras y núcleos que reciben `tx`, sin `@/` ni `server-only`, así que se prueban con `node:test`. Las lecturas del panel van en `lib/admin/*` y las de la tienda en `lib/cuenta-cliente.ts`.

## Design Decisions

El detalle y las alternativas descartadas están en [research.md](./research.md). Los contratos están en [contracts/](./contracts/).

### Flujo: abono con excedente

1. `AbonosPanel` calcula `dividirAbono` y muestra el reparto. La administradora confirma y se envía `permitirExcedente`.
2. `registrarAbono` ejecuta `requireAdmin`, Zod y `prisma.$transaction`.
3. El núcleo:
   1. `bloquearCliente`;
   2. `FOR UPDATE` del pedido;
   3. crea el `Pago` por lo aplicado;
   4. crea el `MovimientoSaldo` `sobrepago` por el excedente;
   5. si el saldo llega a 0, lo pasa a `pagado` (escritura condicionada) con historial "Saldado con abonos";
   6. `acreditarPuntosPorPago`.
4. Se revalida el pedido, la ficha y `/mi-cuenta`, y aparece la notificación con lo que quedó a favor.

### Flujo: cancelación

`aplicarCambioEstadoPedido` hace todo en la misma transacción:

1. `bloquearCliente`;
2. escritura condicionada a `cancelado`;
3. devolución de inventario (no en importados, como hoy);
4. `devolverAbonosDeCancelacion` (`pedido_cancelado` por lo abonado, también en importados);
5. `revertirPuntosDePedido` (devuelve canjes y revierte acumulaciones antiguas con tope);
6. historial.

### Flujo: venta manual sobre el crédito

`registrarVentaManual`, dentro de la transacción:

1. `bloquearCliente`;
2. deuda actual;
3. canjes → `montoDescuentoPuntos`;
4. totales;
5. `evaluarCredito`. Si hace falta autorización y no viene, se lanza un error que revierte todo y la acción devuelve `requiereAutorizacion`;
6. la interfaz confirma y reenvía con `autorizarCredito`;
7. el historial inicial registra la autorización con el actor;
8. saldo a favor aplicado y puntos si nace pagada.

### Flujo: registro en la tienda

1. `/mi-cuenta` sin sesión ofrece las páginas de Stack, que regresan a `/mi-cuenta` con `after_auth_return_to`.
2. `obtenerSesionCliente` hace la vinculación automática:
   - correo verificado que coincide → `vinculada`;
   - si no, el estado es `sin_vinculo` y se muestra el formulario.
3. `completarRegistroCliente` aplica `resolverVinculacion`: `vinculada`, `pendiente` o un cliente nuevo. La administradora confirma las pendientes desde la ficha.

### Flujo: compra con beneficios

1. `BeneficiosCliente` lee `obtenerBeneficiosCheckout()` y la selección queda en el estado local del paso de pago.
2. `procesarCompra` resuelve la sesión y llama a `registrarCompraWeb`. Dentro de la transacción:
   1. el cliente sale de la sesión;
   2. `bloquearCliente`;
   3. `validarCanjes`;
   4. totales con el descuento;
   5. validación del saldo;
   6. pago contra `montoAPagar`;
   7. pedido, líneas, inventario y canjes;
   8. `aplicarSaldoAFavorEnPedido`;
   9. pago declarado, o `pagado` más `acreditarPuntosPorPago`.

   Cualquier cambio concurrente → `BENEFITS_CHANGED`, sin escrituras.

### Cambios por archivo

**Esquema**

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` + migración | Lo de [data-model.md](./data-model.md). |

**Reglas y núcleos (sin `@/`, se pueden probar con `node:test`)**

| Archivo | Cambio |
|---|---|
| `lib/saldo-a-favor.ts` (**nuevo**) | `calcularSaldoAFavor`, `dividirAbono`, `repartirBs`, `validarAplicacionSaldo`, `bloquearCliente`, `saldoAFavorDisponible`, `registrarPagoACuenta`, `aplicarSaldoAFavorEnPedido`, `ajustarSaldoAFavor` y `devolverAbonosDeCancelacion`. |
| `lib/fidelidad.ts` (**nuevo**) | `participaEnFidelidad`, `calcularPuntosGanados`, `calcularPuntos`, `validarCanjes`, `topeReversion`, `acreditarPuntosPorPago`, `canjearPremios`, `canjearPremioEnPedido`, `revertirPuntosDePedido` y `ajustarPuntos`. |
| `lib/checkout-core.ts` (**nuevo**) | `registrarCompraWeb(datos, { clienteSesionId })`: la transacción actual de `procesarCompra` más los beneficios ([contracts/checkout-beneficios.md](./contracts/checkout-beneficios.md)). Ya no acredita puntos al crear el pedido. |
| `lib/cuenta-cliente-rules.ts` (**nuevo**) | `resolverVinculacion`. |
| `lib/admin/auth-rules.ts` (**nuevo**) | `esCorreoAdministrador`. |
| `lib/admin/abonos.ts` | `registrarAbonoEnPedido`: `permitirExcedente`, `bloquearCliente`, sobrepago, `pagoId` en el resultado y acreditación al saldar. `anularAbonoEnPedido`: movimientos `anulacion` y guarda de saldo negativo. Nuevas: `consultarDeudaCliente` y `evaluarCredito`. |
| `lib/admin/order-state-change.ts` | Cancelación: `bloquearCliente`, `devolverAbonosDeCancelacion` y `revertirPuntosDePedido`. Paso a `pagado`: `acreditarPuntosPorPago`. |
| `lib/admin/sales-calculations.ts` | `calculateSaleTotals(lines, discount, tasa, descuentoPuntosUsd = 0)`: el descuento total no puede superar el subtotal. |
| `lib/admin/status.ts` | Etiqueta `SaldoAFavor`. |

**Sesión, consultas y Server Actions**

| Archivo | Cambio |
|---|---|
| `lib/cuenta-cliente.ts` (**nuevo**, `server-only`) | `obtenerSesionCliente`, `obtenerClienteDeSesion` y `obtenerResumenCuenta`. |
| `lib/admin/auth.ts` | `requireAdmin` usa `esCorreoAdministrador` (falla cerrada). |
| `lib/admin/client-profile.ts` (**nuevo**) | `getClientProfile`. |
| `lib/actions/checkout.ts` | Envoltorio de `registrarCompraWeb`. Los tipos ganan `beneficios`, `pago: null`, estado `pagado` y dos códigos de error. |
| `lib/actions/cuenta-cliente.ts` (**nuevo**) | `completarRegistroCliente` y `obtenerBeneficiosCheckout`. |
| `lib/actions/admin-clients.ts` | `guardarNotasCliente`, `actualizarCreditoCliente`, `confirmarVinculacionCuenta` y `desvincularCuenta`. |
| `lib/actions/admin-cuenta-corriente.ts` (**nuevo**) | `registrarPagoACuenta`, `aplicarSaldoAFavor` y `ajustarSaldoAFavor`. |
| `lib/actions/admin-fidelidad.ts` (**nuevo**) | `crearPremio`, `actualizarPremio`, `cambiarEstadoPremio`, `ajustarPuntosCliente` y `canjearPremio`. |
| `lib/actions/admin-orders.ts` | `registrarAbono` acepta `permitirExcedente` y devuelve `excedenteUsd`. El mensaje de cancelación informa el saldo devuelto. |
| `lib/actions/admin-sales.ts` | `registrarVentaManual`: bloqueo, canjes, saldo, crédito y puntos. `guardarEdicionMasivaVentas`: autorización de crédito, bloqueo del cambio de cliente, `montoDescuentoPuntos` y puntos. `actualizarDescuentoVenta`: `montoDescuentoPuntos`. |

**Páginas y componentes**

| Archivo | Cambio |
|---|---|
| `app/mi-cuenta/page.tsx` + `components/mi-cuenta/*` (**nuevos**) | Estados de la sesión, formulario de registro y resumen (puntos, premios, deuda, saldo y pedidos). |
| `app/admin/clients/[id]/page.tsx` + `components/admin/clientes/ficha/*` (**nuevos**) | La ficha y sus modales: crédito, notas, pago a cuenta, ajuste de saldo, ajuste de puntos y cuenta web. |
| `app/admin/clients/rewards/page.tsx` + `components/admin/clientes/premios/*` (**nuevos**) | Catálogo de premios. |
| `app/admin/clients/page.tsx`, `components/admin/clientes/clientsTable.tsx` | Botón "Premios" y enlace a la ficha. |
| `components/admin/ventas/abonosPanel.tsx` | Reparto del excedente, "Usar saldo a favor" y "Canjear premio". |
| `components/admin/ventas/manualSaleForm.tsx` | Puntos y premios del cliente, saldo a favor y confirmación de crédito. |
| `components/admin/ventas/bulkSalesEditor.tsx` | Casilla "Autorizo las ventas que exceden el crédito". |
| `app/productos/layout.tsx`, `components/productos/header.tsx`, `components/productos/loginButton.tsx` | La cabecera recibe la cuenta desde el servidor. El botón enlaza a `/mi-cuenta` y se elimina la búsqueda por teléfono. |
| `app/finalizar-compra/page.tsx`, `components/finalizar-compra/personalInformation.tsx` | Rellenado desde la sesión vinculada. |
| `components/finalizar-compra/beneficiosCliente.tsx` (**nuevo**), `paymentInformation.tsx` | Selección local de beneficios, `montoAPagar` y pago nulo. |
| `app/confirmacion/page.tsx`, `components/finalizar-compra/orderSuccess.tsx` | Beneficios aplicados y mensaje de puntos. |
| `app/admin-login/page.tsx` | `esCorreoAdministrador`. |

**Documentación**

| Archivo | Cambio |
|---|---|
| `README.md` | `ALLOWED_EMAILS` pasa a ser obligatoria en producción. Configuración del registro de clientes en Stack Auth. |
| `CLAUDE.md` | Secciones sobre cuenta del cliente, saldo a favor (libro y método `SaldoAFavor`), puntos (acreditación al pagar, solo `detal`, una vez), canjes (`montoDescuentoPuntos`, línea a precio 0), bloqueo Cliente → Transaccion y el panel que falla cerrado. Se actualiza la línea de la carga de Excel ("no toca fidelidad" se mantiene). |
| `docs/descripcion-tecnica.md` | Resumen de los nuevos modelos y flujos. |

### Entrega por fases

Cada fase corresponde a las prioridades de la spec y deja el sistema consistente:

1. **Fase 1 (P1: US1, US2 y US3)**:
   - migración completa;
   - `esCorreoAdministrador`, el panel que falla cerrado (**antes** de abrir cualquier registro);
   - ficha, crédito, saldo a favor, abonos con excedente y cancelación con devolución.
2. **Fase 2 (P2: US4, US5 y US6)**:
   - acreditación al pagar (y retiro de la acreditación al crear en el checkout);
   - premios y canjes en el panel;
   - `/mi-cuenta`, vinculación y cabecera.
3. **Fase 3 (P3: US7)**: núcleo del checkout y beneficios en la tienda.

## Constitution Check (post-diseño)

Revisado después de la Fase 1.

- **I**:
  - Ninguna tabla nueva duplica datos derivables: la deuda, los puntos y el saldo a favor son sumas.
  - Las únicas columnas de dinero nuevas son `montoDescuentoPuntos` y `limiteCreditoUsd`.
  - Los tres archivos de acciones nuevos separan dominios que ya tienen varias acciones cada uno; `admin-clients.ts` ya pasa de 300 líneas.
- **II**: cada regla tiene un solo dueño (ver la tabla de reglas de [data-model.md](./data-model.md)). El checkout y el panel aplican el saldo a favor con la misma función.
- **III**: sin superficies nuevas. `/mi-cuenta` está en la tienda y las rutas del panel cuelgan de `/admin/clients`.
- **IV**: el `clienteId` del cliente nunca viene del navegador cuando hay sesión. El panel falla cerrado. La vinculación exige un correo verificado.
- **V**: las pruebas cubren todos los caminos de dinero, puntos y acceso.

**Resultado**: APROBADA, sin violaciones nuevas.

## Complexity Tracking

| Adición | Por qué es necesaria | Alternativa más simple descartada |
|---|---|---|
| **Registro público de clientes y tipo de usuario "cliente"** (excepción al Principio IV) | La spec exige que el cliente se registre y vea sus puntos y su saldo (US6). | *Consultar por teléfono sin autenticar*, como hace hoy la cabecera: expone deuda y saldo a quien conozca un número. |
| **Panel que falla cerrado** (cambio de comportamiento) | Con el registro abierto, la regla actual daría el panel a cualquier cliente si `ALLOWED_EMAILS` está vacía. | *Mantener la regla y confiar en la configuración*: FR-042 exige no depender de ella. |
| `CuentaCliente` | Representa el vínculo pendiente o confirmado, con unicidad por cliente y por usuario. | *Columna en `Cliente`*: no representa una cuenta pendiente sin cliente propio ni quién confirmó. |
| `MovimientoSaldo` | El saldo a favor no pertenece a ningún pedido y necesita trazabilidad por movimiento (FR-012). | *Columna `saldoAFavorUsd`*: pierde el origen y el autor, y no se puede auditar (SC-004). |
| `Premio` | Catálogo configurable por la administradora (FR-026). | *Premios fijos en código*: cada cambio requeriría un despliegue. |
| `lib/checkout-core.ts` (código movido) | Probar la transacción del checkout con beneficios, porque la acción importa la sesión (`server-only`). | *Probar solo las reglas puras*: no cubre la atomicidad ni la concurrencia, que exige el Principio V. |
| `lib/admin/auth-rules.ts` | La regla de autorización debe tener pruebas, y `auth.ts` es `server-only`. | *Probarla de forma manual*: el Principio V lo exige para la autorización. |
| Tres archivos de acciones nuevos | Separan los dominios de cuenta del cliente, cuenta corriente y fidelidad, con 2 a 5 acciones cada uno. | *Todo en `admin-clients.ts`*: un archivo de más de 600 líneas que mezcla dominios. |
| Tres rutas nuevas | La ficha y los premios necesitan su propia página; "Mi cuenta" es la vista del cliente. | *Modales en `/admin/clients`*: la ficha tiene demasiadas secciones para una modal. |
