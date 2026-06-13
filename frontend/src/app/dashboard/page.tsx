'use client';

import React from 'react';
import {
  ScanLine,
  ShieldCheck,
  CreditCard,
  CalendarClock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
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

  // Calculate stats from real data
  const totalUsed = quota?.data?.used ?? 0;
  const stats = slipStatsData?.data;
  const successRate = stats?.success_rate ?? 0;
  const dailyUsage = stats?.last_7_days ?? [];
  const maxDailyCount = Math.max(
    1,
    ...dailyUsage.map((data) => data.verified + data.failed)
  );

  if (quotaLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const usedPct = quota?.data ? Math.min((quota.data.used / quota.data.quota_limit) * 100, 100) : 0;
  const resetDate = quota?.data?.reset_date
    ? new Date(quota.data.reset_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="p-6 space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-1">/ OVERVIEW</p>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
        </div>
        <button className="bg-blue-800 text-white px-4 py-2 text-sm hover:bg-blue-900 transition-colors flex items-center gap-2">
          Download Report
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quota blocked warning */}
      {quota?.data?.is_blocked && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700">
            Your quota has been exhausted. <Link href="/dashboard/subscription" className="underline font-medium">Upgrade your plan</Link> to continue verifying slips.
          </p>
        </div>
      )}

      {/* Stats Grid */}
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
          change={`${stats?.verified ?? 0} of ${((stats?.verified ?? 0) + (stats?.failed ?? 0)).toLocaleString()} completed`}
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

      {/* Main Grid */}
      <div className="grid lg:grid-cols-12 gap-6">

        {/* Usage Chart */}
        <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
            <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">/ USAGE ACTIVITY — LAST 7 DAYS</p>
            <div className="flex items-center gap-4 font-mono text-[10px] text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-800 inline-block" /> SUCCESS</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-rose-400 inline-block" /> FAILED</span>
            </div>
          </div>
          <div className="p-6">
            <div className="h-52 flex items-end gap-2">
              {dailyUsage.map((data, i) => {
                const successH = (data.verified / maxDailyCount) * 100;
                const failH = (data.failed / maxDailyCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full">
                      <div
                        className="w-full bg-blue-50 group-hover:bg-blue-800 transition-colors"
                        style={{ height: `${Math.max(successH, 4)}px` }}
                      />
                      <div
                        className="w-full bg-rose-100"
                        style={{ height: `${Math.max(failH, 2)}px` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-zinc-400 uppercase">{data.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-4 space-y-4">

          {/* Gateway Status */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-4">/ GATEWAY STATUS</p>
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-900">Verify Service</span>
            </div>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              All gateways are operational.
            </p>
            <div className="border-t border-zinc-100 pt-4">
              {['KBank Gateway', 'SCB Gateway', 'Bangkok Bank'].map((name) => (
                <div key={name} className="flex items-center justify-between py-1.5">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">{name}</span>
                  <span className="font-mono text-[10px] text-blue-700">● active</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Usage */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-4">/ PLAN USAGE</p>
            <div className="mb-4">
              <div className="flex justify-between font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                <span>API Credits</span>
                <span>{quota?.data ? `${quota.data.used} / ${quota.data.quota_limit}` : 'Loading...'}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100">
                <div
                  className="h-full bg-blue-800"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
            <Link href="/dashboard/subscription" className="w-full border border-zinc-200 py-2.5 text-xs font-medium text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors block text-center">
              Upgrade Plan
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
