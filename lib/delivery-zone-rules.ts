import { roundMoney } from "./checkout-rules.ts";

export type ZonaDeliveryVista = { id: number; nombre: string; costoUsd: number };
export type ZonaDeliveryPanel = ZonaDeliveryVista & { activa: boolean };

export type Resultado<T, C extends string> =
  | { ok: true; value: T }
  | { ok: false; campo: C; message: string };

const NOMBRE_MAX = 80;

export function normalizarNombreZona(nombre: string) {
  return nombre.trim().replace(/\s+/g, " ");
}

// Clave de comparación: sin acentos, en minúsculas, signos como espacio y sin espacios repetidos.
export function claveZona(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function validarNombreZona(
  nombre: string,
): Resultado<{ nombre: string; clave: string }, "nombre"> {
  const normalizado = normalizarNombreZona(nombre);
  if (!normalizado) return { ok: false, campo: "nombre", message: "Escribe el nombre de la zona." };
  if (normalizado.length > NOMBRE_MAX) {
    return { ok: false, campo: "nombre", message: "El nombre de la zona admite hasta 80 caracteres." };
  }
  const clave = claveZona(normalizado);
  if (!clave) {
    return { ok: false, campo: "nombre", message: "El nombre de la zona debe tener letras o números." };
  }
  return { ok: true, value: { nombre: normalizado, clave } };
}

export function validarCostoZona(costo: number): Resultado<number, "costoUsd"> {
  if (typeof costo !== "number" || !Number.isFinite(costo)) {
    return { ok: false, campo: "costoUsd", message: "Escribe un costo válido en dólares." };
  }
  if (costo <= 0) {
    return { ok: false, campo: "costoUsd", message: "El costo del delivery debe ser mayor que cero." };
  }
  const redondeado = roundMoney(costo);
  if (Math.abs(redondeado - costo) > 1e-9) {
    return { ok: false, campo: "costoUsd", message: "El costo admite hasta 2 decimales." };
  }
  return { ok: true, value: redondeado };
}

export function ordenarZonas<T extends { nombre: string; costoUsd: number }>(zonas: T[]): T[] {
  return [...zonas].sort(
    (a, b) =>
      a.costoUsd - b.costoUsd ||
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

export function filtrarZonas<T extends { nombre: string }>(zonas: T[], texto: string): T[] {
  const clave = claveZona(texto);
  if (!clave) return zonas;
  return zonas.filter((zona) => claveZona(zona.nombre).includes(clave));
}

export function agruparPorCosto<T extends { nombre: string; costoUsd: number }>(
  zonas: T[],
): Array<{ costoUsd: number; zonas: T[] }> {
  const grupos: Array<{ costoUsd: number; zonas: T[] }> = [];
  for (const zona of zonas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.costoUsd === zona.costoUsd) ultimo.zonas.push(zona);
    else grupos.push({ costoUsd: zona.costoUsd, zonas: [zona] });
  }
  return grupos;
}

export function buscarZona<T extends { nombre: string }>(zonas: T[], urbanizacion: string): T | null {
  const clave = claveZona(urbanizacion);
  if (!clave) return null;
  return zonas.find((zona) => claveZona(zona.nombre) === clave) ?? null;
}

export function validarDatosEntrega(datos: {
  nombre: string;
  telefono: string;
  direccion: string;
}): Resultado<{ nombre: string; telefono: string; direccion: string }, "nombre" | "telefono" | "direccion"> {
  const nombre = datos.nombre.trim();
  const telefono = datos.telefono.trim();
  const direccion = datos.direccion.trim();

  if (!nombre) return { ok: false, campo: "nombre", message: "Escribe el nombre de quien recibe." };
  if (!telefono) return { ok: false, campo: "telefono", message: "Escribe el teléfono de quien recibe." };
  if (!/^[+\d\s-]+$/.test(telefono)) {
    return { ok: false, campo: "telefono", message: "El teléfono solo admite números, +, espacios y guiones." };
  }
  const digitos = telefono.replace(/\D/g, "").length;
  if (digitos < 10 || digitos > 15) {
    return { ok: false, campo: "telefono", message: "El teléfono debe tener entre 10 y 15 dígitos." };
  }
  if (!direccion) return { ok: false, campo: "direccion", message: "Escribe la dirección de entrega." };
  return { ok: true, value: { nombre, telefono, direccion } };
}
