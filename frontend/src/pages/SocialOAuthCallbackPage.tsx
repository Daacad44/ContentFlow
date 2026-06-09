/**
 * src/pages/SocialOAuthCallbackPage.tsx
 * Handles redirect after social OAuth selection completes.
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';

export default function SocialOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const workspaceId = searchParams.get('workspaceId');
    navigate(`/accounts?connected=true${workspaceId ? `&workspaceId=${workspaceId}` : ''}`, {
      replace: true,
    });
  }, [searchParams, navigate]);

  return (
    <AppShell>
      <p className="text-muted">Completing connection…</p>
    </AppShell>
  );
}
