/**
 * src/controllers/post.controller.ts
 * HTTP handlers for post CRUD, scheduling, and media upload.
 */
import { Request, Response } from 'express';
import { postService } from '../services/post.service';
import { mediaUploadService } from '../services/mediaUpload.service';
import { getClientContext } from '../utils/requestContext';
import { ok, created } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import type { listPostsQuerySchema } from '../validators/post.validator';
import type { z } from 'zod';

type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;

export const postController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ListPostsQuery;
    const result = await postService.list(req.params.workspaceId, {
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
    return ok(res, result, 'OK');
  },

  async get(req: Request, res: Response) {
    const post = await postService.get(req.params.workspaceId, req.params.postId);
    return ok(res, { post }, 'OK');
  },

  async create(req: Request, res: Response) {
    const post = await postService.create(
      req.params.workspaceId,
      req.user!.id,
      req.body,
      getClientContext(req),
    );
    return created(res, { post }, 'Post created.');
  },

  async update(req: Request, res: Response) {
    const post = await postService.update(
      req.params.workspaceId,
      req.params.postId,
      req.user!.id,
      req.body,
      getClientContext(req),
    );
    return ok(res, { post }, 'Post updated.');
  },

  async remove(req: Request, res: Response) {
    await postService.remove(
      req.params.workspaceId,
      req.params.postId,
      req.user!.id,
      getClientContext(req),
    );
    return ok(res, null, 'Post deleted.');
  },

  async publishNow(req: Request, res: Response) {
    const post = await postService.publishNow(
      req.params.workspaceId,
      req.params.postId,
      req.user!.id,
      getClientContext(req),
    );
    return ok(res, { post }, 'Post published.');
  },

  async uploadMedia(req: Request, res: Response) {
    if (!req.file) {
      throw ApiError.badRequest('No file uploaded.');
    }

    const media = await mediaUploadService.saveFile(req.params.workspaceId, req.file);
    return created(res, { media }, 'Media uploaded.');
  },
};
