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
  platformPostUrl: string | null;
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

export const TARGET_STATUS_META: Record<
  PostTargetStatus,
  { label: string; color: string }
> = {
  PENDING: { label: 'Pending', color: 'text-slate-400' },
  PUBLISHING: { label: 'Publishing', color: 'text-amber-400' },
  PUBLISHED: { label: 'Live', color: 'text-emerald-400' },
  FAILED: { label: 'Failed', color: 'text-red-400' },
};

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

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

  /**
   * Uploads a file. With Supabase storage the browser sends the file straight to Supabase
   * via a signed URL (needed for videos larger than the API's ~4.5MB body limit);
   * otherwise it falls back to the multipart endpoint.
   */
  async uploadMedia(
    workspaceId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<PostMediaInput> {
    const mimeType = file.type || 'application/octet-stream';
    let direct: { uploadUrl: string; media: PostMediaInput } | null = null;
    try {
      const res = await api.post<{ data: { uploadUrl: string; media: PostMediaInput } }>(
        `/workspaces/${workspaceId}/posts/media/upload-url`,
        { filename: file.name, mimeType, size: file.size },
      );
      direct = res.data.data;
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status !== 404) {
        const message = (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message;
        throw new Error(message ?? 'Upload failed.');
      }
    }

    if (direct) {
      await putWithProgress(direct.uploadUrl, file, mimeType, onProgress);
      return direct.media;
    }

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

    onProgress?.(100);
    return data.data!.media;
  },
};

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));
    xhr.send(file);
  });
}
