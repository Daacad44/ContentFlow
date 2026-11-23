/**
 * src/pages/PostsPage.tsx
 * List drafts, scheduled, and published posts.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { PostCard } from '../components/PostCard';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { postsApi, Post, PostStatus } from '../lib/posts';

const TABS: { key: PostStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'FAILED', label: 'Failed' },
];

export default function PostsPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PostStatus | 'ALL'>('ALL');

  const canCreate = permissions.includes('post:create');
  const canEdit = permissions.includes('post:update');
  const canDelete = permissions.includes('post:delete');
  const canPublish = permissions.includes('post:publish');

  const loadPosts = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data } = await postsApi.list(activeWorkspace.id, {
        status: activeTab === 'ALL' ? undefined : activeTab,
        limit: 50,
      });
      setPosts(data.data.posts);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load posts.'));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, activeTab]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const handleDelete = async (postId: string) => {
    if (!activeWorkspace) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    try {
      await postsApi.remove(activeWorkspace.id, postId);
      toast.success('Post deleted');
      void loadPosts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete post.'));
    }
  };

  const handlePublish = async (postId: string) => {
    if (!activeWorkspace) return;
    try {
      await postsApi.publishNow(activeWorkspace.id, postId);
      toast.success('Post published');
      void loadPosts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to publish post.'));
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace to manage posts.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Posts</h1>
            <p className="mt-1 text-muted">
              Create, schedule, and publish content across your connected platforms.
            </p>
          </div>
          {canCreate && (
            <Link
              to="/posts/new"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create post
            </Link>
          )}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-brand/15 text-brand'
                  : 'text-muted hover:bg-ink-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted">Loading posts…</p>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-500 bg-ink-800/20 p-10 text-center">
            <p className="text-muted">No posts found.</p>
            {canCreate && (
              <Link
                to="/posts/new"
                className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
              >
                Create your first post
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                canEdit={canEdit}
                canDelete={canDelete}
                canPublish={canPublish}
                onDelete={handleDelete}
                onPublish={handlePublish}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
