# Implementation Plan: Cotización rápida para compartir

**Branch**: `006-cotizacion-rapida` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-cotizacion-rapida/spec.md`

## Summary

Se agregará una página `/cotizacion-rapida` con la misma experiencia visual y catálogo de `/venta-rapida`, pero con estado temporal propio para armar cotizaciones. La operadora podrá revisar productos, cantidades, destinatario opcional, tasa y totales; luego se generará localmente una imagen PNG descargable y compartible por WhatsApp cuando el dispositivo lo permita. No habrá escrituras de pedidos, clientes, pagos, inventario ni historial de cotizaciones.

La solución reutilizará la lectura del catálogo, el formato monetario, la tasa de cambio y los recursos visuales existentes. Un renderer Canvas 2D dibujará el bloque dedicado y completo de la cotización a PNG sin capturar el panel desplazable ni depender de `foreignObject`. El archivo se compartirá mediante Web Share cuando `navigator.canShare({ files })` lo confirme; si no, se descargará y se abrirá WhatsApp con un mensaje preparado para adjuntar la imagen manualmente.

## Technical Context

**Language/Version**: TypeScript estricto, React 19 y Next.js 15 con App Router.

**Primary Dependencies**: Prisma para lectura del catálogo, SWR mediante `useDolar` para la tasa existente, componentes visuales existentes y APIs nativas Canvas 2D, `Blob`, `File`, `URL.createObjectURL` y Web Share.

**Storage**: PostgreSQL/Prisma solo como fuente de lectura del catálogo. La cotización, la imagen y los datos opcionales del destinatario viven temporalmente en el estado del navegador y no se persisten.

**Testing**: `node:test` mediante `npm.cmd run test:checkout` para reglas puras, mensaje y documento; `npm.cmd run lint`; `npm.cmd run build`; validación manual renderizada en móvil y escritorio para generación, descarga y compartir.

**Target Platform**: Navegadores modernos en teléfonos y escritorio. El compartir nativo depende de un contexto seguro y de las capacidades del navegador/dispositivo; `localhost` o HTTPS se usarán para comprobarlo.

**Project Type**: Aplicación web Next.js monolítica con una ruta de lectura de catálogo y un componente cliente de interacción.

**Performance Goals**: La selección y el cálculo se actualizan de forma inmediata; la operadora puede completar una cotización y generar su imagen en menos de 2 minutos; la acción de compartir o su fallback responde en un máximo de 10 segundos en la prueba definida por la especificación.

**Constraints**: No crear pedidos, clientes, pagos, direcciones, transacciones ni cambios de inventario. No usar el store persistido del checkout. No subir la imagen a Cloudinary ni a otro servicio. El arte de cotización no debe depender de imágenes remotas de productos para evitar problemas de CORS; usará líneas, marca y totales.

**Scale/Scope**: Una cotización temporal por sesión de página, con el catálogo existente y sin historial, búsqueda persistida, vencimiento, reserva, autenticación nueva o panel de seguimiento.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Separación de superficies**: la nueva ruta es una herramienta de cotización y no cambia el checkout ni convierte `/venta-rapida` en panel administrativo.
- [x] **Fuente única y consistencia**: los productos, precios y disponibilidad se leen desde PostgreSQL mediante Prisma; no se agrega una fuente paralela ni se escriben operaciones comerciales.
- [x] **Seguridad y privacidad**: se conservan los límites de acceso existentes; nombre y teléfono son opcionales, temporales y se incluyen solo en la imagen solicitada.
- [x] **Calidad verificable**: las reglas de totales y el mensaje tendrán pruebas puras; la imagen y el compartir se validarán en navegador real, incluyendo fallback y móvil.
- [x] **Simplicidad y canales reales**: se usan APIs nativas para convertir el arte visual; no se incorpora servidor de imágenes, almacenamiento ni API de WhatsApp.

**Resultado de la puerta previa**: APROBADA. No se detectan violaciones que requieran justificación.

## Design Decisions

### Flujo de datos

1. La página servidor consulta una proyección de `Producto` con sus imágenes y filtra el inventario disponible.
2. El componente cliente recibe esa proyección, mantiene una selección local y calcula líneas, subtotal, total USD y total Bs con la tasa actual.
3. Antes de generar, una lectura fresca del catálogo compara precio y disponibilidad de las líneas seleccionadas. Si cambió algún dato, se informa y se actualiza la selección antes de permitir la generación.
4. La interfaz construye un bloque de arte completo y Canvas 2D dibuja logo local, líneas, totales y textos en un PNG.
5. La generación conserva el `Blob`/`File` y un URL temporal para previsualizarlo; cualquier modificación posterior invalida el artefacto anterior y obliga a generar una nueva imagen antes de compartir.

### Separación de responsabilidades

- `app/cotizacion-rapida/page.tsx`: carga inicial y proyección de productos; no contiene estado de interacción ni acciones de escritura.
- `components/cotizacion-rapida/quickQuote.tsx`: selección, búsqueda, resumen, datos opcionales, estados de generación y acciones de compartir/descarga.
- `components/cotizacion-rapida/quoteArtwork.tsx`: composición completa y estable que será convertida a imagen; no captura el `Sheet` desplazable.
- `lib/cotizacion-rapida.ts`: tipos, cálculo de líneas/totales, fingerprint de cotización y mensaje de WhatsApp; funciones puras y testeables.
- `lib/cotizacion-imagen.ts`: renderer Canvas 2D, creación de `Blob`/`File`, URL temporal y descarga; no importa Prisma ni estado persistido.
- `lib/actions/cotizacion-rapida.ts`: revalidación puntual del catálogo sin mutaciones.

### Compartir y fallback

El botón debe ejecutarse directamente desde la interacción de la operadora. Si el navegador confirma soporte para compartir archivos, se usará el archivo PNG y un texto corto. Si no existe soporte, si el contexto no es seguro o si WhatsApp no puede abrirse, se mantendrá la imagen descargable, se disparará la descarga con nombre identificable y se intentará abrir el enlace de WhatsApp con el texto preparado. La interfaz debe indicar que el archivo debe adjuntarse manualmente; no se afirmará que el adjunto fue enviado.

### Renderer deliberado

Canvas 2D se usa porque el objetivo principal es producir un PNG estable y visible en el navegador sin depender de la captura de un nodo fuera del viewport. Se limitan las entradas del arte a texto, colores y logo local; las miniaturas remotas no entran en la imagen y no se introduce almacenamiento externo.

## Project Structure

### Documentation (this feature)

```text
specs/006-cotizacion-rapida/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── cotizacion-rapida.md
```

### Source Code (repository root)

```text
app/
└── cotizacion-rapida/
    └── page.tsx                         # Lectura inicial del catálogo

