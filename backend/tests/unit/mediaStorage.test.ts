import { resolveMediaStorage } from '../../src/config/env';
import { STORED_MEDIA_FILENAME } from '../../src/services/mediaUpload.service';

describe('resolveMediaStorage', () => {
  it('prefers Supabase, then Cloudinary, then local disk', () => {
    expect(resolveMediaStorage('auto', { supabase: true, cloudinary: true })).toBe('supabase');
    expect(resolveMediaStorage('auto', { supabase: false, cloudinary: true })).toBe('cloudinary');
    expect(resolveMediaStorage('auto', { supabase: false, cloudinary: false })).toBe('local');
  });

  it('respects an explicit setting', () => {
    expect(resolveMediaStorage('local', { supabase: true, cloudinary: true })).toBe('local');
    expect(resolveMediaStorage('cloudinary', { supabase: true, cloudinary: true })).toBe('cloudinary');
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
