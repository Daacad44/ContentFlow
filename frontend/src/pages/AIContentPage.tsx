/**
 * src/pages/AIContentPage.tsx
 * AI content generation hub — captions, posts, CTAs, hashtags, calendars, templates.
 */
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { aiApi, CalendarEntry, ContentTemplate, GenerateInput } from '../lib/ai';

type Tab = 'generate' | 'calendar' | 'templates';

export default function AIContentPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [tab, setTab] = useState<Tab>('generate');
  const [input, setInput] = useState<GenerateInput>({ topic: '', tone: 'professional', platform: 'instagram' });
  const [result, setResult] = useState('');
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  const canGenerate = permissions.includes('ai:generate');

  useEffect(() => {
    if (!activeWorkspace || !canGenerate) return;
    aiApi.listTemplates(activeWorkspace.id).then(({ data }) => {
      setTemplates(data.data.templates);
    }).catch(() => {});
  }, [activeWorkspace, canGenerate]);

  const handleGenerate = async (type: 'caption' | 'post' | 'cta' | 'hashtags') => {
    if (!activeWorkspace || !input.topic.trim()) {
      toast.error('Enter a topic first.');
      return;
    }
    setLoading(true);
    setResult('');
    try {
      const fn = {
        caption: aiApi.generateCaption,
        post: aiApi.generatePost,
        cta: aiApi.generateCta,
        hashtags: aiApi.generateHashtags,
      }[type];
      const { data } = await fn(activeWorkspace.id, input);
      setResult(data.data.content);
      toast.success('Content generated!');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Generation failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCalendar = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !input.topic.trim()) return;
    setLoading(true);
    try {
      const { data } = await aiApi.generateCalendar(activeWorkspace.id, { ...input, days });
      setCalendar(data.data.calendar);
      toast.success('Calendar generated!');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Calendar generation failed.'));
    } finally {
      setLoading(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace to use AI content tools.</p>
      </AppShell>
    );
  }

  if (!canGenerate) {
    return (
      <AppShell>
        <p className="text-muted">You do not have permission to use AI content tools.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Content Studio</h1>
          <p className="mt-1 text-sm text-muted">
            Generate captions, posts, CTAs, hashtags, and content calendars with Gemini 2.5.
          </p>
        </div>

        <div className="flex gap-2 border-b border-ink-500/60 pb-2">
          {(['generate', 'calendar', 'templates'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                tab === t ? 'bg-brand/15 text-brand' : 'text-muted hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="cf-label">Topic / Theme</label>
            <input
              className="cf-input"
              placeholder="e.g. Summer product launch"
              value={input.topic}
              onChange={(e) => setInput({ ...input, topic: e.target.value })}
            />
          </div>
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
        </div>

        {tab === 'generate' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['caption', 'post', 'cta', 'hashtags'] as const).map((type) => (
                <button
                  key={type}
                  disabled={loading}
                  onClick={() => void handleGenerate(type)}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 capitalize"
                >
                  {loading ? 'Generating…' : `Generate ${type}`}
                </button>
              ))}
            </div>
            {result && (
              <textarea className="cf-input min-h-[200px]" value={result} readOnly />
            )}
          </div>
        )}

        {tab === 'calendar' && (
          <form onSubmit={(e) => void handleCalendar(e)} className="space-y-4">
            <div>
              <label className="cf-label">Days</label>
              <input
                type="number"
                min={1}
                max={30}
                className="cf-input w-32"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate content calendar'}
            </button>
            {calendar.length > 0 && (
              <div className="space-y-3">
                {calendar.map((entry, i) => (
                  <div key={i} className="rounded-xl border border-ink-500/60 bg-ink-800/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-brand">{entry.date}</span>
                      <span className="text-xs text-muted">{entry.platform}</span>
                    </div>
                    <h3 className="mt-1 font-semibold text-white">{entry.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{entry.content}</p>
                    <p className="mt-2 text-xs text-muted">{entry.hashtags}</p>
                  </div>
                ))}
              </div>
            )}
          </form>
        )}

        {tab === 'templates' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-ink-500/60 bg-ink-800/30 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{t.name}</h3>
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
                    {t.type}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted line-clamp-3">{t.content}</p>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-muted">No templates yet. Default templates are seeded on first visit.</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
