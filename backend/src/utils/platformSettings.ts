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

/**
 * Used when a TikTok post has no saved choices: public, all interactions on, auto music for
 * photos. The composer pre-fills the same values so the user sees them before posting.
 */
export const DEFAULT_TIKTOK_SETTINGS: TikTokSettings = {
  privacyLevel: 'PUBLIC_TO_EVERYONE',
  allowComment: true,
  allowDuet: true,
  allowStitch: true,
  commercialContent: 'none',
  autoAddMusic: true,
  sendAsDraft: false,
  consentGiven: true,
};
