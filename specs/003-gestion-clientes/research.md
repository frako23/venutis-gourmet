# Research: Gestión administrativa de clientes

**Feature**: [spec.md](./spec.md)

## Decisión 1: Reutilizar el modelo Cliente y agregar datos derivados mínimos

**Decisión**: Mantener `Cliente` como la entidad única para consumidores y mayoristas. Añadir un RIF nullable y único, más un campo derivado `nombreBusqueda` para consultar nombres sin distinguir acentos. No crear una segunda entidad para “consumidor”.

**Motivo**: El esquema actual ya relaciona `Cliente` con direcciones, transacciones, notas de entrega, fidelidad y reseñas. El enum existente distingue `detal` y `mayorista`; cambiarlo rompería checkout y consultas administrativas. El RIF nullable permite conservar clientes históricos sin ese dato, mientras que la unicidad evita nuevos duplicados. El texto derivado permite una búsqueda predecible sin instalar la extensión `unaccent` ni traer todos los registros al navegador.

**Alternativas consideradas**:

- Crear una tabla separada para consumidores y mayoristas: rechazado porque duplicaría identidad, relaciones e invariantes.
- Usar `unaccent` y SQL específico para cada búsqueda: rechazado por añadir una dependencia de extensión y requerir permisos de base de datos que no son necesarios.
- Filtrar todo en memoria: rechazado por escalar mal y hacer que paginación y total de resultados fueran inconsistentes.

## Decisión 2: Normalización compartida de RIF y nombre

**Decisión**: Centralizar en `lib/client-rules.ts` la normalización de RIF, formato visible, validación, etiqueta de tipo y construcción de `nombreBusqueda`. El RIF aceptará separadores visuales, se normalizará a prefijo en mayúscula más nueve dígitos y se almacenará sin guiones ni espacios. Se admitirán `V`, `E`, `J`, `G` y `P` conforme a la especificación.

Para el dígito verificador se usará el cálculo local de módulo 11 encapsulado en una función pura: valor de prefijo `V=4`, `E=8`, `J=12`, `P=16`, `G=20`; pesos `[3, 2, 7, 6, 5, 4, 3, 2]` sobre los ocho dígitos; `DV = 11 - (suma % 11)` y `DV = 0` si el resultado es 10 u 11. No se hará consulta remota al SENIAT.

**Motivo**: El material del SENIAT consultado muestra la estructura compacta de prefijo, número y dígito verificador sin guiones ni espacios. Una referencia pública de cálculo documenta el formato con máscara y el cálculo módulo 11; mantener la fórmula en una utilidad aislada permite probarla y revisarla sin acoplar la aplicación a un servicio externo.

**Alternativas consideradas**:

- Guardar el RIF con la máscara introducida por el usuario: rechazado porque dificulta duplicados y búsqueda.
- Validar únicamente longitud y prefijo: rechazado porque incumple la regla funcional de dígito verificador definida en la especificación.
- Consultar un servicio externo para validar cada RIF: rechazado por dependencia, latencia, privacidad y falta de necesidad para administrar el registro local.

**Referencias**:

