---

description: "Task list for the unified public catalog feature"
---

# Tasks: Catálogo público unificado

**Input**: Design documents from `/specs/001-catalogo-unificado/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/public-catalog.md`, `quickstart.md`

**Tests**: No se añaden tareas de TDD porque la especificación no lo solicita y el proyecto no tiene runner de pruebas configurado. La validación funcional, lint y build quedan en la fase final.

**Organization**: Las tareas están agrupadas por historia de usuario y ordenadas por dependencia.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo con las tareas de su fase porque usa archivos distintos y no depende de trabajo incompleto.
- **[Story]**: Identifica la historia de usuario de `spec.md`.
- Cada tarea incluye la ruta exacta de los archivos que debe modificar o crear.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear la utilidad común que define el contrato de contexto sin añadir dependencias, migraciones ni nuevas entidades persistentes.

- [X] T001 [P] Crear `lib/catalog-context.ts` con el tipo `PurchaseContext`, normalización de `contexto` con valores válidos `consumidor|mayorista`, valor predeterminado `consumidor`, etiquetas públicas y resolución exclusiva entre `Producto.precioDetal` y `Producto.precioMayorista`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Preparar el estado compartido que necesitan el catálogo, el detalle, el carrito y el checkout.

**⚠️ CRITICAL**: No iniciar las historias de usuario hasta completar esta fase.

- [X] T002 [P] Extender `store/appStore.ts` con `purchaseContext`, `setPurchaseContext`, precios detal/mayorista por `CartItem`, recálculo de `precio` y `totalUSD`, y persistencia versionada; migrar carritos antiguos sin borrar productos y dejar sus precios sujetos a validación final del servidor.
- [X] T003 [P] Crear `components/productos/purchaseContextSwitcher.tsx` como control accesible para cambiar entre consumidor y mayorista, conservar `categoria` y generar enlaces al catálogo canónico mediante `contexto`, usando las utilidades de `lib/catalog-context.ts`.

**Checkpoint**: El tipo/contexto y el carrito pueden representar ambos modos sin modificar PostgreSQL ni el esquema Prisma.

---

## Phase 3: User Story 1 - Elegir contexto de compra al entrar (Priority: P1) 🎯 MVP

**Goal**: La entrada pública lleva directamente al catálogo consumidor y el contexto activo permanece visible y navegable.

**Independent Test**: En una sesión nueva, abrir `/`, confirmar que entra directamente al catálogo consumidor canónico y comprobar que el contexto activo se puede cambiar a mayorista sin abrir otra aplicación.

### Implementation for User Story 1

- [X] T004 [P] [US1] Actualizar `app/page.tsx` para que redirija directamente al catálogo canónico `/productos/consumidores?contexto=consumidor`, eliminando la pantalla inicial de elección.
- [X] T005 [P] [US1] Integrar `PurchaseContextSwitcher` en `components/productos/header.tsx` y/o `app/productos/layout.tsx`, mostrando el contexto activo en la navegación pública sin crear una segunda cabecera o aplicación.
- [X] T006 [US1] Adaptar `app/productos/consumidores/page.tsx` para leer `searchParams.contexto`, normalizarlo con `lib/catalog-context.ts`, conservar `categoria` y construir la proyección de catálogo con el precio del contexto activo en una sola consulta de productos con imágenes.
- [X] T007 [P] [US1] Actualizar `components/productos/sidebar.tsx` para que los enlaces de categoría preserven `contexto` y sigan navegando al catálogo canónico, incluyendo el estado seleccionado visible y usable en móvil.
- [X] T008 [P] [US1] Reemplazar el portal en construcción de `app/productos/mayoristas/page.tsx` por una redirección de compatibilidad a `/productos/consumidores?contexto=mayorista`, sin conservar una superficie mayorista independiente.

**Checkpoint**: Las dos opciones de `/` y la ruta histórica mayorista llegan a una única experiencia pública con contexto visible.

---

## Phase 4: User Story 2 - Descubrir productos mayoristas desde el flujo consumidor (Priority: P1)

**Goal**: Desde el catálogo consumidor se pueden identificar, consultar y añadir ofertas mayoristas disponibles usando el mismo catálogo y detalle.

