/**
 * src/controllers/ai.controller.ts
 */
import { Request, Response } from 'express';
import { aiContentService } from '../services/aiContent.service';
import { getClientContext } from '../utils/requestContext';
import { ok, created } from '../utils/apiResponse';
import type {
  generateContentSchema,
  generateCalendarSchema,
  listGeneratedQuerySchema,
  listTemplatesQuerySchema,
} from '../validators/ai.validator';
import type { z } from 'zod';

type GenerateInput = z.infer<typeof generateContentSchema>;
type CalendarInput = z.infer<typeof generateCalendarSchema>;
type ListGeneratedQuery = z.infer<typeof listGeneratedQuerySchema>;
type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;

function ctx(req: Request) {
  return { userId: req.user!.id, ...getClientContext(req) };
}

export const aiController = {
  async generateCaption(req: Request, res: Response) {
    const result = await aiContentService.generateCaption(
      req.params.workspaceId,
      req.body as GenerateInput,
      ctx(req),
    );
    return ok(res, result, 'Caption generated.');
  },

  async generatePost(req: Request, res: Response) {
    const result = await aiContentService.generatePost(
      req.params.workspaceId,
      req.body as GenerateInput,
      ctx(req),
    );
    return ok(res, result, 'Post generated.');
  },

  async generateCta(req: Request, res: Response) {
    const result = await aiContentService.generateCta(
      req.params.workspaceId,
      req.body as GenerateInput,
      ctx(req),
    );
    return ok(res, result, 'CTAs generated.');
  },

  async generateHashtags(req: Request, res: Response) {
    const result = await aiContentService.generateHashtags(
      req.params.workspaceId,
      req.body as GenerateInput,
      ctx(req),
    );
    return ok(res, result, 'Hashtags generated.');
  },

  async generateCalendar(req: Request, res: Response) {
    const result = await aiContentService.generateCalendar(
      req.params.workspaceId,
      req.body as CalendarInput,
      ctx(req),
    );
    return ok(res, result, 'Content calendar generated.');
  },

  async listTemplates(req: Request, res: Response) {
    const query = req.query as unknown as ListTemplatesQuery;
    await aiContentService.seedDefaultTemplates(req.params.workspaceId);
    const templates = await aiContentService.listTemplates(req.params.workspaceId, query.type);
    return ok(res, { templates }, 'OK');
  },

  async createTemplate(req: Request, res: Response) {
    const template = await aiContentService.createTemplate(
      req.params.workspaceId,
      req.user!.id,
      req.body,
    );
    return created(res, { template }, 'Template created.');
  },

  async updateTemplate(req: Request, res: Response) {
    const template = await aiContentService.updateTemplate(
      req.params.workspaceId,
      req.params.templateId,
      req.body,
    );
    return ok(res, { template }, 'Template updated.');
  },

  async deleteTemplate(req: Request, res: Response) {
    await aiContentService.deleteTemplate(req.params.workspaceId, req.params.templateId);
    return ok(res, null, 'Template deleted.');
  },

  async listGenerated(req: Request, res: Response) {
    const query = req.query as unknown as ListGeneratedQuery;
    const result = await aiContentService.listGenerated(req.params.workspaceId, {
      type: query.type,
      page: Number(query.page),
      limit: Number(query.limit),
    });
    return ok(res, result, 'OK');
  },
};
