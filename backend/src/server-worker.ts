/**
 * src/server-worker.ts
 * Standalone BullMQ worker process for post publishing.
 * Run: npm run worker
 */
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';
import { startPublishWorker, stopPublishWorker } from './workers/publish.worker';
import { publishQueueService } from './services/publishQueue.service';

async function bootstrap() {
  if (!env.redisEnabled) {
    logger.error('REDIS_URL is required to run the publish worker.');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to the database');
    process.exit(1);
  }

  startPublishWorker();
  await publishQueueService.syncScheduledPosts();

  logger.info(`🔧 ${env.APP_NAME} publish worker running`);

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down worker...`);
    await stopPublishWorker();
    logger.info('Worker stopped. Bye 👋');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
