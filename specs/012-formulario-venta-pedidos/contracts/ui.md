# Contrato: Interfaz del panel

**Feature**: 012-formulario-venta-pedidos | **Spec**: [../spec.md](../spec.md)

Toda la interfaz usa:

- las clases `admin-*` y los tokens existentes;
- textos en español;
- avisos solo con sonner;
- un diseño que funcione en teléfono y en escritorio.

## Rutas

| Ruta | Cambio |
|---|---|
| `/admin/add-transaction` | Venta nueva, con buscador de cliente, alta de cliente y fecha por defecto en hora de Caracas. |
| `/admin/add-transaction?editar=<id>` | **Nuevo modo.** El mismo formulario, precargado. Título "Editar pedido {numeroOrden}", con un enlace "← Volver al pedido". Responde 404 si el pedido no existe o está cancelado. |
| `/admin/transactions` | Columna "Acciones" con Ver, Editar y Eliminar, y las mismas acciones en las tarjetas. |
| `/admin/transactions/[id]` | Botón "Editar" en la cabecera (no aparece si el pedido está cancelado). |

Las tres rutas viven bajo `app/admin/layout.tsx`, que exige sesión y un correo autorizado.

## `ClientSearch` (nuevo, `components/admin/ventas/clientSearch.tsx`)

**Props**: `clientes: ClienteBusqueda[]`, `value: number | null`, `onChange(id | null)`, `onCrear(textoBuscado)`, `disabled?: boolean` (el cliente bloqueado al editar).

| Situación | Comportamiento |
|---|---|
| Sin selección | Un campo de texto con el placeholder "Busca por nombre o apellido" y el botón "Registrar cliente nuevo". |
| Al escribir | Lista de hasta 20 resultados de `filtrarClientes`. Cada uno muestra "Nombre Apellido", una insignia Consumidor o Mayorista y el teléfono o el RIF en gris. |
| Teclado | ↑/↓ mueven la opción activa (`aria-activedescendant`), Enter elige y Escape cierra la lista. |
| Sin coincidencias | "No hay clientes con «texto»" y el botón "Registrar «texto» como cliente nuevo". |
| Con selección | Muestra el cliente elegido con el botón "Cambiar", que limpia la selección y enfoca el buscador. |
| Envío del formulario | Un `<input type="hidden" name="clienteId">` con el id elegido. El formulario no se envía sin cliente: el botón de confirmar queda desactivado con la ayuda "Selecciona un cliente". |
| `disabled` | Muestra el cliente y la nota "No se puede cambiar: el pedido tiene puntos o saldo a favor de este cliente". |

## `ClientCreateModal` (ampliado)

**Props nuevas**: `nombreInicial?: string` y `onCreated?: (cliente: ClienteBusqueda) => void`.

- Con `nombreInicial`, precarga la primera palabra como nombre y el resto como apellido.
- Al crear con `onCreated`:
  1. muestra `toast.success`;
  2. llama a `onCreated(cliente)` y se cierra;
  3. no ejecuta `router.refresh()`, para no recargar el formulario de venta.
- Sin `onCreated`, el comportamiento es el de hoy.

## `ManualSaleForm` (modo edición)

**Prop nueva**: `pedido?: PedidoEditable`. Sin ella, el formulario funciona como hoy, salvo por el buscador de cliente y la fecha en hora de Caracas.

| Elemento | Venta nueva | Edición |
|---|---|---|
| Cabecera | "Datos de la venta" | "Editando pedido {numeroOrden}", con una insignia de estado y otra de "Importado" si aplica |
| Cliente | `ClientSearch` | `ClientSearch` precargado; deshabilitado si `clienteBloqueado` |
| Fecha | Ahora en Caracas | `fechaLocal` del pedido, más `fechaOriginal` oculta |
| Número de orden | Opcional | Precargado y obligatorio |
| Líneas | Una línea inicial | Las líneas cobradas del pedido. El stock mostrado es la existencia actual más lo que ya reservó el pedido |
| Líneas de premio, descuento por puntos, delivery | — | Bloque de solo lectura: "Premios canjeados", "Delivery: {zona} · $X" |
| Estado inicial y "Confirmo el cobro" | Visibles | Ocultos; aparece la nota "El estado se cambia desde la tabla o el detalle" |
| Canjes y saldo a favor | Visibles si aplican | Ocultos; se gestionan desde el detalle |
| Resumen | Total | Total con el delivery incluido, "Antes: $X" y la diferencia (+/−), y "Abonado: $Y" si hay abonos |
| Pedido pagado, total mayor | — | Casilla obligatoria "Confirmo que cobré la diferencia de $Z". Sin marcar, el botón queda desactivado |
| Botón principal | "Confirmar venta" | "Guardar cambios" |
| Crédito excedido | Modal de crédito | La misma modal |
| Al tener éxito | Aviso y formulario listo para otra venta | Aviso y navegación a `/admin/transactions/{id}` |
| Al salir sin guardar | — | Enlace "Cancelar edición", que vuelve sin escribir nada |

## `SalesTable` y `SalesCard` (acciones)

- **Columna "Acciones"** (y pie de cada tarjeta):
  - "Ver" (enlace);
  - "Editar" (enlace a `/admin/add-transaction?editar={id}`), si `row.editable`;
  - "Eliminar" (botón en el tono de error), si `row.eliminable`.
- **Cuando no se puede eliminar**: el botón no se muestra y el texto de `motivoNoEliminable` queda como `title` del grupo de acciones, para que la usuaria entienda por qué.
- **En el editor masivo**: las acciones se ocultan mientras está abierto, como hoy con el resto de la tabla.

## `DeleteOrderDialog` (nuevo, `components/admin/ventas/deleteOrderDialog.tsx`)

**Props**: `pedido: { id, numeroOrden, cliente, fechaCompra, totalUsd, estado, tienePagoDeclarado }`, `onClose()` y `ultimaFilaDeLaPagina: boolean`.

| Situación | Comportamiento |
|---|---|
| Al abrir | Título "¿Eliminar el pedido {numeroOrden}?". Muestra el cliente, la fecha (`formatFecha`, en Caracas) y el total. Advierte: "Esta acción no se puede deshacer. Los productos vuelven al inventario." (o "no mueve inventario" si el pedido es importado o cancelado). Si `tienePagoDeclarado`, añade: "También se eliminará el pago declarado por el cliente." |
| Foco | Va primero a "Volver". Escape, pulsar fuera o "Volver" cierran sin eliminar. |
| Confirmar | "Eliminar pedido" llama a `eliminarPedido` dentro de `useTransition`, y queda desactivado y con el texto "Eliminando…" mientras procesa (para evitar el doble clic). |
| Éxito | `toast.success`, cierra la ventana y ejecuta `router.refresh()`. Si `ultimaFilaDeLaPagina` y la página es mayor que 1, navega a `page - 1`. |
| Error | `toast.error(message)`, la ventana sigue abierta y se ejecuta `router.refresh()` para mostrar el estado real. |
