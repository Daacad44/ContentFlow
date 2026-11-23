/**
 * src/components/PlatformSelector.tsx
 * Multi-select connected accounts for post targeting.
 */
import { ConnectedAccount, PLATFORM_META } from '../lib/social';
import { PlatformIcon } from './PlatformIcon';

interface PlatformSelectorProps {
  accounts: ConnectedAccount[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function PlatformSelector({
  accounts,
  selectedIds,
  onChange,
  disabled,
}: PlatformSelectorProps) {
  const connected = accounts.filter((a) => a.status === 'CONNECTED');

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (connected.length === 0) {
    return (
      <p className="text-sm text-muted">
        No connected accounts. Connect platforms on the Accounts page first.
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {connected.map((account) => {
        const meta = PLATFORM_META[account.platform];
        const selected = selectedIds.includes(account.id);
        return (
          <button
            key={account.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(account.id)}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
              selected
                ? 'border-brand/60 bg-brand/10'
                : 'border-ink-500 bg-ink-800/40 hover:border-ink-400'
            } disabled:opacity-50`}
          >
            <PlatformIcon platform={account.platform} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {account.displayName ?? account.username ?? meta.label}
              </p>
              <p className="text-xs text-muted">{meta.label}</p>
            </div>
            <span
              className={`h-5 w-5 shrink-0 rounded-md border ${
                selected ? 'border-brand bg-brand' : 'border-ink-400'
              }`}
            >
              {selected && (
                <svg viewBox="0 0 20 20" fill="white" className="h-full w-full p-0.5">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
