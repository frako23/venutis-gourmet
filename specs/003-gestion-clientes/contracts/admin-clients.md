# Contract: Administrative clients

**Feature**: [spec.md](../spec.md)

Este es un contrato interno del App Router. No es una API pública y solo debe ser accesible desde una sesión administrativa autenticada.

## Route and query state

Route: `/admin/clients`

| Parámetro | Valores | Comportamiento |
|-----------|--------|----------|
| `q` | Texto opcional | Busca tokens del nombre normalizado o RIF compacto |
| `tipo` | Vacío/`todos`, `consumidor`, `mayorista` | Filtra todos, `detal` o `mayorista` |
| `page` | Entero positivo, por defecto `1` | Carga 50 filas y conserva `q` y `tipo` |

La página del servidor devuelve el modelo de vista `ClientPage`:

```ts
type ClientPage = {
  rows: ClientRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ClientRow = {
  id: number;
  tipoCliente: "detal" | "mayorista";
  tipoLabel: "Consumidor" | "Mayorista";
  nombre: string;
  apellido: string;
  rif: string | null;
  celular: string;
  email: string | null;
  direcciones: Array<{
    id: number;
    tipo: string;
    urbanizacion: string;
    direccion: string;
  }>;
  cantidadTransacciones: number;
  ultimaCompra: string | null;
  createdAt: string;
  updatedAt: string;
};
```

El modelo de vista no incluye detalles de pagos, líneas completas de pedidos ni datos privados de autenticación.

## Administrative create action

Action: `crearClienteAdministrativo`

Campos de entrada:

```ts
{
  tipoCliente: "detal" | "mayorista";
  nombre: string;
  apellido: string;
  rif: string;
  celular: string;
  email: string;
  direccionInicial?: {
    tipo: string;
    urbanizacion: string;
    direccion: string;
  } | null;
}
```

Reglas:

- La acción autentica/autoriza antes de analizar los datos.
- `mayorista` requiere un RIF válido; `detal` puede omitirlo.
- El teléfono y el correo no vacío deben ser únicos entre todos los clientes.
- Los campos opcionales vacíos se convierten en `null`.
- El cliente, la dirección opcional y `HistorialCliente(creado)` se persisten atómicamente.

Resultado correcto:

```ts
{ success: true; message: string; clientId: number }
```

Resultado de validación o conflicto:

```ts
{
  success: false;
  message: string;
  issues?: Array<{ field: string; message: string }>;
}
```

La acción revalida `/admin/clients` y los selectores administrativos que dependen del tipo/nombre.

## Administrative bulk action

Action: `guardarEdicionMasivaClientes`

Campo del payload: `clientes`, arreglo JSON de hasta 100 filas.

```ts
type ClientPatch = {
  id: number;
  updatedAt: string;
  changes: Partial<{
    tipoCliente: "detal" | "mayorista";
    nombre: string;
    apellido: string;
    rif: string | null;
    celular: string;
    email: string | null;
  }>;
};
```

La acción valida la estructura del payload antes de abrir la transacción y, dentro de la transacción, rechaza IDs repetidos, clientes inexistentes, `updatedAt` obsoleto, filas completas inválidas e identificadores finales duplicados. Luego actualiza todas las filas y crea un evento de historial por cada fila modificada. Cualquier fallo revierte la tanda completa.

Resultado correcto:

```ts
{ success: true; message: string; updated: number }
```

Resultado de error:

```ts
{
  success: false;
  message: string;
  issues?: Array<{
    rowId?: number;
    field?: string;
    code: "invalid" | "duplicate" | "stale" | "missing";
    message: string;
  }>;
}
```

El editor conserva sus cambios locales cuando la acción devuelve un error y muestra los problemas por fila/campo. El resultado correcto revalida `/admin/clients`, `/admin/transactions`, `/admin/add-transaction` y `/admin/delivery-notes` para que los selectores futuros vean el nuevo tipo/nombre.

## Contrato de interfaz

- “Nuevo cliente” opens a modal without navigating away.
- “Editor masivo” edits only the currently loaded client rows and exposes “Guardar cambios” and “Descartar cambios”.
- Los cambios pendientes se marcan visiblemente; cerrar o cambiar filtros con cambios sin guardar requiere confirmación.
- Las etiquetas mostradas son “Consumidor” y “Mayorista”; el valor histórico persistido `detal` no aparece como un tercer tipo confuso.
- Los resultados vacíos identifican el filtro activo y mantienen disponibles “Limpiar filtros” y “Nuevo cliente”.
- En móvil, el resumen del perfil sigue siendo legible y las acciones principales son accesibles sin hover.
