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

export default function AccountPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingLine, setIsConnectingLine] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '' });

  const { data: subscriptionData } = useQuery({ queryKey: ['subscription'], queryFn: () => api.getSubscription() });
  const { data: quotaData } = useQuery({ queryKey: ['quota'], queryFn: () => api.getQuota() });

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

  if (!user) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const inputClass = "w-full px-4 py-3 text-sm transition-all focus:outline-none";
  const inputStyle = { border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' };
  const disabledStyle = { border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--bg-subtle)' };

  return (
    <div className="p-8 space-y-8 max-w-4xl" style={{ background: 'var(--bg)' }}>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>/ Account</p>
        <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
          Account Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>จัดการข้อมูลส่วนตัวและแผนการใช้งานของคุณ</p>
      </div>

      <div className="space-y-6">

        {/* Profile section */}
        <section className="bg-white p-8" style={{ border: '1px solid var(--border)' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <User className="w-3.5 h-3.5" /> Personal Information
          </p>

          {/* Avatar row */}
          <div className="flex items-center gap-6 mb-8">
            <div
              className="w-16 h-16 flex items-center justify-center text-white text-xl font-bold"
              style={{ background: 'var(--navy)' }}
            >
              {initials}
            </div>
            <div>
              <h3 className="font-bold text-lg mb-0.5" style={{ color: 'var(--navy)' }}>{user.name}</h3>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
              <div className="flex flex-wrap gap-2">
                <span
                  className="font-mono text-[9px] px-2 py-1 uppercase tracking-widest"
                  style={{
                    background: user.email_verified ? '#ECFDF5' : '#FFF7ED',
                    color: user.email_verified ? '#059669' : '#D97706',
                    border: `1px solid ${user.email_verified ? '#A7F3D0' : '#FCD34D'}`,
                  }}
                >
                  {user.email_verified ? '✓ Verified' : '⚠ Not Verified'}
                </span>
                <span
                  className="font-mono text-[9px] px-2 py-1 uppercase tracking-widest"
                  style={{
                    background: user.line_linked ? '#ECFDF5' : 'var(--bg-subtle)',
                    color: user.line_linked ? '#059669' : 'var(--text-muted)',
                    border: `1px solid ${user.line_linked ? '#A7F3D0' : 'var(--border)'}`,
                  }}
                >
                  {user.line_linked ? 'LINE Connected' : 'LINE Not Connected'}
                </span>
              </div>
            </div>
          </div>

          {/* Form grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="text" value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={inputClass}
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="email" value={user.email || ''} disabled className={inputClass}
                  style={{ ...disabledStyle, paddingLeft: '2.75rem' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Email cannot be changed</p>
            </div>

            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="tel" value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+66812345678" className={inputClass}
                  style={{ ...inputStyle, paddingLeft: '2.75rem' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Account Created</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="text"
                  value={user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : ''}
                  disabled className={inputClass}
                  style={{ ...disabledStyle, paddingLeft: '2.75rem' }} />
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-end gap-3 pt-6 mt-6"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {!user.line_linked && (
              <button onClick={handleConnectLine} disabled={isConnectingLine}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: '#06C755', color: '#fff' }}>
                {isConnectingLine ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Connect LINE
              </button>
            )}
            <button onClick={handleSaveProfile} disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--navy)', color: '#fff' }}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </section>

        {/* Plan overview */}
        <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Crown className="w-3.5 h-3.5" /> Current Plan
            </p>
            <Link href="/dashboard/subscription"
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--blue)' }}>
              Manage Plan →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 divide-x" style={{ borderColor: 'var(--border)' }}>
            {[
              { icon: CreditCard, label: 'Plan', value: subscription?.plan?.name || 'Free', sub: `Status: ${subscription?.status || 'trial'}` },
              { icon: Shield, label: 'Quota', value: `${quota?.used ?? 0} / ${quota?.quota_limit ?? 50}`, sub: `${quota?.remaining ?? 0} remaining` },
              { icon: Calendar, label: 'Resets', value: quota?.reset_date ? new Date(quota.reset_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '—', sub: 'Next quota reset' },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
                <h4 className="font-bold text-lg mb-1" style={{ color: 'var(--navy)' }}>{value}</h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="bg-white" style={{ border: '1px solid var(--border)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Quick Actions</p>
          </div>
          <div className="grid md:grid-cols-2 gap-0 divide-x divide-y" style={{ borderColor: 'var(--border)' }}>
            <Link href="/dashboard/subscription"
              className="p-5 group transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'var(--blue-pale)' }}>
                  <Crown className="w-4 h-4" style={{ color: 'var(--blue)' }} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Upgrade Plan</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>View pricing & features</p>
                </div>
              </div>
            </Link>
            <Link href="/forgot-password"
              className="p-5 group transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center bg-rose-50">
                  <Shield className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Change Password</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Update your password</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
