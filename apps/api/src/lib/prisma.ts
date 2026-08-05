import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance. In dev with tsx watch, module reload
// can otherwise spawn a new PrismaClient (and a new connection pool)
// on every file save — stash it on globalThis to prevent that.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
