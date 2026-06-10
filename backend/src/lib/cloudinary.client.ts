/**
 * src/lib/cloudinary.client.ts
 * Cloudinary integration for creative asset storage and transformations.
 */
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

let configured = false;

function ensureConfigured() {
  if (!env.cloudinaryEnabled) {
    throw ApiError.serviceUnavailable(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
}

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}

export const cloudinaryClient = {
  isEnabled(): boolean {
    return env.cloudinaryEnabled;
  },

  async uploadBase64(
    base64: string,
    options: { folder: string; publicId?: string; tags?: string[] },
  ): Promise<UploadResult> {
    ensureConfigured();

    const dataUri = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: options.folder,
      public_id: options.publicId,
      tags: options.tags,
      resource_type: 'image',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  },

  async uploadBuffer(
    buffer: Buffer,
    options: { folder: string; filename?: string; tags?: string[] },
  ): Promise<UploadResult> {
    ensureConfigured();

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.filename,
          tags: options.tags,
          resource_type: 'image',
        },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload failed'));
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        },
      );
      stream.end(buffer);
    });
  },

  buildTransformationUrl(
    publicId: string,
    transforms: Record<string, string | number>,
  ): string {
    ensureConfigured();
    return cloudinary.url(publicId, { secure: true, transformation: [transforms] });
  },

  generateBrandedUrl(
    baseUrl: string,
    brand: { primaryColor?: string | null; logoUrl?: string | null },
    type: 'banner' | 'poster' | 'social' | 'ad',
  ): string {
    if (!env.cloudinaryEnabled) return baseUrl;

    const dimensions: Record<string, { w: number; h: number }> = {
      banner: { w: 1200, h: 628 },
      poster: { w: 1080, h: 1350 },
      social: { w: 1080, h: 1080 },
      ad: { w: 1200, h: 1200 },
    };

    const { w, h } = dimensions[type] ?? dimensions.social;
    const color = (brand.primaryColor ?? '#6366f1').replace('#', '');

    return cloudinary.url(baseUrl, {
      secure: true,
      transformation: [
        { width: w, height: h, crop: 'fill', gravity: 'auto' },
        { overlay: { text: ' ', font_family: 'Arial', font_size: 1 }, color: `#${color}`, opacity: 20 },
      ],
    });
  },

  async deleteAsset(publicId: string): Promise<void> {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId);
  },
};
