/**
 * src/config/socialPlatforms.ts
 * Supported social platforms and their Zernio API identifiers.
 */
import { SocialPlatform } from '@prisma/client';

export const ZERNIO_PLATFORM_MAP: Record<SocialPlatform, string> = {
  [SocialPlatform.FACEBOOK]: 'facebook',
  [SocialPlatform.INSTAGRAM]: 'instagram',
  [SocialPlatform.LINKEDIN]: 'linkedin',
  [SocialPlatform.TIKTOK]: 'tiktok',
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  [SocialPlatform.FACEBOOK]: 'Facebook',
  [SocialPlatform.INSTAGRAM]: 'Instagram',
  [SocialPlatform.LINKEDIN]: 'LinkedIn',
  [SocialPlatform.TIKTOK]: 'TikTok',
};

export const SUPPORTED_PLATFORMS: SocialPlatform[] = [
  SocialPlatform.FACEBOOK,
  SocialPlatform.INSTAGRAM,
  SocialPlatform.LINKEDIN,
  SocialPlatform.TIKTOK,
];

export function toZernioPlatform(platform: SocialPlatform): string {
  return ZERNIO_PLATFORM_MAP[platform];
}

export function fromZernioPlatform(zernioPlatform: string): SocialPlatform | null {
  const entry = Object.entries(ZERNIO_PLATFORM_MAP).find(
    ([, v]) => v === zernioPlatform.toLowerCase(),
  );
  return entry ? (entry[0] as SocialPlatform) : null;
}
