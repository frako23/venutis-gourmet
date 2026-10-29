<!--
Sync Impact Report
- Versión: 1.0.0 → 2.0.0 (MAJOR)
- Motivo: la simplicidad pasa a ser el principio rector y no negociable; los principios se
  reordenan y se redefinen. Los planes 001–006 citan los principios por su numeración anterior;
  se conservan como registro histórico y no se reescriben.
- Principios modificados:
  - V. Simplicidad, experiencia móvil y canales reales → I. Simplicidad ante todo (NO NEGOCIABLE)
    (lo móvil y WhatsApp pasan a "Restricciones técnicas y convenciones")
  - II. Fuente única y consistencia operacional → II. Una sola fuente de verdad
  - I. Separación de las tres aplicaciones → III. Superficies con límites claros
    (cuatro superficies: se añade /cotizacion-rapida; /venta-rapida solo persiste delegando
    en el checkout existente)
  - III. Seguridad, privacidad y control administrativo → IV. Seguridad del lado del servidor
  - IV. Calidad verificable y cambios trazables → V. Pruebas proporcionales al riesgo
- Secciones renombradas: "Restricciones del sistema y del dominio" → "Restricciones técnicas y
  convenciones" (incorpora sonner, español, tokens de DESIGN.md y móvil primero).
- Secciones añadidas: ninguna. Secciones eliminadas: ninguna.
- Flujo de trabajo: la especificación pasa a ser proporcional (los ajustes acotados no la
  requieren) y se añade la "puerta de simplicidad" al Constitution Check.
- Plantillas:
  - ✅ .specify/templates/plan-template.md: deriva los gates de este archivo en tiempo de
    ejecución; su tabla Complexity Tracking ya pide la alternativa más simple rechazada.
  - ✅ spec-template.md, tasks-template.md y checklist-template.md: sin referencias directas.
- TODOs diferidos: ninguno (ratificación confirmada por el commit 2f34227 del 2026-10-07).
-->

# Constitución de Venuti's Gourmet

## Principios fundamentales

### I. Simplicidad ante todo (NO NEGOCIABLE)

Venuti's Gourmet es un negocio pequeño mantenido por un equipo pequeño: cada archivo,
dependencia y abstracción es un costo de mantenimiento permanente. Entre dos soluciones
que cumplen el requisito, gana la más simple.

- Se construye solo lo que el requisito actual exige. NO se añaden opciones,
  configuraciones, flags ni generalizaciones para casos hipotéticos (YAGNI).
- Antes de escribir algo nuevo se DEBE reutilizar lo existente: `lib/prisma.ts`, las
  Server Actions de `lib/actions/*`, las reglas de `lib/*-rules.ts`, Zod, sonner, los
  tokens de `DESIGN.md` y los componentes de `components/`.
- NO se introduce una dependencia, una capa arquitectónica (servicios, repositorios,
  adaptadores, gestores de estado adicionales), un servicio externo ni una superficie
  nueva si el stack actual resuelve el caso. Toda excepción se justifica en la tabla
  *Complexity Tracking* del plan, indicando la alternativa simple rechazada.
- Una abstracción compartida se extrae solo cuando hay tres usos reales o cuando una
  regla de negocio (precio, stock, estado, descuento) debe vivir en un único lugar.
  Repetir unas pocas líneas es preferible a una abstracción prematura.
- Cada cambio toca la menor superficie posible. Los refactors fuera de alcance van en un
  cambio aparte; el código muerto se elimina, no se comenta.
- La complejidad existente (p. ej., el estado de checkout duplicado entre
  `store/appStore.ts` y `context/checkoutContext.tsx`) no justifica añadir más: un cambio
  que la toque DEBE mantenerla o reducirla, nunca ampliarla.
- La simplicidad decide entre alternativas que cumplen los principios II–V; nunca
  justifica relajar la integridad del dinero y del inventario ni la seguridad.

### II. Una sola fuente de verdad

PostgreSQL, a través del singleton `lib/prisma.ts`, es la fuente de verdad de catálogo,
clientes, pedidos, pagos e inventario, y cada regla de negocio vive en un solo lugar.

- Las escrituras DEBEN ser Server Actions (`"use server"`) en `lib/actions/*` que validan
  con Zod antes de tocar la base de datos. Las consultas y reglas del panel viven en
  `lib/admin/*`; la lógica pura (`*-rules.ts`, `*-core.ts`) se separa de la que hace I/O.
- Una operación que confirma una venta y afecta inventario DEBE ejecutarse en una sola
  transacción Prisma que revalida precio y stock en el servidor. El navegador nunca
  decide precio, stock, estado ni cargos.
- Un flujo nuevo que persista ventas DEBE reutilizar el camino de escritura existente,
  como hace `/venta-rapida` al delegar en `/finalizar-compra`, en lugar de crear uno
  paralelo.
- `Transaccion.total` es canónico en USD y la tasa aplicada se guarda en
  `Pago.tasaCambio`. Los cambios de estado pasan por `order-status.ts`/`admin-orders.ts`
  y se registran en `EstadoTransaccionHistorial`, que es solo de inserción.
- Todo cambio de `prisma/schema.prisma` DEBE incluir su migración y la regeneración del
  cliente.

Duplicar una regla es la forma más común de que el stock, los pedidos y los importes
dejen de reflejar el estado real del negocio.

### III. Superficies con límites claros

El sistema tiene cuatro superficies y cada cambio DEBE declarar cuál toca:

- **Tienda pública** (`/productos/*`, `/finalizar-compra`, `/confirmacion`): un único
  catálogo donde `?contexto=consumidor|mayorista` decide el precio.
