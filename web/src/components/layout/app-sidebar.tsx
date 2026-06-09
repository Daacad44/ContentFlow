'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { SidebarLogo } from '@/components/brand/logo';
import { Switch } from '@/components/ui/switch';
import { AUTH_NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(true);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-surface-darkest px-4 py-5">
      {/* Logo */}
      <div className="px-2">
        <SidebarLogo />
      </div>

      {/* Navigation */}
      <nav className="mt-8 flex-1 overflow-y-auto scrollbar-thin">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Authentication
        </p>
        <ul className="mt-3 space-y-1">
          {AUTH_NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-primary/15 text-white ring-1 ring-primary/30'
                      : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px]',
                      active ? 'text-primary' : 'text-muted-foreground group-hover:text-white',
                    )}
                  />
                  <span>
                    <span className="font-semibold text-primary">{item.index}</span>{' '}
                    <span className="font-medium">{item.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Security card */}
      <div className="mt-4 rounded-2xl border border-border bg-white/[0.03] p-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h4 className="mt-3 text-sm font-semibold text-white">Secure &amp; Protected</h4>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Your data is encrypted and protected with enterprise level security.
        </p>
        <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          Learn more <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Dark mode toggle */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">Dark Mode</span>
        <Switch
          checked={darkMode}
          onCheckedChange={setDarkMode}
          aria-label="Toggle dark mode"
        />
      </div>
    </aside>
  );
}
