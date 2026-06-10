/** src/pages/AnalyticsPage.tsx — Module 08 Analytics */
import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { analyticsApi, type DashboardMetrics } from '../lib/analytics';
import { PageHeader, StatCard, LineChart, PlatformBar } from '../components/ui/ContentFlowUI';

const SPARK = [3, 5, 4, 7, 6, 8, 9, 7, 10, 12];

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    analyticsApi
      .dashboard(activeWorkspace.id)
      .then((dash) => setMetrics(dash.data.data.metrics))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.id]);

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace to view analytics.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Analytics Overview"
        action={
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="cf-input w-48 text-xs"
              placeholder="Last 30 days"
              readOnly
            />
            <button className="cf-btn-outline px-3 py-1.5 text-xs">Export</button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Reach" value="24.5K" change="+12.5%" positive sparkline={SPARK} />
            <StatCard label="Engagement" value="3.2K" change="+8.3%" positive sparkline={SPARK} />
            <StatCard label="Impressions" value="48.1K" change="+15.2%" positive sparkline={SPARK} />
            <StatCard label="Profile Views" value="1.8K" change="-2.1%" positive={false} sparkline={SPARK} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LineChart
                title="Performance Over Time"
                series={[
                  { name: 'Reach', color: '#D97706', data: [12, 18, 15, 22, 28, 24, 32, 30, 35, 38] },
                  { name: 'Engagement', color: '#3b82f6', data: [4, 6, 5, 8, 10, 9, 12, 11, 14, 15] },
                ]}
                labels={['Week 1', 'Week 2', 'Week 3', 'Week 4']}
              />
            </div>
            <div className="cf-card">
              <h3 className="mb-4 text-sm font-semibold text-cf-text">Top Platforms</h3>
              <div className="space-y-4">
                <PlatformBar label="Instagram" value={12400} max={15000} />
                <PlatformBar label="Facebook" value={8200} max={15000} />
                <PlatformBar label="LinkedIn" value={3900} max={15000} />
                <PlatformBar label="TikTok" value={2100} max={15000} />
              </div>
              {metrics && (
                <p className="mt-4 text-xs text-cf-muted">
                  {metrics.connectedAccounts} connected account(s) · {metrics.publishedPosts} published posts
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
