'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Key, 
  Webhook, 
  History, 
  Settings, 
  QrCode,
  LogOut,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'API Keys', href: '/dashboard/keys', icon: Key },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Verification Logs', href: '/dashboard/logs', icon: History },
  { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  return (
    <aside className="w-64 border-r border-zinc-100 bg-white flex flex-col h-screen sticky top-0">
      {/* Logo Section */}
      <div className="p-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center transition-all group-hover:bg-emerald-500 shadow-lg shadow-emerald-600/20">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900">
            FlowSlip<span className="text-emerald-600">.ai</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-600")} />
                <span className="text-sm font-bold tracking-tight">{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User / Bottom Section */}
      <div className="p-4 border-t border-zinc-50">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-all group"
        >
          <LogOut className="w-5 h-5 text-zinc-400 group-hover:text-rose-500" />
          <span className="text-sm font-bold tracking-tight">Log Out</span>
        </button>
      </div>
    </aside>
  );
};