- [Guía de registro pagador del SENIAT](https://d3q4nr72nuserl.cloudfront.net/docs/default-source/documents/tercero-pagador.pdf?sfvrsn=56555b88_0), estructura compacta y ejemplo de RIF.
- [Referencia pública de formato y cálculo de RIF](https://box4.dev/es/venezuela/generador-rif), usada como referencia de la fórmula local; no representa una consulta oficial de existencia ante SENIAT.

## Decisión 3: Paginación server-rendered y filtros normalizados

**Decisión**: `app/admin/clients/page.tsx` leerá `q`, `tipo` y `page` desde la URL. La página consultará 50 filas, ordenadas por apellido/nombre/id, y devolverá `total` y `totalPages`. El texto de nombre se tokenizará después de normalizar; cada token debe coincidir dentro de `nombreBusqueda`. El RIF se comparará contra la versión compacta.

**Motivo**: Los filtros quedan compartibles y sobreviven la navegación entre páginas. El servidor mantiene el control de acceso y evita exponer el catálogo completo al cliente. La consulta paginada sigue el patrón existente de ventas, que usa `searchParams`, `count`, `skip` y `take`.

**Alternativas consideradas**:

- Cargar todos los clientes en un componente cliente: rechazado por exposición innecesaria de datos personales y peor comportamiento con crecimiento.
- Crear una API route pública: rechazado porque la sección es interna y el proyecto ya usa Server Components y Server Actions.
- Añadir búsqueda global al header: rechazado porque mezclaría clientes con ventas, productos y otras superficies sin un contrato claro.

## Decisión 4: Server Actions administrativas separadas del checkout

**Decisión**: Crear `lib/actions/admin-clients.ts` para crear/editar desde el panel, siempre después de `requireAdmin`. Mantener `lib/actions/clients.ts` para el checkout público y actualizarlo únicamente para rellenar `nombreBusqueda` cuando crea o edita un cliente existente. La consulta paginada permanecerá en `lib/admin/client-query.ts` y la página del servidor seguirá protegida por el layout administrativo.

**Motivo**: La acción actual de clientes sirve al flujo público y no debe convertirse accidentalmente en una puerta de administración. Las acciones administrativas existentes ya siguen el patrón `requireAdmin` + Zod + `revalidatePath`, y los editores masivos usan `useActionState`.

**Alternativas consideradas**:

- Reutilizar `addClient` para la modal administrativa: rechazado porque mezcla permisos, mensajes y reglas de checkout.
- Implementar una ruta HTTP adicional: rechazado por duplicar superficie sin necesidad.
- Hacer escrituras con llamadas directas desde el navegador: rechazado por la constitución y por riesgo de manipulación de payload.

## Decisión 5: Edición masiva atómica con control optimista

**Decisión**: El editor enviará hasta 100 parches `{ id, updatedAt, changes }`. El servidor cargará las filas, comprobará que todas existen y que su `updatedAt` coincide, combinará cada parche con el estado actual, validará campos y duplicados y ejecutará todas las actualizaciones más sus eventos de historial dentro de `prisma.$transaction`.

**Motivo**: Reutiliza el patrón de `guardarEdicionMasivaVentas` y `editInventoryMasiva`, pero evita sobrescribir cambios realizados por otro administrador. Si una fila falla, la transacción revierte toda la tanda y el estado local del editor conserva los valores para corregirlos.

**Alternativas consideradas**:

- Actualizar fila por fila sin transacción: rechazado porque deja datos parciales.
- Confiar solo en el estado del componente cliente: rechazado porque el payload puede ser manipulado y puede estar obsoleto.
- Sobrescribir siempre el registro actual: rechazado porque pierde cambios concurrentes silenciosamente.

## Decisión 6: Historial administrativo mínimo

**Decisión**: Añadir `HistorialCliente` con `clienteId`, `actorId`, `actorEmail`, `accion`, `camposModificados` y `createdAt`. La alta administrativa crea un evento `creado`; cada fila modificada crea un evento `actualizado`. No se guardarán snapshots completos de datos personales ni se añadirá una pantalla de auditoría en esta feature.

**Motivo**: `updatedAt` permite conocer la última modificación, pero no quién la realizó ni qué campos cambió. El proyecto ya registra actor e historial para estados de transacción; el mismo patrón aporta trazabilidad proporcional sin crear un sistema de auditoría general.

**Alternativas consideradas**:

- Usar únicamente `updatedAt`: rechazado porque no identifica actor ni campos.
- Crear un sistema de auditoría reutilizable para toda la aplicación: rechazado por ampliar el alcance de la feature.
- Guardar valores anteriores completos: rechazado para limitar la duplicación de datos personales.
