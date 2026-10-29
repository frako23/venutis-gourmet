# Research: Cancelación de pedidos y cambio de estado desde la tabla

**Feature**: `007-cancelacion-pedidos`
**Fecha**: 2026-10-29

El Technical Context no dejó incógnitas abiertas: la spec ya resolvió con la persona usuaria qué pedidos se cancelan (solo no cobrados) y qué pasa con el inventario (se devuelve automáticamente). Esta investigación fija las decisiones de diseño a partir del código existente.

## Hallazgos del código actual

- `EstadoTransaccion` ya incluye `cancelado` (migración `20260123112412_ajste_enum_cancelado`) y `EstadoTransaccionHistorial.motivo` ya existe. **No hace falta cambiar el esquema.**
- `actualizarEstadoPedido` (`lib/actions/admin-orders.ts`) es el único camino de cambio de estado individual. Ya valida con Zod (`motivo` ≤ 240), exige `requireAdmin`, bloquea la reapertura de cancelados, aplica `requiresExplicitPaymentConfirmation` y escribe el historial. Solo acepta `por_cobrar | en_pedido | pagado`.
- `OrderStatusForm` (detalle del pedido) llama a la acción pero **ignora su resultado**: no muestra ninguna notificación, ni de éxito ni de error. `orderStatusControl.tsx` es un alias que no se usa.
- El editor masivo **no ofrece** "Cancelado" para pedidos activos; solo lo muestra, deshabilitado, cuando la fila ya está cancelada. Sin embargo, `bulkExistingRowSchema` acepta `cancelado`, y la acción lo guardaría sin devolver inventario.
- Todos los flujos que crean ventas (checkout, venta manual y filas nuevas del editor masivo) descuentan `Producto.inventario`; ninguno lo devuelve.
- `dashboard.ts` y `analytics.ts` ya excluyen `cancelado`; el pronóstico se alimenta de esas líneas.
- `canSelectOrderState` solo se usa en `tests/admin/order-status.test.ts`.
- Los tests no pueden importar Server Actions (`lib/admin/auth.ts` importa `server-only` y Stack Auth). Los módulos que se prueban usan imports relativos con extensión explícita (`./vercel-web-analytics-core.ts`) y nunca `@/`. Ya hay precedente de helpers que reciben la transacción: `nextOrderNumber(tx)` en `lib/order-number.ts`.
- El panel ya tiene una modal propia sin librería (`components/admin/clientes/clientCreateModal.tsx`): overlay, `role="dialog"`, `aria-modal`, cierre con clic fuera y sonner para el resultado.

## Decisión 1: Extender el camino de cambio de estado existente

**Decisión**: Cancelar es un cambio de estado más dentro de `actualizarEstadoPedido`. El enum de entrada pasa a aceptar `cancelado` y la rama de cancelación devuelve el inventario dentro de la misma transacción Prisma.

**Razonamiento**: El Principio II exige que los cambios de estado pasen por `admin-orders.ts` y queden en el historial append-only. Una sola acción mantiene en un único lugar la autorización, la validación, el historial y la revalidación.

**Alternativas consideradas**:

- **Acción nueva `cancelarPedido`**: descartada porque duplicaría la autorización, las validaciones y la escritura del historial, y abriría un segundo camino para el mismo cambio.
- **Permitir cancelar desde el editor masivo**: descartada. Exigiría devolver el inventario y gestionar la razón dentro de una edición de hasta 100 filas, cuando el control por fila ya resuelve el caso con menos código.

## Decisión 2: Devolver el inventario en la misma transacción

**Decisión**: Al cancelar, se agrupan las líneas del pedido (`DetalleCompra`) por producto y se incrementa `Producto.inventario` con la suma de cada uno. Esto ocurre en la misma transacción que cambia el estado y escribe el historial.

**Razonamiento**: Es la operación inversa exacta del descuento que se hizo al crear el pedido. Si algo falla, no se aplica nada (FR-007). La agrupación es una función pura y se puede probar sin base de datos.

**Alternativas consideradas**:

- **Modelo de movimientos de inventario**: descartado. No existe hoy, y crear un libro de movimientos es una capa nueva que el requisito no pide.
- **Devolverlo al reabrir o con un proceso aparte**: descartado, porque el pedido cancelado no se reabre y un proceso aparte rompe la atomicidad.

## Decisión 3: Validar contra el estado vigente con una escritura condicionada

**Decisión**: El cambio se aplica con `updateMany({ where: { id, estado: <estado leído> } })` y se exige que afecte exactamente una fila. Si no afecta ninguna, la transacción aborta con el mensaje "El pedido cambió mientras lo editabas…".

**Razonamiento**: Con el aislamiento por defecto de PostgreSQL (READ COMMITTED), una segunda transacción concurrente queda bloqueada por el lock de la fila. Al liberarse, reevalúa el `WHERE`, ya no encuentra el estado leído y no actualiza nada. Esto garantiza que el inventario se devuelve una sola vez (caso límite de doble clic o de dos sesiones) y que el cambio se valida contra el estado real (FR-020), con una sola condición adicional.

**Alternativas consideradas**:

- **`SELECT … FOR UPDATE` con SQL crudo**: descartado, porque introduce SQL manual para algo que el filtro condicionado ya resuelve.
- **Aislamiento `Serializable`**: descartado, porque obliga a reintentar ante errores de serialización y cambia el comportamiento del resto de la transacción.
- **Bloqueo solo en la interfaz**: insuficiente, porque no protege frente a dos sesiones (Principio IV: ninguna decisión depende solo de la interfaz).

