'use client';

import React from 'react';
import {
  ScanLine,
  ShieldCheck,
  CreditCard,
  CalendarClock,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/dashboardApi';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: quota, isLoading: quotaLoading } = useQuery({
    queryKey: ['quota'],
    queryFn: dashboardApi.getQuota,
    retry: false,
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: dashboardApi.getSubscription,
    retry: false,
  });

  const { data: merchant } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: dashboardApi.getMerchantProfile,
    retry: false,
  });

  const { data: slipData, isLoading: slipsLoading } = useQuery({
    queryKey: ['slips-recent'],
    queryFn: () => dashboardApi.getSlips(1),
    retry: false,
  });

  const isLoading = quotaLoading || subLoading;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const usedPct = quota ? Math.min((quota.used / quota.quota_limit) * 100, 100) : 0;
  const planName = subscription?.plan?.name || subscription?.plan_id || 'Free';
  const planStatus = subscription?.status || 'trial';
  const resetDate = quota?.reset_date
    ? new Date(quota.reset_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const recentSlips = slipData?.data?.slice(0, 5) ?? [];
  const successCount = recentSlips.filter(s => s.status === 'success' || s.status === 'verified').length;
  const successRate = recentSlips.length > 0 ? Math.round((successCount / recentSlips.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-1">/ OVERVIEW</p>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            {merchant?.shop_name ? `${merchant.shop_name}` : 'Dashboard'}
          </h1>
        </div>
        <Link
          href="/dashboard/logs"
          className="bg-blue-800 text-white px-4 py-2 text-sm hover:bg-blue-900 transition-colors flex items-center gap-2"
        >
          View Logs
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quota blocked warning */}
      {quota?.is_blocked && (
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
          value={(quota?.used ?? 0).toLocaleString()}
          change="This month"
          isPositive={true}
          icon={ScanLine}
        />
        <StatCard
          title="Quota Remaining"
          value={(quota?.remaining ?? 0).toLocaleString()}
          change={`of ${(quota?.quota_limit ?? 0).toLocaleString()}`}
          isPositive={(quota?.remaining ?? 0) > 0}
          icon={ShieldCheck}
        />
        <StatCard
          title="Current Plan"
          value={planName}
          change={planStatus}
          isPositive={planStatus === 'active' || planStatus === 'trial'}
          icon={CreditCard}
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

        {/* Usage Bar */}
        <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
            <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">/ MONTHLY QUOTA USAGE</p>
            <p className="font-mono text-[10px] text-zinc-400">{Math.round(usedPct)}% used</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="flex justify-between font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                <span>Slips used</span>
                <span>{(quota?.used ?? 0).toLocaleString()} / {(quota?.quota_limit ?? 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usedPct > 85 ? 'bg-rose-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-blue-800'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>

            {/* Recent slips table */}
            <div>
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-3">Recent Verifications</p>
              {slipsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                </div>
              ) : recentSlips.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  <ScanLine className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-mono text-[11px] uppercase tracking-widest">No verifications yet</p>
                  <p className="text-xs mt-1">Slip verification results will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {recentSlips.map((slip) => (
                    <div key={slip.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        {slip.status === 'success' || slip.status === 'verified' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm text-zinc-900">{slip.sender_name || '—'}</p>
                          <p className="font-mono text-[10px] text-zinc-400">{slip.transaction_ref}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-900">
                          ฿{slip.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-400">
                          {new Date(slip.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-4 space-y-4">

          {/* Gateway Status */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-4">/ GATEWAY STATUS</p>
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-900">Bank Verify Service</span>
            </div>
            <p className="text-sm text-zinc-500 mb-4 leading-relaxed">
              Real-time slip verification via bank gateways.
            </p>
            <div className="border-t border-zinc-100 pt-4 space-y-1.5">
              {[
                ['KBank Gateway', 'active'],
                ['SCB Gateway', 'active'],
                ['Bangkok Bank', 'active'],
                ['Krungthai', 'active'],
              ].map(([name, status]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">{name}</span>
                  <span className="font-mono text-[10px] text-blue-700">● {status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan & Upgrade */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> / YOUR PLAN
            </p>
            <div className="mb-1">
              <p className="text-base font-bold text-zinc-900">{planName}</p>
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">{planStatus}</p>
            </div>
            <div className="my-4 space-y-1.5">
              <div className="flex justify-between font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                <span>Success Rate</span>
                <span>{recentSlips.length > 0 ? `${successRate}%` : '—'}</span>
              </div>
              <div className="flex justify-between font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                <span>Quota Limit</span>
                <span>{(quota?.quota_limit ?? 0).toLocaleString()} / mo</span>
              </div>
              <div className="flex justify-between font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                <span>Reset Date</span>
                <span>{resetDate}</span>
              </div>
            </div>
            <Link
              href="/dashboard/subscription"
              className="block w-full border border-zinc-200 py-2.5 text-xs font-medium text-center text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors rounded-lg"
            >
              Manage Plan →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
