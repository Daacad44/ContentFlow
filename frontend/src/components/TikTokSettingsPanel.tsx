/**
 * src/components/TikTokSettingsPanel.tsx
 * TikTok post options the creator must choose on every post (TikTok Content Sharing
 * Guidelines): who can view, interactions, commercial content disclosure and consent.
 */
import { useEffect, useState } from 'react';
import { socialApi, ConnectedAccount, TikTokCreatorInfo } from '../lib/social';
import type { TikTokPrivacyLevel, TikTokSettings } from '../lib/posts';

export interface TikTokDraft {
  privacyLevel: TikTokPrivacyLevel | '';
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  discloseCommercial: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
  autoAddMusic: boolean;
  sendAsDraft: boolean;
  consentGiven: boolean;
}

/** Pre-filled so a TikTok post is ready the moment the account is selected. */
export const EMPTY_TIKTOK_DRAFT: TikTokDraft = {
  privacyLevel: 'PUBLIC_TO_EVERYONE',
  allowComment: true,
  allowDuet: true,
  allowStitch: true,
  discloseCommercial: false,
  brandOrganic: false,
  brandContent: false,
  autoAddMusic: true,
  sendAsDraft: false,
  consentGiven: true,
};

const PRIVACY_LABELS: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};

export function draftFromSettings(settings: TikTokSettings | null): TikTokDraft {
  if (!settings) return EMPTY_TIKTOK_DRAFT;
  return {
    privacyLevel: settings.privacyLevel,
    allowComment: settings.allowComment,
    allowDuet: settings.allowDuet,
    allowStitch: settings.allowStitch,
    discloseCommercial: settings.commercialContent !== 'none',
    brandOrganic: settings.commercialContent === 'brand_organic',
    brandContent: settings.commercialContent === 'brand_content',
    autoAddMusic: settings.autoAddMusic ?? false,
    sendAsDraft: settings.sendAsDraft ?? false,
    consentGiven: true,
  };
}

/** Returns an error message, or the settings to send to the API. */
export function settingsFromDraft(draft: TikTokDraft): { error: string } | { settings: TikTokSettings } {
  if (!draft.privacyLevel) return { error: 'TikTok: choose who can view this post.' };
  if (draft.discloseCommercial && !draft.brandOrganic && !draft.brandContent) {
    return { error: 'TikTok: choose "Your brand" or "Branded content", or turn off disclosure.' };
  }
  if (draft.brandContent && draft.privacyLevel === 'SELF_ONLY') {
    return { error: 'TikTok: branded content cannot be private (Only me).' };
  }
  return {
    settings: {
      privacyLevel: draft.privacyLevel,
      allowComment: draft.allowComment,
      allowDuet: draft.allowDuet,
      allowStitch: draft.allowStitch,
      commercialContent: !draft.discloseCommercial
        ? 'none'
        : draft.brandContent
          ? 'brand_content'
          : 'brand_organic',
      autoAddMusic: draft.autoAddMusic,
      sendAsDraft: draft.sendAsDraft,
      consentGiven: true,
    },
  };
}

interface Props {
  workspaceId: string;
  account: ConnectedAccount;
  mediaKind: 'video' | 'photo';
  value: TikTokDraft;
  onChange: (value: TikTokDraft) => void;
  disabled?: boolean;
}

