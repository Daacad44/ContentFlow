/**
 * src/pages/ConnectedAccountsPage.tsx — Module 03 Social Accounts
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { ConnectAccountButton } from '../components/ConnectAccountButton';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { socialApi, ConnectedAccount, SocialPlatform, PLATFORM_META } from '../lib/social';
import { PageHeader, StatusBadge, ProgressRing } from '../components/ui/ContentFlowUI';

const PLATFORMS: SocialPlatform[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'];

export default function ConnectedAccountsPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const canConnect = permissions.includes('social:connect');

  const handleConnect = async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await socialApi.connect(activeWorkspace.id, 'INSTAGRAM', '/accounts');
      window.location.href = data.data.authUrl;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to connect account.'));
    }
  };

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
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast.success('Social account connected!');
      loadAccounts();
    }
    const error = searchParams.get('error');
    if (error) toast.error(decodeURIComponent(error));
  }, [searchParams, loadAccounts]);

  const healthyCount = accounts.filter((a) => a.status === 'CONNECTED').length;
  const healthPct = accounts.length > 0 ? Math.round((healthyCount / accounts.length) * 100) : 100;

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace to manage social accounts.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Connected Accounts"
        action={
          canConnect && (
            <button onClick={() => void handleConnect()} className="cf-btn-primary">
              + Connect Account
            </button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {loading ? (
            <p className="text-cf-muted">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <div className="cf-card border-dashed text-center">
              <p className="text-cf-muted">No accounts connected yet.</p>
              {canConnect && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {PLATFORMS.map((platform) => (
                    <ConnectAccountButton
                      key={platform}
                      workspaceId={activeWorkspace.id}
                      platform={platform}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))
          )}
        </div>

        <div className="cf-card flex flex-col items-center justify-center">
          <h3 className="mb-4 text-sm font-semibold text-cf-text">Connection Health</h3>
          <ProgressRing
            value={healthPct}
            label={healthPct === 100 ? 'All accounts are healthy' : `${healthyCount} of ${accounts.length} healthy`}
          />
        </div>
      </div>
    </AppShell>
  );
}

function AccountCard({ account }: { account: ConnectedAccount }) {
  const meta = PLATFORM_META[account.platform];
  const handle = account.username ? `@${account.username}` : account.displayName ?? meta.label;

  return (
    <div className="cf-card flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {account.avatarUrl ? (
          <img src={account.avatarUrl} alt="" className="h-12 w-12 rounded-full border border-cf-border object-cover" />
        ) : (
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: meta.color }}
          >
            {meta.icon}
          </span>
        )}
        <div>
          <p className="font-medium text-cf-text">{meta.label}</p>
          <p className="text-sm text-cf-muted">{handle}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 text-right">
        <div>
          <p className="text-xs text-cf-muted">Followers</p>
          <p className="font-semibold text-cf-text">—</p>
        </div>
        <div>
          <p className="text-xs text-cf-muted">Engagement</p>
          <p className="font-semibold text-cf-text">—</p>
        </div>
        <StatusBadge variant={account.status === 'CONNECTED' ? 'connected' : 'pending'}>
          {account.status === 'CONNECTED' ? 'Connected' : account.status.replace('_', ' ')}
        </StatusBadge>
      </div>
    </div>
  );
}
