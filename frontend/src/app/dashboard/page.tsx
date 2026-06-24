'use client';

import React from 'react';
import {
  ScanLine, ShieldCheck, CheckCircle2, CalendarClock,
  Loader2, AlertCircle, ArrowUpRight,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: quota, isLoading: quotaLoading } = useQuery({
    queryKey: ['quota'],
    queryFn: () => api.getQuota(),
  });

  const { data: slipStatsData } = useQuery({
    queryKey: ['slip-stats'],
    queryFn: () => api.getSlipStats(),
  });

  const stats = slipStatsData?.data;
  const successRate = stats?.success_rate ?? 0;
  const dailyUsage = stats?.last_7_days ?? [];
  const maxDailyCount = Math.max(1, ...dailyUsage.map((d) => d.verified + d.failed));

  if (quotaLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const usedPct = quota?.data ? Math.min((quota.data.used / quota.data.quota_limit) * 100, 100) : 0;
  const resetDate = quota?.data?.reset_date
    ? new Date(quota.data.reset_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            / Overview
          </p>
          <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
        </div>
        <button
          className="flex items-center gap-2 text-sm font-medium transition-all hover:opacity-80 px-4 py-2"
          style={{ background: 'var(--navy)', color: '#fff' }}
        >
          Download Report
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quota blocked */}
      {quota?.data?.is_blocked && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700">
            โควต้าหมดแล้ว{' '}
            <Link href="/dashboard/subscription" className="underline font-medium">อัพเกรดแผน</Link>
            {' '}เพื่อใช้งานต่อ
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Slips Verified"
          value={(quota?.data?.used ?? 0).toLocaleString()}
          change="This month"
          isPositive={true}
          icon={ScanLine}
        />
        <StatCard
          title="Quota Remaining"
          value={(quota?.data?.remaining ?? 0).toLocaleString()}
          change={`of ${(quota?.data?.quota_limit ?? 0).toLocaleString()}`}
          isPositive={(quota?.data?.remaining ?? 0) > 0}
          icon={ShieldCheck}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          change={`${stats?.verified ?? 0} verified`}
          isPositive={successRate >= 80}
          icon={CheckCircle2}
        />
        <StatCard
          title="Quota Resets"
          value={resetDate}
          change="Next reset"
          isPositive={true}
          icon={CalendarClock}
        />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-12 gap-6">

        {/* Chart */}
        <div className="lg:col-span-8 bg-white" style={{ border: '1px solid var(--border)' }}>
          <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Usage — Last 7 Days
            </p>
            <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 inline-block" style={{ background: 'var(--blue)' }} />
                Verified
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 inline-block bg-rose-400" />
                Failed
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="h-48 flex items-end gap-2">
              {dailyUsage.length > 0 ? dailyUsage.map((data, i) => {
                const successH = (data.verified / maxDailyCount) * 100;
                const failH = (data.failed / maxDailyCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full">
                      <div
                        className="w-full transition-colors"
                        style={{
                          height: `${Math.max(successH, 4)}px`,
                          background: 'var(--blue-pale)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--blue-pale)')}
                      />
                      {failH > 0 && (
                        <div className="w-full bg-rose-100 group-hover:bg-rose-400 transition-colors"
                          style={{ height: `${Math.max(failH, 2)}px` }} />
                      )}
                    </div>
                    <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--border-strong)' }}>
                      {data.day}
                    </span>
                  </div>
                );
              }) : (
                <div className="w-full flex items-center justify-center">
                  <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--border-strong)' }}>
                    No data yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side panels */}
        <div className="lg:col-span-4 space-y-4">

          {/* Gateway status */}
          <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              Gateway Status
            </p>
            <div className="space-y-0">
              {['KBank Gateway', 'SCB Gateway', 'Bangkok Bank'].map((name, i, arr) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>{name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-600">active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan usage */}
          <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              Plan Usage
            </p>
            <div className="mb-4">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}>
                <span>API Credits</span>
                <span style={{ color: 'var(--navy)' }}>
                  {quota?.data ? `${quota.data.used} / ${quota.data.quota_limit}` : '—'}
                </span>
              </div>
              <div className="h-1.5 w-full" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${usedPct}%`,
                    background: usedPct > 80 ? '#EF4444' : 'var(--blue)',
                  }}
                />
              </div>
            </div>
            <Link
              href="/dashboard/subscription"
              className="block w-full py-2.5 text-xs font-semibold text-center transition-all hover:opacity-90"
              style={{ background: 'var(--navy)', color: '#fff' }}
            >
              Upgrade Plan
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
