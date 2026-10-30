# Contrato: cuenta del cliente y acceso al panel

**Feature**: `010-cuenta-cliente-fidelizacion`
**Superficie**: Tienda pública (`/mi-cuenta` y botón de la cabecera de `/productos/*`) y protección del Panel administrativo.

## 1. Acceso al panel (`lib/admin/auth-rules.ts`, `lib/admin/auth.ts`)

| Función | Contrato |
|---|---|
| `esCorreoAdministrador(email, lista)` | Es pura. `false` si `lista` está vacía o si `email` es nulo. Si no, `true` solo si `email.trim().toLowerCase()` está en la lista normalizada. |
| `requireAdmin()` | En desarrollo, el mismo atajo de hoy. En producción: sin sesión, redirige a `/admin-login`; si `!esCorreoAdministrador(...)`, redirige a `/unauthorized`. **Una lista vacía ya no deja pasar a nadie.** |
| `app/admin-login/page.tsx` | Usa `esCorreoAdministrador`. Si la sesión es de administradora, va a `/admin/inventory`; si es de otra persona, a `/unauthorized`. |

## 2. Sesión del cliente (`lib/cuenta-cliente.ts`, `server-only`)

```ts
type SesionCliente =
  | { estado: "anonimo" }
  | { estado: "correo_sin_verificar"; email: string }
  | { estado: "sin_vinculo"; email: string; nombreSugerido: string | null }
  | { estado: "pendiente"; email: string }
  | { estado: "vinculada"; email: string; clienteId: number; tipoCliente: TipoCliente; nombre: string };

obtenerSesionCliente(): Promise<SesionCliente>
obtenerClienteDeSesion(): Promise<number | null>   // clienteId solo si estado === "vinculada"
```

- La sesión se lee con `stackServerApp.getUser()`. Para vincular se exige `primaryEmailVerified`.
- El `clienteId` sale **solo** de `CuentaCliente` por `stackUserId`. Ninguna lectura del cliente acepta un id enviado por el navegador.

## 3. Reglas de vinculación (`lib/cuenta-cliente-rules.ts`, pura)

```ts
resolverVinculacion(input: {
  correoVerificado: boolean;
  clientePorCorreo: { id: number; tieneCuenta: boolean } | null;
  clientePorTelefono: { id: number; tieneCuenta: boolean } | null;
  telefonoIndicado: boolean; // false mientras la persona aún no ha dado su teléfono
}): { accion: "verificar_correo" }
  | { accion: "vincular"; clienteId: number }
  | { accion: "pendiente"; clienteId: number }
  | { accion: "crear_cliente" }
  | { accion: "pedir_datos" }
  | { accion: "conflicto" }
```

| Situación | Resultado |
|---|---|
| Correo sin verificar | `verificar_correo` |
| El correo coincide con un cliente sin cuenta | `vincular` |
| El correo coincide con un cliente que ya tiene cuenta | `conflicto` |
| No coincide el correo y aún no hay teléfono | `pedir_datos` |
| El teléfono coincide con un cliente sin cuenta | `pendiente` |
| El teléfono coincide con un cliente que ya tiene cuenta | `conflicto` |
| No coincide nada | `crear_cliente` |

## 4. Server Action `completarRegistroCliente(prev, formData)`

Ubicación: `lib/actions/cuenta-cliente.ts`.

**Entrada**: `nombre` (2 a 60), `apellido` (2 a 60) y `celular` (normalizado como en el alta de clientes, mínimo 10 dígitos).

**Pasos**:

1. Exige una sesión con correo verificado y sin `CuentaCliente`.
2. Valida con Zod.
3. En una transacción, busca el cliente por correo (sin distinguir mayúsculas) y por teléfono, y aplica `resolverVinculacion`:
   - `vincular` o `pendiente`: crea la `CuentaCliente` con ese estado;
   - `crear_cliente`: crea un `Cliente` (`detal`, `email` de la sesión, `nombreBusqueda` con `normalizeSearchName`) y su `CuentaCliente` `vinculada`, y escribe `HistorialCliente` `creado` con el actor `cliente:{stackUserId}`;
   - `conflicto`: no escribe nada.
