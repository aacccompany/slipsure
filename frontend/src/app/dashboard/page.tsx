'use client';

import React from 'react';
import {
  Zap,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  });

  const { data: dailyUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['dashboard-usage-daily'],
    queryFn: dashboardService.getDailyUsage,
  });

  if (statsLoading || usageLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scans"
          value={stats?.totalScans.toLocaleString() || '0'}
          change={`${stats?.scansTrend}%`}
          isPositive={stats?.scansTrend ? stats.scansTrend > 0 : true}
          icon={Zap}
        />
        <StatCard
          title="Success Rate"
          value={`${stats?.successRate}%`}
          change={`${stats?.successTrend}%`}
          isPositive={stats?.successTrend ? stats.successTrend > 0 : true}
          icon={CheckCircle2}
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers.toLocaleString() || '0'}
          change={`${stats?.usersTrend}%`}
          isPositive={stats?.usersTrend ? stats.usersTrend > 0 : true}
          icon={Users}
        />
        <StatCard
          title="Avg. Latency"
          value={`${stats?.avgLatency}s`}
          change={`${Math.abs(stats?.latencyTrend || 0)}s`}
          isPositive={stats?.latencyTrend ? stats.latencyTrend < 0 : true}
          icon={Clock}
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
              {dailyUsage?.map((data, i) => {
                const successH = (data.successful / 1000) * 100;
                const failH = (data.failed / 1000) * 100;
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
              {[['KBank Gateway', 'active'], ['SCB Gateway', 'active'], ['Bangkok Bank', 'active']].map(([name, status]) => (
                <div key={name} className="flex items-center justify-between py-1.5">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">{name}</span>
                  <span className="font-mono text-[10px] text-blue-700">● {status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Usage */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> / PLAN USAGE
            </p>
            <div className="mb-4">
              <div className="flex justify-between font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                <span>API Credits</span>
                <span>12,482 / 50,000</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100">
                <div className="w-[25%] h-full bg-blue-800" />
              </div>
            </div>
            <button className="w-full border border-zinc-200 py-2.5 text-xs font-medium text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors">
              Upgrade Plan
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
