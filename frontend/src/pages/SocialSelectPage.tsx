/**
 * src/pages/SocialSelectPage.tsx
 * Headless OAuth — select Facebook page or LinkedIn organization.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { getApiErrorMessage } from '../lib/api';
import { socialApi, SocialPlatform, PLATFORM_META } from '../lib/social';

export default function SocialSelectPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  const workspaceId = searchParams.get('workspaceId') ?? '';
  const platform = (searchParams.get('platform') ?? '') as SocialPlatform;
  const profileId = searchParams.get('profileId') ?? '';
  const tempToken = searchParams.get('tempToken') ?? '';
  const connectToken = searchParams.get('connectToken') ?? undefined;
  const userProfileRaw = searchParams.get('userProfile') ?? '{}';
  const step = searchParams.get('step') ?? '';

  const meta = PLATFORM_META[platform];
  const isOrg = step === 'select_organization';

  useEffect(() => {
    if (!workspaceId || !platform || !tempToken) {
      toast.error('Invalid selection session.');
      navigate('/accounts', { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await socialApi.listSelection(workspaceId, {
          platform,
          profileId,
          tempToken,
          connectToken,
        });
        setItems(data.data.items);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load options.'));
        navigate('/accounts', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, platform, profileId, tempToken, connectToken, navigate]);

  const handleSelect = async (itemId: string) => {
    setSelecting(true);
    try {
      let userProfile: Record<string, unknown> = {};
      try {
        userProfile = JSON.parse(userProfileRaw);
      } catch {
        userProfile = {};
      }

      await socialApi.completeSelection(workspaceId, {
        platform,
        profileId,
        itemId,
        tempToken,
        connectToken,
        userProfile,
      });

      toast.success('Account connected!');
      navigate('/accounts?connected=true', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to connect account.'));
      setSelecting(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Select {isOrg ? 'organization' : 'page'}
          </h1>
          <p className="mt-1 text-muted">
            Choose which {meta?.label ?? platform} {isOrg ? 'organization' : 'page'} to connect.
          </p>
        </div>

        {loading ? (
          <p className="text-muted">Loading options…</p>
        ) : items.length === 0 ? (
          <p className="text-muted">No options available. Try reconnecting.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                disabled={selecting}
                className="flex w-full items-center justify-between rounded-xl border border-ink-500 bg-ink-800/40 px-5 py-4 text-left transition hover:border-brand/40 hover:bg-ink-700/60 disabled:opacity-50"
              >
                <span className="font-medium text-white">{item.name}</span>
                <span className="text-sm text-brand">{selecting ? '…' : 'Select'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
