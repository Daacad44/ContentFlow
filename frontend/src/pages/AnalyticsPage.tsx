/** src/pages/AnalyticsPage.tsx — Module 08 Analytics (real workspace data only) */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  analyticsApi,
  type DashboardMetrics,
  type GrowthAnalytics,
  type ReachAnalytics,
} from '../lib/analytics';
import { getApiErrorMessage } from '../lib/api';
import { PageHeader, StatCard, LineChart, PlatformBar } from '../components/ui/ContentFlowUI';

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
] as const;

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
  TIKTOK: 'TikTok',
};

function rangeParams(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function axisLabels(timeline: { date: string }[]) {
  if (timeline.length === 0) return [];
  const picks = [0, Math.floor((timeline.length - 1) / 2), timeline.length - 1];
  return Array.from(new Set(picks)).map((i) => formatDay(timeline[i].date));
}

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace();
  const [days, setDays] = useState<number>(30);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [growth, setGrowth] = useState<GrowthAnalytics | null>(null);
  const [reach, setReach] = useState<ReachAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    const { from, to } = rangeParams(days);
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      analyticsApi.dashboard(activeWorkspace.id),
      analyticsApi.growth(activeWorkspace.id, from, to),
      analyticsApi.reach(activeWorkspace.id, from, to),
    ])
      .then(([dash, g, r]) => {
        if (cancelled) return;
        setMetrics(dash.data.data.metrics);
        setGrowth(g.data.data.growth);
        setReach(r.data.data.reach);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load analytics.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.id, days]);

  async function handleExport() {
    if (!activeWorkspace) return;
    setExporting(true);
    try {
      const { from, to } = rangeParams(days);
      const res = await analyticsApi.performance(activeWorkspace.id, from, to);
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contentflow-analytics-${activeWorkspace.slug}-${days}d.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  }

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace to view analytics.</p>
      </AppShell>
    );
  }

  const timeline = growth?.timeline ?? [];
  const sparkline = timeline.map((d) => d.count);
  const postsInRange = timeline.reduce((sum, d) => sum + d.count, 0);
  const platforms = reach?.byPlatform ?? [];
  const maxPublished = Math.max(...platforms.map((p) => p.published), 1);

  return (
    <AppShell>
      <PageHeader
        title="Analytics Overview"
        subtitle="Publishing activity for this workspace"
        action={
          <div className="flex items-center gap-2">
            <select
              className="cf-input w-40 text-xs"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Date range"
            >
              {RANGES.map((r) => (
                <option key={r.days} value={r.days}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              className="cf-btn-outline px-3 py-1.5 text-xs"
              onClick={handleExport}
              disabled={exporting || loading}
            >
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : error ? (
        <div className="cf-card text-sm text-red-400">{error}</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label={`Posts created (${days}d)`}
              value={postsInRange.toLocaleString()}
              change={
                growth?.growthRate != null
                  ? `${growth.growthRate >= 0 ? '+' : ''}${growth.growthRate}% vs first half`
                  : undefined
              }
              positive={(growth?.growthRate ?? 0) >= 0}
              sparkline={sparkline.length > 1 ? sparkline : undefined}
            />
            <StatCard
              label="Deliveries published"
              value={(reach?.publishedTargets ?? 0).toLocaleString()}
            />
            <StatCard label="Publish success rate" value={`${metrics?.publishRate ?? 0}%`} />
            <StatCard label="Scheduled posts" value={(metrics?.scheduledPosts ?? 0).toLocaleString()} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {postsInRange > 0 ? (
                <LineChart
                  title="Posts created per day"
                  series={[{ name: 'Posts', color: '#D97706', data: sparkline }]}
                  labels={axisLabels(timeline)}
                />
              ) : (
                <div className="cf-card">
                  <h3 className="text-sm font-semibold text-cf-text">Posts created per day</h3>
                  <p className="mt-6 text-sm text-cf-muted">No posts in this period yet.</p>
                </div>
              )}
            </div>
            <div className="cf-card">
              <h3 className="mb-4 text-sm font-semibold text-cf-text">Published by account</h3>
              {platforms.length === 0 ? (
                <p className="text-sm text-cf-muted">Connect a social account to see results here.</p>
              ) : (
                <div className="space-y-4">
                  {platforms.map((p) => (
                    <PlatformBar
                      key={`${p.platform}-${p.accountName ?? ''}`}
                      label={`${PLATFORM_LABELS[p.platform] ?? p.platform}${p.accountName ? ` · ${p.accountName}` : ''}`}
                      value={p.published}
                      max={maxPublished}
                    />
                  ))}
                </div>
              )}
              {metrics && (
                <p className="mt-4 text-xs text-cf-muted">
                  {metrics.connectedAccounts} connected account(s) · {metrics.failedPosts} failed post(s)
                </p>
              )}
            </div>
          </div>

          {reach && !reach.platformMetrics.available && (
            <div className="cf-card mt-6 text-sm text-cf-muted">
              Reach, impressions and engagement will appear here once platform insights are connected.
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
