'use client';

import React from 'react';
import { 
  BarChart3, 
  Users, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats
  });

  const { data: dailyUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['dashboard-usage-daily'],
    queryFn: dashboardService.getDailyUsage
  });

  if (statsLoading || usageLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Dashboard Overview</h1>
          <p className="text-sm font-medium text-zinc-500">Welcome back, here&apos;s what&apos;s happening with your API usage.</p>
        </div>
        <button className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg flex items-center gap-2">
          Download Reports
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Usage Chart Placeholder */}
        <div className="lg:col-span-8 bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight mb-1">Usage Activity</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Daily API Requests (Last 7 Days)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100 text-[10px] font-bold text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Successful
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100 text-[10px] font-bold text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                Failed
              </div>
            </div>
          </div>
          
          <div className="h-64 flex items-end gap-3 px-4">
            {dailyUsage?.map((data, i) => {
              const successHeight = (data.successful / 1000) * 100; // Mock scale
              const failHeight = (data.failed / 1000) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="w-full relative">
                      <div 
                          className="w-full bg-emerald-100 rounded-t-xl group-hover:bg-emerald-500 transition-all cursor-pointer relative"
                          style={{ height: `${successHeight}%` }}
                      >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                             {data.successful} success
                          </div>
                      </div>
                      <div className="w-full bg-rose-100 rounded-b-xl" style={{ height: `${Math.max(failHeight, 5)}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{data.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Actions / Quick Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden">
             <div className="relative z-10">
                <ShieldCheck className="w-10 h-10 mb-6 opacity-80" />
                <h3 className="text-2xl font-bold mb-2">Verify Service</h3>
                <p className="text-emerald-100 text-sm font-medium mb-8 leading-relaxed">
                  Your API health is excellent. All gateways are operational.
                </p>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest pt-6 border-t border-emerald-500/50">
                   <span>KBank Gateway</span>
                   <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      Active
                   </span>
                </div>
             </div>
             {/* Decorative element */}
             <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </div>

          <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm">
             <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Plan Usage
             </h3>
             <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                        <span>API Credits</span>
                        <span className="text-zinc-900">12,482 / 50,000</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="w-[25%] h-full bg-emerald-500 rounded-full" />
                    </div>
                </div>
                <button className="w-full py-4 border-2 border-zinc-100 rounded-2xl text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-all">
                    Upgrade Plan
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
