import { PrismaClient } from "@prisma/client";

// One shared Prisma client for the whole app (02-design.md §5).
// Cached on globalThis so `next dev` hot-reloads don't open a new
// connection on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
