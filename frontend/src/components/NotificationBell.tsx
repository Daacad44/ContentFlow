import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi, type Notification } from '../lib/notifications';

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  const load = async () => {
    try {
      const res = await notificationsApi.list();
      setUnread(res.data.data.unreadCount);
      setItems(res.data.data.items.slice(0, 5));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    load();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg border border-ink-500 px-2.5 py-1.5 text-sm hover:bg-ink-700"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-ink-500 bg-ink-800 shadow-xl">
          <div className="flex items-center justify-between border-b border-ink-500 px-4 py-3">
            <span className="text-sm font-semibold text-white">Notifications</span>
            <Link to="/notifications" className="text-xs text-brand" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">No notifications</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`block w-full border-b border-ink-500/40 px-4 py-3 text-left hover:bg-ink-700/60 ${
                    !n.readAt ? 'bg-brand/5' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
