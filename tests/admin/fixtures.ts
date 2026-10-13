import type { EstadoTransaccion, TipoCliente } from "@prisma/client";

export const fixtureProducts = [
  { id: 101, nombre: "Mermelada artesanal", inventario: 24, precioDetal: 8, precioMayorista: 6.5 },
  { id: 102, nombre: "Galletas de cacao", inventario: 12, precioDetal: 5.5, precioMayorista: 4.25 },
] as const;

export const fixtureClients = [
  { id: 201, tipoCliente: "detal" as TipoCliente, nombre: "Ana", apellido: "Rojas", celular: "04140000001" },
  { id: 202, tipoCliente: "mayorista" as TipoCliente, nombre: "Mercado", apellido: "Central", celular: "04140000002" },
] as const;

export const fixtureTransactions = [
  { id: 301, numeroOrden: "V-LOCAL-301", clienteId: 201, estado: "pagado" as EstadoTransaccion, montoTotal: 16 },
  { id: 302, numeroOrden: "V-LOCAL-302", clienteId: 202, estado: "por_cobrar" as EstadoTransaccion, montoTotal: 13 },
  { id: 303, numeroOrden: "V-LOCAL-303", clienteId: 201, estado: "pendiente" as EstadoTransaccion, montoTotal: 5 },
  { id: 304, numeroOrden: "V-LOCAL-304", clienteId: 202, estado: "cancelado" as EstadoTransaccion, montoTotal: 9 },
] as const;

export function cloneFixture<T>(value: T): T {
  return structuredClone(value);
}

export function fixtureStock(productId: number) {
  return fixtureProducts.find((product) => product.id === productId)?.inventario ?? 0;
}
