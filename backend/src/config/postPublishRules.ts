/**
 * src/config/postPublishRules.ts
 * Platform-specific requirements before publishing via Zernio.
 */
import { SocialPlatform } from '@prisma/client';

const MEDIA_REQUIRED: SocialPlatform[] = [
  SocialPlatform.INSTAGRAM,
  SocialPlatform.TIKTOK,
];

export function validatePlatformPublishRequirements(
  platform: SocialPlatform,
  mediaCount: number,
): string | null {
  if (MEDIA_REQUIRED.includes(platform) && mediaCount === 0) {
    const label = platform === SocialPlatform.TIKTOK ? 'TikTok' : 'Instagram';
    return `${label} posts require at least one image or video.`;
  }
  return null;
}

/** Zernio internal Mongo IDs are 24-char hex strings. Real platform IDs differ. */
export function isLikelyZernioInternalId(id: string, zernioPostId?: string): boolean {
  if (zernioPostId && id === zernioPostId) return true;
  return /^[a-f0-9]{24}$/i.test(id);
}

export function isConfirmedPlatformPublish(result: {
  postId: string;
  platformPostId?: string;
  platformPostUrl?: string;
  status: string;
  platformStatus: string;
}): boolean {
  if (result.platformPostUrl) return true;

  const status = (result.platformStatus || result.status || '').toLowerCase();
  if (status !== 'published') return false;

  if (result.platformPostId && !isLikelyZernioInternalId(result.platformPostId, result.postId)) {
    return true;
  }

  return false;
}
