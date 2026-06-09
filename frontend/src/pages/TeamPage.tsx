/**
 * src/pages/TeamPage.tsx
 * Team members, invitations, and member management.
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import {
  workspaceApi,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceRole,
  WORKSPACE_ROLES,
  roleBadgeColor,
} from '../lib/workspace';

export default function TeamPage() {
  const { activeWorkspace, canManageMembers, refreshWorkspaces } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!activeWorkspace) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [membersRes, invRes] = await Promise.all([
        workspaceApi.listMembers(activeWorkspace.id),
        canManageMembers
          ? workspaceApi.listInvitations(activeWorkspace.id)
          : Promise.resolve({ data: { data: { invitations: [] } } }),
      ]);
      setMembers(membersRes.data.data.members);
      setInvitations(invRes.data.data.invitations);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load team.'));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, canManageMembers]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await workspaceApi.invite(activeWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success('Invitation sent');
      setInviteEmail('');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to send invitation.'));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: WorkspaceRole) => {
    if (!activeWorkspace) return;
    try {
      await workspaceApi.updateMemberRole(activeWorkspace.id, memberId, role);
      toast.success('Role updated');
      await load();
      await refreshWorkspaces();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update role.'));
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!activeWorkspace) return;
    if (!confirm(`Remove ${name} from this workspace?`)) return;
    try {
      await workspaceApi.removeMember(activeWorkspace.id, memberId);
      toast.success('Member removed');
      await load();
      await refreshWorkspaces();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to remove member.'));
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!activeWorkspace) return;
    try {
      await workspaceApi.revokeInvitation(activeWorkspace.id, invitationId);
      toast.success('Invitation revoked');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to revoke invitation.'));
    }
  };

  const handleResend = async (invitationId: string) => {
    if (!activeWorkspace) return;
    try {
      await workspaceApi.resendInvitation(activeWorkspace.id, invitationId);
      toast.success('Invitation resent');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to resend invitation.'));
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <EmptyState message="Select or create a workspace to manage your team." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-extrabold text-white">Team</h1>
        <p className="mt-1 text-muted">
          Manage members and invitations for <strong className="text-white">{activeWorkspace.name}</strong>
        </p>
      </div>

      {canManageMembers && (
        <form
          onSubmit={handleInvite}
          className="mt-8 rounded-xl border border-ink-500/60 bg-ink-700/60 p-5"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Invite member
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              className="cf-input flex-1"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <select
              className="cf-input sm:max-w-[160px]"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
            >
              {WORKSPACE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">
          Members ({members.length})
        </h2>
        {loading ? (
          <p className="mt-4 text-muted">Loading…</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-ink-500/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-800/80 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  {canManageMembers && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-500/40">
                {members.map((m) => (
                  <tr key={m.id} className="bg-ink-700/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{m.user.fullName}</p>
                      <p className="text-xs text-muted">{m.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {canManageMembers && m.role !== 'OWNER' ? (
                        <select
                          className="rounded-lg border border-ink-500 bg-ink-800 px-2 py-1 text-xs"
                          value={m.role}
                          onChange={(e) =>
                            void handleRoleChange(m.id, e.target.value as WorkspaceRole)
                          }
                        >
                          {WORKSPACE_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${roleBadgeColor(m.role)}`}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    {canManageMembers && (
                      <td className="px-4 py-3 text-right">
                        {m.role !== 'OWNER' && (
                          <button
                            onClick={() => void handleRemove(m.id, m.user.fullName)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canManageMembers && invitations.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">
            Pending invitations ({invitations.length})
          </h2>
          <div className="mt-4 space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-500/60 bg-ink-700/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{inv.email}</p>
                  <p className="text-xs text-muted">
                    {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleResend(inv.id)}
                    className="rounded-lg border border-ink-500 px-3 py-1 text-xs text-slate-200 hover:bg-ink-700"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => void handleRevokeInvite(inv.id)}
                    className="rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-500/60 py-16 text-center text-muted">
      {message}
    </div>
  );
}
