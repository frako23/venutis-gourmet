# Guía de validación: Catálogo público unificado

**Feature**: `001-catalogo-unificado`

## Prerrequisitos

- Node.js compatible con el proyecto y dependencias instaladas.
- PostgreSQL de desarrollo aislado con al menos un producto con imagen, inventario disponible, `precioDetal` y `precioMayorista` válidos, y un producto agotado para validar estados.
- Variables de entorno locales configuradas sin modificar ni exponer secretos versionados.

Preparar el cliente Prisma si es necesario:

```powershell
npx prisma generate
```

Esta feature no requiere ejecutar una migración porque no modifica el esquema.

## Validación automatizada disponible

Desde la raíz del proyecto:

```powershell
npm run lint
npm run build
```

El proyecto no declara un script de pruebas automatizadas; la validación funcional principal se realiza con los escenarios siguientes y con la revisión del diff.

## Escenarios funcionales

1. Iniciar la aplicación y abrir `/`. Confirmar que redirige directamente al catálogo canónico con contexto consumidor.
2. Confirmar que el contexto queda visible y que el precio mostrado corresponde a `precioDetal`.
3. Desde el catálogo consumidor, activar "Mayorista". Confirmar que se mantiene el mismo layout, la categoría seleccionada y la ruta canónica, y que el precio cambia a `precioMayorista` cuando es válido.
4. Abrir una ficha desde cada contexto. Confirmar que el contexto se conserva, que la etiqueta comercial es correcta y que el botón se deshabilita para un producto agotado.
5. Añadir un producto al carrito, cambiar de contexto y confirmar que el producto permanece y el total se recalcula con el precio del contexto activo.
6. Entrar en `/productos/mayoristas`. Confirmar que la vista antigua ya no muestra el portal "en construcción" y conduce al catálogo unificado con contexto mayorista.
7. Añadir productos, abrir `/finalizar-compra` y avanzar hasta la confirmación. Confirmar que el checkout usa el mismo flujo para ambos contextos.
8. Cambiar directamente el precio o la disponibilidad en la base de datos de desarrollo antes de confirmar. Confirmar que el servidor rechaza la línea desactualizada y no crea una transacción parcial.
9. Repetir los escenarios 1 a 7 con viewport de 360 px. Confirmar que no aparece desplazamiento horizontal y que selector, precio, disponibilidad y acciones siguen siendo legibles.
10. Verificar que `/admin`, `/admin-login`, `/venta-rapida` y el envío existente por WhatsApp conservan su comportamiento y permisos.

## Evidencia a registrar

- Resultado de `npm run lint` y `npm run build`.
- URLs observadas para ambos contextos y para la compatibilidad mayorista.
- Capturas o notas de los escenarios móvil y de error de precio/inventario.
- Confirmación de que no hubo migración Prisma ni cambios de secretos.
