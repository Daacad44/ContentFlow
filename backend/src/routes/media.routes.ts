/**
 * src/routes/media.routes.ts
 * Serves post media stored on local disk (MEDIA_STORAGE=local).
 *
 * This route is intentionally unauthenticated: social platforms (via Zernio) must be able
 * to fetch attachments by URL. Access is protected by unguessable random-UUID filenames,
 * strict name validation, and response headers that stop browsers from executing content.
 * With MEDIA_STORAGE=cloudinary, new uploads are served by Cloudinary instead.
 */
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { STORED_MEDIA_FILENAME } from '../services/mediaUpload.service';

const router = Router();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:workspaceId/:filename', (req: Request, res: Response, next) => {
  try {
    const { workspaceId, filename } = req.params;

    if (!UUID.test(workspaceId) || !STORED_MEDIA_FILENAME.test(filename) || filename.includes('..')) {
      throw ApiError.notFound('File not found.');
    }

    const root = path.resolve(env.UPLOAD_DIR);
    const filePath = path.resolve(root, workspaceId, filename);
    if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) {
      throw ApiError.notFound('File not found.');
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

export { router as mediaRoutes };
