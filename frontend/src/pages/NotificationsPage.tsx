/** src/pages/NotificationsPage.tsx — Module 09 Notifications */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { notificationsApi, type Notification } from '../lib/notifications';
import { PageHeader } from '../components/ui/ContentFlowUI';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const ICON_COLORS: Record<string, string> = {
  PUBLISH: 'text-emerald-400',
  POST: 'text-blue-400',
  FAILED: 'text-red-400',
  SECURITY: 'text-amber-400',
};

export default function NotificationsPage() {
  const { activeWorkspace } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = async () => {
    const { data } = await notificationsApi.list();
    setNotifications(data.data.items);
  };

  useEffect(() => {
    load().catch(() => toast.error('Failed to load notifications'));
  }, [activeWorkspace?.id]);

  return (
    <AppShell>
      <PageHeader
        title="All Notifications"
        action={
          <button
            onClick={() => notificationsApi.markAllRead().then(load)}
            className="text-sm text-brand hover:underline"
          >
            Mark all as read
          </button>
        }
      />

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-cf-muted">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`cf-card flex items-start gap-4 ${!n.readAt ? 'border-brand/30' : ''}`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cf-navy-800 text-sm ${
                  ICON_COLORS[n.category] ?? 'text-cf-muted'
                }`}
              >
                {n.category === 'PUBLISH' ? '✓' : n.category === 'SECURITY' ? '!' : '●'}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-cf-text">{n.title}</h3>
                <p className="mt-1 text-sm text-cf-muted">{n.body}</p>
              </div>
              <span className="shrink-0 text-xs text-cf-muted">{timeAgo(n.createdAt)}</span>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
