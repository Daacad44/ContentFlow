/**
 * src/components/PostCard.tsx
 * Summary card for a post in the list view.
 */
import { Link } from 'react-router-dom';
import { Post, POST_STATUS_META, TARGET_STATUS_META } from '../lib/posts';
import { PLATFORM_META } from '../lib/social';

interface PostCardProps {
  post: Post;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
}

export function PostCard({
  post,
  canEdit,
  canDelete,
  canPublish,
  onDelete,
  onPublish,
}: PostCardProps) {
  const statusMeta = POST_STATUS_META[post.status];
  const editable =
    canEdit && (post.status === 'DRAFT' || post.status === 'SCHEDULED' || post.status === 'FAILED');

  return (
    <div className="rounded-xl border border-ink-500/60 bg-ink-700/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
            {post.scheduledAt && post.status === 'SCHEDULED' && (
              <span className="text-xs text-muted">
                {new Date(post.scheduledAt).toLocaleString()}
              </span>
            )}
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-slate-200">{post.content}</p>
        </div>

        {post.media.length > 0 && (
          <div className="flex gap-1">
            {post.media.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="h-14 w-14 overflow-hidden rounded-lg border border-ink-500"
              >
                {m.mimeType.startsWith('video/') ? (
                  <video src={m.url} className="h-full w-full object-cover" muted />
                ) : (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            ))}
            {post.media.length > 3 && (
              <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-ink-500 text-xs text-muted">
                +{post.media.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {post.targets.map((t) => {
          const meta = PLATFORM_META[t.connectedAccount.platform];
          const targetMeta = TARGET_STATUS_META[t.status];
          const accountDisconnected = t.connectedAccount.status !== 'CONNECTED';
          return (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-500/60 bg-ink-800/30 px-3 py-2"
            >
              <span className="inline-flex items-center gap-2 text-xs text-muted">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="text-slate-200">
                  {t.connectedAccount.displayName ?? meta.label}
                </span>
                <span className={`font-medium ${targetMeta.color}`}>{targetMeta.label}</span>
                {accountDisconnected && (
                  <span className="text-amber-400">· Reconnect account</span>
                )}
              </span>
              {t.errorMessage && (
                <span className="text-xs text-red-400">{t.errorMessage}</span>
              )}
              {t.platformPostUrl && (
                <a
                  href={t.platformPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline"
                >
                  View on platform →
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-500/40 pt-3">
        {editable && (
          <Link
            to={`/posts/${post.id}/edit`}
            className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-ink-700"
          >
            Edit
          </Link>
        )}
        {canPublish &&
          (post.status === 'DRAFT' || post.status === 'SCHEDULED' || post.status === 'FAILED') && (
            <button
              onClick={() => onPublish(post.id)}
              className="rounded-lg bg-brand/20 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/30"
            >
              Publish now
            </button>
          )}
        {canDelete && post.status !== 'PUBLISHING' && (
          <button
            onClick={() => onDelete(post.id)}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
