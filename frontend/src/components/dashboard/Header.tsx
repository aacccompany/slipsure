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
    <header
      className="h-14 px-6 flex items-center justify-between sticky top-0 z-30"
      style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 md:w-80">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 transition-colors rounded"
          style={{ color: 'var(--text-muted)' }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden md:block w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search logs, transaction ref..."
            className="w-full pl-9 pr-4 py-1.5 text-sm focus:outline-none transition-colors"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--navy)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      </div>

      {/* Right */}
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
              {planLabel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
