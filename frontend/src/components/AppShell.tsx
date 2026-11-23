/**
 * src/components/AppShell.tsx
 * Authenticated app layout with left sidebar navigation per ContentFlow design.
 */
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Logo } from './Logo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import {
  IconWorkspace,
  IconAccounts,
  IconScheduler,
  IconPublishing,
  IconAIContent,
  IconStudio,
  IconAnalytics,
  IconNotifications,
  IconBilling,
  IconAdmin,
  IconActivity,
  IconSettings,
} from './icons/SidebarIcons';

const NAV = [
  { to: '/workspaces', label: 'Workspace', icon: IconWorkspace },
  { to: '/accounts', label: 'Social Accounts', icon: IconAccounts },
  { to: '/scheduler', label: 'Scheduler', icon: IconScheduler },
  { to: '/publishing', label: 'Publishing Engine', icon: IconPublishing },
  { to: '/ai-content', label: 'AI Content Generator', icon: IconAIContent },
  { to: '/studio', label: 'AI Creative Studio', icon: IconStudio },
  { to: '/analytics', label: 'Analytics', icon: IconAnalytics },
  { to: '/notifications', label: 'Notifications', icon: IconNotifications },
  { to: '/billing', label: 'Billing', icon: IconBilling },
  { to: '/admin', label: 'Admin Panel', icon: IconAdmin, adminOnly: true },
  { to: '/activity-logs', label: 'Activity Logs', icon: IconActivity },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock page scroll while the drawer is open on small screens.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login', { replace: true });
  };

  const isActive = (to: string) => {
    if (to === '/workspaces') {
      return (
        location.pathname === '/workspaces' ||
        location.pathname === '/team' ||
        location.pathname.startsWith('/workspace')
      );
    }
    if (to === '/admin') {
      return location.pathname.startsWith('/admin');
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <div className="flex min-h-screen bg-cf-bg">
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-cf-border bg-cf-navy-900 transition-transform duration-200 ease-out lg:w-60 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-cf-border px-5 py-4 lg:py-5">
          <Link to="/workspaces">
            <Logo size="sm" />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="-mr-2 rounded-lg p-2 text-cf-muted hover:bg-cf-navy-800 hover:text-cf-text lg:hidden"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-brand text-white'
                    : 'text-cf-muted hover:bg-cf-navy-800 hover:text-cf-text'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-cf-border px-3 py-4">
          <p className="mb-2 truncate px-3 text-xs text-cf-muted lg:hidden">{user?.email}</p>
          <Link
            to="/workspace/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              location.pathname === '/workspace/settings'
                ? 'bg-brand text-white'
                : 'text-cf-muted hover:bg-cf-navy-800 hover:text-cf-text'
            }`}
          >
            <IconSettings className="h-5 w-5 shrink-0" />
            Settings
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-cf-muted transition hover:bg-cf-navy-800 hover:text-cf-text sm:hidden"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-cf-border bg-cf-bg/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-6 sm:py-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-cf-text hover:bg-cf-navy-800 lg:hidden"
            aria-label="Open menu"
            aria-controls="app-sidebar"
            aria-expanded={menuOpen}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Link to="/workspaces" className="shrink-0 lg:hidden" aria-label="ContentFlow home">
            <Logo size="sm" textClassName="hidden min-[420px]:inline" />
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <WorkspaceSwitcher />
            <span className="hidden text-sm text-cf-muted xl:inline">{user?.email}</span>
            <button onClick={handleLogout} className="cf-btn-outline hidden px-3 py-1.5 text-xs sm:flex">
              Logout
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
