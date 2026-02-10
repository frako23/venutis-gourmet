import { Producto } from "@prisma/client";

export enum UserRole {
  MAYORISTA = "mayorista",
  DETAL = "detal",
}

export enum EstadoTransaccion {
  PAGADO = "pagado",
  PENDIENTE = "pendiente",
  CANCELADO = "cancelado",
}

export enum TipoCliente {
  MAYORISTA = "mayorista",
  DETAL = "detal",
}

export interface ProductoConImagenes extends Producto {
  imagenes: Imagen[];
}
