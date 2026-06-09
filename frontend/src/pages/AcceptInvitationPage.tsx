/**
 * src/pages/AcceptInvitationPage.tsx
 * Preview and accept/decline workspace invitations.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { workspaceApi, InvitationPreview, roleBadgeColor } from '../lib/workspace';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { user, loading: authLoading } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void workspaceApi
      .previewInvitation(token)
      .then(({ data }) => setPreview(data.data.invitation))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Invalid invitation.')))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const { data } = await workspaceApi.acceptInvitation(token);
      toast.success(`Welcome to ${data.data.workspace.name}!`);
      await refreshWorkspaces();
      navigate('/team', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to accept invitation.'));
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    try {
      await workspaceApi.declineInvitation(token);
      toast.success('Invitation declined');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to decline invitation.'));
    }
  };

  if (!token) {
    return (
      <AuthShell>
        <p className="text-muted">Missing invitation token.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-brand hover:underline">
          Go to dashboard
        </Link>
      </AuthShell>
    );
  }

  if (loading || authLoading) {
    return (
      <AuthShell>
        <p className="text-muted">Loading invitation…</p>
      </AuthShell>
    );
  }

  if (!preview) {
    return (
      <AuthShell>
        <p className="text-muted">This invitation is invalid or has expired.</p>
        <Link to="/login" className="mt-4 inline-block text-brand hover:underline">
          Sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-2xl">
          👥
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">You're invited!</h1>
        <p className="mt-2 text-sm text-muted">
          <strong className="text-white">{preview.invitedBy}</strong> invited you to join
        </p>
        <p className="mt-1 text-lg font-semibold text-white">{preview.workspace.name}</p>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase ${roleBadgeColor(preview.role)}`}
        >
          {preview.role}
        </span>
        <p className="mt-4 text-xs text-muted">
          Invitation for {preview.email} · expires{' '}
          {new Date(preview.expiresAt).toLocaleDateString()}
        </p>
      </div>

      {!user ? (
        <div className="mt-8 space-y-3">
          <p className="text-center text-sm text-muted">
            Sign in with <strong className="text-white">{preview.email}</strong> to accept.
          </p>
          <Link to={`/login?redirect=${encodeURIComponent(`/invitations/accept?token=${token}`)}`} className="cf-btn-primary">
            Sign in to accept
          </Link>
          <Link to="/register" className="cf-btn-ghost">
            Create an account
          </Link>
        </div>
      ) : user.email.toLowerCase() !== preview.email.toLowerCase() ? (
        <div className="mt-8 text-center text-sm text-red-400">
          You're signed in as {user.email}, but this invitation was sent to {preview.email}.
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <button onClick={() => void handleAccept()} disabled={accepting} className="cf-btn-primary">
            {accepting ? 'Joining…' : 'Accept invitation'}
          </button>
          <button onClick={() => void handleDecline()} className="cf-btn-ghost !text-slate-300 !bg-transparent !border-ink-500">
            Decline
          </button>
        </div>
      )}
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="cf-card w-full max-w-md">
        <Logo />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
