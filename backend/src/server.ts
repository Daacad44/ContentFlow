/**
 * src/server.ts
 * Entry point. Boots the HTTP server and wires graceful shutdown.
 */
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';
import { postSchedulerService } from './services/postScheduler.service';
import { publishQueueService } from './services/publishQueue.service';
import { startPublishWorker } from './workers/publish.worker';

async function bootstrap() {
  if (env.requireRedisInProduction && !env.redisEnabled) {
    logger.error(
      'REDIS_URL is required in production. Set REDIS_URL or REQUIRE_REDIS_IN_PRODUCTION=false.',
    );
    process.exit(1);
  }

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to the database');
    process.exit(1);
  }

  if (env.googleOAuthEnabled) {
    logger.info('Google OAuth enabled');
  } else {
    logger.warn('Google OAuth disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  const app = createApp();

  if (publishQueueService.isQueueEnabled()) {
    startPublishWorker();
    await publishQueueService.syncScheduledPosts();
    await publishQueueService.syncOverdueScheduledPosts();
    logger.info('BullMQ publish worker started in-process');
  } else if (env.isProd) {
    logger.error('Redis/BullMQ is required for publishing in production.');
    process.exit(1);
  } else if (env.ENABLE_IN_PROCESS_SCHEDULER) {
    postSchedulerService.start();
    logger.warn('In-process post scheduler active — set REDIS_URL for BullMQ in production');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 ${env.APP_NAME} API listening on ${env.API_URL} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    postSchedulerService.stop();
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Cleanup complete. Bye 👋');
      process.exit(0);
    });
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
