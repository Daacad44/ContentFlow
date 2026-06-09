/**
 * src/config/prisma.ts
 * Singleton Prisma client. Using a single instance avoids exhausting the
 * connection pool during hot-reload in development.
 */
import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev ? ['warn', 'error'] : ['error'],
  });

if (!env.isProd) {
  globalForPrisma.prisma = prisma;
}
