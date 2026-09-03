'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BarChart3,
  CreditCard,
  LogOut,
  Search,
  Store,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export type AdminMenuItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  matchPath?: string;
  matchTab?: string;
};

export const adminMenuItems: AdminMenuItem[] = [
  { name: 'Overview', href: '/admin?tab=analytics', icon: BarChart3, matchPath: '/admin', matchTab: 'analytics' },
  { name: 'Merchants', href: '/admin?tab=merchants', icon: Store, matchPath: '/admin', matchTab: 'merchants' },
  { name: 'Users', href: '/admin?tab=users', icon: Users, matchPath: '/admin', matchTab: 'users' },
  { name: 'Billing', href: '/admin?tab=billing', icon: CreditCard, matchPath: '/admin', matchTab: 'billing' },
];

function isMenuActive(item: AdminMenuItem, pathname: string, activeTab?: string) {
  if (pathname.startsWith('/admin/merchants/') && item.name === 'Merchants') {
    return true;
  }

  if (item.matchTab) {
    return pathname === item.matchPath && activeTab === item.matchTab;
  }

  return pathname === item.matchPath && !activeTab;
}

export function AdminShell({
  children,
  activeTab,
}: {
  children: React.ReactNode;
  activeTab?: string;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out?')) {
      return;
    }

    await logout();
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <aside
        className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col md:flex"
        style={{ background: 'var(--navy)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/admin?tab=analytics">
            <Image src="/logo.png" alt="FlowSlip" width={96} height={26} className="h-6 w-auto brightness-0 invert" priority />
          </Link>
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Backoffice
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {adminMenuItems.map((item) => {
            const active = isMenuActive(item, pathname, activeTab);
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all"
                style={{
                  color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                  background: active ? 'rgba(0,82,255,0.25)' : 'transparent',
                  borderLeft: `2px solid ${active ? 'var(--blue)' : 'transparent'}`,
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)';
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
                }}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all"
            style={{ color: 'rgba(255,255,255,0.35)', borderLeft: '2px solid transparent' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#FCA5A5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)';
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header
          className="h-14 px-6 flex items-center justify-between sticky top-0 z-30"
          style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}
        >
          <div className="relative hidden md:block w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search merchants, users..."
              className="w-full pl-9 pr-4 py-1.5 text-sm focus:outline-none transition-colors"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--navy)' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              className="transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--navy)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Bell className="w-4 h-4" />
            </button>

            <div className="h-4 w-px" style={{ background: 'var(--border)' }} />

            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 flex items-center justify-center text-white text-[11px] font-bold font-mono"
                style={{ background: 'var(--navy)' }}
              >
                {initials}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold leading-none mb-0.5" style={{ color: 'var(--navy)' }}>
                  {user?.name || '—'}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Admin
                </p>
              </div>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
