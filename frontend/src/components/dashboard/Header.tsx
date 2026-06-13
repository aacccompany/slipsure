'use client';

import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export const DashboardHeader = ({ onMenuClick }: DashboardHeaderProps) => {
  const { data: userData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.getProfile(),
    retry: false,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
    retry: false,
  });

  const user = userData?.data;
  const subscription = subscriptionData?.data?.subscription;

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const planLabel = subscription?.plan?.name || subscription?.plan_id || 'Free';

  return (
    <header className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 md:w-80">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden md:block w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search logs, transaction ref..."
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative text-zinc-400 hover:text-zinc-900 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-800 rounded-full" />
        </button>

        <div className="h-4 w-px bg-zinc-200" />

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-zinc-900 flex items-center justify-center text-white text-[11px] font-bold uppercase font-mono">
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-zinc-900 leading-none">{user?.name || '—'}</p>
            <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">{planLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
