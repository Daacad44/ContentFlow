/**
 * src/routes/ai.routes.ts
 * AI content generation — Gemini 2.5 powered.
 */
import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import {
  requireWorkspaceMember,
  requireWorkspacePermission,
} from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import {
  generateContentSchema,
  generateCalendarSchema,
  createTemplateSchema,
  updateTemplateSchema,
  templateIdParamSchema,
  listGeneratedQuerySchema,
  listTemplatesQuerySchema,
} from '../validators/ai.validator';

const router = Router({ mergeParams: true });

const generatePerm = [
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.AI_GENERATE),
] as const;

router.post(
  '/generate/caption',
  validate({ params: workspaceIdParamSchema, body: generateContentSchema }),
  ...generatePerm,
  asyncHandler(aiController.generateCaption),
);

router.post(
  '/generate/post',
  validate({ params: workspaceIdParamSchema, body: generateContentSchema }),
  ...generatePerm,
  asyncHandler(aiController.generatePost),
);

router.post(
  '/generate/cta',
  validate({ params: workspaceIdParamSchema, body: generateContentSchema }),
  ...generatePerm,
  asyncHandler(aiController.generateCta),
);

router.post(
  '/generate/hashtags',
  validate({ params: workspaceIdParamSchema, body: generateContentSchema }),
  ...generatePerm,
  asyncHandler(aiController.generateHashtags),
);

router.post(
  '/generate/calendar',
  validate({ params: workspaceIdParamSchema, body: generateCalendarSchema }),
  ...generatePerm,
  asyncHandler(aiController.generateCalendar),
);

router.get(
  '/templates',
  validate({ params: workspaceIdParamSchema, query: listTemplatesQuerySchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.AI_GENERATE),
  asyncHandler(aiController.listTemplates),
);

router.post(
  '/templates',
  validate({ params: workspaceIdParamSchema, body: createTemplateSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.AI_TEMPLATE_MANAGE),
  asyncHandler(aiController.createTemplate),
);

router.patch(
  '/templates/:templateId',
  validate({ params: templateIdParamSchema, body: updateTemplateSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.AI_TEMPLATE_MANAGE),
  asyncHandler(aiController.updateTemplate),
);

router.delete(
  '/templates/:templateId',
  validate({ params: templateIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.AI_TEMPLATE_MANAGE),
  asyncHandler(aiController.deleteTemplate),
);

router.get(
  '/history',
  validate({ params: workspaceIdParamSchema, query: listGeneratedQuerySchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.AI_GENERATE),
  asyncHandler(aiController.listGenerated),
);

export { router as aiWorkspaceRoutes };
