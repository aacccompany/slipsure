'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  LogOut,
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
  { name: 'Analytics', href: '/admin?tab=analytics', icon: BarChart3, matchPath: '/admin', matchTab: 'analytics' },
  { name: 'Users', href: '/admin?tab=users', icon: Users, matchPath: '/admin', matchTab: 'users' },
  { name: 'Payments', href: '/admin?tab=payments', icon: CreditCard, matchPath: '/admin', matchTab: 'payments' },
];

function isMenuActive(item: AdminMenuItem, pathname: string, activeTab?: string) {
  if (pathname.startsWith('/admin/merchants/') && item.name === 'Analytics') {
    return true;
  }

  if (item.matchTab) {
    return pathname === item.matchPath && activeTab === item.matchTab;
  }

  return pathname === item.matchPath && !activeTab;
}

export function AdminShell({
  children,
  title = 'FlowSlip Operations',
  eyebrow = 'Admin Backoffice',
  activeTab,
}: {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  activeTab?: string;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="border-b border-zinc-200 px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-blue-700">FlowSlip</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-950">Backoffice</h2>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {adminMenuItems.map((item) => {
            const active = isMenuActive(item, pathname, activeTab);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-2">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-zinc-200 bg-white">
          <div className="px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-blue-700">{eyebrow}</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">{title}</h1>
          </div>
        </header>

        <main className="px-4 py-4">{children}</main>
      </div>
    </div>
  );
}
