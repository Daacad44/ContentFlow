/**
 * src/controllers/creative.controller.ts
 */
import { Request, Response } from 'express';
import { creativeService, brandKitService } from '../services/creative.service';
import { getClientContext } from '../utils/requestContext';
import { ok, created } from '../utils/apiResponse';
import type { generateCreativeSchema, listAssetsQuerySchema, listBrandTemplatesQuerySchema } from '../validators/creative.validator';
import type { z } from 'zod';

type GenerateInput = z.infer<typeof generateCreativeSchema>;
type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
type ListBrandTemplatesQuery = z.infer<typeof listBrandTemplatesQuerySchema>;

function ctx(req: Request) {
  return { userId: req.user!.id, ...getClientContext(req) };
}

export const creativeController = {
  async generateImage(req: Request, res: Response) {
    const asset = await creativeService.generateImage(req.params.workspaceId, req.body as GenerateInput, ctx(req));
    return ok(res, { asset }, 'Image generated.');
  },

  async generatePoster(req: Request, res: Response) {
    const asset = await creativeService.generatePoster(req.params.workspaceId, req.body as GenerateInput, ctx(req));
    return ok(res, { asset }, 'Poster generated.');
  },

  async generateBanner(req: Request, res: Response) {
    const asset = await creativeService.generateBanner(req.params.workspaceId, req.body as GenerateInput, ctx(req));
    return ok(res, { asset }, 'Banner generated.');
  },

  async generateAd(req: Request, res: Response) {
    const asset = await creativeService.generateAd(req.params.workspaceId, req.body as GenerateInput, ctx(req));
    return ok(res, { asset }, 'Ad generated.');
  },

  async generateSocialCreative(req: Request, res: Response) {
    const asset = await creativeService.generateSocialCreative(req.params.workspaceId, req.body as GenerateInput, ctx(req));
    return ok(res, { asset }, 'Social creative generated.');
  },

  async listAssets(req: Request, res: Response) {
    const query = req.query as unknown as ListAssetsQuery;
    const result = await creativeService.listAssets(req.params.workspaceId, {
      type: query.type,
      page: Number(query.page),
      limit: Number(query.limit),
    });
    return ok(res, result, 'OK');
  },

  async getAsset(req: Request, res: Response) {
    const asset = await creativeService.getAsset(req.params.workspaceId, req.params.assetId);
    return ok(res, { asset }, 'OK');
  },

  async deleteAsset(req: Request, res: Response) {
    await creativeService.deleteAsset(req.params.workspaceId, req.params.assetId);
    return ok(res, null, 'Asset deleted.');
  },

  async getBrandKit(req: Request, res: Response) {
    const brandKit = await brandKitService.get(req.params.workspaceId);
    return ok(res, { brandKit }, 'OK');
  },

  async updateBrandKit(req: Request, res: Response) {
    const brandKit = await brandKitService.update(req.params.workspaceId, req.body, ctx(req));
    return ok(res, { brandKit }, 'Brand kit updated.');
  },

  async listBrandTemplates(req: Request, res: Response) {
    const query = req.query as unknown as ListBrandTemplatesQuery;
    await creativeService.seedDefaultBrandTemplates(req.params.workspaceId);
    const templates = await creativeService.listBrandTemplates(req.params.workspaceId, query.type);
    return ok(res, { templates }, 'OK');
  },

  async createBrandTemplate(req: Request, res: Response) {
    const template = await creativeService.createBrandTemplate(req.params.workspaceId, req.body);
    return created(res, { template }, 'Brand template created.');
  },
};
