/**
 * src/components/ProtectedRoute.tsx
 * Guards routes. Redirects unauthenticated users to /login and optionally
 * enforces a minimum role for RBAC-protected pages.
 */
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, Role } from '../context/AuthContext';

const RANK: Record<Role, number> = { USER: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export function ProtectedRoute({
  children,
  minRole,
}: {
  children: ReactNode;
  minRole?: Role;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (minRole && RANK[user.role] < RANK[minRole]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
