import { isConfirmedPlatformPublish, validateTikTokMedia } from '../../src/config/postPublishRules';
import { tiktokSettingsSchema } from '../../src/validators/post.validator';

describe('validateTikTokMedia', () => {
  it('requires media', () => {
    expect(validateTikTokMedia([])).toMatch(/require/);
  });

  it('accepts one video or several photos', () => {
    expect(validateTikTokMedia([{ mimeType: 'video/mp4' }])).toBeNull();
    expect(validateTikTokMedia([{ mimeType: 'image/jpeg' }, { mimeType: 'image/png' }])).toBeNull();
  });

  it('rejects mixed media, two videos and GIFs', () => {
    expect(validateTikTokMedia([{ mimeType: 'video/mp4' }, { mimeType: 'image/jpeg' }])).toMatch(/mix/);
    expect(validateTikTokMedia([{ mimeType: 'video/mp4' }, { mimeType: 'video/quicktime' }])).toMatch(/one video/);
    expect(validateTikTokMedia([{ mimeType: 'image/gif' }])).toMatch(/GIF/);
  });
});

describe('TikTok publish confirmation', () => {
  it('treats Zernio "published" as confirmed even before TikTok returns a URL', () => {
    expect(
      isConfirmedPlatformPublish({
        postId: '65f1c0a9e2b5af0012ab34cd',
        status: 'published',
        platformStatus: 'published',
        platform: 'tiktok',
      }),
    ).toBe(true);
  });

  it('does not confirm while TikTok is processing', () => {
    expect(
      isConfirmedPlatformPublish({
        postId: '65f1c0a9e2b5af0012ab34cd',
        status: 'publishing',
        platformStatus: 'processing',
        platform: 'tiktok',
      }),
    ).toBe(false);
  });
});

describe('tiktokSettingsSchema', () => {
  const base = { privacyLevel: 'PUBLIC_TO_EVERYONE', consentGiven: true };

  it('requires consent and a privacy level', () => {
    expect(tiktokSettingsSchema.safeParse({ ...base, consentGiven: false }).success).toBe(false);
    expect(tiktokSettingsSchema.safeParse({ consentGiven: true }).success).toBe(false);
    expect(tiktokSettingsSchema.safeParse(base).success).toBe(true);
  });

  it('rejects private branded content', () => {
    const result = tiktokSettingsSchema.safeParse({
      ...base,
      privacyLevel: 'SELF_ONLY',
      commercialContent: 'brand_content',
    });
    expect(result.success).toBe(false);
  });
});
