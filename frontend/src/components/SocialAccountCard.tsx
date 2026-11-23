/**
 * src/components/SocialAccountCard.tsx
 * Displays a connected social account with actions.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../lib/api';
import { socialApi, ConnectedAccount, PLATFORM_META } from '../lib/social';
import { PlatformIcon } from './PlatformIcon';

interface Props {
  workspaceId: string;
  account: ConnectedAccount;
  canDisconnect: boolean;
  canReconnect: boolean;
  onUpdate: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: 'bg-emerald-500/15 text-emerald-400',
  TOKEN_EXPIRED: 'bg-amber-500/15 text-amber-400',
  ERROR: 'bg-red-500/15 text-red-400',
  PENDING: 'bg-blue-500/15 text-blue-400',
  DISCONNECTED: 'bg-slate-500/15 text-slate-400',
};

export function SocialAccountCard({
  workspaceId,
  account,
  canDisconnect,
  canReconnect,
  onUpdate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const meta = PLATFORM_META[account.platform];

  const handleDisconnect = async () => {
    const name = account.displayName ?? account.username ?? meta.label;
    if (!confirm(`Disconnect ${name}?`)) return;
    setLoading(true);
    try {
      await socialApi.disconnect(workspaceId, account.id);
      toast.success('Account disconnected');
      onUpdate();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to disconnect.'));
    } finally {
      setLoading(false);
    }
  };

  const needsReconnect =
    account.status === 'TOKEN_EXPIRED' || account.status === 'ERROR';

  const handleReconnect = async () => {
    setLoading(true);
    try {
      const { data } = await socialApi.connect(workspaceId, account.platform, '/accounts');
      window.location.href = data.data.authUrl;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to start reconnect.'));
      setLoading(false);
    }
  };

  const handleCheckHealth = async () => {
    setLoading(true);
    try {
      const { data } = await socialApi.checkHealth(workspaceId, account.id);
      const { healthy, message } = data.data.health;
      if (healthy) {
        toast.success('Account is healthy');
      } else {
        toast.error(message ?? 'Token may be expired — reconnect the account.');
      }
      onUpdate();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Health check failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-ink-500 bg-ink-800/40 p-4">
      <div className="flex items-center gap-4">
        {account.avatarUrl ? (
          <img
            src={account.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full border border-ink-500 object-cover"
          />
        ) : (
          <PlatformIcon platform={account.platform} size="lg" />
        )}
        <div>
          <p className="font-medium text-white">
            {account.displayName ?? account.username ?? meta.label}
          </p>
          <p className="text-sm text-muted">
            {meta.label}
            {account.accountType ? ` · ${account.accountType}` : ''}
            {account.username ? ` · @${account.username}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[account.status] ?? STATUS_STYLES.CONNECTED}`}
        >
          {account.status.replace('_', ' ')}
        </span>
        {needsReconnect && canReconnect ? (
          <button
            onClick={handleReconnect}
            disabled={loading}
            className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/20 disabled:opacity-50"
          >
            Reconnect
          </button>
        ) : (
          <button
            onClick={handleCheckHealth}
            disabled={loading}
            className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs font-medium text-muted hover:bg-ink-700 hover:text-white disabled:opacity-50"
          >
            Check
          </button>
        )}
        {canDisconnect && (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
