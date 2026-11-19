'use client';

import React from 'react';
import {
  Store, MapPin, Phone, Mail, Settings, ChevronRight,
  MessageSquare, CreditCard, User, CheckCircle, AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function MerchantProfilePage() {
  const { data: merchantData, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchant-profile'],
    queryFn: () => api.getMerchantProfile(),
  });
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });
  const { data: quotaData, isLoading: quotaLoading } = useQuery({
    queryKey: ['quota'],
    queryFn: () => api.getQuota(),
  });
  const { data: lineConfigData, isLoading: lineConfigLoading } = useQuery({
    queryKey: ['line-webhook-config'],
    queryFn: () => api.getLINEWebhookConfig(),
  });

  const profile = merchantData?.data?.profile;
  const subscription = subscriptionData?.data?.subscription;
  const quota = quotaData?.data;
  const lineConfig = lineConfigData?.data?.config;
  const statusLabels: Record<string, string> = {
    active: 'ใช้งานอยู่', expired: 'หมดอายุ', canceled: 'ยกเลิกแล้ว',
    cancelled: 'ยกเลิกแล้ว', trial: 'ทดลองใช้งาน', paused: 'หยุดชั่วคราว',
  };

  if (merchantLoading || subscriptionLoading || quotaLoading || lineConfigLoading) {
    return <PageSkeleton />;
  }

  const quickActions = [
    {
      href: '/dashboard/merchant/profile',
      icon: Store,
      title: 'ข้อมูลร้านค้า',
      sub: 'ข้อมูลร้าน',
      accent: 'var(--blue)',
    },
    {
      href: '/dashboard/merchant/line',
      icon: MessageSquare,
      title: 'เชื่อมต่อ LINE',
      sub: lineConfig?.is_configured ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้ตั้งค่า',
      accent: '#06C755',
      badge: lineConfig?.is_configured
        ? { label: 'เชื่อมต่อแล้ว', ok: true }
        : { label: 'ยังไม่ได้ตั้งค่า', ok: false },
    },
    {
      href: '/dashboard/subscription',
      icon: CreditCard,
      title: 'แพ็กเกจ',
      sub: 'แผนการใช้งาน',
      accent: '#F59E0B',
    },
    {
      href: '/dashboard/account',
      icon: User,
      title: 'ตั้งค่าบัญชี',
      sub: 'ตั้งค่าบัญชี',
      accent: '#8B5CF6',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          / ร้านค้า
        </p>
        <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          {profile?.shop_name || 'ร้านค้า'}
        </h1>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-white p-6 group transition-all hover:shadow-md"
            style={{ border: '1px solid var(--border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = action.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 flex items-center justify-center"
                style={{ background: `${action.accent}15` }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.accent }} />
              </div>
              {action.badge && (
                <div className="flex items-center gap-1">
                  {action.badge.ok
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    : <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--border-strong)' }} />}
                </div>
              )}
            </div>
            <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--ink)' }}>{action.title}</h3>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {action.sub}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span
                className="text-xs font-semibold transition-colors"
                style={{ color: action.accent }}
              >
                จัดการ
              </span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                style={{ color: action.accent }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Overview */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Shop info */}
        <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'var(--blue-pale)' }}>
              <Store className="w-4 h-4" style={{ color: 'var(--blue)' }} />
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>ร้านค้า</p>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{profile?.shop_name || 'ยังไม่ได้ตั้งค่า'}</h3>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { icon: MapPin, value: profile?.address || 'ยังไม่มีที่อยู่' },
              { icon: Phone, value: profile?.contact_phone || 'ยังไม่มีเบอร์โทรศัพท์' },
              { icon: Mail, value: profile?.contact_email || 'ยังไม่มีอีเมล' },
            ].map(({ icon: Icon, value }) => (
              <div key={value} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{value}</span>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/merchant/profile"
            className="mt-4 block w-full py-2 text-center text-xs font-semibold transition-all hover:opacity-90"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          >
            แก้ไขข้อมูลร้านค้า
          </Link>
        </div>

        {/* Subscription */}
        <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'var(--warn-pale)' }}>
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>แผนการใช้งาน</p>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                {subscription?.plan?.name === 'Free' ? 'ฟรี' : subscription?.plan?.name || 'แผนฟรี'}
              </h3>
            </div>
          </div>
          <div className="space-y-2">
            {[
              ['สถานะ', statusLabels[subscription?.status || 'trial'] || subscription?.status || 'ทดลองใช้งาน'],
              ['ใช้โควต้าแล้ว', `${quota?.used ?? 0} / ${quota?.quota_limit ?? 20}`],
              ['คงเหลือ', `${quota?.remaining ?? 20}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-medium" style={{ color: 'var(--ink)' }}>{value as string}</span>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/subscription"
            className="mt-4 block w-full py-2 text-center text-xs font-semibold transition-all hover:opacity-90"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          >
            จัดการแพ็กเกจ
          </Link>
        </div>

        {/* LINE status */}
        <div className="bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'var(--ok-pale)' }}>
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>LINE</p>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                {lineConfig?.is_configured ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
              </h3>
            </div>
          </div>
          {lineConfig?.is_configured ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>รหัสอ้างอิง</span>
                <span className="font-mono text-xs" style={{ color: 'var(--blue)' }}>
                  {lineConfig?.webhook_reference_id?.slice(0, 8) || '—'}...
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              ยังไม่ได้ตั้งค่า LINE webhook
            </p>
          )}
          <Link
            href="/dashboard/merchant/line"
            className="mt-4 block w-full py-2 text-center text-xs font-semibold transition-all hover:opacity-90"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          >
            {lineConfig?.is_configured ? 'ตั้งค่า LINE' : 'เชื่อมต่อ LINE'}
          </Link>
        </div>
      </div>

      {/* Quick settings */}
      <div className="max-w-2xl">
        <div className="bg-white" style={{ border: '1px solid var(--border)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Settings className="w-3.5 h-3.5" /> ตั้งค่าด่วน
            </p>
          </div>
          {[
            { href: '/dashboard/merchant/profile', icon: Store, label: 'แก้ไขข้อมูลร้านค้า' },
            { href: '/dashboard/merchant/line',    icon: MessageSquare, label: 'ตั้งค่า LINE Webhook' },
            { href: '/dashboard/subscription', icon: CreditCard, label: 'จัดการแพ็กเกจ' },
            { href: '/dashboard/account',          icon: User, label: 'ตั้งค่าบัญชี' },
          ].map((item, i, arr) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-5 py-3.5 group transition-colors"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: 'var(--blue)' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