components/
└── cotizacion-rapida/
    ├── quickQuote.tsx                   # UI cliente y flujo de cotización
    └── quoteArtwork.tsx                 # Arte completo para convertir a PNG

lib/
├── cotizacion-rapida.ts                 # Tipos y reglas puras
├── cotizacion-imagen.ts                 # Captura a Blob/File y descarga
└── actions/
    └── cotizacion-rapida.ts             # Revalidación de catálogo sin escritura

tests/
└── checkout/
    └── quick-quote.test.ts              # Totales, fingerprint y texto de compartir
```

**Structure Decision**: Se mantiene el proyecto Next.js existente y se crea una superficie aislada para cotización. Se reutilizan el singleton de Prisma, `PRODUCT_ORDER`, `useDolar`, formatos monetarios, logo y componentes visuales de la vista rápida, pero no se reutiliza el store persistido del checkout ni se agregan modelos Prisma.

## Phase 1 Implementation Boundaries

- La implementación no modifica el comportamiento de `/venta-rapida`.
- La implementación no crea registros ni modifica `prisma/schema.prisma`.
- La implementación debe demostrar que una imagen generada con datos modificados no puede compartirse como si fuera vigente.
- La validación visual debe probar al menos una pantalla estrecha y un navegador de escritorio; una compilación exitosa no sustituye esa comprobación.
- El acceso se mantiene igual al de `/venta-rapida`; si se requiere restringir esta herramienta exclusivamente al panel administrativo, será una decisión de seguridad separada y no se asumirá dentro de esta feature.
- Se debe revisar la visibilidad de `WhatsAppButtonWrapper` en esta ruta para que el botón flotante global no compita con las acciones de la cotización.

## Complexity Tracking

La única complejidad adicional deliberada es el renderer Canvas, justificado por la necesidad de generar un PNG fiel sin introducir servidor de imágenes ni almacenamiento externo.

| Cambio | Motivo | Alternativa más simple descartada |
|---|---|---|
| Renderer Canvas 2D | Evitar que una captura DOM fuera del viewport produzca un PNG negro y mantener el control del wrapping, medidas y layout. | Captura DOM con `foreignObject` falló en el navegador objetivo. |