**Independent Test**: Desde el contexto consumidor, activar la oferta mayorista, localizar un producto con `precioMayorista` válido, abrir su ficha, comprobar etiqueta/precio/disponibilidad y volver al catálogo sin salir de la aplicación.

### Implementation for User Story 2

- [X] T009 [P] [US2] Extender `components/productos/productCard.tsx` para recibir ambos precios y `PurchaseContext`, mostrar el precio resuelto, identificar la oferta mayorista cuando corresponda, conservar `contexto` en los enlaces y pasar ambos precios al carrito.
- [X] T010 [US2] Completar `app/productos/consumidores/page.tsx` para presentar desde el contexto consumidor el acceso reconocible a ofertas mayoristas, filtrar productos con precio mayorista válido y mostrar un estado vacío claro cuando no haya ofertas publicadas/disponibles, sin ocultar el catálogo consumidor.
- [X] T011 [P] [US2] Adaptar `app/productos/consumidores/[id]/page.tsx` para leer `searchParams.contexto`, resolver precio y etiqueta comercial, conservar el contexto al regresar y bloquear la compra cuando el inventario sea cero.
- [X] T012 [P] [US2] Actualizar `components/producto/addToCart.tsx` para recibir el contexto y los precios detal/mayorista del producto, añadir al carrito la proyección completa y mantener la acción deshabilitada para productos agotados.

**Checkpoint**: Un visitante consumidor puede descubrir una oferta mayorista, abrir su detalle y verla con información comercial coherente dentro del mismo flujo.

---

## Phase 5: User Story 3 - Comprar sin cambiar de aplicación (Priority: P1)

**Goal**: El carrito conserva productos al cambiar de contexto y el checkout valida el precio vigente antes de confirmar.

**Independent Test**: Añadir un producto, cambiar de contexto, verificar que el carrito y el total se conservan/actualizan, avanzar por `/finalizar-compra` y confirmar que una línea con precio o inventario desactualizado es rechazada sin crear una transacción parcial.

### Implementation for User Story 3

- [X] T013 [US3] Actualizar `components/productos/shoppingCartButton.tsx` para mostrar el contexto activo, precios/totales recalculados por el store, estado de producto agotado y acceso al checkout único `/finalizar-compra`.
- [X] T014 [US3] Actualizar `components/finalizar-compra/paymentInformation.tsx` para enviar `contexto` junto con las líneas del carrito a `procesarCompra`, conservar el carrito ante errores de validación y mostrar un mensaje accionable cuando cambie precio o inventario.
- [X] T015 [US3] Modificar `lib/actions/checkout.ts` para validar la entrada, consultar cada producto dentro de la transacción, resolver el precio según `PurchaseContext`, rechazar precio/inventario desactualizados antes de escribir y guardar en `DetalleCompra.precioUnitario` el importe server-side validado.

**Checkpoint**: El catálogo unificado desemboca en el checkout existente para ambos contextos y no confirma datos obsoletos.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Completar enlaces públicos, documentación y validación transversal sin ampliar el alcance.

- [X] T016 [P] Actualizar `components/productos/footer.tsx` y `app/about-us/page.tsx` para eliminar enlaces a la experiencia mayorista separada y conservar `contexto`/`categoria` cuando corresponda.
- [X] T017 [P] Actualizar la sección de rutas y comportamiento público de `README.md`, documentando `/productos/consumidores` como catálogo canónico y `/productos/mayoristas` como compatibilidad.
- [X] T018 Ejecutar `npm run lint` y `npm run build` según los scripts de `package.json`, corregir errores introducidos por la feature y revisar que no existan cambios en `prisma/schema.prisma`, `/admin`, `/venta-rapida` ni secretos.
- [ ] T019 Ejecutar los escenarios de `specs/001-catalogo-unificado/quickstart.md` con una base de desarrollo aislada, incluyendo viewport de 360 px, cambio de contexto, ruta mayorista antigua, carrito persistido y rechazo de precio/inventario desactualizados.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 no depende de tareas de implementación y desbloquea los tipos/utilidades comunes.
- **Foundational (Phase 2)**: T002 y T003 dependen de T001 y bloquean el trabajo de las historias.
- **User Story 1 (Phase 3)**: T004-T008 dependen de T002/T003; es el MVP funcional.
- **User Story 2 (Phase 4)**: T009-T012 dependen de T006 y reutilizan el contexto/selector de las fases anteriores.
- **User Story 3 (Phase 5)**: T013-T015 dependen de T002 y de la forma final de las líneas de catálogo; requiere completar US1/US2 para probar el recorrido completo.
- **Polish (Phase 6)**: T016-T019 dependen de las historias que afectan sus enlaces y flujos.

