'use client';

import React from 'react';
import {
  ScanLine, ShieldCheck, CheckCircle2, CalendarClock,
  Loader2, AlertCircle, ArrowUpRight, Users,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentSlips } from '@/components/dashboard/RecentSlips';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { data: quota, isLoading: quotaLoading } = useQuery({
    queryKey: ['quota'],
    queryFn: () => api.getQuota(),
  });

  const { data: slipStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['merchant-analytics-dashboard'],
    queryFn: () => api.getMerchantAnalyticsDashboard(),
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['merchant-analytics-usage', '7d'],
    queryFn: () => api.getMerchantAnalyticsUsage({ period: '7d' }),
  });

  const { data: subscriptionData, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });

  const stats = slipStatsData?.data;
  const successRate = Math.round(stats?.success_rate ?? 0);
  const dailyUsage = usageData?.data?.usage_per_day ?? [];
  const maxDailyCount = Math.max(1, ...dailyUsage.map((d) => d.verified + d.failed));
  // Sum from the same 7-day usage data as the chart above, not `stats` (which is all-time) —
  // mixing periods made the Duplicate slice incomparable to Verified/Failed.
  const recentVerifiedScans = dailyUsage.reduce((sum, d) => sum + d.verified, 0);
  const recentFailedScans = dailyUsage.reduce((sum, d) => sum + d.failed, 0);
  const duplicateScans = usageData?.data?.failed_scan_reasons
    ?.find((item) => item.reason === 'DUPLICATE_SLIP')?.count ?? 0;
  const maxResultCount = Math.max(1, recentVerifiedScans, recentFailedScans, duplicateScans);
  const resultBreakdown = [
    { label: 'Verified', value: recentVerifiedScans, color: 'var(--blue)' },
    { label: 'Failed', value: recentFailedScans, color: '#FB7185' },
    { label: 'Duplicate', value: duplicateScans, color: '#F59E0B' },
  ];

  const downloadReport = async () => {
    try {
      const blob = await api.exportMerchantAnalytics({ format: 'csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merchant-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download report');
    }
  };

  if (quotaLoading || statsLoading || usageLoading || subLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const usedPct = quota?.data && quota.data.quota_limit > 0
    ? Math.min((quota.data.used / quota.data.quota_limit) * 100, 100)
    : 0;
  const resetDate = quota?.data?.reset_date
    ? new Date(quota.data.reset_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const planName = subscriptionData?.data?.subscription?.plan?.name || 'Free';
  const isNearLimit = usedPct >= 80 && !quota?.data?.is_blocked;
  const peakTime = usageData?.data?.peak_time && usageData.data.peak_time !== 'N/A'
    ? usageData.data.peak_time
    : null;

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            / Overview
          </p>
          <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
        </div>
        <button
          onClick={downloadReport}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Slips Verified"
          value={(stats?.verified_scans ?? 0).toLocaleString()}
          change="All time"
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
          change={`${stats?.verified_scans ?? 0} verified`}
          isPositive={successRate >= 80}
          icon={CheckCircle2}
        />
        <StatCard
          title="Bot Clients"
          value={(stats?.bot_clients ?? 0).toLocaleString()}
          change={`${stats?.new_bot_clients ?? 0} new / ${stats?.previous_bot_clients ?? 0} previous`}
          isPositive={true}
          icon={Users}
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
          <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Usage — Last 7 Days
              </p>
              {peakTime && (
                <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5" style={{ color: 'var(--blue)', background: 'var(--blue-pale)' }}>
                  Peak {peakTime}
                </span>
              )}
            </div>
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
                const chartPxHeight = 150;
                const successPx = (data.verified / maxDailyCount) * chartPxHeight;
                const failPx = (data.failed / maxDailyCount) * chartPxHeight;
                const total = data.verified + data.failed;
                return (
                  <div key={i} className="group relative flex flex-1 flex-col items-center gap-2">
                    <div className="w-full">
                      <div
                        className="w-full transition-colors bg-[var(--blue-pale)] group-hover:bg-[var(--blue)]"
                        style={{ height: `${Math.max(successPx, 4)}px` }}
                      />
                      {data.failed > 0 && (
                        <div className="w-full bg-rose-100 group-hover:bg-rose-400 transition-colors"
                          style={{ height: `${Math.max(failPx, 2)}px` }} />
                      )}
                    </div>
                    <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 hidden min-w-28 -translate-x-1/2 border border-zinc-200 bg-white px-3 py-2 text-left shadow-lg group-hover:block">
                      <p className="mb-1 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>
                        Verified: {data.verified}
                      </p>
                      <p className="text-xs font-semibold text-rose-500">
                        Failed: {data.failed}
                      </p>
                      <p className="mt-1 border-t border-zinc-100 pt-1 text-xs font-semibold text-zinc-700">
                        Total: {total}
                      </p>
                    </div>
                    <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--border-strong)' }}>
                  {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
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

          {/* Verification results */}
          <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              Verification Results — Last 7 Days
            </p>
            {recentVerifiedScans + recentFailedScans + duplicateScans === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-widest py-4 text-center" style={{ color: 'var(--border-strong)' }}>
                No data yet
              </p>
            ) : (
            <div className="space-y-4">
              {resultBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>{item.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.max(item.value > 0 ? 4 : 0, (item.value / maxResultCount) * 100)}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Plan usage */}
          <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Plan Usage
              </p>
              <span
                className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5"
                style={{ color: 'var(--navy)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                {planName}
              </span>
            </div>
            <div className="mb-4">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}>
                <span>API Credits</span>
                <span style={{ color: 'var(--navy)' }}>
                  {quota?.data ? `${quota.data.used.toLocaleString()} / ${quota.data.quota_limit.toLocaleString()}` : '—'}
                </span>
              </div>
              <div className="h-1.5 w-full" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${usedPct}%`,
                    background: quota?.data?.is_blocked ? '#EF4444' : isNearLimit ? '#F59E0B' : 'var(--blue)',
                  }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest mt-2" style={{ color: 'var(--text-muted)' }}>
                <span>
                  {quota?.data?.is_blocked
                    ? 'Quota exhausted'
                    : isNearLimit
                      ? `${Math.round(usedPct)}% used — nearing limit`
                      : `${(quota?.data?.remaining ?? 0).toLocaleString()} remaining`}
                </span>
                <span>Resets {resetDate}</span>
              </div>
            </div>
            <Link
              href="/dashboard/subscription"
              className="block w-full py-2.5 text-xs font-semibold text-center transition-all hover:opacity-90"
              style={{
                background: quota?.data?.is_blocked ? '#EF4444' : 'var(--navy)',
                color: '#fff',
              }}
            >
              {quota?.data?.is_blocked ? 'Upgrade Now' : 'Upgrade Plan'}
            </Link>
          </div>

        </div>
      </div>

      <RecentSlips />
    </div>
  );
}