- **Panel administrativo** (`/admin`): operación interna protegida.
- **Venta rápida** (`/venta-rapida`): arma un pedido y lo envía por WhatsApp sin
  persistir, o lo delega al checkout existente. No tiene un camino de escritura propio.
- **Cotización rápida** (`/cotizacion-rapida`): no persiste; genera la imagen en el
  navegador y solo relee precio e inventario para no emitir datos obsoletos.

Las superficies comparten reglas de dominio, no permisos ni presentación. NO se crea una
superficie nueva si una existente puede absorber el caso, y cambiar lo que una superficie
persiste requiere una especificación propia.

### IV. Seguridad del lado del servidor

- Las rutas y acciones del panel exigen autenticación (Stack Auth) y, si
  `ALLOWED_EMAILS` está definida, que el correo esté en la lista, verificado en el
  servidor. Ninguna decisión de seguridad depende solo de la interfaz, y las descargas
  protegidas revalidan la autorización en cada petición.
- Los secretos viven solo en variables de entorno no versionadas; los tokens de servidor
  NUNCA usan el prefijo `NEXT_PUBLIC_` ni se imprimen.
- Cada operación expone solo los datos personales y de pago que necesita.
- NO se añaden roles, registros públicos ni proveedores de identidad sin una decisión
  documentada.

La seguridad se resuelve con los mecanismos que ya existen, sin capas adicionales.

### V. Pruebas proporcionales al riesgo

- Las reglas que tocan dinero, inventario, estados de pedido o autorización DEBEN tener
  pruebas; los cambios puramente visuales no las requieren.
- Las pruebas usan el runner nativo `node:test` (`npm run test:admin`,
  `npm run test:checkout`). NO se añaden frameworks de prueba, librerías de mocks ni
  suites E2E sin justificarlo en el plan.
- Primero se prueba la lógica pura, sin base de datos; las pruebas de integración se
  reservan para transacciones y corren contra una base aislada, nunca con datos reales.
- Antes de entregar se ejecutan `npm run lint`, `npm run build` cuando el cambio lo
  afecta y las pruebas del área tocada; toda verificación omitida se declara.

Una compilación exitosa no demuestra un flujo de negocio correcto, pero una suite pesada
tampoco se sostiene en un equipo pequeño.

## Restricciones técnicas y convenciones

- Stack: Next.js 15 (App Router), React 19, TypeScript estricto, Tailwind 4, PostgreSQL
  con Prisma, Zod, Zustand, Stack Auth, Cloudinary y `pdf-lib`. Las dependencias de
  `package.json` son las herramientas disponibles; sumar o sustituir una requiere
  justificarlo según el Principio I.
- Las notificaciones se muestran exclusivamente con `sonner` (`toast`); no se usan
  `alert()`, banners ad hoc ni otras librerías de avisos.
- La UI, los mensajes y los nombres de dominio están en español (`Transaccion`,
  `Cliente`, `Producto`). Los imports usan el alias `@/*`.
- Los estilos usan los tokens de `DESIGN.md` y `app/globals.css`; no se introducen
  colores, fuentes ni sistemas de componentes paralelos. La tienda y la venta rápida se
  diseñan móvil primero.
- WhatsApp es el canal de coordinación con los clientes. NO se añaden pasarelas de pago,
  webhooks, colas, cachés externas ni microservicios sin una necesidad de negocio
  documentada.
- Las imágenes se sirven desde Cloudinary con los hosts permitidos en `next.config.ts`.

## Flujo de trabajo y puertas de calidad

1. **Especificación proporcional**: pasa por Spec Kit (`specs/00N-*`) todo cambio que
   toque el esquema, el dinero, el inventario, los estados de pedido o la autorización,
   o que cree una ruta nueva. Las correcciones y los ajustes acotados se hacen
   directamente, sin especificación.
2. **Puerta de simplicidad**: el *Constitution Check* de cada plan DEBE evaluar primero
   el Principio I y responder: ¿cuál es la alternativa más simple?, ¿qué se reutiliza?,
   ¿qué dependencia, archivo o capa nueva se añade y por qué? Toda complejidad añadida se
   registra en *Complexity Tracking*.
3. **Esquema**: migración, `npx prisma generate` y validación en una base de desarrollo
   aislada.
4. **Entrega**: lint, build y pruebas según el Principio V, y revisión del diff en busca
   de secretos, cambios fuera de alcance, código muerto y documentación desactualizada
   (`CLAUDE.md`, `README.md`, `DESIGN.md`).

## Gobernanza

Esta constitución prevalece sobre las convenciones informales que la contradigan.
`CLAUDE.md` contiene la guía operativa de desarrollo y DEBE mantenerse coherente con ella.

- **Enmiendas**: se proponen como un cambio revisable a este archivo que explica el
  motivo, los principios afectados y el trabajo de adopción necesario.
- **Versionado** (SemVer): MAJOR al eliminar o redefinir un principio de forma
  incompatible; MINOR al añadir un principio o ampliar materialmente una obligación;
  PATCH para aclaraciones de redacción.
- **Cumplimiento**: toda revisión de plan o de código verifica esta constitución. Ante la
  duda entre dos opciones que la cumplen, se elige la más simple.
- **Excepciones**: se documentan en *Complexity Tracking* del plan con su motivo y la
  alternativa simple rechazada; una excepción no se convierte en práctica por repetición.

**Versión**: 2.0.0 | **Ratificada**: 2026-10-07 | **Última enmienda**: 2026-10-29
