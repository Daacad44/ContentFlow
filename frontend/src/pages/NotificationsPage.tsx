import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { notificationsApi, type Notification, type NotificationCategory } from '../lib/notifications';

const CATEGORIES: NotificationCategory[] = [
  'POST', 'PUBLISH', 'TEAM', 'BILLING', 'SECURITY', 'SYSTEM', 'ALERT',
];

export default function NotificationsPage() {
  const { activeWorkspace } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<Array<{ category: NotificationCategory; emailEnabled: boolean; inAppEnabled: boolean }>>([]);
  const [tab, setTab] = useState<'inbox' | 'preferences' | 'alerts'>('inbox');

  const load = async () => {
    const [notifRes, prefRes] = await Promise.all([
      notificationsApi.list(),
      notificationsApi.getPreferences(activeWorkspace?.id),
    ]);
    setNotifications(notifRes.data.data.items);
    setPrefs(prefRes.data.data.preferences);
  };

  useEffect(() => {
    load().catch(() => toast.error('Failed to load notifications'));
  }, [activeWorkspace?.id]);

  const savePrefs = async () => {
    await notificationsApi.updatePreferences(prefs, activeWorkspace?.id);
    toast.success('Preferences saved');
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">Notifications</h1>

      <div className="mt-6 flex gap-2">
        {(['inbox', 'preferences', 'alerts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-ink-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'inbox' && (
        <div className="mt-6 space-y-3">
          <button
            onClick={() => notificationsApi.markAllRead().then(load)}
            className="text-sm text-brand hover:underline"
          >
            Mark all read
          </button>
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border border-ink-500/60 p-4 ${!n.readAt ? 'bg-brand/5' : 'bg-ink-700/40'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs text-muted">{n.category}</span>
                  <h3 className="font-semibold text-white">{n.title}</h3>
                  <p className="mt-1 text-sm text-muted">{n.body}</p>
                </div>
                <span className="text-xs text-muted">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'preferences' && (
        <div className="mt-6 space-y-4">
          {CATEGORIES.map((cat) => {
            const pref = prefs.find((p) => p.category === cat) ?? {
              category: cat, emailEnabled: true, inAppEnabled: true,
            };
            return (
              <div key={cat} className="flex items-center justify-between rounded-xl border border-ink-500/60 bg-ink-700/40 p-4">
                <span className="font-medium text-white">{cat}</span>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={pref.inAppEnabled}
                      onChange={(e) => {
                        const next = prefs.filter((p) => p.category !== cat);
                        next.push({ ...pref, inAppEnabled: e.target.checked });
                        setPrefs(next);
                      }}
                    />
                    In-app
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={pref.emailEnabled}
                      onChange={(e) => {
                        const next = prefs.filter((p) => p.category !== cat);
                        next.push({ ...pref, emailEnabled: e.target.checked });
                        setPrefs(next);
                      }}
                    />
                    Email
                  </label>
                </div>
              </div>
            );
          })}
          <button onClick={savePrefs} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
            Save preferences
          </button>
        </div>
      )}

      {tab === 'alerts' && activeWorkspace && (
        <AlertsPanel workspaceId={activeWorkspace.id} />
      )}
    </AppShell>
  );
}

function AlertsPanel({ workspaceId }: { workspaceId: string }) {
  const [rules, setRules] = useState<Array<{ id: string; name: string; metric: string; condition: string; threshold: number; isActive: boolean }>>([]);

  useEffect(() => {
    notificationsApi.listAlerts(workspaceId).then((r) => setRules(r.data.data.rules));
  }, [workspaceId]);

  const addRule = async () => {
    await notificationsApi.createAlert(workspaceId, {
      name: 'Failed posts alert',
      metric: 'failed_posts',
      condition: 'gt',
      threshold: 3,
    });
    const r = await notificationsApi.listAlerts(workspaceId);
    setRules(r.data.data.rules);
    toast.success('Alert created');
  };

  return (
    <div className="mt-6">
      <button onClick={addRule} className="mb-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
        Add default alert
      </button>
      {rules.map((rule) => (
        <div key={rule.id} className="mb-3 rounded-xl border border-ink-500/60 bg-ink-700/40 p-4">
          <h3 className="font-semibold text-white">{rule.name}</h3>
          <p className="text-sm text-muted">
            {rule.metric} {rule.condition} {rule.threshold} — {rule.isActive ? 'Active' : 'Inactive'}
          </p>
          <button
            onClick={() => notificationsApi.deleteAlert(workspaceId, rule.id).then(() => setRules((r) => r.filter((x) => x.id !== rule.id)))}
            className="mt-2 text-xs text-red-400 hover:underline"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
