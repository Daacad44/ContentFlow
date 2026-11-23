/**
 * src/validators/post.validator.ts
 * Validation for post CRUD, scheduling, and media operations.
 */
import { z } from 'zod';
import { PostStatus } from '@prisma/client';

export const postIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace id.'),
  postId: z.string().uuid('Invalid post id.'),
});

const postMediaItemSchema = z.object({
  url: z.string().url('Invalid media URL.'),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().positive().max(50 * 1024 * 1024),
});

export const TIKTOK_PRIVACY_LEVELS = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
] as const;

/** TikTok requires the creator to choose these on every post (Content Sharing Guidelines). */
export const tiktokSettingsSchema = z
  .object({
    privacyLevel: z.enum(TIKTOK_PRIVACY_LEVELS, {
      errorMap: () => ({ message: 'Choose who can view this TikTok post.' }),
    }),
    allowComment: z.boolean().default(false),
    allowDuet: z.boolean().default(false),
    allowStitch: z.boolean().default(false),
    commercialContent: z.enum(['none', 'brand_organic', 'brand_content']).default('none'),
    consentGiven: z.literal(true, {
      errorMap: () => ({ message: "You must agree to TikTok's Music Usage Confirmation." }),
    }),
  })
  .refine((s) => !(s.commercialContent === 'brand_content' && s.privacyLevel === 'SELF_ONLY'), {
    message: 'Branded content cannot be private (Only me).',
    path: ['privacyLevel'],
  });

export type TikTokSettings = z.infer<typeof tiktokSettingsSchema>;

export const directUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

export const createPostSchema = z
  .object({
    content: z.string().trim().min(1, 'Content is required.').max(10000),
    connectedAccountIds: z
      .array(z.string().uuid('Invalid connected account id.'))
      .min(1, 'Select at least one platform account.'),
    scheduledAt: z.string().datetime({ message: 'Invalid schedule date.' }).optional(),
    saveAsDraft: z.boolean().optional().default(false),
    media: z.array(postMediaItemSchema).max(10).optional().default([]),
    tiktokSettings: tiktokSettingsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.saveAsDraft && data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Drafts cannot have a schedule date.',
        path: ['scheduledAt'],
      });
    }
  });

export const updatePostSchema = z
  .object({
    content: z.string().trim().min(1).max(10000).optional(),
    connectedAccountIds: z.array(z.string().uuid()).min(1).optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    saveAsDraft: z.boolean().optional(),
    media: z.array(postMediaItemSchema).max(10).optional(),
    tiktokSettings: tiktokSettingsSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.content !== undefined ||
      data.connectedAccountIds !== undefined ||
      data.scheduledAt !== undefined ||
      data.saveAsDraft !== undefined ||
      data.media !== undefined ||
      data.tiktokSettings !== undefined,
    { message: 'At least one field must be provided.' },
  );

export const listPostsQuerySchema = z.object({
  status: z.nativeEnum(PostStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
