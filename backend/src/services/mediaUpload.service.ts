/**
 * src/services/mediaUpload.service.ts
 * Local media storage for post attachments.
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
]);

function ensureUploadDir(workspaceId: string): string {
  const dir = path.join(env.UPLOAD_DIR, workspaceId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export const mediaUploadService = {
  validateMimeType(mimeType: string) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw ApiError.badRequest(
        'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV.',
      );
    }
  },

  saveFile(workspaceId: string, file: Express.Multer.File) {
    if (file.size > env.MAX_UPLOAD_SIZE_BYTES) {
      throw ApiError.badRequest(
        `File too large. Maximum size is ${Math.round(env.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024)}MB.`,
      );
    }

    this.validateMimeType(file.mimetype);

    const dir = ensureUploadDir(workspaceId);
    const safeName = sanitizeFilename(file.originalname);
    const storedName = `${randomUUID()}-${safeName}`;
    const destPath = path.join(dir, storedName);

    fs.writeFileSync(destPath, file.buffer);

    const url = `${env.publicApiUrl}/api/v1/media/${workspaceId}/${storedName}`;

    return {
      url,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  },
};
