'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Save, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import Link from 'next/link';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, disabled = false, type = 'text' }: {
  value: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      className="w-full px-4 py-3 border text-sm transition-all focus:outline-none"
      style={{
        borderColor: 'var(--border)',
        color: disabled ? 'var(--text-muted)' : 'var(--navy)',
        background: disabled ? 'var(--bg-subtle)' : '#fff',
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={(e) => { if (!disabled) e.target.style.borderColor = 'var(--blue)'; }}
      onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
  );
}

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

  const handleSave = async () => {
    setIsSaving(true);
    try { await api.updateProfile(profileData); toast.success('บันทึกสำเร็จ'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ'); }
    finally { setIsSaving(false); }
  };

  const handleConnectLine = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;
    if (!channelId || channelId === 'your_line_login_channel_id_here') { toast.error('LINE login ยังไม่ได้ตั้งค่า'); return; }
    setIsConnectingLine(true);
    const redirectUri = process.env.NEXT_PUBLIC_LINE_LOGIN_CALLBACK_URL || `${window.location.origin}/auth/line/callback`;
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=connect&scope=profile%20openid%20email`;
  };

  const subscription = subscriptionData?.data?.subscription;
  const quota = quotaData?.data;

  if (!user) return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
    </div>
  );

  const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="p-6 md:p-8 max-w-2xl" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>/ บัญชี</p>
        <h1 className="font-bold tracking-tight" style={{ fontSize: '1.75rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
          ตั้งค่าบัญชี
        </h1>
      </div>

      {/* Avatar + status */}
      <div className="flex items-center gap-5 mb-8 pb-8" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-16 h-16 flex items-center justify-center text-white text-xl font-bold"
          style={{ background: 'var(--navy)' }}>
          {initials}
        </div>
        <div>
          <p className="font-bold text-lg mb-1" style={{ color: 'var(--navy)' }}>{user.name}</p>
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-[9px] px-2 py-1 uppercase tracking-widest"
              style={{
                background: user.email_verified ? '#ECFDF5' : '#FFF7ED',
                color: user.email_verified ? '#059669' : '#D97706',
                border: `1px solid ${user.email_verified ? '#A7F3D0' : '#FCD34D'}`,
              }}>
              {user.email_verified ? 'ยืนยันอีเมลแล้ว' : 'ยังไม่ยืนยันอีเมล'}
            </span>
            <span className="font-mono text-[9px] px-2 py-1 uppercase tracking-widest"
              style={{
                background: user.line_linked ? '#ECFDF5' : 'var(--bg-subtle)',
                color: user.line_linked ? '#059669' : 'var(--text-muted)',
                border: `1px solid ${user.line_linked ? '#A7F3D0' : 'var(--border)'}`,
              }}>
              {user.line_linked ? 'LINE เชื่อมต่อแล้ว' : 'LINE ยังไม่เชื่อมต่อ'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="space-y-5 mb-8">
        <h2 className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          ข้อมูลส่วนตัว
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="ชื่อ-นามสกุล">
            <Input value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} placeholder="สมชาย ใจดี" />
          </Field>
          <Field label="อีเมล">
            <Input value={user.email || ''} disabled />
          </Field>
          <Field label="เบอร์โทร">
            <Input type="tel" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} placeholder="0812345678" />
          </Field>
          <Field label="สมาชิกตั้งแต่">
            <Input value={user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : ''} disabled />
          </Field>
        </div>

        <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          {!user.line_linked && (
            <button onClick={handleConnectLine} disabled={isConnectingLine}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: '#06C755', color: '#fff' }}>
              {isConnectingLine ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              เชื่อมต่อ LINE
            </button>
          )}
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 ml-auto"
            style={{ background: 'var(--navy)', color: '#fff' }}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึก
          </button>
        </div>
      </div>

      {/* Plan summary */}
      <div className="bg-white" style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>แผนปัจจุบัน</span>
          <Link href="/dashboard/merchant/subscription" className="font-mono text-[10px] uppercase tracking-widest transition-colors"
            style={{ color: 'var(--blue)' }}>จัดการ →</Link>
        </div>
        <div className="grid grid-cols-3">
          {[
            { label: 'แผน', value: subscription?.plan?.name || 'Free' },
            { label: 'โควต้าใช้ไป', value: `${quota?.used ?? 0} / ${quota?.quota_limit ?? 50}` },
            { label: 'คงเหลือ', value: `${quota?.remaining ?? 0} สลิป` },
          ].map(({ label, value }, i) => (
            <div key={label} className="px-5 py-4"
              style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="font-bold text-sm" style={{ color: 'var(--navy)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link href="/pricing"
          className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <span className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>อัพเกรดแผน</span>
          <span style={{ color: 'var(--blue)' }}>→</span>
        </Link>
        <Link href="/forgot-password"
          className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FECACA')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <span className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>เปลี่ยนรหัสผ่าน</span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
        </Link>
      </div>

    </div>
  );
}
