/**
 * src/services/creative.service.ts
 * AI Creative Studio — image generation, posters, banners, ads, brand assets.
 */
import { CreativeAssetType, Prisma, UsageMetric } from '@prisma/client';
import { prisma } from '../config/prisma';
import { geminiClient } from '../lib/gemini.client';
import { cloudinaryClient } from '../lib/cloudinary.client';
import { supabaseStorageClient } from '../lib/supabaseStorage.client';
import { randomUUID } from 'crypto';
import { auditService, AUDIT } from './audit.service';
import { billingService } from './billing.service';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface CreativeContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GenerateCreativeInput {
  prompt: string;
  name?: string;
  width?: number;
  height?: number;
}

const TYPE_PROMPTS: Record<CreativeAssetType, string> = {
  IMAGE: 'Create a high-quality marketing image:',
  POSTER: 'Create a professional event/product poster with bold typography and visual hierarchy:',
  BANNER: 'Create a wide marketing banner (1200x628 ratio) with headline space:',
  AD: 'Create a product advertisement with clear product focus and promotional feel:',
  SOCIAL_CREATIVE: 'Create a square social media creative (1080x1080) optimized for feeds:',
};

async function getBrandKit(workspaceId: string) {
  return prisma.brandKit.findUnique({ where: { workspaceId } });
}

async function saveAsset(
  workspaceId: string,
  type: CreativeAssetType,
  params: {
    name: string;
    prompt: string;
    url: string;
    cloudinaryPublicId?: string;
    width?: number;
    height?: number;
    metadata?: Prisma.InputJsonValue;
    userId?: string;
  },
) {
  const asset = await prisma.creativeAsset.create({
    data: {
      workspaceId,
      createdById: params.userId,
      type,
      name: params.name,
      prompt: params.prompt,
      url: params.url,
      cloudinaryPublicId: params.cloudinaryPublicId,
      width: params.width,
      height: params.height,
      metadata: params.metadata,
    },
  });

  await auditService.record({
    action: AUDIT.CREATIVE_ASSET_CREATED,
    userId: params.userId,
    metadata: { workspaceId, assetId: asset.id, type },
  });

  return asset;
}