4. Revalida `/mi-cuenta`.

**Resultado**:

```ts
| { status: "success"; estado: "vinculada" | "pendiente"; message: string }
| { status: "error"; message: string; fieldErrors?: Record<string, string> }
```

| Caso | `message` |
|---|---|
| Vinculada | `¡Listo! Ya puedes ver tus puntos y tu saldo.` |
| Pendiente | `Encontramos un registro con ese teléfono. Lo confirmaremos y te avisaremos.` |
| Conflicto | `Ese registro ya tiene una cuenta. Escríbenos por WhatsApp para ayudarte.` |
| Datos inválidos | `Revisa tus datos.` |

La vinculación automática por correo no necesita esta acción: `obtenerSesionCliente` la ejecuta en la primera visita (`vincular`) dentro de una transacción idempotente, protegida por los `@unique` de `stackUserId` y `clienteId`.

## 5. Página `/mi-cuenta` (`app/mi-cuenta/page.tsx`)

`dynamic = "force-dynamic"`. Componentes en `components/mi-cuenta/`.

| `SesionCliente.estado` | Muestra |
|---|---|
| `anonimo` | "Ingresar" → `/handler/sign-in?after_auth_return_to=/mi-cuenta` y "Crear cuenta" → `/handler/sign-up?after_auth_return_to=/mi-cuenta`. |
| `correo_sin_verificar` | Aviso para verificar el correo y botón para reenviar la verificación (del proveedor). |
| `sin_vinculo` | Formulario de `completarRegistroCliente`. |
| `pendiente` | Aviso "Confirmaremos tu registro", sin ningún dato del cliente existente (FR-043). |
| `vinculada` | Resumen (§6) y "Cerrar sesión". |

## 6. Lectura del resumen: `obtenerResumenCuenta(clienteId)`

Está en `lib/cuenta-cliente.ts` y solo se llama con el `clienteId` de la sesión.

```ts
type ResumenCuenta = {
  nombre: string;
  tipoCliente: "detal" | "mayorista";
  puntos: { disponibles: number; mostrar: boolean; movimientos: Array<{ fecha: Date; puntos: number; tipo: TipoMovimiento; descripcion: string; numeroOrden: string | null }> };
  premios: Array<{ id: number; nombre: string; descripcion: string | null; costoPuntos: number; faltan: number }>; // solo activos
  deudaUsd: number;
  pedidosPendientes: Array<{ numeroOrden: string; fecha: Date; totalUsd: number; saldoUsd: number; estado: string }>;
  saldoAFavorUsd: number;
  movimientosSaldo: Array<{ fecha: Date; montoUsd: number; concepto: string; numeroOrden: string | null }>;
  pedidos: Array<{ id: number; numeroOrden: string; fecha: Date; totalUsd: number; estado: string; saldoUsd: number }>;
};
```

- `puntos.mostrar = tipoCliente === "detal" || disponibles > 0` (FR-039).
- `deudaUsd` usa `consultarDeudaCliente` (la misma regla que la ficha y las cuentas por cobrar).
- **Nunca incluye** notas internas, límite de crédito, `actorEmail`, motivos de ajustes manuales (se muestran como "Ajuste") ni RIF (FR-040). Los movimientos y pedidos se limitan a los 50 más recientes.
- Los montos se muestran en USD. Si se muestran también en Bs, se indica la tasa del día (`hooks/useDolar.ts`).

## 7. Cabecera de la tienda (`components/productos/loginButton.tsx`)

- `LoginButton` (componente cliente) usa el hook `useUser()` de Stack, que ya provee el layout raíz: muestra el nombre de la sesión y enlaza a `/mi-cuenta`, o muestra "Ingresar" con el mismo enlace. No requiere leer la sesión en el layout, así que no cambia el comportamiento de renderizado de `/productos/*`.
- Se elimina la búsqueda por teléfono sin autenticar.
- El `client` de `store/appStore.ts` lo sigue usando solo el checkout.
