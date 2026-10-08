# Contrato público: catálogo unificado

**Feature**: `001-catalogo-unificado`

Este contrato describe la navegación pública y el estado visible. No crea una API externa ni modifica el esquema de datos.

## Entrada y contexto

| Entrada | Comportamiento |
|---|---|
| `/` | Redirige directamente al catálogo canónico con `contexto=consumidor`. |
| `/productos/consumidores` | Catálogo canónico. Sin `contexto`, usa `consumidor`. |
| `/productos/consumidores?contexto=consumidor` | Muestra precios detal y la presentación de consumidor. |
| `/productos/consumidores?contexto=mayorista` | Muestra la oferta mayorista disponible usando el mismo layout, carrito y checkout. |
| `/productos/consumidores?contexto=<otro>` | Normaliza el contexto a `consumidor`. |
| `/productos/consumidores?categoria=<valor>&contexto=<valor>` | Conserva ambos filtros durante la navegación. |
| `/productos/mayoristas` | Redirige al catálogo canónico con `contexto=mayorista`; no muestra un portal independiente. |

## Detalle de producto

`/productos/consumidores/:id?contexto=<valor>` debe:

- conservar el contexto al abrir y al volver al catálogo;
- mostrar el precio aplicable al contexto normalizado;
- identificar la oferta mayorista cuando corresponda;
- impedir añadir al carrito cuando el inventario es cero;
- añadir al carrito los dos precios disponibles para permitir un cambio de contexto consistente.

## Selector de contexto

El catálogo debe mostrar un selector o control equivalente que:

- indique cuál contexto está activo;
- permita pasar de consumidor a mayorista sin cambiar de aplicación;
- mantenga la categoría actual al cambiar de contexto;
- sea usable con teclado y en pantallas móviles;
- actualice el precio visible, el total del carrito y la etiqueta comercial.

## Carrito y checkout

- El carrito conserva las líneas al cambiar de contexto.
- El total visible se recalcula con el precio del contexto activo.
- El checkout recibe el contexto junto con las líneas.
- El servidor valida nuevamente contexto, precio e inventario antes de persistir la compra.
- Si una línea quedó desactualizada, el checkout no confirma la compra y comunica qué debe revisar el visitante.

## Compatibilidad y superficies excluidas

- Los enlaces del footer, header y página de historia deben apuntar al catálogo canónico y conservar, cuando corresponda, `contexto` y `categoria`.
- `/admin`, `/admin-login`, `/venta-rapida`, `/confirmacion` y la coordinación por WhatsApp mantienen sus responsabilidades actuales.
- No se añaden rutas de autenticación, endpoints de pago ni integraciones externas.
