/**
 * src/pages/ConnectedAccountsPage.tsx — Module 03 Social Accounts
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { ConnectAccountButton } from '../components/ConnectAccountButton';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { socialApi, ConnectedAccount, SocialPlatform, PLATFORM_META } from '../lib/social';
import { PageHeader, StatusBadge, ProgressRing } from '../components/ui/ContentFlowUI';
import { PlatformIcon } from '../components/PlatformIcon';

const PLATFORMS: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN'];

export default function ConnectedAccountsPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const handledParams = useRef(false);

  const canConnect = permissions.includes('social:connect');
  const canDisconnect = permissions.includes('social:disconnect');

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

  // Show the OAuth result once, then clear it from the URL so it doesn't repeat.
  useEffect(() => {
    if (handledParams.current) return;
    const connected = searchParams.get('connected') === 'true';
    const error = searchParams.get('error');
    if (!connected && !error) return;
    handledParams.current = true;
    if (connected) toast.success('Social account connected!', { id: 'social-connected' });
    if (error) toast.error(decodeURIComponent(error), { id: 'social-error' });
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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
            <button onClick={() => setPickerOpen(true)} className="cf-btn-primary">
              + Connect Account
            </button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {loading ? (
            <p className="text-cf-muted">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <div className="cf-card border-dashed text-center">
              <p className="text-cf-muted">No accounts connected yet. Choose a platform to connect.</p>
              {canConnect && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
              <AccountCard
                key={account.id}
                workspaceId={activeWorkspace.id}
                account={account}
                canDisconnect={canDisconnect}
                onDisconnected={() => void loadAccounts()}
              />
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

      {pickerOpen && (
        <ConnectPicker
          workspaceId={activeWorkspace.id}
          accounts={accounts}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </AppShell>
  );
}

function ConnectPicker({
  workspaceId,
  accounts,
  onClose,
}: {
  workspaceId: string;
  accounts: ConnectedAccount[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-picker-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-cf-border bg-cf-navy-900 p-5 sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between gap-4">
          <h2 id="connect-picker-title" className="text-lg font-semibold text-cf-text">
            Connect an account
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-cf-muted hover:bg-cf-navy-800 hover:text-cf-text"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-cf-muted">Choose the platform you want to connect.</p>

        <div className="grid gap-2 sm:grid-cols-2">
          {PLATFORMS.map((platform) => {
            const count = accounts.filter((a) => a.platform === platform).length;
            return (
              <ConnectAccountButton
                key={platform}
                workspaceId={workspaceId}
                platform={platform}
                hint={count > 0 ? `${count} connected · add another` : undefined}
              />
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-cf-muted">
          You'll sign in on the platform and pick the page or profile to connect. If it opens
          the wrong account, log out of that account in your browser first, or use “Not you?”
          / “Switch account” on the sign-in screen.
        </p>
      </div>
    </div>
  );
}

function AccountCard({
  workspaceId,
  account,
  canDisconnect,
  onDisconnected,
}: {
  workspaceId: string;
  account: ConnectedAccount;
  canDisconnect: boolean;
  onDisconnected: () => void;
}) {
  const meta = PLATFORM_META[account.platform];
  const handle = account.username ? `@${account.username}` : account.displayName ?? meta.label;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const disconnect = async () => {
    setBusy(true);
    try {
      await socialApi.disconnect(workspaceId, account.id);
      toast.success(`${meta.label} account disconnected`);
      onDisconnected();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to disconnect.'));
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="cf-card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="relative shrink-0">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt=""
                className="h-11 w-11 rounded-full border border-cf-border object-cover sm:h-12 sm:w-12"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cf-navy-800 text-sm font-semibold text-cf-text sm:h-12 sm:w-12">
                {(account.displayName ?? account.username ?? meta.label).slice(0, 1).toUpperCase()}
              </span>
            )}
            <PlatformIcon
              platform={account.platform}
              size="xs"
              className="absolute -bottom-1 -right-1 ring-2 ring-cf-navy-900"
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-cf-text">{meta.label}</p>
            <p className="truncate text-sm text-cf-muted">{handle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge variant={account.status === 'CONNECTED' ? 'connected' : 'pending'}>
            {account.status === 'CONNECTED' ? 'Connected' : account.status.replace('_', ' ')}
          </StatusBadge>
          {canDisconnect && !confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-cf-text">
            Disconnect {handle}? Scheduled posts for this account won't be published.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-lg border border-cf-border px-3 py-1.5 text-xs font-medium text-cf-muted hover:text-cf-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void disconnect()}
              disabled={busy}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? 'Disconnecting…' : 'Yes, disconnect'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
