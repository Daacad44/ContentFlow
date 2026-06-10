/**
 * src/pages/CreativeStudioPage.tsx
 * AI Creative Studio — image generation, posters, banners, brand kit.
 */
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import {
  BrandKit,
  CreativeAsset,
  CreativeType,
  creativeApi,
} from '../lib/creative';

type Tab = 'generate' | 'gallery' | 'brand';

const GENERATE_TYPES: { type: CreativeType; label: string; fn: keyof typeof creativeApi }[] = [
  { type: 'IMAGE', label: 'Image', fn: 'generateImage' },
  { type: 'POSTER', label: 'Poster', fn: 'generatePoster' },
  { type: 'BANNER', label: 'Banner', fn: 'generateBanner' },
  { type: 'AD', label: 'Product Ad', fn: 'generateAd' },
  { type: 'SOCIAL_CREATIVE', label: 'Social Creative', fn: 'generateSocial' },
];

export default function CreativeStudioPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [tab, setTab] = useState<Tab>('generate');
  const [prompt, setPrompt] = useState('');
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<CreativeType | null>(null);

  const canCreate = permissions.includes('creative:create');
  const canManageBrand = permissions.includes('brand:manage');

  const loadAssets = async () => {
    if (!activeWorkspace) return;
    const { data } = await creativeApi.listAssets(activeWorkspace.id);
    setAssets(data.data.assets);
  };

  const loadBrandKit = async () => {
    if (!activeWorkspace) return;
    const { data } = await creativeApi.getBrandKit(activeWorkspace.id);
    setBrandKit(data.data.brandKit);
  };

  useEffect(() => {
    if (!activeWorkspace) return;
    loadAssets().catch(() => {});
    loadBrandKit().catch(() => {});
  }, [activeWorkspace]);

  const handleGenerate = async (type: CreativeType) => {
    if (!activeWorkspace || !prompt.trim()) {
      toast.error('Enter a prompt first.');
      return;
    }
    setGenerating(type);
    try {
      const entry = GENERATE_TYPES.find((g) => g.type === type)!;
      const fn = creativeApi[entry.fn] as (
        wsId: string,
        input: { prompt: string },
      ) => ReturnType<typeof creativeApi.generateImage>;
      const { data } = await fn(activeWorkspace.id, { prompt: prompt.trim() });
      setAssets((prev) => [data.data.asset, ...prev]);
      toast.success(`${entry.label} generated!`);
      setTab('gallery');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Generation failed.'));
    } finally {
      setGenerating(null);
    }
  };

  const handleBrandSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !brandKit) return;
    setLoading(true);
    try {
      const { data } = await creativeApi.updateBrandKit(activeWorkspace.id, {
        name: brandKit.name,
        primaryColor: brandKit.primaryColor ?? undefined,
        secondaryColor: brandKit.secondaryColor ?? undefined,
        accentColor: brandKit.accentColor ?? undefined,
        fontHeading: brandKit.fontHeading ?? undefined,
        fontBody: brandKit.fontBody ?? undefined,
        logoUrl: brandKit.logoUrl ?? undefined,
      });
      setBrandKit(data.data.brandKit);
      toast.success('Brand kit saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save brand kit.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!activeWorkspace) return;
    try {
      await creativeApi.deleteAsset(activeWorkspace.id, assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      toast.success('Asset deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed.'));
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace to use Creative Studio.</p>
      </AppShell>
    );
  }

  if (!canCreate && !permissions.includes('creative:read')) {
    return (
      <AppShell>
        <p className="text-muted">You do not have permission to access Creative Studio.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Creative Studio</h1>
          <p className="mt-1 text-sm text-muted">
            Generate AI images, posters, banners, and ads. Manage your brand kit.
          </p>
        </div>

        <div className="flex gap-2 border-b border-ink-500/60 pb-2">
          {(['generate', 'gallery', 'brand'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                tab === t ? 'bg-brand/15 text-brand' : 'text-muted hover:text-white'
              }`}
            >
              {t === 'brand' ? 'Brand Kit' : t}
            </button>
          ))}
        </div>

        {tab === 'generate' && canCreate && (
          <div className="space-y-4">
            <div>
              <label className="cf-label">Prompt</label>
              <textarea
                className="cf-input min-h-[100px]"
                placeholder="Describe the creative you want to generate…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {GENERATE_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  disabled={!!generating}
                  onClick={() => void handleGenerate(type)}
                  className="rounded-xl border border-ink-500 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-ink-700 disabled:opacity-50"
                >
                  {generating === type ? 'Generating…' : label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'gallery' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <div key={asset.id} className="overflow-hidden rounded-xl border border-ink-500/60 bg-ink-800/30">
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">{asset.name}</span>
                    <span className="text-xs text-muted">{asset.type}</span>
                  </div>
                  {canCreate && (
                    <button
                      onClick={() => void handleDelete(asset.id)}
                      className="mt-2 text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {assets.length === 0 && (
              <p className="col-span-full text-muted">No creatives yet. Generate your first asset!</p>
            )}
          </div>
        )}

        {tab === 'brand' && brandKit && (
          <form onSubmit={(e) => void handleBrandSave(e)} className="max-w-lg space-y-4">
            <div>
              <label className="cf-label">Brand name</label>
              <input
                className="cf-input"
                value={brandKit.name}
                onChange={(e) => setBrandKit({ ...brandKit, name: e.target.value })}
                disabled={!canManageBrand || loading}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((field) => (
                <div key={field}>
                  <label className="cf-label capitalize">{field.replace('Color', ' color')}</label>
                  <input
                    type="color"
                    className="h-10 w-full cursor-pointer rounded-lg border border-ink-500"
                    value={brandKit[field] ?? '#6366f1'}
                    onChange={(e) => setBrandKit({ ...brandKit, [field]: e.target.value })}
                    disabled={!canManageBrand || loading}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="cf-label">Heading font</label>
                <input
                  className="cf-input"
                  placeholder="Inter, Arial…"
                  value={brandKit.fontHeading ?? ''}
                  onChange={(e) => setBrandKit({ ...brandKit, fontHeading: e.target.value })}
                  disabled={!canManageBrand || loading}
                />
              </div>
              <div>
                <label className="cf-label">Body font</label>
                <input
                  className="cf-input"
                  placeholder="Inter, Georgia…"
                  value={brandKit.fontBody ?? ''}
                  onChange={(e) => setBrandKit({ ...brandKit, fontBody: e.target.value })}
                  disabled={!canManageBrand || loading}
                />
              </div>
            </div>
            <div>
              <label className="cf-label">Logo URL</label>
              <input
                className="cf-input"
                placeholder="https://…"
                value={brandKit.logoUrl ?? ''}
                onChange={(e) => setBrandKit({ ...brandKit, logoUrl: e.target.value })}
                disabled={!canManageBrand || loading}
              />
            </div>
            {canManageBrand && (
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save brand kit'}
              </button>
            )}
          </form>
        )}
      </div>
    </AppShell>
  );
}
