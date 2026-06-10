/**
 * src/pages/ConnectedAccountsPage.tsx
 * Manage Facebook, Instagram, LinkedIn, and TikTok account connections.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { ConnectAccountButton } from '../components/ConnectAccountButton';
import { SocialAccountCard } from '../components/SocialAccountCard';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { socialApi, ConnectedAccount, SocialPlatform, PLATFORM_META } from '../lib/social';

const PLATFORMS: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK'];

export default function ConnectedAccountsPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const canConnect = permissions.includes('social:connect');
  const canDisconnect = permissions.includes('social:disconnect');
  const canSync = permissions.includes('social:sync');

  const isExpired = (status: string) =>
    status === 'TOKEN_EXPIRED' || status === 'ERROR';

  const loadAccounts = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data } = await socialApi.list(activeWorkspace.id);
      setAccounts(data.data.accounts);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load accounts.'));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    (async () => {
      await loadAccounts();
      if (activeWorkspace && canSync) {
        try {
          const { data } = await socialApi.sync(activeWorkspace.id);
          setAccounts(data.data.accounts);
        } catch {
          // Non-blocking — list still shown from initial load
        }
      }
    })();
  }, [loadAccounts, activeWorkspace, canSync]);

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast.success('Social account connected!');
      loadAccounts();
    }
    const error = searchParams.get('error');
    if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [searchParams, loadAccounts]);

  const handleSync = async () => {
    if (!activeWorkspace) return;
    setSyncing(true);
    try {
      const { data } = await socialApi.sync(activeWorkspace.id);
      toast.success(`Synced ${data.data.synced} account(s)`);
      setAccounts(data.data.accounts);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sync failed.'));
    } finally {
      setSyncing(false);
    }
  };

  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace to manage social accounts.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Connected Accounts</h1>
            <p className="mt-1 text-muted">
              Connect Facebook, Instagram, LinkedIn, and TikTok to schedule and publish content.
            </p>
          </div>
          {canSync && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg border border-ink-500 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-ink-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync accounts'}
            </button>
          )}
        </div>

        {canConnect && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              Connect a platform
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLATFORMS.map((platform) => {
                const connected = accounts.find((a) => a.platform === platform);
                const disabled =
                  connectedPlatforms.has(platform) &&
                  connected &&
                  !isExpired(connected.status);
                return (
                  <ConnectAccountButton
                    key={platform}
                    workspaceId={activeWorkspace.id}
                    platform={platform}
                    disabled={disabled}
                    label={
                      connected && isExpired(connected.status)
                        ? `Reconnect ${PLATFORM_META[platform].label}`
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Your accounts ({accounts.length})
          </h2>
          {loading ? (
            <p className="text-muted">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-500 bg-ink-800/20 p-8 text-center">
              <p className="text-muted">No accounts connected yet.</p>
              {canConnect && (
                <p className="mt-1 text-sm text-muted">
                  Choose a platform above to get started.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <SocialAccountCard
                  key={account.id}
                  workspaceId={activeWorkspace.id}
                  account={account}
                  canDisconnect={canDisconnect}
                  canReconnect={canConnect}
                  onUpdate={loadAccounts}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
