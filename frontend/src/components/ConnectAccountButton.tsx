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
  hint?: string;
}

export function ConnectAccountButton({ workspaceId, platform, disabled, label, hint }: Props) {
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
      type="button"
      onClick={handleConnect}
      disabled={disabled || loading}
      className="flex w-full items-center gap-3 rounded-lg border border-cf-border bg-cf-navy-900 px-5 py-4 text-left transition hover:border-brand/40 hover:bg-cf-navy-800 disabled:opacity-50"
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: meta.color }}
      >
        {meta.icon}
      </span>
      <div>
        <p className="font-medium text-cf-text">
          {loading ? 'Connecting…' : (label ?? `Connect ${meta.label}`)}
        </p>
        <p className="text-sm text-cf-muted">{hint ?? 'Sign in and choose the account'}</p>
      </div>
    </button>
  );
}
