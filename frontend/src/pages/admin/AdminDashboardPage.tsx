/** src/pages/admin/AdminDashboardPage.tsx — Module 11 Admin Panel */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AppShell } from '../../components/AppShell';
import { adminApi } from '../../lib/admin';
import { PageHeader, StatCard, LineChart, Avatar } from '../../components/ui/ContentFlowUI';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    adminApi.dashboard().then((r) => setStats(r.data.data.stats));
    api.get<{ data: { items: AdminUser[] } }>('/users').then((r) => {
      setUsers(r.data.data.items.slice(0, 5));
    });
  }, []);

  const userStats = stats?.users as Record<string, number> | undefined;
  const revenue = stats?.revenue as Record<string, number> | undefined;

  return (
    <AppShell>
      <PageHeader title="Admin Dashboard" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={String(userStats?.total ?? '—')} />
        <StatCard label="Active Users" value={String(userStats?.active ?? '—')} />
        <StatCard
          label="Total Revenue"
          value={`$${((revenue?.last30DaysCents ?? 0) / 100).toFixed(0)}`}
        />
        <StatCard label="New Signups" value={String(userStats?.recentSignups ?? '—')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LineChart
            title="Users Growth"
            series={[
              {
                name: 'Users',
                color: '#D97706',
                data: [10, 15, 18, 22, 28, 35, 42, 48, 55, 62],
              },
            ]}
            labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']}
          />
        </div>
        <div className="cf-card">
          <h3 className="mb-4 text-sm font-semibold text-cf-text">Recent Users</h3>
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar name={u.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-cf-text">{u.fullName}</p>
                  <p className="truncate text-xs text-cf-muted">{u.email}</p>
                </div>
                <span className="shrink-0 text-xs text-cf-muted">
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-cf-muted">No users yet.</p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
