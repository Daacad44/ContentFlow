import { isConfirmedPlatformPublish, isLikelyZernioInternalId, isValidPlatformPostUrl } from '../../src/config/postPublishRules';

describe('postPublishRules', () => {
  it('rejects URL-only confirmation without platform post ID', () => {
    expect(
      isConfirmedPlatformPublish({
        postId: 'abc123def456789012345678',
        platformPostUrl: 'https://www.facebook.com/page/posts/123',
        status: 'published',
        platformStatus: 'published',
        platform: 'facebook',
      }),
    ).toBe(false);
  });

  it('confirms when platform ID and valid URL are present', () => {
    expect(
      isConfirmedPlatformPublish({
        postId: 'abc123def456789012345678',
        platformPostId: 'fb_post_12345',
        platformPostUrl: 'https://www.facebook.com/page/posts/12345',
        status: 'published',
        platformStatus: 'published',
        platform: 'facebook',
      }),
    ).toBe(true);
  });

  it('rejects Zernio internal IDs as platform post IDs', () => {
    const zernioId = 'abc123def456789012345678';
    expect(isLikelyZernioInternalId(zernioId, zernioId)).toBe(true);
    expect(
      isConfirmedPlatformPublish({
        postId: zernioId,
        platformPostId: zernioId,
        platformPostUrl: 'https://www.instagram.com/p/abc123/',
        status: 'published',
        platformStatus: 'published',
        platform: 'instagram',
      }),
    ).toBe(false);
  });

  it('validates platform URL hostnames', () => {
    expect(isValidPlatformPostUrl('https://www.linkedin.com/feed/update/1', 'linkedin')).toBe(true);
    expect(isValidPlatformPostUrl('https://evil.example.com/post', 'linkedin')).toBe(false);
  });
});
