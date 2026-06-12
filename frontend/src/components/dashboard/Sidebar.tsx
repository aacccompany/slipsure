'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Key,
  Webhook,
  History,
  Settings,
  LogOut,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'API Keys', href: '/dashboard/keys', icon: Key },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Logs', href: '/dashboard/logs', icon: History },
  { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardSidebar = ({ isOpen, onClose }: DashboardSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  return (
    <aside className={[
      'w-56 border-r border-zinc-200 bg-white flex flex-col h-screen',
      'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
      'md:sticky md:top-0 md:translate-x-0 md:z-auto',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    ].join(' ')}>
      <div className="px-6 py-4 border-b border-zinc-200">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Flowslip" width={96} height={26} className="h-6 w-auto" priority />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors border-l-2 rounded-r-lg',
                isActive
                  ? 'border-zinc-900 text-zinc-900 font-medium bg-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-zinc-400 hover:text-rose-600 transition-colors border-l-2 border-transparent hover:border-rose-500"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
