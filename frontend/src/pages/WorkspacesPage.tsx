/**
 * src/pages/WorkspacesPage.tsx — Module 02 Workspace
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import {
  workspaceApi,
  roleBadgeColor,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
} from '../lib/workspace';
import { PageHeader, StatusBadge, Avatar, DataTable } from '../components/ui/ContentFlowUI';

const WORKSPACE_COLORS = ['#B45309', '#6366f1', '#10b981', '#ec4899'];

export default function WorkspacesPage() {
  const {
    workspaces,
    activeWorkspace,
    selectWorkspaceById,
    createWorkspace,
    canManageMembers,
  } = useWorkspace();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);

  const loadTeam = useCallback(async () => {
    if (!activeWorkspace) {
      setMembers([]);
      setInvitations([]);
      return;
    }
    try {
      const [membersRes, invRes] = await Promise.all([
        workspaceApi.listMembers(activeWorkspace.id),
        canManageMembers
          ? workspaceApi.listInvitations(activeWorkspace.id)
          : Promise.resolve({ data: { data: { invitations: [] } } }),
      ]);
      setMembers(membersRes.data.data.members);
      setInvitations(invRes.data.data.invitations);
    } catch {
      // non-blocking
    }
  }, [activeWorkspace, canManageMembers]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

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

  const teamRows = [
    ...members.map((m) => [
      <div key={m.id} className="flex items-center gap-3">
        <Avatar name={m.user.fullName} size="sm" />
        <span>{m.user.fullName}</span>
      </div>,
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${roleBadgeColor(m.role)}`}>{m.role}</span>,
      <StatusBadge variant="active">Active</StatusBadge>,
      new Date(m.joinedAt).toLocaleDateString(),
    ]),
    ...invitations.map((inv) => [
      <div key={inv.id} className="flex items-center gap-3">
        <Avatar name={inv.email} size="sm" />
        <span>{inv.email}</span>
      </div>,
      <span className="text-cf-muted">{inv.role}</span>,
      <StatusBadge variant="pending">Invited</StatusBadge>,
      '—',
    ]),
  ];

  return (
    <AppShell>
      <PageHeader
        title="Workspaces"
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="cf-btn-primary"
          >
            {showForm ? 'Cancel' : '+ Create Workspace'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="cf-card mb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="cf-label" htmlFor="ws-name">Workspace name</label>
              <input
                id="ws-name"
                className="cf-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ContentFlow Team"
                required
              />
            </div>
            <div>
              <label className="cf-label" htmlFor="ws-desc">Description (optional)</label>
              <input
                id="ws-desc"
                className="cf-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Marketing Agency"
              />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="cf-btn-primary mt-4">
            {submitting ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {workspaces.map((ws, i) => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            color={WORKSPACE_COLORS[i % WORKSPACE_COLORS.length]}
            isActive={ws.id === activeWorkspace?.id}
            onSelect={() => {
              selectWorkspaceById(ws.id);
              toast.success(`Switched to ${ws.name}`);
            }}
          />
        ))}
      </div>

      {workspaces.length === 0 && (
        <p className="mt-8 text-center text-cf-muted">No workspaces yet. Create one to get started.</p>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-cf-text">Team Members</h2>
        <DataTable
          headers={['Name', 'Role', 'Status', 'Joined']}
          rows={teamRows}
          emptyMessage={activeWorkspace ? 'No team members yet.' : 'Select a workspace to view team members.'}
        />
      </section>
    </AppShell>
  );
}

function WorkspaceCard({
  workspace,
  color,
  isActive,
  onSelect,
}: {
  workspace: Workspace;
  color: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`cf-card text-left transition hover:border-brand/40 ${
        isActive ? 'border-brand/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {workspace.name.charAt(0)}
          </span>
          <div>
            <h3 className="font-semibold text-cf-text">{workspace.name}</h3>
            <p className="text-xs text-cf-muted">
              {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="text-cf-muted hover:text-cf-text"
          onClick={(e) => e.stopPropagation()}
          aria-label="Options"
        >
          ⋯
        </button>
      </div>
    </button>
  );
}
