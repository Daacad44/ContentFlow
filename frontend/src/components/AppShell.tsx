/**
 * src/components/AppShell.tsx
 * Authenticated app layout with left sidebar navigation per ContentFlow design.
 */
import { ReactNode } from 'react';
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
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-cf-border bg-cf-navy-900">
        <div className="border-b border-cf-border px-5 py-5">
          <Link to="/workspaces">
            <Logo size="sm" />
          </Link>
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
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-cf-border bg-cf-bg/95 px-6 py-3 backdrop-blur">
          <NotificationBell />
          <WorkspaceSwitcher />
          <span className="hidden text-sm text-cf-muted lg:inline">{user?.email}</span>
          <button onClick={handleLogout} className="cf-btn-outline px-3 py-1.5 text-xs">
            Logout
          </button>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
