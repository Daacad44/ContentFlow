/**
 * src/pages/PostComposerPage.tsx
 * Create and edit posts with multi-platform targeting, media, and scheduling.
 */
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { MediaUpload } from '../components/MediaUpload';
import { PlatformSelector } from '../components/PlatformSelector';
import { AIPanel } from '../components/AIPanel';
import {
  TikTokSettingsPanel,
  TikTokDraft,
  EMPTY_TIKTOK_DRAFT,
  draftFromSettings,
  settingsFromDraft,
} from '../components/TikTokSettingsPanel';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { postsApi, PostMediaInput, TikTokSettings } from '../lib/posts';
import { socialApi, ConnectedAccount } from '../lib/social';

export default function PostComposerPage() {
  const { id: postId } = useParams<{ id: string }>();
  const isEdit = Boolean(postId);
  const navigate = useNavigate();
  const { activeWorkspace, permissions } = useWorkspace();

  const [content, setContent] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [media, setMedia] = useState<PostMediaInput[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [tiktok, setTiktok] = useState<TikTokDraft>(EMPTY_TIKTOK_DRAFT);

  const tiktokAccount = accounts.find(
    (a) => a.platform === 'TIKTOK' && selectedAccountIds.includes(a.id),
  );
  const tiktokMediaKind: 'video' | 'photo' =
    media.length > 0 && media.every((m) => m.mimeType.startsWith('image/')) ? 'photo' : 'video';

  /**
   * Validates TikTok requirements when a TikTok account is selected. Returns the settings to
   * send (undefined when TikTok is not selected), or null after showing an error.
   */
  const resolveTikTok = (forPublish: boolean): TikTokSettings | undefined | null => {
    if (!tiktokAccount) return undefined;
    const result = settingsFromDraft(tiktok);
    if (!forPublish) return 'settings' in result ? result.settings : undefined;
    // Defaults are pre-filled, so this only fails if the user cleared a choice.
    if ('error' in result) {
      toast.error(result.error);
      return null;
    }
    const mediaError = tiktokMediaError(media);
    if (mediaError) {
      toast.error(mediaError);
      return null;
    }
    return result.settings;
  };

  const canCreate = permissions.includes('post:create');
  const canEdit = permissions.includes('post:update');
  const canPublish = permissions.includes('post:publish');

  useEffect(() => {
    if (!activeWorkspace) return;

    (async () => {
      try {
        const { data } = await socialApi.list(activeWorkspace.id);
        setAccounts(data.data.accounts);
      } catch {
        toast.error('Failed to load connected accounts.');
      }
    })();
  }, [activeWorkspace]);

  useEffect(() => {
    if (!isEdit || !activeWorkspace || !postId) return;

    (async () => {
      setLoading(true);
      try {
        const { data } = await postsApi.get(activeWorkspace.id, postId);
        const post = data.data.post;

        if (post.status === 'PUBLISHED' || post.status === 'PUBLISHING') {
          toast.error('Published posts cannot be edited.');
          navigate('/posts', { replace: true });
          return;
        }

        setContent(post.content);
        setTiktok(draftFromSettings(post.tiktokSettings));
        setSelectedAccountIds(post.targets.map((t) => t.connectedAccount.id));
        setMedia(
          post.media.map((m) => ({
            url: m.url,
            filename: m.filename,
            mimeType: m.mimeType,
            size: m.size,
          })),
        );
        if (post.scheduledAt) {
          setScheduleEnabled(true);
          setScheduledAt(toDatetimeLocal(post.scheduledAt));
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load post.'));
        navigate('/posts', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, activeWorkspace, postId, navigate]);

  const handleSubmit = async (e: FormEvent, saveAsDraft: boolean) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    if (!content.trim()) {
      toast.error('Content is required.');
      return;
    }
    if (selectedAccountIds.length === 0) {
      toast.error('Select at least one platform.');
      return;
    }
    if (scheduleEnabled && !scheduledAt && !saveAsDraft) {
      toast.error('Pick a schedule date and time.');
      return;
    }
    const tiktokSettings = resolveTikTok(!saveAsDraft && scheduleEnabled);
    if (tiktokSettings === null) return;

    setSubmitting(true);
    try {
      const payload = {
        content: content.trim(),
        connectedAccountIds: selectedAccountIds,
        media,
        saveAsDraft,
        ...(tiktokSettings ? { tiktokSettings } : {}),
        ...(scheduleEnabled && scheduledAt && !saveAsDraft
          ? { scheduledAt: new Date(scheduledAt).toISOString() }
          : {}),
      };

      if (isEdit && postId) {
        await postsApi.update(activeWorkspace.id, postId, payload);
        toast.success(saveAsDraft ? 'Draft saved' : 'Post updated');
      } else {
        await postsApi.create(activeWorkspace.id, payload);
        toast.success(saveAsDraft ? 'Draft saved' : scheduleEnabled ? 'Post scheduled' : 'Post created');
      }

      navigate('/posts');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save post.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndPublish = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || isEdit) return;

    if (!content.trim()) {
      toast.error('Content is required.');
      return;
    }
    if (selectedAccountIds.length === 0) {
      toast.error('Select at least one platform.');
      return;
    }
    const tiktokSettings = resolveTikTok(true);
    if (tiktokSettings === null) return;

    setSubmitting(true);
    try {
      const { data } = await postsApi.create(activeWorkspace.id, {
        content: content.trim(),
        connectedAccountIds: selectedAccountIds,
        media,
        saveAsDraft: true,
        ...(tiktokSettings ? { tiktokSettings } : {}),
      });
      const published = await postsApi.publishNow(activeWorkspace.id, data.data.post.id);
      toastPublishResult(published.data.data.post.status);
      navigate('/posts');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to publish post.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishNow = async () => {
    if (!activeWorkspace || !postId) return;
    const tiktokSettings = resolveTikTok(true);
    if (tiktokSettings === null) return;
    setSubmitting(true);
    try {
      if (tiktokSettings) {
        // Store the TikTok choices made on this screen before publishing.
        await postsApi.update(activeWorkspace.id, postId, { tiktokSettings });
      }
      const published = await postsApi.publishNow(activeWorkspace.id, postId);
      toastPublishResult(published.data.data.post.status);
      navigate('/posts');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to publish.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace to compose posts.</p>
      </AppShell>
    );
  }

  if ((isEdit && !canEdit) || (!isEdit && !canCreate)) {
    return (
      <AppShell>
        <p className="text-muted">You do not have permission to {isEdit ? 'edit' : 'create'} posts.</p>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link to="/posts" className="text-sm text-muted hover:text-white">
            ← Back to posts
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">
            {isEdit ? 'Edit post' : 'Create post'}
          </h1>
        </div>

        <form className="space-y-6" onSubmit={(e) => void handleSubmit(e, false)}>
          {permissions.includes('ai:generate') && (
            <AIPanel
              workspaceId={activeWorkspace.id}
              topic={content}
              disabled={submitting}
              onApplyContent={(text) => setContent(text)}
              onApplyHashtags={(tags) =>
                setContent((prev) => `${prev.trim()}\n\n${tags}`.trim())
              }
            />
          )}

          <div>
            <label className="cf-label" htmlFor="content">
              Content
            </label>
            <textarea
              id="content"
              className="cf-input min-h-[140px] resize-y"
              placeholder="What would you like to share?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <p className="cf-label">Platforms</p>
            <PlatformSelector
              accounts={accounts}
              selectedIds={selectedAccountIds}
              onChange={setSelectedAccountIds}
              disabled={submitting}
            />
          </div>

          <div>
            <p className="cf-label">Media</p>
            <MediaUpload
              workspaceId={activeWorkspace.id}
              media={media}
              onChange={setMedia}
              onUpload={(file, onProgress) => postsApi.uploadMedia(activeWorkspace.id, file, onProgress)}
              disabled={submitting}
            />
          </div>

          {tiktokAccount && (
            <TikTokSettingsPanel
              workspaceId={activeWorkspace.id}
              account={tiktokAccount}
              mediaKind={tiktokMediaKind}
              value={tiktok}
              onChange={setTiktok}
              disabled={submitting}
            />
          )}

          <div className="rounded-xl border border-ink-500/60 bg-ink-800/30 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                disabled={submitting}
                className="h-4 w-4 rounded border-ink-500 accent-brand"
              />
              <span className="text-sm font-medium text-white">Schedule for later</span>
            </label>

            {scheduleEnabled && (
              <div className="mt-3">
                <label className="cf-label" htmlFor="scheduledAt">
                  Date & time
                </label>
                <input
                  id="scheduledAt"
                  type="datetime-local"
                  className="cf-input"
                  value={scheduledAt}
                  min={toDatetimeLocal(new Date().toISOString())}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {scheduleEnabled ? (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Schedule post'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => void handleSubmit(e, true)}
                  className="rounded-xl border border-ink-500 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-ink-700 disabled:opacity-50"
                >
                  Save as draft
                </button>
                {isEdit ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl border border-ink-500 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-ink-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Update post'}
                  </button>
                ) : null}
              </>
            )}

            {canPublish && !scheduleEnabled && (
              <button
                type="button"
                disabled={submitting}
                onClick={(e) =>
                  isEdit ? void handlePublishNow() : void handleCreateAndPublish(e)
                }
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Publishing…' : 'Publish now'}
              </button>
            )}
          </div>
          {!scheduleEnabled && (
            <p className="text-xs text-muted">
              Save as draft keeps the post in ContentFlow only. Use Publish now to post to your
              connected social accounts.
            </p>
          )}
        </form>
      </div>
    </AppShell>
  );
}

function toastPublishResult(status: string) {
  if (status === 'PUBLISHING') {
    toast.success('Post sent. The platform is still processing it; status updates within a few minutes.');
  } else {
    toast.success('Post published to your platforms');
  }
}

/** Mirrors the API's TikTok media rules so the user sees the problem before publishing. */
function tiktokMediaError(media: PostMediaInput[]): string | null {
  if (media.length === 0) return 'TikTok posts need a video or photos.';
  const videos = media.filter((m) => m.mimeType.startsWith('video/')).length;
  const images = media.filter((m) => m.mimeType.startsWith('image/'));
  if (videos > 0 && images.length > 0) return "TikTok can't mix photos and a video in one post.";
  if (videos > 1) return 'TikTok allows one video per post.';
  if (images.some((m) => m.mimeType === 'image/gif')) return "TikTok doesn't accept GIFs. Use JPG, PNG or WebP.";
  return null;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
