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