/**
 * src/pages/WorkspaceSettingsPage.tsx
 * Workspace settings, permissions overview, and danger zone.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { workspaceApi, WORKSPACE_ROLES } from '../lib/workspace';

export default function WorkspaceSettingsPage() {
  const navigate = useNavigate();
  const {
    activeWorkspace,
    canEditSettings,
    canDeleteWorkspace,
    refreshWorkspaces,
    permissions,
  } = useWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setDescription(activeWorkspace.description ?? '');
    }
  }, [activeWorkspace]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setSaving(true);
    try {
      await workspaceApi.update(activeWorkspace.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      toast.success('Settings saved');
      await refreshWorkspaces();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!activeWorkspace) return;
    if (!confirm(`Leave ${activeWorkspace.name}?`)) return;
    try {
      await workspaceApi.leave(activeWorkspace.id);
      toast.success('You left the workspace');
      await refreshWorkspaces();
      navigate('/workspaces');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to leave workspace.'));
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspace) return;
    if (!confirm(`Permanently delete "${activeWorkspace.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await workspaceApi.remove(activeWorkspace.id);
      toast.success('Workspace deleted');
      await refreshWorkspaces();
      navigate('/workspaces');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete workspace.'));
    } finally {
      setDeleting(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <div className="rounded-xl border border-dashed border-ink-500/60 py-16 text-center text-muted">
          Select or create a workspace to manage settings.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-extrabold text-white">Workspace Settings</h1>
        <p className="mt-1 text-muted">
          Configure <strong className="text-white">{activeWorkspace.name}</strong>
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {canEditSettings ? (
            <form
              onSubmit={handleSave}
              className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-6"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                General
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="cf-label" htmlFor="settings-name">
                    Workspace name
                  </label>
                  <input
                    id="settings-name"
                    className="cf-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="cf-label" htmlFor="settings-desc">
                    Description
                  </label>
                  <textarea
                    id="settings-desc"
                    className="cf-input min-h-[100px] resize-y"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this workspace for?"
                  />
                </div>
                <p className="text-xs text-muted">
                  Slug: <code className="text-slate-300">{activeWorkspace.slug}</code>
                </p>
              </div>
              <button type="submit" disabled={saving} className="cf-btn-primary mt-6 max-w-xs">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-6 text-muted">
              You have view-only access to this workspace. Contact an admin to change settings.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Your permissions
            </h2>
            <p className="mt-2 text-sm text-white">
              Role: <span className="font-semibold text-brand">{activeWorkspace.role}</span>
            </p>
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs text-muted">
              {permissions.map((p) => (
                <li key={p} className="font-mono">
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Role reference
            </h2>
            <ul className="mt-3 space-y-3">
              {WORKSPACE_ROLES.map((r) => (
                <li key={r.value}>
                  <p className="text-sm font-medium text-white">{r.label}</p>
                  <p className="text-xs text-muted">{r.description}</p>
                </li>
              ))}
              <li>
                <p className="text-sm font-medium text-brand">Owner</p>
                <p className="text-xs text-muted">Full control including deletion</p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <section className="mt-10 rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">
          Danger zone
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {activeWorkspace.role !== 'OWNER' && (
            <button
              onClick={() => void handleLeave()}
              className="rounded-lg border border-ink-500 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-ink-700"
            >
              Leave workspace
            </button>
          )}
          {canDeleteWorkspace && (
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete workspace'}
            </button>
          )}
        </div>
      </section>
    </AppShell>
  );
}
