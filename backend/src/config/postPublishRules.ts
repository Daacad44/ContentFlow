/**
 * src/config/postPublishRules.ts
 * Platform-specific requirements and publish confirmation rules.
 */
import { SocialPlatform } from '@prisma/client';

const MEDIA_REQUIRED: SocialPlatform[] = [
  SocialPlatform.INSTAGRAM,
  SocialPlatform.TIKTOK,
];

/** Known platform permalink host patterns — used to validate delivery URLs. */
const PLATFORM_URL_PATTERNS: Record<string, RegExp[]> = {
  facebook: [/facebook\.com/i, /fb\.com/i, /fb\.watch/i],
  instagram: [/instagram\.com/i],
  linkedin: [/linkedin\.com/i],
  tiktok: [/tiktok\.com/i],
};

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

export function isValidPlatformPostUrl(url: string, platform: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    const patterns = PLATFORM_URL_PATTERNS[platform.toLowerCase()];
    if (!patterns?.length) return true;
    return patterns.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

export interface PublishConfirmationInput {
  postId: string;
  platformPostId?: string;
  platformPostUrl?: string;
  status: string;
  platformStatus: string;
  platform?: string;
}

/**
 * A post is confirmed published only when we have evidence of live platform delivery:
 * a real platform post ID (not Zernio internal) AND a matching platform permalink.
 */
export function isConfirmedPlatformPublish(result: PublishConfirmationInput): boolean {
  const status = (result.platformStatus || result.status || '').toLowerCase();
  if (status === 'failed' || status === 'error' || status === 'rejected') {
    return false;
  }

  const platformId = result.platformPostId?.trim();
  if (!platformId || isLikelyZernioInternalId(platformId, result.postId)) {
    return false;
  }

  const url = result.platformPostUrl?.trim();
  if (!url) return false;

  if (result.platform && !isValidPlatformPostUrl(url, result.platform)) {
    return false;
  }

  return status === 'published' || status === 'success' || status === 'live';
}