export const creativeService = {
  async generateImage(workspaceId: string, input: GenerateCreativeInput, ctx?: CreativeContext) {
    return this.generateByType(workspaceId, CreativeAssetType.IMAGE, input, ctx);
  },

  async generatePoster(workspaceId: string, input: GenerateCreativeInput, ctx?: CreativeContext) {
    return this.generateByType(workspaceId, CreativeAssetType.POSTER, input, ctx);
  },

  async generateBanner(workspaceId: string, input: GenerateCreativeInput, ctx?: CreativeContext) {
    return this.generateByType(workspaceId, CreativeAssetType.BANNER, input, ctx);
  },

  async generateAd(workspaceId: string, input: GenerateCreativeInput, ctx?: CreativeContext) {
    return this.generateByType(workspaceId, CreativeAssetType.AD, input, ctx);
  },

  async generateSocialCreative(workspaceId: string, input: GenerateCreativeInput, ctx?: CreativeContext) {
    return this.generateByType(workspaceId, CreativeAssetType.SOCIAL_CREATIVE, input, ctx);
  },

  async generateByType(
    workspaceId: string,
    type: CreativeAssetType,
    input: GenerateCreativeInput,
    ctx?: CreativeContext,
  ) {
    await billingService.assertWithinLimit(workspaceId, UsageMetric.CREATIVE_ASSETS);

    const brand = await getBrandKit(workspaceId);
    const typePrompt = TYPE_PROMPTS[type];

    let brandContext = '';
    if (brand) {
      brandContext = [
        brand.primaryColor && `Primary color: ${brand.primaryColor}`,
        brand.secondaryColor && `Secondary color: ${brand.secondaryColor}`,
        brand.fontHeading && `Heading font style: ${brand.fontHeading}`,
      ]
        .filter(Boolean)
        .join('. ');
    }

    const fullPrompt = `${typePrompt} ${input.prompt}${brandContext ? `. Brand guidelines: ${brandContext}` : ''}`;

    let url: string;
    let cloudinaryPublicId: string | undefined;
    let width: number | undefined;
    let height: number | undefined;

    if (geminiClient.isEnabled()) {
      try {
        const image = await geminiClient.generateImage(fullPrompt);

        if (cloudinaryClient.isEnabled()) {
          const uploaded = await cloudinaryClient.uploadBase64(image.base64, {
            folder: `contentflow/${workspaceId}`,
            tags: [type.toLowerCase(), workspaceId],
          });
          url = uploaded.url;
          cloudinaryPublicId = uploaded.publicId;
          width = uploaded.width;
          height = uploaded.height;
        } else if (supabaseStorageClient.isEnabled()) {
          const ext = image.mimeType === 'image/jpeg' ? '.jpg' : image.mimeType === 'image/webp' ? '.webp' : '.png';
          const uploaded = await supabaseStorageClient.upload(
            `${workspaceId}/creatives/${randomUUID()}${ext}`,
            Buffer.from(image.base64, 'base64'),
            image.mimeType,
          );
          url = uploaded.url;
        } else {
          url = `data:${image.mimeType};base64,${image.base64}`;
        }
      } catch (err) {
        logger.warn({ err, type }, 'AI image generation failed; using placeholder');
        url = await this.generatePlaceholderUrl(type, brand, input);
      }
    } else {
      url = await this.generatePlaceholderUrl(type, brand, input);
    }

    const asset = await saveAsset(workspaceId, type, {
      name: input.name ?? `${type} - ${new Date().toLocaleDateString()}`,
      prompt: input.prompt,
      url,
      cloudinaryPublicId,
      width,
      height,
      metadata: { generatedWith: env.geminiEnabled ? 'gemini' : 'placeholder' },
      userId: ctx?.userId,
    });

    await billingService.trackUsage(workspaceId, UsageMetric.CREATIVE_ASSETS);

    return asset;
  },

  async generatePlaceholderUrl(
    type: CreativeAssetType,
    brand: { primaryColor?: string | null } | null,
    input: GenerateCreativeInput,
  ): Promise<string> {
    const color = (brand?.primaryColor ?? '6366f1').replace('#', '');
    const dims: Record<CreativeAssetType, string> = {
      IMAGE: '800x600',
      POSTER: '1080x1350',
      BANNER: '1200x628',
      AD: '1200x1200',
      SOCIAL_CREATIVE: '1080x1080',
    };
    const size = dims[type];
    const text = encodeURIComponent(input.prompt.slice(0, 40));

    if (cloudinaryClient.isEnabled()) {
      return cloudinaryClient.buildTransformationUrl(`sample`, {
        width: size.split('x')[0],
        height: size.split('x')[1],
        crop: 'fill',
        background: `#${color}`,
      });
    }

    return `https://placehold.co/${size}/${color}/white?text=${text}`;
  },

  async listAssets(
    workspaceId: string,
    query: { type?: CreativeAssetType; page: number; limit: number },
  ) {
    const where: Prisma.CreativeAssetWhereInput = { workspaceId };
    if (query.type) where.type = query.type;

    const [assets, total] = await Promise.all([
      prisma.creativeAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.creativeAsset.count({ where }),
    ]);

    return {
      assets,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async getAsset(workspaceId: string, assetId: string) {
    const asset = await prisma.creativeAsset.findFirst({
      where: { id: assetId, workspaceId },
    });
    if (!asset) throw ApiError.notFound('Creative asset not found.');
    return asset;
  },

  async deleteAsset(workspaceId: string, assetId: string) {
    const asset = await this.getAsset(workspaceId, assetId);

    if (asset.cloudinaryPublicId && cloudinaryClient.isEnabled()) {
      try {
        await cloudinaryClient.deleteAsset(asset.cloudinaryPublicId);
      } catch {
        // Best-effort cleanup
      }
    }

    await prisma.creativeAsset.delete({ where: { id: assetId } });
  },

  async listBrandTemplates(workspaceId: string, type?: CreativeAssetType) {
    const where: Prisma.BrandTemplateWhereInput = { workspaceId };
    if (type) where.type = type;

    return prisma.brandTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  },

  async createBrandTemplate(
    workspaceId: string,
    data: {
      name: string;
      type: CreativeAssetType;
      templateData: Prisma.InputJsonValue;
      previewUrl?: string;
    },
  ) {
    return prisma.brandTemplate.create({
      data: {
        workspaceId,
        name: data.name,
        type: data.type,
        templateData: data.templateData,
        previewUrl: data.previewUrl,
      },
    });
  },

  async seedDefaultBrandTemplates(workspaceId: string) {
    const count = await prisma.brandTemplate.count({ where: { workspaceId } });
    if (count > 0) return;

    await prisma.brandTemplate.createMany({
      data: [
        {
          workspaceId,
          name: 'Instagram Post',
          type: CreativeAssetType.SOCIAL_CREATIVE,
          isDefault: true,
          templateData: { width: 1080, height: 1080, layout: 'centered' },
        },
        {
          workspaceId,
          name: 'Facebook Banner',
          type: CreativeAssetType.BANNER,
          isDefault: true,
          templateData: { width: 1200, height: 628, layout: 'wide' },
        },
        {
          workspaceId,
          name: 'Product Ad',
          type: CreativeAssetType.AD,
          isDefault: true,
          templateData: { width: 1200, height: 1200, layout: 'product-focus' },
        },
      ],
    });
  },
};

export const brandKitService = {
  async get(workspaceId: string) {
    let kit = await prisma.brandKit.findUnique({ where: { workspaceId } });
    if (!kit) {
      kit = await prisma.brandKit.create({
        data: { workspaceId, name: 'Default Brand Kit' },
      });
    }
    return kit;
  },

  async update(
    workspaceId: string,
    data: Partial<{
      name: string;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      fontHeading: string;
      fontBody: string;
      logoUrl: string;
    }>,
    ctx?: CreativeContext,
  ) {
    await this.get(workspaceId);

    const kit = await prisma.brandKit.update({
      where: { workspaceId },
      data,
    });

    await auditService.record({
      action: AUDIT.BRAND_KIT_UPDATED,
      userId: ctx?.userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { workspaceId },
    });

    return kit;
  },
};
