/**
 * src/pages/SchedulerPage.tsx — Module 04 Scheduler
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { postsApi, Post } from '../lib/posts';
import { PLATFORM_META } from '../lib/social';
import { PageHeader } from '../components/ui/ContentFlowUI';

type ViewMode = 'month' | 'week' | 'list';

const BADGE_COLORS = ['bg-brand/80', 'bg-purple-500/80', 'bg-emerald-500/80', 'bg-blue-500/80'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SchedulerPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const canCreate = permissions.includes('post:create');

  const loadPosts = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data } = await postsApi.list(activeWorkspace.id, { limit: 100 });
      const scheduled = data.data.posts.filter(
        (p) => p.scheduledAt && (p.status === 'SCHEDULED' || p.status === 'DRAFT'),
      );
      setPosts(scheduled);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load schedule.'));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const postsByDay = useMemo(() => {
    const map = new Map<number, Post[]>();
    posts.forEach((post) => {
      if (!post.scheduledAt) return;
      const d = new Date(post.scheduledAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(post);
      }
    });
    return map;
  }, [posts, year, month]);

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace to view the scheduler.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Calendar View"
        action={
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-cf-border">
              {(['month', 'week', 'list'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize first:rounded-l-lg last:rounded-r-lg ${
                    view === v ? 'bg-brand text-white' : 'text-cf-muted hover:text-cf-text'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {canCreate && (
              <Link to="/posts/new" className="cf-btn-primary">
                + Create Post
              </Link>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="cf-btn-outline px-3 py-1.5 text-sm"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold text-cf-text">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="cf-btn-outline px-3 py-1.5 text-sm"
        >
          →
        </button>
      </div>

      {loading ? (
        <p className="text-cf-muted">Loading calendar…</p>
      ) : view === 'month' ? (
        <div className="cf-card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-cf-border">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-3 text-center text-xs font-medium text-cf-muted">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayPosts = day ? postsByDay.get(day) ?? [] : [];
              return (
                <div
                  key={i}
                  className="min-h-[100px] border-b border-r border-cf-border/60 p-2 last:border-r-0"
                >
                  {day && (
                    <>
                      <span className="text-sm text-cf-muted">{day}</span>
                      <div className="mt-1 space-y-1">
                        {dayPosts.map((post, j) => {
                          const time = post.scheduledAt
                            ? new Date(post.scheduledAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '';
                          const platform = post.targets[0]?.connectedAccount.platform;
                          const platformIcon = platform ? PLATFORM_META[platform].icon : '';
                          return (
                            <div
                              key={post.id}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${BADGE_COLORS[j % BADGE_COLORS.length]}`}
                            >
                              <span className="mr-1">{platformIcon}</span>
                              {time} {post.content.slice(0, 20)}
                              {post.content.length > 20 ? '…' : ''}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-2">
          {posts.length === 0 ? (
            <p className="text-cf-muted">No scheduled posts.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="cf-card flex items-center justify-between">
                <div>
                  <p className="font-medium text-cf-text">{post.content.slice(0, 60)}</p>
                  <p className="text-xs text-cf-muted">
                    {post.scheduledAt && new Date(post.scheduledAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
                  {post.status}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="cf-card">
          <p className="text-cf-muted">Week view — {posts.length} scheduled post(s) this month.</p>
        </div>
      )}
    </AppShell>
  );
}
