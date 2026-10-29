# Quickstart: validar el orden manual de productos

**Feature**: `009-orden-productos`

Guía para comprobar de punta a punta que la función cumple la [spec](./spec.md). El detalle del modelo está en [data-model.md](./data-model.md) y el de la acción y la pantalla en [contracts/product-order.md](./contracts/product-order.md).

## Requisitos previos

- Una base de desarrollo **aislada** (nunca la de producción) en `DATABASE_URL`, con una copia del catálogo real o al menos 10 productos de varias categorías, alguno agotado y alguno cuyo nombre no esté en la lista fija actual.
- `npm install` hecho. En desarrollo, `requireAdmin()` deja pasar sin sesión.

## 1. Orden inicial (FR-015, SC-005)

1. **Antes** de migrar, con `npm.cmd run dev`, abre `/productos/consumidores?contexto=consumidor` en "Todos" y anota la secuencia de nombres.
2. Aplica la migración y regenera el cliente:

   ```powershell
   npx prisma migrate dev
   npx prisma generate
   ```

3. Revisa el resultado:

   ```sql
   SELECT "orden", "nombre", "categoria" FROM "Producto" ORDER BY "orden" NULLS LAST, "nombre", "id";
   ```

   **Esperado**: ningún `orden` en `null`, valores `1..N` sin repetir y la misma secuencia anotada en el paso 1, incluidos los productos con tildes o "ñ" (por ejemplo, "Salsa Atún" y "Ravioli de ricotta y champiñones").
4. Con el código nuevo, recarga la tienda: la secuencia es idéntica a la del paso 1.

## 2. Reordenar (Historia 1)

1. En `/admin/inventory`, pulsa "Ordenar productos": se abre `/admin/inventory/sort` con todos los productos, incluidos los agotados (marcados "Agotado").
2. Arrastra el último producto a la primera posición: la lista se actualiza y "Guardar orden" y "Descartar" se habilitan.
3. Pulsa "Descartar": la lista vuelve al orden guardado y los botones se deshabilitan.
4. En el selector "Posición" del último producto, elige 1 y pulsa "Guardar orden". **Esperado**: notificación de éxito y la lista conserva el nuevo orden tras recargar.
5. **Teléfono** (DevTools en ~390 px o un teléfono real): desplazar la lista tocando fuera del asa hace scroll sin arrastrar; con el selector, lleva el último producto al primer lugar y guarda en menos de 30 segundos (SC-001).
6. **Teclado**: enfoca un asa, pulsa Espacio, muévelo con las flechas y suéltalo con Espacio.

## 3. Mismo orden en todas las vistas (Historia 2, SC-003)

Con el último producto movido al primer lugar, comprueba que encabeza la lista (y que el resto sigue la misma secuencia) en:

- [ ] `/productos/consumidores?contexto=consumidor`, en "Todos" y filtrando por su categoría;
- [ ] `/productos/consumidores?contexto=mayorista` (si es oferta mayorista);
- [ ] `/venta-rapida`, también al buscar parte de su nombre (si tiene inventario);
- [ ] `/cotizacion-rapida`, y después de que la cotización relea precios e inventario;
- [ ] `/admin/inventory`, sin filtro y filtrando por tipo;
- [ ] selectores de producto de `/admin/add-transaction`, `/admin/delivery-notes/new`, el editor de `/admin/transactions`, el filtro de `/admin/analytics/sales` y las equivalencias de `/admin/transactions/import`.

Además, comprueba que **no** cambiaron las líneas del detalle de un pedido, el PDF de una nota de entrega ni los rankings de analíticas.

## 4. Cambios del catálogo (Historia 3)

1. **Producto nuevo**: créalo en `/admin/add-product`. **Esperado**: aparece último en la tienda, la venta rápida (si tiene inventario) y la pantalla de ordenar.
2. **Renombrar**: cambia el nombre de un producto que está en la posición 5. **Esperado**: sigue en la posición 5 en todas las vistas (SC-006).
3. **Agotar y reponer**: deja un producto en 0 desde el inventario: desaparece de la venta rápida y la cotización sin alterar el orden de los demás. Repónlo: vuelve a su posición.
4. **Eliminar**: elimina un producto del medio. **Esperado**: los demás conservan su orden relativo.

## 5. Concurrencia y errores (casos borde)

1. Abre la pantalla de ordenar en dos pestañas. Guarda un orden en la primera y otro distinto en la segunda. **Esperado**: al recargar, prevalece el de la segunda completo, sin posiciones repetidas:

   ```sql
   SELECT "orden", COUNT(*) FROM "Producto" GROUP BY "orden" HAVING COUNT(*) > 1; -- 0 filas
   ```

2. Abre la pantalla de ordenar, crea un producto en otra pestaña y guarda desde la primera. **Esperado**: el guardado funciona y el producto nuevo queda último.
3. Repite con un producto eliminado en otra pestaña. **Esperado**: el guardado funciona y el producto eliminado no reaparece.
4. Con la base detenida (o sin red), pulsa "Guardar orden". **Esperado**: notificación de error, los cambios en pantalla se conservan y el orden guardado no cambia.
5. En un despliegue con `ALLOWED_EMAILS` (no en desarrollo), invocar la acción con una sesión no autorizada no cambia el orden.

## 6. Verificación automática

```powershell
npm.cmd run test:admin
npm.cmd run lint
npm.cmd run build
```

**Esperado**: las pruebas de `ordenFinal` pasan, junto con las existentes del panel; lint y build terminan sin errores. Si alguna verificación se omite, se declara en la entrega.

## Despliegue

1. Aplica la migración en producción (`npx prisma migrate deploy`) **antes** de desplegar el código. La columna es opcional, así que el código anterior sigue funcionando.
2. Despliega el código y repite la comparación del paso 1 contra la tienda de producción.
