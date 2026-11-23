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
import { PlatformIcon } from '../components/PlatformIcon';
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
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

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
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          onClick={() => {
            setCurrentDate(new Date(year, month - 1, 1));
            setSelectedDay(null);
          }}
          className="cf-btn-outline px-3 py-1.5 text-sm"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold text-cf-text">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={() => {
            setCurrentDate(new Date(year, month + 1, 1));
            setSelectedDay(null);
          }}
          className="cf-btn-outline px-3 py-1.5 text-sm"
        >
          →
        </button>
      </div>

      {loading ? (
        <p className="text-cf-muted">Loading calendar…</p>
      ) : view === 'month' ? (
        <>
        <div className="cf-card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-cf-border">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-1 py-2 text-center text-[11px] font-medium text-cf-muted sm:px-2 sm:py-3 sm:text-xs">
                <span className="sm:hidden">{d.slice(0, 1)}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayPosts = day ? postsByDay.get(day) ?? [] : [];
              const isToday =
                day !== null &&
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();
              const isSelected = day !== null && day === selectedDay;
              return (
                <button
                  type="button"
                  key={i}
                  disabled={!day}
                  onClick={() => day && setSelectedDay(day)}
                  className={`flex min-h-[52px] flex-col items-stretch border-b border-r border-cf-border/60 p-1 text-left sm:min-h-[100px] sm:p-2 [&:nth-child(7n)]:border-r-0 ${
                    isSelected ? 'bg-brand/10' : day ? 'hover:bg-cf-navy-800/50' : ''
                  }`}
                >
                  {day && (
                    <>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center self-center rounded-full text-xs sm:self-start sm:text-sm ${
                          isToday ? 'bg-brand font-semibold text-white' : 'text-cf-muted'
                        }`}
                      >
                        {day}
                      </span>
                      {/* Phones: one dot per post */}
                      {dayPosts.length > 0 && (
                        <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                          {dayPosts.slice(0, 3).map((post, j) => (
                            <span
                              key={post.id}
                              className={`h-1.5 w-1.5 rounded-full ${BADGE_COLORS[j % BADGE_COLORS.length]}`}
                            />
                          ))}
                        </div>
                      )}
                      {/* Larger screens: labelled entries */}
                      <div className="mt-1 hidden space-y-1 sm:block">
                        {dayPosts.map((post, j) => {
                          const platform = post.targets[0]?.connectedAccount.platform;
                          return (
                            <div
                              key={post.id}
                              className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium text-white ${BADGE_COLORS[j % BADGE_COLORS.length]}`}
                            >
                              {platform && <PlatformIcon platform={platform} size="xs" className="!h-3.5 !w-3.5" />}
                              <span className="truncate">
                                {formatTime(post.scheduledAt)} {post.content}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {selectedDay && (
          <div className="mt-4 space-y-2 sm:hidden">
            <h3 className="text-sm font-semibold text-cf-text">
              {MONTHS[month]} {selectedDay}
            </h3>
            {(postsByDay.get(selectedDay) ?? []).length === 0 ? (
              <p className="text-sm text-cf-muted">Nothing scheduled this day.</p>
            ) : (
              (postsByDay.get(selectedDay) ?? []).map((post) => <ScheduledRow key={post.id} post={post} />)
            )}
          </div>
        )}
        </>
      ) : view === 'list' ? (
        <div className="space-y-2">
          {posts.length === 0 ? (
            <p className="text-cf-muted">No scheduled posts.</p>
          ) : (
            posts.map((post) => <ScheduledRow key={post.id} post={post} />)
          )}
        </div>
      ) : (
        <WeekView posts={posts} />
      )}
    </AppShell>
  );
}

function formatTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

function ScheduledRow({ post }: { post: Post }) {
  const platforms = Array.from(new Set(post.targets.map((t) => t.connectedAccount.platform)));
  return (
    <Link
      to={`/posts/${post.id}/edit`}
      className="cf-card flex items-center gap-3 p-3 hover:border-brand/40 sm:p-4"
    >
      <div className="flex shrink-0 -space-x-1.5">
        {platforms.map((p) => (
          <PlatformIcon key={p} platform={p} size="sm" className="ring-2 ring-cf-navy-900" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-cf-text">{post.content}</p>
        <p className="text-xs text-cf-muted">
          {post.scheduledAt &&
            new Date(post.scheduledAt).toLocaleString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">
        {post.status === 'SCHEDULED' ? 'Scheduled' : 'Draft'}
      </span>
    </Link>
  );
}

function WeekView({ posts }: { posts: Post[] }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <div className="space-y-3">
      {days.map((d) => {
        const dayPosts = posts.filter((p) => {
          if (!p.scheduledAt) return false;
          const s = new Date(p.scheduledAt);
          return s.toDateString() === d.toDateString();
        });
        return (
          <div key={d.toISOString()}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-cf-muted">
              {d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            {dayPosts.length === 0 ? (
              <p className="text-sm text-cf-muted/70">—</p>
            ) : (
              <div className="space-y-2">
                {dayPosts.map((p) => (
                  <ScheduledRow key={p.id} post={p} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