## Decisión 4: Un solo control de estado por pedido, reutilizado en tres lugares

**Decisión**: Un componente cliente, `OrderStateSelect`, con un `<select>` nativo. Se usa en la fila de escritorio, en la tarjeta móvil y en el detalle del pedido, donde reemplaza a `OrderStatusForm`.

- Los cambios entre "Por cobrar" y "En pedido", y los que salen de "Pagado", se guardan al seleccionarlos.
- "Pagado" (desde un estado no pagado) y "Cancelado" abren una modal de confirmación. Para cancelar, la modal pide la razón opcional; para pagar, pide confirmar el cobro y acepta una nota opcional, que conserva el motivo que hoy permite el formulario del detalle.
- Mientras se guarda, el control se deshabilita y muestra el estado elegido (`useOptimistic` de React 19). Al terminar, la fila refleja el estado del servidor: `revalidatePath` en la acción más `router.refresh()`, como en `clientCreateModal.tsx`. El resultado se notifica con `toast`.

**Razonamiento**: Son tres usos reales del mismo control (Principio I permite extraerlo). Un solo componente evita que la tabla y el detalle apliquen reglas distintas, y de paso corrige la falta de notificaciones del formulario actual. El `<select>` nativo es accesible, funciona en móvil y no necesita dependencias.

**Alternativas consideradas**:

- **Mantener `OrderStatusForm` y añadirle "Cancelado"**: descartada. Dejaría dos controles con flujos distintos (formulario con botón frente a guardado inmediato) y el formulario seguiría sin notificar.
- **Menú desplegable de una librería (Radix, Headless UI)**: descartada, porque es una dependencia nueva que el `<select>` nativo hace innecesaria.
- **Modo de edición por fila**: descartado, porque reintroduce el paso extra que la persona usuaria quiere evitar.
- **`window.confirm` para el cobro**: descartado. No permite la nota opcional y daría una experiencia distinta a la de la cancelación.

## Decisión 5: Modal propia siguiendo el patrón existente

**Decisión**: La modal vive en el mismo archivo que el control (es su único consumidor). Sigue la estructura de `clientCreateModal.tsx`: overlay, `role="dialog"`, `aria-modal`, `aria-labelledby` y cierre con clic fuera. Además se cierra con Escape, enfoca el textarea al abrirse, limita el texto con `maxLength={240}` y muestra los caracteres restantes. Los botones son "Volver" y "Confirmar cancelación"; se evita un botón "Cancelar" dentro de una modal de cancelación, porque sería ambiguo.

**Razonamiento**: Así se reutiliza el lenguaje visual y el patrón ya aceptado en el panel, sin librerías nuevas. Al vivir en el mismo archivo no aparece una abstracción compartida prematura.

**Alternativas consideradas**:

- **Elemento `<dialog>` nativo con `showModal()`**: viable, pero se descarta para mantener un único patrón de modal en el panel. Si se decide migrar, se haría en un cambio aparte que cubra también `clientCreateModal.tsx`.
- **Componente de modal genérico compartido**: descartado, porque solo hay dos modales en el panel.

## Decisión 6: El editor masivo no cancela, y el servidor lo garantiza

**Decisión**: La interfaz del editor masivo no cambia (ya no ofrece cancelar). `guardarEdicionMasivaVentas` rechaza cualquier fila existente que pase a `cancelado` desde otro estado, con el mensaje "Cancela {orden} desde la tabla o el detalle para registrar la razón y devolver el inventario.". El aviso del editor añade esa misma indicación.

**Razonamiento**: Cumple FR-011 y cierra el hueco del servidor (cancelar sin devolver inventario) con una sola condición.

## Decisión 7: Pruebas proporcionales al riesgo

**Decisión**:

- **Unitarias** (`tests/admin/order-status.test.ts`) sobre las reglas puras de `lib/admin/status.ts`: estados siguientes por estado actual, qué estados se pueden cancelar, normalización de la razón y agrupación de cantidades a devolver.
- **Integración** (`tests/admin/order-status.integration.test.ts`, con `RUN_ADMIN_INTEGRATION=1` y `ADMIN_TEST_DATABASE_URL`) sobre la transacción real. Para eso, el cuerpo transaccional de `actualizarEstadoPedido` se mueve a `aplicarCambioEstadoPedido(tx, input, actor)` en `lib/admin/order-state-change.ts`, sin `server-only` y con imports relativos con extensión. La acción conserva la autorización, el Zod y la revalidación.

**Razonamiento**: La cancelación toca estados de pedido e inventario, así que el Principio V exige pruebas, y una prueba que replique la lógica en línea no probaría el código real. El precedente `nextOrderNumber(tx)` muestra que este tipo de helper ya es parte del proyecto.

**Alternativas consideradas**:

- **Replicar la transacción dentro del test**, como hace hoy `order-status.integration.test.ts`: descartada, porque no verificaría la devolución de inventario ni la escritura condicionada reales.
- **Mockear `requireAdmin` para importar la acción**: descartada, porque necesitaría una librería de mocks o un loader especial (Principio V).

## Decisión 8: Fuera de alcance confirmado

- Puntos de fidelidad: no se revierten (no hay canje ni consulta en ninguna pantalla).
- Notificación al cliente: ninguna.
- Notas de entrega: se conservan; el botón "Generar nota" del detalle no cambia.
- El pedido cancelado no se reabre; la regla existente se mantiene.
- No hay un catálogo de motivos predefinidos.
