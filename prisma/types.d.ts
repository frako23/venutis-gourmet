export type ClientWithRelations = Prisma.ClientGetPayload<{
  include: {
    cityName: { include: { estado: true } };
    stateName: true;
  };
}>;
