'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

function VerifyEmailContent() {
  const { verifyOTP } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    else router.push('/login');
  }, [searchParams, router]);

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) setCanResend(true);
  }, [countdown, canResend]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) return;
    setIsLoading(true); setError('');
    try {
      await verifyOTP(email, otp);
      toast.success('Email verified!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true); setError(''); setCountdown(60); setCanResend(false);
    try {
      const { api } = await import('@/lib/api-client');
      await api.resendOTP(email);
      toast.success('New code sent!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
      setCanResend(true);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="thai-pattern fixed inset-0 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <Link href="/login"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-8 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
          ← Back to Login
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold mb-1" style={{ color: 'var(--navy)' }}>
            Verify Email
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--gold)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
              Check Your Inbox
            </span>
          </div>
        </div>

        <div className="bg-white p-8 space-y-6" style={{ border: '1px solid var(--border)' }}>
          {/* Email icon + message */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div
              className="w-14 h-14 flex items-center justify-center"
              style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold)' }}
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              We sent a 6-digit code to<br />
              <span className="font-semibold" style={{ color: 'var(--navy)' }}>{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Verification Code
              </label>
              <input
                type="text" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} required
                className="w-full px-4 py-4 border text-center tracking-[0.5em] font-mono text-xl transition-colors focus:outline-none"
                style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-600">{error}</p>
              </div>
            )}

            <button type="submit" disabled={isLoading || otp.length !== 6}
              className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--navy)', color: 'var(--gold-pale)' }}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify Email <span style={{ color: 'var(--gold)' }}>→</span></>}
            </button>

            <div className="text-center">
              <button type="button" onClick={handleResend} disabled={!canResend || isLoading}
                className="font-mono text-[10px] uppercase tracking-widest transition-colors disabled:opacity-40"
                style={{ color: canResend ? 'var(--gold)' : 'var(--text-muted)' }}>
                {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
              </button>
            </div>
          </form>

          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Wrong email?{' '}
              <Link href="/login" className="font-medium transition-colors" style={{ color: 'var(--navy)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--navy)')}>
                Change address
              </Link>
            </p>
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-center mt-6" style={{ color: 'var(--text-muted)' }}>
          © 2026 FLOWSLIP
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--gold)' }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