export function TikTokSettingsPanel({ workspaceId, account, mediaKind, value, onChange, disabled }: Props) {
  const [info, setInfo] = useState<TikTokCreatorInfo | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    socialApi
      .tiktokCreatorInfo(workspaceId, account.id, mediaKind)
      .then(({ data }) => {
        if (!cancelled) setInfo(data.data.creatorInfo);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, account.id, mediaKind]);

  const set = (patch: Partial<TikTokDraft>) => onChange({ ...value, ...patch });

  // Fit the pre-filled choices to what this account allows once TikTok tells us.
  useEffect(() => {
    if (!info) return;
    const allowed = info.privacyLevels?.map((l) => l.value) ?? [];
    const settingsFor = info.postingLimits?.interactionSettings ?? {};
    const off = (key: string) => settingsFor[key]?.enabled === false;
    const patch: Partial<TikTokDraft> = {};
    if (allowed.length && !allowed.includes(value.privacyLevel as TikTokPrivacyLevel)) {
      patch.privacyLevel = (allowed.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : allowed[0]) as TikTokPrivacyLevel;
    }
    if (off('allow_comment') && value.allowComment) patch.allowComment = false;
    if (off('allow_duet') && value.allowDuet) patch.allowDuet = false;
    if (off('allow_stitch') && value.allowStitch) patch.allowStitch = false;
    if (Object.keys(patch).length) onChange({ ...value, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  const levels = (info?.privacyLevels?.map((l) => l.value) ??
    Object.keys(PRIVACY_LABELS)) as TikTokPrivacyLevel[];
  const interaction = info?.postingLimits?.interactionSettings ?? {};
  const isEnabled = (key: string) => interaction[key]?.enabled !== false;
  const nickname = info?.creator?.nickname ?? account.username ?? account.displayName ?? 'TikTok';

  const toggles: Array<{ key: 'allowComment' | 'allowDuet' | 'allowStitch'; api: string; label: string }> = [
    { key: 'allowComment', api: 'allow_comment', label: 'Comments' },
    ...(mediaKind === 'video'
      ? [
          { key: 'allowDuet' as const, api: 'allow_duet', label: 'Duet' },
          { key: 'allowStitch' as const, api: 'allow_stitch', label: 'Stitch' },
        ]
      : []),
  ];

  return (
    <div className="space-y-4 rounded-xl border border-[#FE2C55]/30 bg-ink-800/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">TikTok settings</p>
        <p className="truncate text-xs text-muted">Posting to @{nickname}</p>
      </div>

      {loadError && (
        <p className="text-xs text-amber-300">
          Could not load this account's TikTok options. Defaults are shown; TikTok may reject
          options the account does not allow.
        </p>
      )}
      {info?.creator?.canPostMore === false && (
        <p className="text-xs text-amber-300">
          This account has reached TikTok's posting limit for now. Try again later.
        </p>
      )}

      <div>
        <label className="cf-label" htmlFor="tiktok-privacy">
          Who can view this post
        </label>
        <select
          id="tiktok-privacy"
          className="cf-input"
          value={value.privacyLevel}
          onChange={(e) => set({ privacyLevel: e.target.value as TikTokPrivacyLevel })}
          disabled={disabled}
        >
          <option value="" disabled>
            Choose…
          </option>
          {levels.map((level) => (
            <option
              key={level}
              value={level}
              disabled={level === 'SELF_ONLY' && value.brandContent}
            >
              {PRIVACY_LABELS[level] ?? level}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="cf-label">Allow users to</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {toggles.map((t) => {
            const enabled = isEnabled(t.api);
            return (
              <label
                key={t.key}
                className={`flex items-center gap-2 text-sm ${enabled ? 'text-slate-200' : 'text-muted'}`}
                title={enabled ? undefined : 'Turned off in this account’s TikTok settings'}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand"
                  checked={enabled && value[t.key]}
                  onChange={(e) => set({ [t.key]: e.target.checked })}
                  disabled={disabled || !enabled}
                />
                {t.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-lg bg-ink-900/40 p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          <span aria-hidden>♪</span> Music
        </p>
        {mediaKind === 'photo' ? (
          <label className="flex items-start gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-brand"
              checked={value.autoAddMusic}
              onChange={(e) => set({ autoAddMusic: e.target.checked })}
              disabled={disabled || value.sendAsDraft}
            />
            <span>
              Add music automatically
              <span className="block text-xs text-muted">TikTok picks a recommended sound for the photos.</span>
            </span>
          </label>
        ) : (
          <p className="text-xs text-muted">
            A video keeps the sound in its file. To post with a TikTok sound, record the music into
            the video, or send it to the TikTok app below and pick a sound there.
          </p>
        )}
        <label className="flex items-start gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-brand"
            checked={value.sendAsDraft}
            onChange={(e) => set({ sendAsDraft: e.target.checked })}
            disabled={disabled}
          />
          <span>
            Send to TikTok app to choose a sound
            <span className="block text-xs text-muted">
              Goes to your TikTok inbox as a draft. Open TikTok, add any trending sound, then post.
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand"
            checked={value.discloseCommercial}
            onChange={(e) =>
              set({
                discloseCommercial: e.target.checked,
                ...(e.target.checked ? {} : { brandOrganic: false, brandContent: false }),
              })
            }
            disabled={disabled}
          />
          Disclose post content (promotes a brand, product or service)
        </label>
        {value.discloseCommercial && (
          <div className="space-y-2 pl-6">
            <label className="flex items-start gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-brand"
                checked={value.brandOrganic}
                onChange={(e) => set({ brandOrganic: e.target.checked })}
                disabled={disabled}
              />
              <span>
                Your brand
                <span className="block text-xs text-muted">Labelled “Promotional content”.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-brand"
                checked={value.brandContent}
                onChange={(e) =>
                  set({
                    brandContent: e.target.checked,
                    ...(e.target.checked && value.privacyLevel === 'SELF_ONLY'
                      ? { privacyLevel: '' }
                      : {}),
                  })
                }
                disabled={disabled}
              />
              <span>
                Branded content
                <span className="block text-xs text-muted">
                  Labelled “Paid partnership”. Cannot be private.
                </span>
              </span>
            </label>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        <span>
          By posting, I agree to TikTok's{' '}
          {value.brandContent && (
            <>
              <a
                href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                target="_blank"
                rel="noreferrer"
                className="text-slate-200 underline"
              >
                Branded Content Policy
              </a>{' '}
              and{' '}
            </>
          )}
          <a
            href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
            target="_blank"
            rel="noreferrer"
            className="text-slate-200 underline"
          >
            Music Usage Confirmation
          </a>
          .
        </span>
      </p>

      <p className="text-xs text-muted">
        After publishing, TikTok can take a few minutes to process the post before it appears
        on your profile.
      </p>
    </div>
  );
}
