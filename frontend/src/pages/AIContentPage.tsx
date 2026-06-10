/**
 * src/pages/AIContentPage.tsx — Module 06 AI Content Generator
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { aiApi, GenerateInput } from '../lib/ai';
import { PageHeader, SubNav } from '../components/ui/ContentFlowUI';

const SUB_MENU = [
  { key: 'post', label: 'Post Generator' },
  { key: 'hashtag', label: 'Hashtag Generator' },
  { key: 'cta', label: 'CTA Generator' },
  { key: 'calendar', label: 'Content Calendar' },
];

export default function AIContentPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [activeTab, setActiveTab] = useState('post');
  const [input, setInput] = useState<GenerateInput>({
    topic: '',
    tone: 'professional',
    platform: 'instagram',
  });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const canGenerate = permissions.includes('ai:generate');

  const handleGenerate = async () => {
    if (!activeWorkspace || !input.topic.trim()) {
      toast.error('Enter a topic first.');
      return;
    }
    setLoading(true);
    setResult('');
    try {
      const fn = {
        post: aiApi.generatePost,
        hashtag: aiApi.generateHashtags,
        cta: aiApi.generateCta,
        calendar: aiApi.generateCaption,
      }[activeTab as 'post' | 'hashtag' | 'cta' | 'calendar'];
      const { data } = await fn(activeWorkspace.id, input);
      setResult(data.data.content);
      toast.success('Content generated!');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Generation failed.'));
    } finally {
      setLoading(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace to use AI content tools.</p>
      </AppShell>
    );
  }

  if (!canGenerate) {
    return (
      <AppShell>
        <p className="text-cf-muted">You do not have permission to use AI content tools.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="AI Content Generator" />

      <div className="flex gap-6">
        <SubNav items={SUB_MENU} active={activeTab} onChange={setActiveTab} />

        <div className="flex-1 space-y-6">
          <div className="cf-card space-y-4">
            <div>
              <label className="cf-label">What do you want to write about?</label>
              <textarea
                className="cf-input min-h-[120px]"
                placeholder="Describe your topic, product, or campaign…"
                value={input.topic}
                onChange={(e) => setInput({ ...input, topic: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="cf-label">Tone</label>
                <select
                  className="cf-input"
                  value={input.tone}
                  onChange={(e) => setInput({ ...input, tone: e.target.value })}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="playful">Playful</option>
                  <option value="inspirational">Inspirational</option>
                </select>
              </div>
              <div>
                <label className="cf-label">Language</label>
                <select className="cf-input" defaultValue="en">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="cf-btn-primary"
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>

          <div className="cf-card">
            <h3 className="mb-3 text-sm font-semibold text-cf-text">Generated Posts</h3>
            {result ? (
              <>
                <p className="whitespace-pre-wrap text-sm text-cf-muted">{result}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(result);
                      toast.success('Copied!');
                    }}
                    className="cf-btn-outline px-3 py-1.5 text-xs"
                  >
                    Copy
                  </button>
                  <button className="cf-btn-secondary px-3 py-1.5 text-xs">Save</button>
                </div>
              </>
            ) : (
              <p className="text-sm text-cf-muted">Generated content will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
