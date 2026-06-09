/**
 * src/pages/WorkspacesPage.tsx
 * List workspaces, create new ones, and switch active workspace.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { roleBadgeColor, Workspace } from '../lib/workspace';

export default function WorkspacesPage() {
  const {
    workspaces,
    activeWorkspace,
    selectWorkspaceById,
    createWorkspace,
    refreshWorkspaces,
  } = useWorkspace();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createWorkspace({ name: name.trim(), description: description.trim() || undefined });
      toast.success('Workspace created');
      setName('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create workspace.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Workspaces</h1>
          <p className="mt-1 text-muted">
            Organize your team and content across separate workspaces.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          {showForm ? 'Cancel' : '+ New workspace'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-xl border border-ink-500/60 bg-ink-700/60 p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="cf-label" htmlFor="ws-name">
                Workspace name
              </label>
              <input
                id="ws-name"
                className="cf-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Marketing"
                required
              />
            </div>
            <div>
              <label className="cf-label" htmlFor="ws-desc">
                Description (optional)
              </label>
              <input
                id="ws-desc"
                className="cf-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Social media for Acme Corp"
              />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="cf-btn-primary mt-4 max-w-xs">
            {submitting ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((ws) => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            isActive={ws.id === activeWorkspace?.id}
            onSelect={() => {
              selectWorkspaceById(ws.id);
              toast.success(`Switched to ${ws.name}`);
            }}
          />
        ))}
      </div>

      {workspaces.length === 0 && (
        <div className="mt-12 text-center text-muted">
          <p>No workspaces yet. Create one to get started.</p>
        </div>
      )}

      <button
        onClick={() => void refreshWorkspaces()}
        className="mt-6 text-sm text-muted hover:text-white"
      >
        Refresh list
      </button>
    </AppShell>
  );
}

function WorkspaceCard({
  workspace,
  isActive,
  onSelect,
}: {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`rounded-xl border p-5 text-left transition hover:border-brand/40 ${
        isActive ? 'border-brand/50 bg-brand/5' : 'border-ink-500/60 bg-ink-700/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white">{workspace.name}</h3>
        {isActive && (
          <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand">
            ACTIVE
          </span>
        )}
      </div>
      {workspace.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted">{workspace.description}</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${roleBadgeColor(workspace.role)}`}
        >
          {workspace.role}
        </span>
        <span className="text-xs text-muted">
          {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}
