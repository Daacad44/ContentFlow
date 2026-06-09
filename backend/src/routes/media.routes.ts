/**
 * src/routes/media.routes.ts
 * Serves uploaded post media files.
 */
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

const router = Router();

router.get('/:workspaceId/:filename', (req: Request, res: Response, next) => {
  try {
    const { workspaceId, filename } = req.params;

    if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) {
      throw ApiError.badRequest('Invalid workspace id.');
    }
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw ApiError.badRequest('Invalid filename.');
    }

    const filePath = path.join(env.UPLOAD_DIR, workspaceId, filename);
    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound('File not found.');
    }

    res.sendFile(path.resolve(filePath));
  } catch (err) {
    next(err);
  }
});

export { router as mediaRoutes };
