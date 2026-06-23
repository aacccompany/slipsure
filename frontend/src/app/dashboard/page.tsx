'use client';

import React from 'react';
import { Loader2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: quota, isLoading } = useQuery({
    queryKey: ['quota'],
    queryFn: () => api.getQuota(),
  });

  const { data: slipStatsData } = useQuery({
    queryKey: ['slip-stats'],
    queryFn: () => api.getSlipStats(),
  });

  const stats = slipStatsData?.data;
  const dailyUsage = stats?.last_7_days ?? [];
  const maxDailyCount = Math.max(1, ...dailyUsage.map((d) => (d.verified ?? 0) + (d.failed ?? 0)));
  const usedPct = quota?.data ? Math.min((quota.data.used / quota.data.quota_limit) * 100, 100) : 0;
  const resetDate = quota?.data?.reset_date
    ? new Date(quota.data.reset_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    : '—';

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8" style={{ background: 'var(--bg)' }}>

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            / ภาพรวม
          </p>
          <h1 className="font-bold tracking-tight" style={{ fontSize: '1.75rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
        </div>
        <Link href="/pricing"
          className="flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--blue)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--navy)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--blue)')}>
          อัพเกรดแผน <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quota blocked warning */}
      {quota?.data?.is_blocked && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700">
            โควต้าหมดแล้ว{' '}
            <Link href="/pricing" className="underline font-medium">อัพเกรดแผน</Link>
            {' '}เพื่อใช้งานต่อ
          </p>
        </div>
      )}

      {/* 4 stat blocks — editorial, no cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ border: '1px solid var(--border)', background: '#fff' }}>
        {[
          { label: 'สลิปที่ใช้ไป', value: (quota?.data?.used ?? 0).toLocaleString(), sub: 'เดือนนี้' },
          { label: 'โควต้าคงเหลือ', value: (quota?.data?.remaining ?? 0).toLocaleString(), sub: `จาก ${(quota?.data?.quota_limit ?? 0).toLocaleString()}` },
          { label: 'อัตราสำเร็จ', value: `${stats?.success_rate ?? 0}%`, sub: `${stats?.verified ?? 0} สำเร็จ` },
          { label: 'รีเซ็ตโควต้า', value: resetDate, sub: 'รอบถัดไป' },
        ].map((s, i) => (
          <div key={s.label} className="p-6 transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </p>
            <p className="font-bold mb-0.5" style={{ fontSize: '1.75rem', color: 'var(--navy)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {s.value}
            </p>
            <p className="font-mono text-[9px]" style={{ color: 'var(--border-strong)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-12 gap-6">

        {/* Usage chart */}
        <div className="lg:col-span-8 bg-white" style={{ border: '1px solid var(--border)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              การใช้งาน 7 วันที่ผ่านมา
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 inline-block" style={{ background: 'var(--blue)' }} />
                <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>สำเร็จ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 inline-block bg-rose-400" />
                <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>ล้มเหลว</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            {dailyUsage.length > 0 ? (
              <div className="h-40 flex items-end gap-2">
                {dailyUsage.map((d, i) => {
                  const verified = d.verified ?? 0;
                  const failed = d.failed ?? 0;
                  const total = verified + failed;
                  const successH = (verified / maxDailyCount) * 100;
                  const failH = (failed / maxDailyCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="w-full relative">
                        <div className="w-full transition-colors group-hover:opacity-80"
                          style={{ height: `${Math.max(successH, 4)}px`, background: 'var(--blue-pale)' }}>
                          <div className="w-full h-full opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'var(--blue)' }} />
                        </div>
                        {failH > 0 && (
                          <div className="w-full bg-rose-100 group-hover:bg-rose-400 transition-colors"
                            style={{ height: `${Math.max(failH, 2)}px` }} />
                        )}
                      </div>
                      <span className="font-mono text-[8px] uppercase" style={{ color: 'var(--border-strong)' }}>
                        {d.day ?? String(i + 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--border-strong)' }}>
                  ยังไม่มีข้อมูล
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Side panels */}
        <div className="lg:col-span-4 space-y-4">

          {/* Quota bar */}
          <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              โควต้าเดือนนี้
            </p>
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mb-2"
              style={{ color: 'var(--border-strong)' }}>
              <span>ใช้ไป</span>
              <span>{quota?.data ? `${quota.data.used} / ${quota.data.quota_limit}` : '—'}</span>
            </div>
            <div className="h-1.5 w-full" style={{ background: 'var(--border)' }}>
              <div className="h-full transition-all" style={{ width: `${usedPct}%`, background: usedPct > 80 ? '#EF4444' : 'var(--blue)' }} />
            </div>
            <p className="font-mono text-[9px] mt-2" style={{ color: 'var(--border-strong)' }}>
              รีเซ็ต {resetDate}
            </p>
            <Link href="/pricing"
              className="block w-full text-center py-2.5 text-xs font-semibold mt-4 transition-all hover:opacity-90"
              style={{ background: 'var(--navy)', color: '#fff' }}>
              อัพเกรดแผน →
            </Link>
          </div>

          {/* Gateway status */}
          <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              สถานะ Gateway
            </p>
            {['KBank Gateway', 'SCB Gateway', 'Bangkok Bank'].map((name) => (
              <div key={name} className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>active</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
