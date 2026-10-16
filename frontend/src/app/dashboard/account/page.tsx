'use client';

import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Calendar, Shield, CreditCard,
  Loader2, Crown, Save, MessageSquare,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import Link from 'next/link';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function AccountPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingLine, setIsConnectingLine] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '' });

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({ queryKey: ['subscription'], queryFn: () => api.getSubscription() });
  const { data: quotaData, isLoading: quotaLoading } = useQuery({ queryKey: ['quota'], queryFn: () => api.getQuota() });

  useEffect(() => {
    if (user) setProfileData({ name: user.name || '', phone: user.phone || '' });
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.updateProfile(profileData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally { setIsSaving(false); }
  };

  const handleConnectLine = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;
    if (!channelId || channelId === 'your_line_login_channel_id_here') {
      toast.error('LINE login channel ID is not configured'); return;
    }
    setIsConnectingLine(true);
    const redirectUri = process.env.NEXT_PUBLIC_LINE_LOGIN_CALLBACK_URL || `${window.location.origin}/auth/line/callback`;
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=connect&scope=profile%20openid%20email`;
  };

  const subscription = subscriptionData?.data?.subscription;
  const quota = quotaData?.data;
  const isSubscriptionExpired = Boolean(subscription?.expires_at && new Date(subscription.expires_at).getTime() <= Date.now());
  const effectivePlanStatus = isSubscriptionExpired
    ? 'expired'
    : quota?.is_blocked
      ? 'blocked'
      : subscription?.status || 'trial';

  if (!user || subscriptionLoading || quotaLoading) {
    return <PageSkeleton />;
  }

  const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="min-h-full px-6 py-6 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="border-b border-zinc-200 pb-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">/ Account</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">Account Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Manage your personal profile, sign-in connection, and current usage plan.
          </p>
        </div>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="grid lg:grid-cols-[320px_1fr]">
            <aside className="border-b border-zinc-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Identity</p>
              <div className="mt-7 flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-zinc-950 text-3xl font-black text-white">
                  {initials}
                </div>
                <h2 className="mt-5 max-w-full truncate text-xl font-black text-zinc-950">{profileData.name || user.name}</h2>
                <p className="mt-1 max-w-full truncate text-sm text-zinc-500">{user.email}</p>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span
                  className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: user.email_verified ? '#ECFDF5' : '#FFF7ED',
                    color: user.email_verified ? '#059669' : '#D97706',
                    borderColor: user.email_verified ? '#A7F3D0' : '#FCD34D',
                  }}
                >
                  {user.email_verified ? 'Verified' : 'Not Verified'}
                </span>
                <span
                  className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: user.line_linked ? '#ECFDF5' : '#fff',
                    color: user.line_linked ? '#059669' : '#64748B',
                    borderColor: user.line_linked ? '#A7F3D0' : '#CBD5E1',
                  }}
                >
                  {user.line_linked ? 'LINE Connected' : 'LINE Not Connected'}
                </span>
              </div>

              {!user.line_linked && (
                <button
                  type="button"
                  onClick={handleConnectLine}
                  disabled={isConnectingLine}
                  className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                  style={{ background: '#06C755' }}
                >
                  {isConnectingLine ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Connect LINE
                </button>
              )}
            </aside>

            <div className="p-6 md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-black text-zinc-950">Personal Information</h3>
                  <p className="mt-1 text-sm text-zinc-500">Update the profile details used inside FlowSlip.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Full Name</span>
                  <span className="relative block">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm font-semibold text-zinc-950 outline-none transition-colors focus:border-blue-500"
                    />
                  </span>
                </label>

                <label className="space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email Address</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="h-11 w-full rounded-md border border-zinc-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-zinc-500 outline-none"
                    />
                  </span>
                  <span className="block text-xs text-zinc-400">Email cannot be changed</span>
                </label>

                <label className="space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Phone Number</span>
                  <span className="relative block">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+66812345678"
                      className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
                    />
                  </span>
                </label>

                <label className="space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Account Created</span>
                  <span className="relative block">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : ''}
                      disabled
                      className="h-11 w-full rounded-md border border-zinc-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-zinc-500 outline-none"
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            { icon: CreditCard, label: 'Current Plan', value: subscription?.plan?.name || 'Free', sub: `Status: ${effectivePlanStatus}` },
            { icon: Shield, label: 'Quota', value: `${quota?.used ?? 0} / ${quota?.quota_limit ?? 20}`, sub: `${quota?.remaining ?? 0} remaining` },
            { icon: Calendar, label: 'Next Reset', value: quota?.reset_date ? new Date(quota.reset_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-', sub: 'Monthly quota reset' },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
                <Icon className="h-4 w-4 text-zinc-400" />
              </div>
              <h4 className="text-2xl font-black text-zinc-950">{value}</h4>
              <p className="mt-1 text-sm text-zinc-500">{sub}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Quick Actions</p>
            <Link href="/dashboard/subscription" className="text-sm font-bold text-blue-700 hover:text-blue-800">
              Manage Plan →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href="/dashboard/subscription" className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50">
                <Crown className="h-4 w-4 text-blue-700" />
              </span>
              <span>
                <span className="block text-sm font-bold text-zinc-950">Upgrade Plan</span>
                <span className="text-xs text-zinc-500">View pricing and features</span>
              </span>
            </Link>
            <Link href="/forgot-password" className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-rose-200 hover:bg-rose-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-50">
                <Shield className="h-4 w-4 text-rose-500" />
              </span>
              <span>
                <span className="block text-sm font-bold text-zinc-950">Change Password</span>
                <span className="text-xs text-zinc-500">Update your password</span>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
