/**
 * src/components/AppShell.tsx
 * Authenticated app layout with workspace switcher and navigation.
 */
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Logo } from './Logo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/workspaces', label: 'Workspaces' },
  { to: '/team', label: 'Team' },
  { to: '/workspace/settings', label: 'Settings' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-500/60 bg-ink-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/dashboard">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => {
                const active =
                  location.pathname === item.to ||
                  (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'bg-brand/15 text-brand'
                        : 'text-muted hover:bg-ink-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <WorkspaceSwitcher />
            <span className="hidden text-sm text-muted lg:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-ink-500 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-ink-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
