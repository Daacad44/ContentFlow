import { resolveMediaStorage } from '../../src/config/env';
import { STORED_MEDIA_FILENAME } from '../../src/services/mediaUpload.service';

describe('resolveMediaStorage', () => {
  it('uses Cloudinary automatically when it is configured', () => {
    expect(resolveMediaStorage('auto', true)).toBe('cloudinary');
    expect(resolveMediaStorage('auto', false)).toBe('local');
  });

  it('respects an explicit local setting', () => {
    expect(resolveMediaStorage('local', true)).toBe('local');
  });
});

describe('STORED_MEDIA_FILENAME', () => {
  it('accepts current and legacy stored names', () => {
    expect(STORED_MEDIA_FILENAME.test('3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90.jpg')).toBe(true);
    expect(STORED_MEDIA_FILENAME.test('3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90-my_photo.png')).toBe(true);
  });

  it('rejects guessable or unsafe names', () => {
    expect(STORED_MEDIA_FILENAME.test('photo.jpg')).toBe(false);
    expect(STORED_MEDIA_FILENAME.test('../secret.env')).toBe(false);
    expect(STORED_MEDIA_FILENAME.test('3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90.html')).toBe(false);
    expect(STORED_MEDIA_FILENAME.test('3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90-a/b.png')).toBe(false);
  });
});
