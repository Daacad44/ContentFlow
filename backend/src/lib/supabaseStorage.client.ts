/**
 * src/lib/supabaseStorage.client.ts
 * Minimal Supabase Storage client (REST) for uploading post media to a public bucket.
 * Uses the service-role key, so it must only ever run on the server.
 */
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

function baseUrl(): string {
  if (!env.supabaseStorageEnabled || !env.SUPABASE_URL) {
    throw ApiError.serviceUnavailable(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return env.SUPABASE_URL.replace(/\/$/, '');
}

function encodePath(objectPath: string): string {
  return objectPath.split('/').map(encodeURIComponent).join('/');
}

export const supabaseStorageClient = {
  isEnabled(): boolean {
    return env.supabaseStorageEnabled;
  },

  /** Public URL of an object in a public bucket. */
  publicUrl(objectPath: string, bucket = env.SUPABASE_STORAGE_BUCKET): string {
    return `${baseUrl()}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodePath(objectPath)}`;
  },

  async upload(
    objectPath: string,
    body: Buffer,
    contentType: string,
    bucket = env.SUPABASE_STORAGE_BUCKET,
  ): Promise<{ path: string; url: string }> {
    const res = await fetch(
      `${baseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(objectPath)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': contentType,
          'Cache-Control': 'max-age=31536000',
          'x-upsert': 'false',
        },
        body: new Uint8Array(body),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Supabase Storage upload failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    return { path: objectPath, url: this.publicUrl(objectPath, bucket) };
  },
};
