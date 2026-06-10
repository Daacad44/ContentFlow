/**
 * src/lib/ai.ts
 * API client for AI content generation (Gemini 2.5).
 */
import { api } from './api';

export type ContentType = 'CAPTION' | 'POST' | 'CTA' | 'HASHTAG' | 'CALENDAR' | 'CUSTOM';

export interface GenerateInput {
  topic: string;
  tone?: string;
  platform?: string;
  audience?: string;
  keywords?: string[];
  language?: string;
  brandVoice?: string;
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: ContentType;
  content: string;
  prompt: string | null;
  variables: Record<string, string> | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEntry {
  date: string;
  title: string;
  content: string;
  platform: string;
  hashtags: string;
}

export const aiApi = {
  generateCaption(workspaceId: string, input: GenerateInput) {
    return api.post<{ data: { content: string; id: string } }>(
      `/workspaces/${workspaceId}/ai/generate/caption`,
      input,
    );
  },

  generatePost(workspaceId: string, input: GenerateInput) {
    return api.post<{ data: { content: string; id: string } }>(
      `/workspaces/${workspaceId}/ai/generate/post`,
      input,
    );
  },

  generateCta(workspaceId: string, input: GenerateInput) {
    return api.post<{ data: { content: string; id: string } }>(
      `/workspaces/${workspaceId}/ai/generate/cta`,
      input,
    );
  },

  generateHashtags(workspaceId: string, input: GenerateInput) {
    return api.post<{ data: { content: string; id: string } }>(
      `/workspaces/${workspaceId}/ai/generate/hashtags`,
      input,
    );
  },

  generateCalendar(
    workspaceId: string,
    input: GenerateInput & { days?: number; postsPerDay?: number },
  ) {
    return api.post<{ data: { calendar: CalendarEntry[]; id: string } }>(
      `/workspaces/${workspaceId}/ai/generate/calendar`,
      input,
    );
  },

  listTemplates(workspaceId: string, type?: ContentType) {
    return api.get<{ data: { templates: ContentTemplate[] } }>(
      `/workspaces/${workspaceId}/ai/templates`,
      { params: type ? { type } : undefined },
    );
  },

  createTemplate(
    workspaceId: string,
    body: { name: string; type: ContentType; content: string; prompt?: string },
  ) {
    return api.post(`/workspaces/${workspaceId}/ai/templates`, body);
  },

  deleteTemplate(workspaceId: string, templateId: string) {
    return api.delete(`/workspaces/${workspaceId}/ai/templates/${templateId}`);
  },

  listHistory(workspaceId: string, params?: { type?: ContentType; page?: number }) {
    return api.get(`/workspaces/${workspaceId}/ai/history`, { params });
  },
};
