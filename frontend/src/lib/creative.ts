/**
 * src/lib/creative.ts
 * API client for AI Creative Studio (Cloudinary).
 */
import { api } from './api';

export type CreativeType = 'IMAGE' | 'POSTER' | 'BANNER' | 'AD' | 'SOCIAL_CREATIVE';

export interface CreativeAsset {
  id: string;
  type: CreativeType;
  name: string;
  prompt: string | null;
  url: string;
  cloudinaryPublicId: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface BrandKit {
  id: string;
  name: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontHeading: string | null;
  fontBody: string | null;
  logoUrl: string | null;
}

export interface BrandTemplate {
  id: string;
  name: string;
  type: CreativeType;
  templateData: Record<string, unknown>;
  previewUrl: string | null;
  isDefault: boolean;
}

export interface GenerateCreativeInput {
  prompt: string;
  name?: string;
}

export const creativeApi = {
  generateImage(workspaceId: string, input: GenerateCreativeInput) {
    return api.post<{ data: { asset: CreativeAsset } }>(
      `/workspaces/${workspaceId}/creative/generate/image`,
      input,
    );
  },

  generatePoster(workspaceId: string, input: GenerateCreativeInput) {
    return api.post<{ data: { asset: CreativeAsset } }>(
      `/workspaces/${workspaceId}/creative/generate/poster`,
      input,
    );
  },

  generateBanner(workspaceId: string, input: GenerateCreativeInput) {
    return api.post<{ data: { asset: CreativeAsset } }>(
      `/workspaces/${workspaceId}/creative/generate/banner`,
      input,
    );
  },

  generateAd(workspaceId: string, input: GenerateCreativeInput) {
    return api.post<{ data: { asset: CreativeAsset } }>(
      `/workspaces/${workspaceId}/creative/generate/ad`,
      input,
    );
  },

  generateSocial(workspaceId: string, input: GenerateCreativeInput) {
    return api.post<{ data: { asset: CreativeAsset } }>(
      `/workspaces/${workspaceId}/creative/generate/social`,
      input,
    );
  },

  listAssets(workspaceId: string, params?: { type?: CreativeType; page?: number }) {
    return api.get<{
      data: {
        assets: CreativeAsset[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    }>(`/workspaces/${workspaceId}/creative/assets`, { params });
  },

  deleteAsset(workspaceId: string, assetId: string) {
    return api.delete(`/workspaces/${workspaceId}/creative/assets/${assetId}`);
  },

  getBrandKit(workspaceId: string) {
    return api.get<{ data: { brandKit: BrandKit } }>(
      `/workspaces/${workspaceId}/creative/brand-kit`,
    );
  },

  updateBrandKit(workspaceId: string, data: Partial<BrandKit>) {
    return api.patch<{ data: { brandKit: BrandKit } }>(
      `/workspaces/${workspaceId}/creative/brand-kit`,
      data,
    );
  },

  listBrandTemplates(workspaceId: string, type?: CreativeType) {
    return api.get<{ data: { templates: BrandTemplate[] } }>(
      `/workspaces/${workspaceId}/creative/brand-templates`,
      { params: type ? { type } : undefined },
    );
  },
};
