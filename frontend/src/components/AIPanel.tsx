/**
 * src/components/AIPanel.tsx
 * Inline AI assistant for the post composer — captions, hashtags, CTAs.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { aiApi, GenerateInput } from '../lib/ai';
import { getApiErrorMessage } from '../lib/api';

interface AIPanelProps {
  workspaceId: string;
  topic: string;
  onApplyContent: (content: string) => void;
  onApplyHashtags: (hashtags: string) => void;
  disabled?: boolean;
}

type GenerateType = 'caption' | 'post' | 'cta' | 'hashtags';

export function AIPanel({
  workspaceId,
  topic,
  onApplyContent,
  onApplyHashtags,
  disabled,
}: AIPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<GenerateType | null>(null);
  const [lastType, setLastType] = useState<GenerateType | null>(null);
  const [result, setResult] = useState('');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('instagram');

  const baseInput: GenerateInput = {
    topic: topic || 'social media marketing',
    tone,
    platform,
  };

  const generate = async (type: GenerateType) => {
    setLoading(type);
    setResult('');
    try {
      let content = '';
      switch (type) {
        case 'caption': {
          const { data } = await aiApi.generateCaption(workspaceId, baseInput);
          content = data.data.content;
          break;
        }
        case 'post': {
          const { data } = await aiApi.generatePost(workspaceId, baseInput);
          content = data.data.content;
          break;
        }
        case 'cta': {
          const { data } = await aiApi.generateCta(workspaceId, baseInput);
          content = data.data.content;
          break;
        }
        case 'hashtags': {
          const { data } = await aiApi.generateHashtags(workspaceId, baseInput);
          content = data.data.content;
          break;
        }
      }
      setResult(content);
      setLastType(type);
      toast.success('Generated!');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'AI generation failed.'));
    } finally {
      setLoading(null);
    }
  };

  const apply = () => {
    if (!result) return;
    if (lastType === 'hashtags') {
      onApplyHashtags(result);
    } else {
      onApplyContent(result);
    }
    setOpen(false);
    toast.success('Applied to post');
  };

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-brand">✨ AI Content Assistant</span>
        <span className="text-xs text-muted">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="cf-label">Tone</label>
              <select
                className="cf-input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={disabled || !!loading}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="playful">Playful</option>
                <option value="inspirational">Inspirational</option>
              </select>
            </div>
            <div>
              <label className="cf-label">Platform</label>
              <select
                className="cf-input"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={disabled || !!loading}
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['caption', 'Caption'],
                ['post', 'Full Post'],
                ['cta', 'CTAs'],
                ['hashtags', 'Hashtags'],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                type="button"
                disabled={disabled || !!loading}
                onClick={() => void generate(type)}
                className="rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
              >
                {loading === type ? 'Generating…' : label}
              </button>
            ))}
          </div>

          {result && (
            <div className="space-y-2">
              <textarea
                className="cf-input min-h-[100px] text-sm"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                readOnly={!!loading}
              />
              <button
                type="button"
                onClick={apply}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Apply to post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
