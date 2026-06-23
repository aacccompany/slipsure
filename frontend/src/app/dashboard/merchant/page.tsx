'use client';

import React from 'react';
import { Store, MessageSquare, CreditCard, User, ChevronRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';

export default function MerchantPage() {
  const { data: merchantData, isLoading } = useQuery({ queryKey: ['merchant-profile'], queryFn: () => api.getMerchantProfile() });
  const { data: subscriptionData } = useQuery({ queryKey: ['subscription'], queryFn: () => api.getSubscription() });
  const { data: quotaData } = useQuery({ queryKey: ['quota'], queryFn: () => api.getQuota() });
  const { data: lineConfigData } = useQuery({ queryKey: ['line-webhook-config'], queryFn: () => api.getLINEWebhookConfig() });

  const profile = merchantData?.data?.profile;
  const subscription = subscriptionData?.data?.subscription;
  const quota = quotaData?.data;
  const lineConfig = lineConfigData?.data?.config;

  if (isLoading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
    </div>
  );

  const sections = [
    {
      href: '/dashboard/merchant/profile',
      icon: Store,
      label: 'โปรไฟล์ร้านค้า',
      sub: profile?.shop_name || 'ยังไม่ได้ตั้งค่า',
      status: profile?.shop_name ? 'done' : 'pending',
    },
    {
      href: '/dashboard/merchant/line',
      icon: MessageSquare,
      label: 'LINE Integration',
      sub: lineConfig?.is_configured ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้ตั้งค่า',
      status: lineConfig?.is_configured ? 'done' : 'pending',
    },
    {
      href: '/dashboard/merchant/subscription',
      icon: CreditCard,
      label: 'แผนการใช้งาน',
      sub: `${subscription?.plan?.name || 'Free'} · ${quota?.used ?? 0}/${quota?.quota_limit ?? 50} สลิป`,
      status: subscription?.status === 'active' ? 'done' : 'pending',
    },
    {
      href: '/dashboard/account',
      icon: User,
      label: 'ตั้งค่าบัญชี',
      sub: 'ข้อมูลส่วนตัวและรหัสผ่าน',
      status: 'neutral',
    },
  ];

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>/ ร้านค้า</p>
        <h1 className="font-bold tracking-tight" style={{ fontSize: '1.75rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
          {profile?.shop_name || 'Merchant'}
        </h1>
      </div>

      {/* Navigation list — not cards */}
      <div className="bg-white" style={{ border: '1px solid var(--border)' }}>
        {sections.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-5 px-6 py-5 transition-colors group"
            style={{ borderBottom: i < sections.length - 1 ? '1px solid var(--border)' : 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Icon */}
            <div className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <s.icon className="w-4 h-4" style={{ color: 'var(--navy)' }} />
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--navy)' }}>{s.label}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 shrink-0">
              {s.status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
              {s.status === 'pending' && <AlertCircle className="w-4 h-4" style={{ color: 'var(--border-strong)' }} />}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Info grid */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'ชื่อร้าน', value: profile?.shop_name || '—' },
          { label: 'อีเมลติดต่อ', value: profile?.contact_email || '—' },
          { label: 'เบอร์โทร', value: profile?.contact_phone || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white px-5 py-4" style={{ border: '1px solid var(--border)' }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
