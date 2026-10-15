# Quickstart: Gestión administrativa de clientes

**Feature**: [spec.md](./spec.md)

Esta guía valida la feature contra una base de desarrollo o integración aislada. No se deben dirigir los ensayos de migración ni las pruebas de integración a datos de producción.

## Prerrequisitos

- PowerShell in the repository root.
- Node dependencies installed.
- A PostgreSQL database isolated for development or testing.
- `DATABASE_URL` configured for local migration checks, or `ADMIN_TEST_DATABASE_URL` configured for integration tests.
- Existing administrative authentication available for manual browser checks.

## Validación de esquema y estática

Run with `npm.cmd`/`npx.cmd` in PowerShell:

```powershell
npx.cmd prisma validate
npx.cmd prisma migrate status
npx.cmd prisma generate
npx.cmd tsc --noEmit
```

Resultado esperado: el esquema es válido, la nueva migración aparece/aplica en la base aislada, los tipos de Prisma se generan correctamente y TypeScript no informa errores.

## Pruebas automatizadas

Las reglas unitarias se ejecutan con el comando administrativo existente:

```powershell
npm.cmd run test:admin
```

Cuando exista una base aislada de integración:

```powershell
$env:RUN_ADMIN_INTEGRATION = "1"
$env:ADMIN_TEST_DATABASE_URL = "<isolated-postgresql-url>"
npm.cmd run test:admin
```

La cobertura de integración debe demostrar:

1. An admin-created consumer and wholesaler persist the normalized RIF and optional initial address.
2. A historical client without RIF remains queryable and can later receive a valid RIF.
3. Name search is insensitive to accents, case, spaces and RIF separators.
4. A valid multi-row edit updates all rows and creates one history event per changed row.
5. A batch containing an invalid field, duplicate identifier or stale `updatedAt` rolls back every row and every history event.
6. Existing transaction, payment, delivery-note and address relations remain linked after profile/type changes.

## Validación manual en el navegador

1. Start the app with `npm.cmd run dev` and authenticate as an administrator.
2. Open `/admin/clients`; confirm that “Clientes” appears in desktop and mobile navigation.
3. Confirm the table shows both “Consumidor” and “Mayorista”, total results and profile summary without exposing payment details.
4. Search by a partial name with and without accents; search by a RIF with and without hyphens; combine each search with both type filters.
5. Open “Nuevo cliente”, create one consumer without RIF and one wholesaler with a valid RIF and optional address; confirm both appear once.
6. Attempt a duplicate phone, duplicate email, duplicate RIF, invalid RIF and missing wholesaler RIF; confirm the modal stays open and identifies the field.
7. Enter editor masivo, change at least three rows, verify pending indicators, save and confirm the updated count.
8. Enter an invalid value in one row and save; confirm no row changes, row/field errors remain visible and the local edits are preserved.
9. Open a separate session or perform a direct data change between load and save; confirm the stale row is rejected instead of overwritten.
10. Change a client type and verify that existing transactions/notes still show their historical client and values.
11. At 360 px width, verify filter, create, edit, save and discard actions remain accessible without hover.

## Comprobaciones finales del proyecto

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run test:admin
npm.cmd run build
git diff --check
```

Se deben registrar los escenarios de integración omitidos cuando no exista `ADMIN_TEST_DATABASE_URL`; un build correcto por sí solo no demuestra rollback, detección de duplicados ni conservación de relaciones históricas.
