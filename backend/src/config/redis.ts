/**
 * src/config/redis.ts
 * Redis connection options for BullMQ (uses connection object to avoid ioredis version conflicts).
 */
import type { ConnectionOptions } from 'bullmq';
import { env } from './env';

export function getRedisConnection(): ConnectionOptions {
  if (!env.redisEnabled) {
    throw new Error('Redis is not configured. Set REDIS_URL in .env');
  }

  return {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null,
  };
}

export async function closeRedisConnection(): Promise<void> {
  // BullMQ manages its own connections when using ConnectionOptions.
}
