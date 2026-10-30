/** Separa `ALLOWED_EMAILS` en correos normalizados (minúsculas, sin espacios ni vacíos). */
export function leerCorreosAdministradores(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Falla cerrado: sin lista configurada nadie es administradora (las cuentas de clientes no deben entrar). */
export function esCorreoAdministrador(email: string | null | undefined, lista: string[]): boolean {
  if (lista.length === 0 || !email) return false;
  return lista.includes(email.trim().toLowerCase());
}
