/**
 * src/components/ConnectAccountButton.tsx
 * Initiates OAuth connect flow for a social platform.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../lib/api';
import { socialApi, SocialPlatform, PLATFORM_META } from '../lib/social';

interface Props {
  workspaceId: string;
  platform: SocialPlatform;
  disabled?: boolean;
  label?: string;
}

export function ConnectAccountButton({ workspaceId, platform, disabled, label }: Props) {
  const [loading, setLoading] = useState(false);
  const meta = PLATFORM_META[platform];

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data } = await socialApi.connect(workspaceId, platform, '/accounts');
      window.location.href = data.data.authUrl;
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Failed to connect ${meta.label}.`));
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={disabled || loading}
      className="flex items-center gap-3 rounded-xl border border-ink-500 bg-ink-800/60 px-5 py-4 text-left transition hover:border-brand/40 hover:bg-ink-700/60 disabled:opacity-50"
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: meta.color }}
      >
        {meta.icon}
      </span>
      <div>
        <p className="font-medium text-white">
          {loading ? 'Connecting…' : (label ?? `Connect ${meta.label}`)}
        </p>
        <p className="text-sm text-muted">Authorize via OAuth</p>
      </div>
    </button>
  );
}
