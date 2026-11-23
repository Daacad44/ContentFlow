/**
 * src/pages/CreativeStudioPage.tsx — Module 07 AI Creative Studio
 */
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { BrandKit, CreativeAsset, creativeApi } from '../lib/creative';
import { PageHeader, SubNav } from '../components/ui/ContentFlowUI';

const SUB_MENU = [
  { key: 'image', label: 'AI Image Generator' },
  { key: 'brand', label: 'Brand Kit' },
  { key: 'templates', label: 'Template Library' },
];

const STYLES = ['Realistic', '3D Render', 'Illustration', 'Minimal'];
const ASPECTS = ['1:1', '16:9', '9:16', '4:5'];

export default function CreativeStudioPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [activeTab, setActiveTab] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Realistic');
  const [aspect, setAspect] = useState('1:1');
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canCreate = permissions.includes('creative:create');
  const canManageBrand = permissions.includes('brand:manage');

  useEffect(() => {
    if (!activeWorkspace) return;
    creativeApi.listAssets(activeWorkspace.id).then(({ data }) => {
      setAssets(data.data.assets);
    }).catch(() => {});
    creativeApi.getBrandKit(activeWorkspace.id).then(({ data }) => {
      setBrandKit(data.data.brandKit);
    }).catch(() => {});
  }, [activeWorkspace]);

  const handleGenerate = async () => {
    if (!activeWorkspace || !prompt.trim()) {
      toast.error('Enter a description first.');
      return;
    }
    setGenerating(true);
    try {
      const { data } = await creativeApi.generateImage(activeWorkspace.id, {
        prompt: `${prompt.trim()} — style: ${style}, aspect: ${aspect}`,
      });
      setAssets((prev) => [data.data.asset, ...prev]);
      toast.success('Image generated!');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Generation failed.'));
    } finally {
      setGenerating(false);
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

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace to use Creative Studio.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="AI Creative Studio" />

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <SubNav items={SUB_MENU} active={activeTab} onChange={setActiveTab} />

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row">
          {activeTab === 'image' && (
            <>
              <div className="min-w-0 flex-1 space-y-4">
                <div className="cf-card space-y-4">
                  <div>
                    <label className="cf-label">Image description</label>
                    <textarea
                      className="cf-input min-h-[100px]"
                      placeholder="Describe the image you want to generate…"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="cf-label">Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStyle(s)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            style === s
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-cf-border text-cf-muted hover:border-brand/40'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="cf-label">Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                      {ASPECTS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAspect(a)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                            aspect === a
                              ? 'border-brand bg-brand text-white'
                              : 'border-cf-border text-cf-muted hover:text-cf-text'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  {canCreate && (
                    <button
                      onClick={() => void handleGenerate()}
                      disabled={generating}
                      className="cf-btn-primary"
                    >
                      {generating ? 'Generating…' : 'Generate Image'}
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-80 lg:shrink-0">
                <h3 className="mb-3 text-sm font-semibold text-cf-text">Generated Images</h3>
                <div className="grid grid-cols-2 gap-2">
                  {assets.slice(0, 4).map((asset) => (
                    <div key={asset.id} className="overflow-hidden rounded-lg border border-cf-border">
                      <img src={asset.url} alt={asset.name} className="aspect-square w-full object-cover" />
                    </div>
                  ))}
                  {assets.length === 0 && (
                    <p className="col-span-2 text-sm text-cf-muted">No images yet.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'brand' && brandKit && (
            <form onSubmit={(e) => void handleBrandSave(e)} className="max-w-lg flex-1 space-y-4">
              <div className="cf-card space-y-4">
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
                        className="h-10 w-full cursor-pointer rounded-lg border border-cf-border"
                        value={brandKit[field] ?? '#B45309'}
                        onChange={(e) => setBrandKit({ ...brandKit, [field]: e.target.value })}
                        disabled={!canManageBrand || loading}
                      />
                    </div>
                  ))}
                </div>
                {canManageBrand && (
                  <button type="submit" disabled={loading} className="cf-btn-primary">
                    {loading ? 'Saving…' : 'Save brand kit'}
                  </button>
                )}
              </div>
            </form>
          )}

          {activeTab === 'templates' && (
            <div className="flex-1">
              <p className="text-cf-muted">Template library coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
