/**
 * src/server.ts
 * Entry point. Boots the HTTP server and wires graceful shutdown.
 */
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';

async function bootstrap() {
  // Verify DB connectivity before accepting traffic.
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to the database');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 ${env.APP_NAME} API listening on ${env.API_URL} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Cleanup complete. Bye 👋');
      process.exit(0);
    });
    // Force-exit if cleanup hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

void bootstrap();
