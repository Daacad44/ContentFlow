import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { analyticsApi, type DashboardMetrics } from '../lib/analytics';

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [engagement, setEngagement] = useState<Record<string, unknown> | null>(null);
  const [reach, setReach] = useState<Record<string, unknown> | null>(null);
  const [growth, setGrowth] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      analyticsApi.dashboard(activeWorkspace.id),
      analyticsApi.engagement(activeWorkspace.id),
      analyticsApi.reach(activeWorkspace.id),
      analyticsApi.growth(activeWorkspace.id),
    ])
      .then(([dash, eng, rch, grw]) => {
        setMetrics(dash.data.data.metrics);
        setEngagement(eng.data.data.engagement as Record<string, unknown>);
        setReach(rch.data.data.reach as Record<string, unknown>);
        setGrowth(grw.data.data.growth as Record<string, unknown>);
      })
      .finally(() => setLoading(false));
  }, [activeWorkspace?.id]);

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace to view analytics.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">Analytics</h1>
      <p className="mt-2 text-muted">Engagement, reach, growth & performance for {activeWorkspace.name}</p>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-bold text-white">Dashboard Metrics</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Published" value={String(metrics?.publishedPosts ?? 0)} />
              <MetricCard label="Scheduled" value={String(metrics?.scheduledPosts ?? 0)} />
              <MetricCard label="Publish Rate" value={`${metrics?.publishRate ?? 0}%`} />
              <MetricCard label="Failure Rate" value={`${metrics?.failureRate ?? 0}%`} />
              <MetricCard label="Connected Accounts" value={String(metrics?.connectedAccounts ?? 0)} />
              <MetricCard label="AI Generations" value={String(metrics?.aiGenerations ?? 0)} />
              <MetricCard label="Publish Jobs" value={String(metrics?.publishJobs ?? 0)} />
              <MetricCard label="Team Members" value={String(metrics?.teamMembers ?? 0)} />
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <AnalyticsPanel title="Engagement" data={engagement} />
            <AnalyticsPanel title="Reach" data={reach} />
            <AnalyticsPanel title="Growth" data={growth} />
          </div>
        </>
      )}
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function AnalyticsPanel({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  return (
    <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-5">
      <h3 className="font-bold text-white">{title}</h3>
      <pre className="mt-3 max-h-64 overflow-auto text-xs text-muted">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
