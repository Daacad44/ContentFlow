/**
 * src/services/aiContent.service.ts
 * AI content generation using Gemini 2.5 — captions, posts, CTAs, hashtags, calendars.
 */
import { ContentTemplateType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { geminiClient } from '../lib/gemini.client';
import { auditService, AUDIT } from './audit.service';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

const SYSTEM_PROMPT =
  'You are an expert social media content strategist for brands. ' +
  'Write engaging, platform-appropriate content. Be concise and actionable.';

interface GenerateContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GenerateInput {
  topic: string;
  tone?: string;
  platform?: string;
  audience?: string;
  keywords?: string[];
  language?: string;
  brandVoice?: string;
}

async function recordGeneration(
  workspaceId: string,
  type: ContentTemplateType,
  prompt: string,
  input: Prisma.InputJsonValue,
  output: string,
  userId?: string,
) {
  return prisma.generatedContent.create({
    data: {
      workspaceId,
      userId,
      type,
      prompt,
      input,
      output,
      model: env.GEMINI_MODEL,
    },
  });
}

export const aiContentService = {
  async generateCaption(workspaceId: string, input: GenerateInput, ctx?: GenerateContext) {
    const prompt = buildPrompt('caption', input, [
      'Write a compelling social media caption (max 2200 chars).',
      'Include emojis where appropriate.',
      'Do not include hashtags — those will be generated separately.',
    ]);

    const output = await geminiClient.generateText(prompt, { systemPrompt: SYSTEM_PROMPT });
    const record = await recordGeneration(workspaceId, ContentTemplateType.CAPTION, prompt, input as unknown as Prisma.InputJsonValue, output, ctx?.userId);

    await auditService.record({
      action: AUDIT.AI_CONTENT_GENERATED,
      userId: ctx?.userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { workspaceId, type: 'CAPTION', id: record.id },
    });

    return { content: output, id: record.id };
  },

  async generatePost(workspaceId: string, input: GenerateInput, ctx?: GenerateContext) {
    const prompt = buildPrompt('full post', input, [
      'Write a complete social media post ready to publish.',
      'Include a hook, body, and call-to-action.',
      'Format for the specified platform.',
    ]);

    const output = await geminiClient.generateText(prompt, { systemPrompt: SYSTEM_PROMPT });
    const record = await recordGeneration(workspaceId, ContentTemplateType.POST, prompt, input as unknown as Prisma.InputJsonValue, output, ctx?.userId);

    await auditService.record({
      action: AUDIT.AI_CONTENT_GENERATED,
      userId: ctx?.userId,
      metadata: { workspaceId, type: 'POST', id: record.id },
    });

    return { content: output, id: record.id };
  },

  async generateCta(workspaceId: string, input: GenerateInput, ctx?: GenerateContext) {
    const prompt = buildPrompt('call-to-action', input, [
      'Generate 5 distinct call-to-action phrases.',
      'Number each CTA (1-5).',
      'Keep each under 15 words.',
    ]);

    const output = await geminiClient.generateText(prompt, { systemPrompt: SYSTEM_PROMPT, temperature: 0.9 });
    const record = await recordGeneration(workspaceId, ContentTemplateType.CTA, prompt, input as unknown as Prisma.InputJsonValue, output, ctx?.userId);

    return { content: output, id: record.id };
  },

  async generateHashtags(workspaceId: string, input: GenerateInput, ctx?: GenerateContext) {
    const prompt = buildPrompt('hashtags', input, [
      'Generate 15-20 relevant hashtags.',
      'Mix popular and niche tags.',
      'Return as a space-separated list starting with #.',
      'No explanations, just hashtags.',
    ]);

    const output = await geminiClient.generateText(prompt, { systemPrompt: SYSTEM_PROMPT, temperature: 0.6 });
    const record = await recordGeneration(workspaceId, ContentTemplateType.HASHTAG, prompt, input as unknown as Prisma.InputJsonValue, output, ctx?.userId);

    return { content: output, id: record.id };
  },

  async generateCalendar(
    workspaceId: string,
    input: GenerateInput & { days?: number; postsPerDay?: number },
    ctx?: GenerateContext,
  ) {
    const days = input.days ?? 7;
    const postsPerDay = input.postsPerDay ?? 1;

    const prompt = buildPrompt('content calendar', input, [
      `Create a ${days}-day content calendar with ${postsPerDay} post(s) per day.`,
      'Return JSON array with objects: { date, title, content, platform, hashtags }.',
      `Start from tomorrow. Topic theme: ${input.topic}.`,
    ]);

    const calendar = await geminiClient.generateJson<Array<{
      date: string;
      title: string;
      content: string;
      platform: string;
      hashtags: string;
    }>>(prompt, SYSTEM_PROMPT);

    const output = JSON.stringify(calendar, null, 2);
    const record = await recordGeneration(
      workspaceId,
      ContentTemplateType.CALENDAR,
      prompt,
      { ...input, days, postsPerDay },
      output,
      ctx?.userId,
    );

    return { calendar, id: record.id };
  },

  async listTemplates(workspaceId: string, type?: ContentTemplateType) {
    const where: Prisma.ContentTemplateWhereInput = { workspaceId };
    if (type) where.type = type;

    return prisma.contentTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  },

  async createTemplate(
    workspaceId: string,
    userId: string,
    data: {
      name: string;
      type: ContentTemplateType;
      content: string;
      prompt?: string;
      variables?: Prisma.InputJsonValue;
    },
  ) {
    return prisma.contentTemplate.create({
      data: {
        workspaceId,
        createdById: userId,
        name: data.name,
        type: data.type,
        content: data.content,
        prompt: data.prompt,
        variables: data.variables,
      },
    });
  },

  async updateTemplate(
    workspaceId: string,
    templateId: string,
    data: Partial<{ name: string; content: string; prompt: string; variables: Prisma.InputJsonValue }>,
  ) {
    const existing = await prisma.contentTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });
    if (!existing) throw ApiError.notFound('Template not found.');

    return prisma.contentTemplate.update({
      where: { id: templateId },
      data,
    });
  },

  async deleteTemplate(workspaceId: string, templateId: string) {
    const existing = await prisma.contentTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });
    if (!existing) throw ApiError.notFound('Template not found.');
    if (existing.isDefault) throw ApiError.badRequest('Cannot delete default templates.');

    await prisma.contentTemplate.delete({ where: { id: templateId } });
  },

  async listGenerated(workspaceId: string, query: { type?: ContentTemplateType; page: number; limit: number }) {
    const where: Prisma.GeneratedContentWhereInput = { workspaceId };
    if (query.type) where.type = query.type;

    const [items, total] = await Promise.all([
      prisma.generatedContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.generatedContent.count({ where }),
    ]);

    return {
      items,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async seedDefaultTemplates(workspaceId: string) {
    const count = await prisma.contentTemplate.count({ where: { workspaceId } });
    if (count > 0) return;

    const defaults = [
      {
        name: 'Product Launch Caption',
        type: ContentTemplateType.CAPTION,
        content: '🚀 Introducing {{product}}! {{benefit}}. Tap the link in bio to learn more. {{cta}}',
        prompt: 'Product launch announcement caption',
      },
      {
        name: 'Engagement Post',
        type: ContentTemplateType.POST,
        content: '{{hook}}\n\n{{story}}\n\n{{question}}\n\n#{{hashtag1}} #{{hashtag2}}',
        prompt: 'Engagement-focused social post',
      },
      {
        name: 'Shop Now CTA',
        type: ContentTemplateType.CTA,
        content: 'Shop now → Link in bio | Limited time offer | Grab yours today',
        prompt: 'E-commerce call to action',
      },
    ];

    await prisma.contentTemplate.createMany({
      data: defaults.map((d) => ({
        workspaceId,
        name: d.name,
        type: d.type,
        content: d.content,
        prompt: d.prompt,
        isDefault: true,
      })),
    });
  },
};

function buildPrompt(kind: string, input: GenerateInput, instructions: string[]): string {
  const lines = [
    `Task: Generate ${kind}.`,
    ...instructions,
    '',
    `Topic: ${input.topic}`,
  ];
  if (input.tone) lines.push(`Tone: ${input.tone}`);
  if (input.platform) lines.push(`Platform: ${input.platform}`);
  if (input.audience) lines.push(`Audience: ${input.audience}`);
  if (input.brandVoice) lines.push(`Brand voice: ${input.brandVoice}`);
  if (input.language) lines.push(`Language: ${input.language}`);
  if (input.keywords?.length) lines.push(`Keywords: ${input.keywords.join(', ')}`);
  return lines.join('\n');
}
