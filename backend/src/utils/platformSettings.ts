/**
 * src/utils/platformSettings.ts
 * Reads per-platform options stored in Post.platformSettings.
 */
import type { Prisma } from '@prisma/client';
import type { TikTokSettings } from '../validators/post.validator';

export function readTikTokSettings(platformSettings: Prisma.JsonValue | null): TikTokSettings | null {
  if (!platformSettings || typeof platformSettings !== 'object' || Array.isArray(platformSettings)) {
    return null;
  }
  const tiktok = (platformSettings as Record<string, unknown>).tiktok;
  return tiktok && typeof tiktok === 'object' ? (tiktok as TikTokSettings) : null;
}
