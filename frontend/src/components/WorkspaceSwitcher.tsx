/**
 * src/components/WorkspaceSwitcher.tsx
 * Dropdown to switch between workspaces or create a new one.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { roleBadgeColor } from '../lib/workspace';

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, selectWorkspaceById, loading } = useWorkspace();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-9 w-40 animate-pulse rounded-lg bg-ink-700" aria-hidden />
    );
  }

  if (!activeWorkspace) {
    return (
      <button
        onClick={() => navigate('/workspaces')}
        className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand"
      >
        Create workspace
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-2 rounded-lg border border-ink-500 bg-ink-800/70 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-ink-700 sm:px-3"
      >
        <span className="max-w-[110px] truncate sm:max-w-[160px]">{activeWorkspace.name}</span>
        <span
          className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase sm:inline ${roleBadgeColor(activeWorkspace.role)}`}
        >
          {activeWorkspace.role}
        </span>
        <span className="text-muted">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-ink-500 bg-ink-800 py-1 shadow-xl">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Your workspaces
            </p>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  selectWorkspaceById(ws.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-700 ${
                  ws.id === activeWorkspace.id ? 'text-brand' : 'text-white'
                }`}
              >
                <span className="truncate">{ws.name}</span>
                <span className="text-xs text-muted">{ws.memberCount}</span>
              </button>
            ))}
            <div className="my-1 border-t border-ink-500" />
            <button
              onClick={() => {
                setOpen(false);
                navigate('/workspaces');
              }}
              className="w-full px-3 py-2 text-left text-sm text-brand hover:bg-ink-700"
            >
              + Manage workspaces
            </button>
          </div>
        </>
      )}
    </div>
  );
}
