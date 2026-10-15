import { PrismaClient } from "@prisma/client";

export const integrationEnabled =
  process.env.RUN_CHECKOUT_INTEGRATION === "1" &&
  Boolean(process.env.CHECKOUT_TEST_DATABASE_URL || process.env.ADMIN_TEST_DATABASE_URL);

export function createIntegrationClient() {
  const url = process.env.CHECKOUT_TEST_DATABASE_URL || process.env.ADMIN_TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Define CHECKOUT_TEST_DATABASE_URL para ejecutar la integración de checkout.",
    );
  }
  return new PrismaClient({ datasources: { db: { url } } });
}

export function uniqueValue(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
