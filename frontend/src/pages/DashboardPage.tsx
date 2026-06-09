/**
 * src/pages/DashboardPage.tsx
 * Authenticated landing page with workspace overview.
 */
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { roleBadgeColor } from '../lib/workspace';

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeWorkspace, workspaces, loading } = useWorkspace();

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">
        Welcome back, {user?.fullName?.split(' ')[0]} 👋
      </h1>
      <p className="mt-2 text-muted">
        Manage your workspaces, teams, and permissions from one place.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Workspaces" value={loading ? '…' : String(workspaces.length)} />
        <StatCard
          label="Active workspace"
          value={activeWorkspace?.name ?? 'None'}
          small
        />
        <StatCard label="Your role" value={activeWorkspace?.role ?? '—'} />
        <StatCard
          label="Team size"
          value={activeWorkspace ? String(activeWorkspace.memberCount) : '—'}
        />
      </div>

      {activeWorkspace && (
        <div className="mt-8 rounded-xl border border-ink-500/60 bg-ink-700/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Current workspace</p>
              <h2 className="mt-1 text-xl font-bold text-white">{activeWorkspace.name}</h2>
              {activeWorkspace.description && (
                <p className="mt-1 text-sm text-muted">{activeWorkspace.description}</p>
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${roleBadgeColor(activeWorkspace.role)}`}
            >
              {activeWorkspace.role}
            </span>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/workspaces" title="Workspaces" desc="Create and switch workspaces" />
        <QuickLink to="/team" title="Team" desc="Members & invitations" />
        <QuickLink to="/workspace/settings" title="Settings" desc="Workspace configuration" />
        <QuickLink to="/complete-profile" title="Profile" desc="Update your account" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <InfoCard label="Email verified" value={user?.emailVerified ? 'Yes ✅' : 'No ⚠️'} />
        <InfoCard label="Profile complete" value={user?.profileComplete ? 'Yes ✅' : 'No'} />
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-semibold text-white ${small ? 'truncate text-base' : 'text-2xl'}`}>
        {value}
      </p>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-ink-500/60 bg-ink-700/40 p-4 transition hover:border-brand/40 hover:bg-ink-700/80"
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </Link>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
