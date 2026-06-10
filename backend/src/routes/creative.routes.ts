/**
 * src/routes/creative.routes.ts
 * AI Creative Studio — Cloudinary + image generation.
 */
import { Router } from 'express';
import { creativeController } from '../controllers/creative.controller';
import {
  requireWorkspaceMember,
  requireWorkspacePermission,
} from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import {
  generateCreativeSchema,
  updateBrandKitSchema,
  createBrandTemplateSchema,
  assetIdParamSchema,
  listAssetsQuerySchema,
  listBrandTemplatesQuerySchema,
} from '../validators/creative.validator';

const router = Router({ mergeParams: true });

const createPerm = [
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.CREATIVE_CREATE),
] as const;

router.post(
  '/generate/image',
  validate({ params: workspaceIdParamSchema, body: generateCreativeSchema }),
  ...createPerm,
  asyncHandler(creativeController.generateImage),
);

router.post(
  '/generate/poster',
  validate({ params: workspaceIdParamSchema, body: generateCreativeSchema }),
  ...createPerm,
  asyncHandler(creativeController.generatePoster),
);

router.post(
  '/generate/banner',
  validate({ params: workspaceIdParamSchema, body: generateCreativeSchema }),
  ...createPerm,
  asyncHandler(creativeController.generateBanner),
);

router.post(
  '/generate/ad',
  validate({ params: workspaceIdParamSchema, body: generateCreativeSchema }),
  ...createPerm,
  asyncHandler(creativeController.generateAd),
);

router.post(
  '/generate/social',
  validate({ params: workspaceIdParamSchema, body: generateCreativeSchema }),
  ...createPerm,
  asyncHandler(creativeController.generateSocialCreative),
);

router.get(
  '/assets',
  validate({ params: workspaceIdParamSchema, query: listAssetsQuerySchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.CREATIVE_READ),
  asyncHandler(creativeController.listAssets),
);

router.get(
  '/assets/:assetId',
  validate({ params: assetIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.CREATIVE_READ),
  asyncHandler(creativeController.getAsset),
);

router.delete(
  '/assets/:assetId',
  validate({ params: assetIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.CREATIVE_CREATE),
  asyncHandler(creativeController.deleteAsset),
);

router.get(
  '/brand-kit',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.CREATIVE_READ),
  asyncHandler(creativeController.getBrandKit),
);

router.patch(
  '/brand-kit',
  validate({ params: workspaceIdParamSchema, body: updateBrandKitSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BRAND_MANAGE),
  asyncHandler(creativeController.updateBrandKit),
);

router.get(
  '/brand-templates',
  validate({ params: workspaceIdParamSchema, query: listBrandTemplatesQuerySchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.CREATIVE_READ),
  asyncHandler(creativeController.listBrandTemplates),
);

router.post(
  '/brand-templates',
  validate({ params: workspaceIdParamSchema, body: createBrandTemplateSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BRAND_MANAGE),
  asyncHandler(creativeController.createBrandTemplate),
);

export { router as creativeWorkspaceRoutes };
