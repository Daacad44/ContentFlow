/**
 * src/routes/post.routes.ts
 * Post CRUD, scheduling, and media upload — workspace-scoped.
 */
import { Router } from 'express';
import multer from 'multer';
import { postController } from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  requireWorkspaceMember,
  requireWorkspacePermission,
} from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { env } from '../config/env';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import {
  postIdParamSchema,
  createPostSchema,
  directUploadSchema,
  updatePostSchema,
  listPostsQuerySchema,
} from '../validators/post.validator';

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_SIZE_BYTES },
});

router.use(authenticate);

router.get(
  '/',
  validate({ params: workspaceIdParamSchema, query: listPostsQuerySchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_READ),
  asyncHandler(postController.list),
);

router.post(
  '/',
  validate({ params: workspaceIdParamSchema, body: createPostSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_CREATE),
  asyncHandler(postController.create),
);

router.post(
  '/media',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_CREATE),
  upload.single('file'),
  asyncHandler(postController.uploadMedia),
);

router.post(
  '/media/upload-url',
  validate({ params: workspaceIdParamSchema, body: directUploadSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_CREATE),
  asyncHandler(postController.createDirectUpload),
);

router.get(
  '/:postId',
  validate({ params: postIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_READ),
  asyncHandler(postController.get),
);

router.patch(
  '/:postId',
  validate({ params: postIdParamSchema, body: updatePostSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_UPDATE),
  asyncHandler(postController.update),
);

router.delete(
  '/:postId',
  validate({ params: postIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_DELETE),
  asyncHandler(postController.remove),
);

router.post(
  '/:postId/publish',
  validate({ params: postIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_PUBLISH),
  asyncHandler(postController.publishNow),
);

export { router as postWorkspaceRoutes };
