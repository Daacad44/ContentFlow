/**
 * src/services/mediaUpload.service.ts
 * Storage for post attachments.
 *
 * - "supabase": Supabase Storage public bucket (SUPABASE_STORAGE_BUCKET). Use in production.
 * - "cloudinary": durable object storage with a public HTTPS URL that social platforms
 *   (via Zernio) can fetch.
 * - "local": files on the API server's disk under UPLOAD_DIR. Fine for development, but
 *   files are lost when a container is replaced unless a persistent volume is mounted.
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { cloudinaryClient } from '../lib/cloudinary.client';
import { supabaseStorageClient } from '../lib/supabaseStorage.client';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

/**
 * Stored local filenames are `<uuid><ext>` (older uploads: `<uuid>-<sanitized original name>`).
 * The random UUID makes URLs unguessable; the media route only serves names of this shape.
 */
export const STORED_MEDIA_FILENAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.(jpg|png|gif|webp|mp4|mov)|-[A-Za-z0-9._-]{1,200})$/i;

export interface StoredMedia {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

function ensureUploadDir(workspaceId: string): string {
  const dir = path.join(env.UPLOAD_DIR, workspaceId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const mediaUploadService = {
  validateMimeType(mimeType: string) {
    if (!ALLOWED_MIME_TYPES[mimeType]) {
      throw ApiError.badRequest(
        'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV.',
      );
    }
  },

  async saveFile(workspaceId: string, file: Express.Multer.File): Promise<StoredMedia> {
    if (file.size > env.MAX_UPLOAD_SIZE_BYTES) {
      throw ApiError.badRequest(
        `File too large. Maximum size is ${Math.round(env.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024)}MB.`,
      );
    }

    this.validateMimeType(file.mimetype);

    const meta = {
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };

    if (env.mediaStorage === 'supabase') {
      try {
        const objectPath = `${workspaceId}/${randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype]}`;
        const uploaded = await supabaseStorageClient.upload(objectPath, file.buffer, file.mimetype);
        return { url: uploaded.url, ...meta };
      } catch (err) {
        logger.error({ err, workspaceId }, 'Supabase media upload failed');
        throw ApiError.serviceUnavailable('Media storage is unavailable. Please try again.');
      }
    }

    if (env.mediaStorage === 'cloudinary') {
      try {
        const uploaded = await cloudinaryClient.uploadMedia(file.buffer, {
          folder: `contentflow/workspaces/${workspaceId}/posts`,
          resourceType: file.mimetype.startsWith('video/') ? 'video' : 'image',
          tags: ['contentflow', 'post-media', `workspace:${workspaceId}`],
        });
        return { url: uploaded.url, ...meta };
      } catch (err) {
        logger.error({ err, workspaceId }, 'Cloudinary media upload failed');
        throw ApiError.serviceUnavailable('Media storage is unavailable. Please try again.');
      }
    }

    if (env.isServerless) {
      // Serverless functions have no durable disk: a local file would vanish after the request.
      throw ApiError.serviceUnavailable(
        'Media storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    const dir = ensureUploadDir(workspaceId);
    const storedName = `${randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype]}`;
    await fs.promises.writeFile(path.join(dir, storedName), file.buffer);

    return {
      url: `${env.publicApiUrl}/api/v1/media/${workspaceId}/${storedName}`,
      ...meta,
    };
  },

  /**
   * Prepares a direct browser upload to Supabase Storage. Returns null when Supabase
   * is not the active storage, so the client falls back to the multipart endpoint.
   */
  async createDirectUpload(
    workspaceId: string,
    file: { filename: string; mimeType: string; size: number },
  ): Promise<{ uploadUrl: string; media: StoredMedia } | null> {
    if (env.mediaStorage !== 'supabase') return null;

    this.validateMimeType(file.mimeType);
    if (file.size > env.MAX_DIRECT_UPLOAD_BYTES) {
      throw ApiError.badRequest(
        `File too large. Maximum size is ${Math.round(env.MAX_DIRECT_UPLOAD_BYTES / 1024 / 1024)}MB.`,
      );
    }

    const objectPath = `${workspaceId}/${randomUUID()}${ALLOWED_MIME_TYPES[file.mimeType]}`;
    try {
      const signed = await supabaseStorageClient.createSignedUploadUrl(objectPath);
      return {
        uploadUrl: signed.uploadUrl,
        media: { url: signed.url, filename: file.filename, mimeType: file.mimeType, size: file.size },
      };
    } catch (err) {
      logger.error({ err, workspaceId }, 'Supabase signed upload URL failed');
      throw ApiError.serviceUnavailable('Media storage is unavailable. Please try again.');
    }
  },
};
