export type ClientWithRelations = Prisma.ClientGetPayload<{
  include: {
    cityName: { include: { estado: true } };
    stateName: true;
  };
}>;

export enum UserRole {
  MAYORISTA = "mayorista",
  DETAL = "detal",
}

export enum TipoDireccion {
  PRINCIPAL = "principal",
  SECUNDARIA = "secundaria",
  TERCIARIA = "terciaria",
}

export enum EstadoTransaccion {
  PAGADO = "pagado",
  PENDIENTE = "pendiente",
  CANCELADO = "cancelado",
}
