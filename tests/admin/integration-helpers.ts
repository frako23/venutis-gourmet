import { PrismaClient } from "@prisma/client";

export const integrationEnabled = process.env.RUN_ADMIN_INTEGRATION === "1" && Boolean(process.env.ADMIN_TEST_DATABASE_URL);

export function createIntegrationClient() {
  const url = process.env.ADMIN_TEST_DATABASE_URL;
  if (!url) throw new Error("Define ADMIN_TEST_DATABASE_URL para ejecutar integración administrativa.");
  return new PrismaClient({ datasources: { db: { url } } });
}

export function uniqueValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