### User Story Dependencies

- **User Story 1 (P1)**: Puede comenzar después de la fase fundacional y constituye el MVP; no depende de US2 ni US3 para probar el acceso directo y el cambio de contexto.
- **User Story 2 (P1)**: Depende del catálogo contextual de US1, pero puede validarse de manera independiente una vez integrado el acceso mayorista.
- **User Story 3 (P1)**: Depende de los datos contextualizados de US1/US2 para probar precios y productos, aunque su validación server-side queda concentrada en `lib/actions/checkout.ts`.

### Within Each User Story

- Las utilidades y el estado compartido preceden a las interfaces que los consumen.
- La página que carga la proyección precede a las tarjetas/detalles que reciben sus props.
- El cliente del checkout debe enviar el contexto antes de validar la acción server-side de confirmación.
- Cada checkpoint debe validarse antes de avanzar a la siguiente historia.

### Parallel Opportunities

- T002 y T003 pueden ejecutarse en paralelo después de T001.
- En US1, T004, T005, T007 y T008 pueden ejecutarse en paralelo; T006 integra el contexto en la página canónica.
- En US2, T009, T011 y T012 pueden ejecutarse en paralelo después de tener disponible la utilidad y el store; T010 integra el listado con la interfaz de tarjeta.
- En US3, T013 y T014 pueden avanzar en paralelo antes de cerrar T015, siempre que respeten el contrato de `CheckoutData`.
- T016 y T017 pueden ejecutarse en paralelo; T018 y T019 deben ejecutarse después de la implementación completa.

## Parallel Example: User Story 1

```text
Después de T001-T003:

Task T004: actualizar app/page.tsx con la redirección al catálogo consumidor
Task T005: integrar components/productos/purchaseContextSwitcher.tsx en la navegación pública
Task T007: conservar contexto en components/productos/sidebar.tsx
Task T008: convertir app/productos/mayoristas/page.tsx en redirección
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar T001-T003 para preparar el contexto y el carrito.
2. Completar T004-T008 para que la entrada pública conduzca directamente al catálogo único.
3. Ejecutar el checkpoint de US1 y validar acceso directo, URL, contexto visible, categorías y redirección mayorista.
4. Continuar con US2 solo después de confirmar que el MVP no crea una segunda superficie pública.

### Incremental Delivery

1. Entregar US1 como catálogo único y selector de contexto.
2. Añadir US2 para descubrir y consultar ofertas mayoristas desde el mismo catálogo.
3. Añadir US3 para conservar carrito y validar precios/inventario en checkout.
4. Ejecutar T016-T019 y revisar regresiones en administración, vista rápida y canal operativo.

### Parallel Team Strategy

1. Una persona completa T001 y luego el equipo toma T002/T003.
2. Para US1, separar entrada (`app/page.tsx`), navegación/selector (`components/productos`) y compatibilidad (`app/productos/mayoristas/page.tsx`).
3. Para US2, separar tarjeta, detalle y acción de carrito; integrar la página de listado después.
4. Para US3, separar carrito/checkout cliente y acción server-side, coordinando el contrato de `CheckoutData`.

## Notes

- Todos los elementos implementables usan el formato `- [ ] T### [P?] [US#] ...` y contienen rutas concretas.
- No se crean tareas de migración Prisma porque `data-model.md` establece que no hay cambios de esquema.
- No se añaden tareas para `/admin`, `/venta-rapida`, autenticación administrativa, pasarelas ni webhooks porque están fuera de alcance.
- `[P]` indica trabajo en archivos distintos sin dependencia de trabajo incompleto; las tareas que comparten `app/productos/consumidores/page.tsx` se mantienen ordenadas.
- T019 requiere una base PostgreSQL de desarrollo aislada y accesible; la comprobación HTTP local de rutas se ejecutó, pero la base configurada actualmente no responde y no se modificó `.env`.
