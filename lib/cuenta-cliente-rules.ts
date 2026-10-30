export type ResolucionVinculacion =
  | { accion: "verificar_correo" }
  | { accion: "vincular"; clienteId: number }
  | { accion: "pendiente"; clienteId: number }
  | { accion: "crear_cliente" }
  | { accion: "pedir_datos" }
  | { accion: "conflicto" };

type ClienteEncontrado = { id: number; tieneCuenta: boolean } | null;

/**
 * Decide cómo se vincula una cuenta nueva con un cliente. Solo el correo verificado vincula solo;
 * el teléfono no se verifica, así que únicamente deja la vinculación pendiente de confirmar.
 * `clientePorTelefono` es `null` mientras la persona aún no ha dado su teléfono.
 */
export function resolverVinculacion({
  correoVerificado,
  clientePorCorreo,
  clientePorTelefono,
  telefonoIndicado,
}: {
  correoVerificado: boolean;
  clientePorCorreo: ClienteEncontrado;
  clientePorTelefono: ClienteEncontrado;
  telefonoIndicado: boolean;
}): ResolucionVinculacion {
  if (!correoVerificado) return { accion: "verificar_correo" };
  if (clientePorCorreo) return clientePorCorreo.tieneCuenta ? { accion: "conflicto" } : { accion: "vincular", clienteId: clientePorCorreo.id };
  if (!telefonoIndicado) return { accion: "pedir_datos" };
  if (clientePorTelefono) return clientePorTelefono.tieneCuenta ? { accion: "conflicto" } : { accion: "pendiente", clienteId: clientePorTelefono.id };
  return { accion: "crear_cliente" };
}
