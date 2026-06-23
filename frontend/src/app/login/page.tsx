'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';

type LoginMode = 'password' | 'otp';

function Input({ type, value, onChange, placeholder, required, className = '' }: {
  type: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; className?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      className={`w-full px-4 py-3 border text-sm transition-all focus:outline-none ${className}`}
      style={{ borderColor: 'var(--border)', color: 'var(--navy)', background: '#fff' }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
      <p className="text-xs text-rose-600">{message}</p>
    </div>
  );
}

function LoginContent() {
  const { login, lineLogin, isAuthenticated, user } = useAuth();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const router = useRouter();
  const lineCallbackHandledRef = React.useRef(false);

  const getLineRedirectUri = () =>
    process.env.NEXT_PUBLIC_LINE_LOGIN_CALLBACK_URL || `${window.location.origin}/auth/line/callback`;

  React.useEffect(() => {
    if (isAuthenticated && user) {
      const redirect = searchParams.get('redirect');
      router.push(redirect || '/dashboard');
    }
  }, [isAuthenticated, user, router, searchParams]);

  React.useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) { setEmail(decodeURIComponent(emailParam)); setMode('otp'); setIsOtpSent(true); }
  }, [searchParams]);

  React.useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const lineError = searchParams.get('error_description') || searchParams.get('error');
    if (lineError) { setError(lineError); return; }
    if (!code || state !== 'login' || lineCallbackHandledRef.current) return;
    lineCallbackHandledRef.current = true;
    setIsLoading(true);
    lineLogin(code, getLineRedirectUri()).catch((err) => {
      setError(err instanceof Error ? err.message : 'LINE login failed');
      setIsLoading(false);
    });
  }, [lineLogin, searchParams]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try { await api.resendOTP(email); setIsOtpSent(true); toast.success('รหัสถูกส่งแล้ว'); }
    catch (err) { setError(err instanceof Error ? err.message : 'ส่งรหัสไม่สำเร็จ'); }
    finally { setIsLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError('');
    try {
      if (mode === 'otp') router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
      else await login(email, password);
    } catch (err) { setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ'); setIsLoading(false); }
  };

  const handleLineLogin = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID;
    if (!channelId || channelId === 'your_line_login_channel_id_here') { toast.error('LINE login ยังไม่ได้ตั้งค่า'); return; }
    const redirectUri = getLineRedirectUri();
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=login&scope=profile%20openid%20email`;
  };

  const isLineEnabled = process.env.NEXT_PUBLIC_ENABLE_LINE_LOGIN !== 'false';

  return (
    <div className="min-h-screen grid md:grid-cols-[420px_1fr]">

      {/* Left — navy brand panel */}
      <div
        className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'var(--navy)' }}
      >
        <div className="thai-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.07 }} />

        <div className="relative">
          <Link href="/" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--cyan)' }}>
            ← flowslip.ai
          </Link>
        </div>

        <div className="relative space-y-6">
          <div
            className="text-7xl font-black select-none leading-none"
            style={{ color: 'rgba(0,82,255,0.12)', letterSpacing: '-0.04em' }}
          >
            ✓
          </div>
          <h2
            className="font-bold leading-tight"
            style={{ fontSize: '1.75rem', color: 'rgba(248,250,252,0.9)', letterSpacing: '-0.02em' }}
          >
            ยืนยันสลิปทุกใบ<br />
            <span style={{ color: 'var(--cyan)' }}>จากธนาคารโดยตรง</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(248,250,252,0.45)' }}>
            ไม่ใช่ OCR ไม่ใช่การเดา ผลลัพธ์มาจากธนาคารเสมอ
          </p>
        </div>

        <div className="relative">
          <p className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: 'rgba(248,250,252,0.25)' }}>
            รองรับธนาคาร
          </p>
          <div className="flex flex-wrap gap-2">
            {['KBANK', 'SCB', 'KTB', 'BBL', 'TTB', 'GSB'].map((b) => (
              <span key={b} className="font-mono text-[9px] px-2 py-1" style={{ border: '1px solid rgba(0,82,255,0.25)', color: 'rgba(248,250,252,0.4)' }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-col justify-center px-8 py-12 md:px-16" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm mx-auto">

          {/* Mobile back */}
          <Link href="/" className="md:hidden inline-block font-mono text-[10px] uppercase tracking-widest mb-8 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            ← FLOWSLIP
          </Link>

          <div className="mb-8">
            <h1 className="font-bold mb-1" style={{ fontSize: '1.75rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
              เข้าสู่ระบบ
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>เข้าถึง Dashboard ของคุณ</p>
          </div>

          {/* Mode toggle */}
          <div className="flex mb-6" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            {(['password', 'otp'] as LoginMode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setIsOtpSent(false); setError(''); }}
                className="flex-1 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all"
                style={{
                  background: mode === m ? 'var(--navy)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                }}>
                {m === 'password' ? 'รหัสผ่าน' : 'OTP'}
              </button>
            ))}
          </div>

          {mode === 'password' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>อีเมล</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>รหัสผ่าน</label>
                  <Link href="/forgot-password" className="font-mono text-[10px] uppercase tracking-widest transition-colors" style={{ color: 'var(--blue)' }}>ลืมรหัสผ่าน?</Link>
                </div>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--navy)', color: '#fff' }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'เข้าสู่ระบบ →'}
              </button>
            </form>
          ) : !isOtpSent ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>อีเมล</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
              </div>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--navy)', color: '#fff' }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ส่งรหัส OTP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>รหัส OTP</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" maxLength={6} required
                  className="w-full px-4 py-3 border text-center tracking-[0.5em] font-mono text-lg transition-all focus:outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')} />
                <p className="font-mono text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>ส่งไปที่ {email}</p>
              </div>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--navy)', color: '#fff' }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยัน →'}
              </button>
              <button type="button" onClick={() => setIsOtpSent(false)}
                className="w-full font-mono text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: 'var(--text-muted)' }}>เปลี่ยนอีเมล</button>
            </form>
          )}

          {isLineEnabled && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--border-strong)' }}>หรือ</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <button onClick={handleLineLogin} disabled={isLoading}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: '#06C755', color: '#fff' }}>
                <MessageSquare className="w-4 h-4 fill-current" /> เข้าสู่ระบบด้วย LINE
              </button>
            </>
          )}

          <p className="font-mono text-[10px] uppercase tracking-widest text-center mt-8" style={{ color: 'var(--text-muted)' }}>
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" style={{ color: 'var(--navy)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--navy)')}>
              สมัครฟรี
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} /></div>}>
      <LoginContent />
    </Suspense>
  );
}
