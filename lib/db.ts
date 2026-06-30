import { PrismaClient } from "@prisma/client";

// Reuse one PrismaClient across hot-reloads / serverless invocations to avoid
// exhausting the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** True when the database is configured (so features can degrade gracefully). */
export function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
