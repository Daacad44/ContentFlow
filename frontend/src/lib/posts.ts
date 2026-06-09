/**
 * src/lib/posts.ts
 * API client for post scheduling and management.
 */
import { api, tokenStore } from './api';
import type { SocialPlatform } from './social';

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type PostTargetStatus = 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface PostMedia {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  sortOrder: number;
}

export interface PostTarget {
  id: string;
  status: PostTargetStatus;
  externalPostId: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  connectedAccount: {
    id: string;
    platform: SocialPlatform;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    status: string;
  };
}

export interface Post {
  id: string;
  workspaceId: string;
  content: string;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; fullName: string; email: string };
  media: PostMedia[];
  targets: PostTarget[];
}

export interface PostMediaInput {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export const POST_STATUS_META: Record<
  PostStatus,
  { label: string; color: string }
> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500/20 text-slate-300' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-300' },
  PUBLISHING: { label: 'Publishing', color: 'bg-amber-500/20 text-amber-300' },
  PUBLISHED: { label: 'Published', color: 'bg-emerald-500/20 text-emerald-300' },
  FAILED: { label: 'Failed', color: 'bg-red-500/20 text-red-300' },
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const postsApi = {
  list(workspaceId: string, params?: { status?: PostStatus; page?: number; limit?: number }) {
    return api.get<{
      data: {
        posts: Post[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    }>(`/workspaces/${workspaceId}/posts`, { params });
  },

  get(workspaceId: string, postId: string) {
    return api.get<{ data: { post: Post } }>(`/workspaces/${workspaceId}/posts/${postId}`);
  },

  create(
    workspaceId: string,
    body: {
      content: string;
      connectedAccountIds: string[];
      scheduledAt?: string;
      saveAsDraft?: boolean;
      media?: PostMediaInput[];
    },
  ) {
    return api.post<{ data: { post: Post } }>(`/workspaces/${workspaceId}/posts`, body);
  },

  update(
    workspaceId: string,
    postId: string,
    body: {
      content?: string;
      connectedAccountIds?: string[];
      scheduledAt?: string | null;
      saveAsDraft?: boolean;
      media?: PostMediaInput[];
    },
  ) {
    return api.patch<{ data: { post: Post } }>(
      `/workspaces/${workspaceId}/posts/${postId}`,
      body,
    );
  },

  remove(workspaceId: string, postId: string) {
    return api.delete(`/workspaces/${workspaceId}/posts/${postId}`);
  },

  publishNow(workspaceId: string, postId: string) {
    return api.post<{ data: { post: Post } }>(
      `/workspaces/${workspaceId}/posts/${postId}/publish`,
    );
  },

  async uploadMedia(workspaceId: string, file: File): Promise<PostMediaInput> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/posts/media`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        ...(tokenStore.get() ? { Authorization: `Bearer ${tokenStore.get()}` } : {}),
      },
    });

    const data = (await res.json()) as {
      success?: boolean;
      data?: { media: PostMediaInput };
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(data.error?.message ?? 'Upload failed.');
    }

    return data.data!.media;
  },
};
